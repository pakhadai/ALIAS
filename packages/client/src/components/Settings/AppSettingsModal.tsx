import React, { useMemo, useState } from 'react';
import { Check, Lock, Settings as SettingsIcon } from 'lucide-react';
import { ModalSheet, ModalSheetBody } from '../ModalSheet';
import { ModalSheetTitle, menuHeaderModalBackdropClass } from '../Shared';
import { Button } from '../Button';
import { Language, SoundPreset } from '../../types';
import { THEME_CONFIG, UI_THEME_IDS } from '../../constants';
import { useT } from '../../hooks/useT';
import { useGame } from '../../context/GameContext';
import { setHapticsEnabled } from '../../utils/haptics';
import { useAuthContext } from '../../context/AuthContext';
import { playSoundEffect } from '../../utils/audio';
import { typographyClass, labelSectionClass, captionMutedClass } from '../../constants/typography';
import { SettingsToggle } from './SettingsToggle';

type Props = {
  onClose: () => void;
};

export function AppSettingsModal({ onClose }: Props) {
  const { settings, currentTheme, setPreferences, showNotification, uiLanguage } = useGame();
  const { isAuthenticated } = useAuthContext();
  const [open, setOpen] = useState(true);
  const [haptics, setHaptics] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('movli_preferences');
      if (!raw) return true;
      const prefs = JSON.parse(raw);
      return prefs?.hapticsEnabled !== false;
    } catch {
      return true;
    }
  });
  const t = useT();

  const themes = useMemo(() => UI_THEME_IDS, []);

  const sectionLabel = `${labelSectionClass} ${currentTheme.textMain}`;
  const handleClose = () => setOpen(false);

  return (
    <ModalSheet
      open={open}
      onClose={handleClose}
      onExited={onClose}
      zLayer="modalNested"
      size="tall"
      showClose
      closeAriaLabel={t.close}
      paddedContent={false}
      backdropClassName={menuHeaderModalBackdropClass}
      ariaLabelledBy="app-settings-title"
      header={
        <div className="flex items-center gap-2 min-w-0">
          <SettingsIcon size={16} className={currentTheme.iconColor} aria-hidden />
          <ModalSheetTitle id="app-settings-title" themeClass={currentTheme.textMain}>
            {t.settings}
          </ModalSheetTitle>
        </div>
      }
    >
      <ModalSheetBody className="space-y-7 px-5 pb-modal-bottom">
        {/* General */}
        <div className="space-y-3">
          <p className={sectionLabel}>{t.cat_general ?? 'General'}</p>
          <div className="space-y-2">
            <p className={`${labelSectionClass} ${currentTheme.textMain}`}>{t.language}</p>
            <div className="flex gap-2">
              {[Language.UA, Language.DE, Language.EN].map((l) => (
                <Button
                  key={l}
                  type="button"
                  variant={uiLanguage === l ? 'primary' : 'secondary'}
                  className="flex-1 rounded-xl font-sans normal-case tracking-normal"
                  onClick={() => setPreferences({ language: l })}
                >
                  {l}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="space-y-3">
          <p className={sectionLabel}>{t.theme}</p>
          <div className="grid grid-cols-2 gap-3">
            {themes.map((themeId) => {
              const theme = THEME_CONFIG[themeId];
              const themeName = theme.labels?.[uiLanguage]?.name ?? theme.name;
              const themeDesc = theme.labels?.[uiLanguage]?.description ?? theme.description;
              const isActive = settings.general.theme === themeId;
              const locked = !theme.isFree && !isAuthenticated;
              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    if (locked) {
                      showNotification(t.themeLockedAuthRequired, 'info');
                      return;
                    }
                    setPreferences({ theme: themeId });
                    handleClose();
                  }}
                  className={`relative rounded-2xl p-4 flex flex-col gap-1 transition-all active:scale-95 text-left overflow-hidden ${
                    isActive ? 'ring-2 ring-offset-2 ring-offset-ui-bg' : ''
                  }`}
                  style={{
                    background: theme.preview.bg,
                    ...(isActive
                      ? ({ '--tw-ring-color': theme.preview.accent } as React.CSSProperties)
                      : {}),
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full mb-1"
                    style={{ background: theme.preview.accent }}
                  />
                  <span
                    className={`${typographyClass.body} font-bold leading-tight`}
                    style={{
                      color: theme.tokens?.fg ?? 'var(--ui-fg)',
                      fontFamily: theme.fonts.heading,
                    }}
                  >
                    {themeName}
                  </span>
                  <span
                    className={captionMutedClass}
                    style={{ color: theme.tokens?.fg ?? 'var(--ui-fg)' }}
                  >
                    {themeDesc}
                  </span>
                  {locked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[color-mix(in_srgb,var(--ui-bg)_70%,transparent)] backdrop-blur-[2px] px-3">
                      <div className="flex items-center gap-2 text-ui-fg">
                        <Lock size={12} />
                        <span className={`${typographyClass.label} tracking-wider`}>
                          {t.statsGuestBannerCta}
                        </span>
                      </div>
                      <span
                        className={`${typographyClass.label} text-ui-fg-muted text-center leading-snug`}
                      >
                        {t.themeLockedAuthRequired}
                      </span>
                    </div>
                  )}
                  {isActive && !locked && (
                    <div
                      className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: theme.preview.accent }}
                    >
                      <Check size={10} className="text-ui-accent-contrast" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sound */}
        <div className="space-y-4">
          <SettingsToggle
            checked={settings.general.soundEnabled}
            onChange={(next) => {
              setPreferences({ soundEnabled: next });
              if (next) {
                playSoundEffect('click', settings.general.soundPreset);
              }
            }}
            title={t.sound}
            enabledLabel={t.enabled}
            disabledLabel={t.disabled}
            titleClassName={`${typographyClass.body} ${currentTheme.textMain} font-semibold normal-case tracking-normal`}
          />

          {settings.general.soundEnabled && (
            <div className="grid grid-cols-3 gap-2">
              {[SoundPreset.FUN, SoundPreset.MINIMAL, SoundPreset.EIGHT_BIT].map((preset) => {
                const active = settings.general.soundPreset === preset;
                return (
                  <Button
                    key={preset}
                    type="button"
                    variant={active ? 'primary' : 'secondary'}
                    className="font-sans normal-case tracking-normal"
                    onClick={() => {
                      setPreferences({ soundPreset: preset });
                      playSoundEffect('correct', preset);
                    }}
                  >
                    {preset.replace('_', ' ')}
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {/* Haptics */}
        <SettingsToggle
          checked={haptics}
          onChange={(next) => {
            setHaptics(next);
            setHapticsEnabled(next);
            if (next) {
              navigator.vibrate?.([40, 40, 40]);
            }
          }}
          title={t.vibration}
          hint={t.vibrationHint}
          enabledLabel={t.enabled}
          disabledLabel={t.disabled}
          titleClassName={`${typographyClass.body} ${currentTheme.textMain} font-semibold normal-case tracking-normal`}
        />
      </ModalSheetBody>
    </ModalSheet>
  );
}
