import React, { useEffect, useMemo, useState } from 'react';
import { Check, Lock, Settings as SettingsIcon, Volume2, Vibrate, X } from 'lucide-react';
import { AppTheme, Language, SoundPreset } from '../../types';
import { THEME_CONFIG, TRANSLATIONS } from '../../constants';
import { useGame } from '../../context/GameContext';
import { getHapticsEnabled, setHapticsEnabled } from '../../utils/haptics';
import { useAuthContext } from '../../context/AuthContext';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function AppSettingsModal({ isOpen, onClose }: Props) {
  const { settings, currentTheme, setPreferences, showNotification } = useGame();
  const { isAuthenticated } = useAuthContext();
  const isDark = currentTheme.isDark;
  const [haptics, setHaptics] = useState<boolean>(() => getHapticsEnabled());
  const t = TRANSLATIONS[settings.general.language];
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [visible, setVisible] = useState(false);

  const themes = useMemo(
    () => [AppTheme.PREMIUM_DARK, AppTheme.CYBERPUNK, AppTheme.FOREST, AppTheme.SLEEK],
    []
  );

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    if (!shouldRender) return;
    setVisible(false);
    const timer = setTimeout(() => setShouldRender(false), 280);
    return () => clearTimeout(timer);
  }, [isOpen, shouldRender]);

  if (!shouldRender) return null;

  const sectionLabel = `text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`;
  const isGuestSheet = !isAuthenticated;
  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col transition-all duration-300
        ${isGuestSheet ? 'justify-end' : 'justify-end md:justify-center md:items-center'}
        ${visible ? 'bg-[color-mix(in_srgb,var(--ui-bg)_78%,transparent)] backdrop-blur-xl animate-fade-in' : 'bg-transparent'}`}
      onClick={handleClose}
      role="presentation"
    >
      <div
        className={`w-full max-w-sm md:max-w-md mx-auto rounded-t-4xl md:rounded-4xl px-5 pt-5 pb-8 ${currentTheme.card}
          transition-transform duration-300 ease-out
          ${visible ? 'translate-y-0 animate-pop-in' : 'translate-y-full'}`}
        style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-settings-title"
      >
        {isGuestSheet && (
          <div className="flex justify-center pt-1 pb-2">
            <div className="h-1 w-10 rounded-full bg-(--ui-border)" />
          </div>
        )}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <SettingsIcon size={16} className={currentTheme.iconColor} />
            <p
              id="app-settings-title"
              className={`text-[9px] font-sans font-bold tracking-[0.28em] uppercase ${currentTheme.textSecondary}`}
            >
              Settings
            </p>
          </div>
          <button
            onClick={handleClose}
            className={`p-1 opacity-50 hover:opacity-100 transition-opacity ${currentTheme.textMain}`}
            aria-label={t.close}
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-7">
          {/* General */}
          <div className="space-y-3">
            <p className={sectionLabel}>{t.cat_general ?? 'General'}</p>
            <div className="space-y-2">
              <p
                className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}
              >
                {t.language}
              </p>
              <div className="flex gap-2">
                {[Language.UA, Language.DE, Language.EN].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setPreferences({ language: l })}
                    className={`flex-1 py-3 rounded-xl border transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform ${
                      settings.general.language === l
                        ? 'bg-(--ui-accent) text-(--ui-accent-contrast) border-(--ui-accent)'
                        : 'bg-(--ui-surface) border-(--ui-border) text-(--ui-fg-muted) hover:text-(--ui-fg) hover:bg-(--ui-surface-hover)'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="space-y-3">
            <p className={sectionLabel}>Theme</p>
            <div className="grid grid-cols-2 gap-3">
              {themes.map((themeId) => {
                const theme = THEME_CONFIG[themeId];
                const isActive = settings.general.theme === themeId;
                const locked = themeId !== AppTheme.PREMIUM_DARK && !isAuthenticated;
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
                      isActive ? 'ring-2 ring-offset-2 ring-offset-(--ui-bg)' : ''
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
                      className="text-[13px] font-bold leading-tight"
                      style={{
                        color: theme.isDark ? '#fff' : '#111',
                        fontFamily: theme.fonts.heading,
                      }}
                    >
                      {theme.name}
                    </span>
                    <span
                      className="text-[10px] opacity-50 leading-snug"
                      style={{ color: theme.isDark ? '#fff' : '#111' }}
                    >
                      {theme.description}
                    </span>
                    {locked && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[color-mix(in_srgb,var(--ui-bg)_70%,transparent)] backdrop-blur-[2px] px-3">
                        <div className="flex items-center gap-2 text-(--ui-fg)">
                          <Lock size={12} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            {t.statsGuestBannerCta}
                          </span>
                        </div>
                        <span className="text-[10px] text-(--ui-fg-muted) text-center leading-snug">
                          {t.themeLockedAuthRequired}
                        </span>
                      </div>
                    )}
                    {isActive && !locked && (
                      <div
                        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: theme.preview.accent }}
                      >
                        <Check size={10} className="text-(--ui-accent-contrast)" />
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
                <Volume2 size={16} className="text-(--ui-fg-muted) opacity-80" />
                <p className={sectionLabel}>Sound</p>
              </div>
              <button
                type="button"
                onClick={() => setPreferences({ soundEnabled: !settings.general.soundEnabled })}
                className={`w-12 h-6 rounded-full transition-all relative ${
                  settings.general.soundEnabled ? 'bg-(--ui-accent)' : 'bg-(--ui-surface)'
                }`}
                aria-pressed={settings.general.soundEnabled}
              >
                <div
                  className={`absolute w-5 h-5 bg-(--ui-fg) rounded-full top-0.5 transition-all ${
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
                    <button
                      key={preset}
                      onClick={() => setPreferences({ soundPreset: preset })}
                      className={`p-3 rounded-xl border text-[9px] uppercase tracking-widest font-bold transition-all ${
                        active
                          ? 'border-(--ui-accent) bg-(--ui-accent) text-(--ui-accent-contrast)'
                          : isDark
                            ? 'border-(--ui-border) bg-(--ui-surface) text-(--ui-fg-muted) hover:text-(--ui-fg)'
                            : 'border-(--ui-border) bg-(--ui-surface) text-(--ui-fg-muted) hover:text-(--ui-fg)'
                      }`}
                    >
                      {preset.replace('_', ' ')}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Haptics */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Vibrate size={16} className="text-(--ui-fg-muted) opacity-80" />
                <p className={sectionLabel}>Vibration</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !haptics;
                  setHaptics(next);
                  setHapticsEnabled(next);
                }}
                className={`w-12 h-6 rounded-full transition-all relative ${
                  haptics ? 'bg-(--ui-accent)' : 'bg-(--ui-surface)'
                }`}
                aria-pressed={haptics}
              >
                <div
                  className={`absolute w-5 h-5 bg-(--ui-fg) rounded-full top-0.5 transition-all ${
                    haptics ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
            <p className="text-[10px] leading-relaxed text-(--ui-fg-muted) opacity-70">
              Vibration is stored on this device and won&apos;t affect the lobby rules.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
