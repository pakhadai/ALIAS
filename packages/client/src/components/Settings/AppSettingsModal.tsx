import React, { useMemo, useState } from 'react';
import { Check, Lock, Settings as SettingsIcon, Volume2, Vibrate } from 'lucide-react';
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

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AppSettingsModal({ open, onClose }: Props) {
  const { settings, currentTheme, setPreferences, showNotification, uiLanguage } = useGame();
  const { isAuthenticated } = useAuthContext();
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

  return (
    <ModalSheet
      open={open}
      onClose={onClose}
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
                    onClose();
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 size={16} className="text-ui-fg-muted opacity-80" />
              <p className={sectionLabel}>{t.sound}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !settings.general.soundEnabled;
                setPreferences({ soundEnabled: next });
                if (next) {
                  // Play a demo sound so the user immediately hears that sound works.
                  // Called directly (not via useAudio) because the state update is
                  // async — soundEnabled is still false when this handler runs.
                  playSoundEffect('click', settings.general.soundPreset);
                }
              }}
              className={`w-12 h-6 rounded-full transition-all relative ${
                settings.general.soundEnabled ? 'bg-ui-accent' : 'bg-ui-surface'
              }`}
              aria-pressed={settings.general.soundEnabled}
            >
              <div
                className={`absolute w-5 h-5 bg-ui-fg rounded-full top-0.5 transition-all ${
                  settings.general.soundEnabled ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Vibrate size={16} className="text-ui-fg-muted opacity-80" />
              <p className={sectionLabel}>{t.vibration}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !haptics;
                setHaptics(next);
                setHapticsEnabled(next);
                if (next) {
                  // Confirm vibration immediately. setHapticsEnabled already wrote
                  // to localStorage synchronously, so navigator.vibrate fires right away.
                  // Three short pulses — noticeable but not annoying.
                  navigator.vibrate?.([40, 40, 40]);
                }
              }}
              className={`w-12 h-6 rounded-full transition-all relative ${
                haptics ? 'bg-ui-accent' : 'bg-ui-surface'
              }`}
              aria-pressed={haptics}
            >
              <div
                className={`absolute w-5 h-5 bg-ui-fg rounded-full top-0.5 transition-all ${
                  haptics ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
          <p className={`${typographyClass.label} leading-relaxed text-ui-fg-muted opacity-70`}>
            {t.vibrationHint}
          </p>
        </div>
      </ModalSheetBody>
    </ModalSheet>
  );
}
