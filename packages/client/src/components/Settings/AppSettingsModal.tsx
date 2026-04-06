import React, { useMemo, useState } from 'react';
import { Check, Lock, Settings as SettingsIcon, Volume2, Vibrate, X } from 'lucide-react';
import { AppTheme, SoundPreset } from '../../types';
import { THEME_CONFIG } from '../../constants';
import { useGame } from '../../context/GameContext';
import { getHapticsEnabled, setHapticsEnabled } from '../../utils/haptics';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  isThemeOwned: (themeId: AppTheme) => boolean;
  onGoStore: () => void;
};

export function AppSettingsModal({ isOpen, onClose, isThemeOwned, onGoStore }: Props) {
  const { settings, currentTheme, setPreferences } = useGame();
  const isDark = currentTheme.isDark;
  const [haptics, setHaptics] = useState<boolean>(() => getHapticsEnabled());

  const themes = useMemo(() => Object.keys(THEME_CONFIG) as AppTheme[], []);

  if (!isOpen) return null;

  const sectionLabel = `text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center bg-black/60 transition-all"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="App settings"
    >
      <div
        className={`w-full max-w-sm md:max-w-md mx-auto rounded-t-4xl md:rounded-4xl px-5 pt-5 pb-8 ${currentTheme.card}`}
        style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <SettingsIcon size={16} className={currentTheme.iconColor} />
            <p
              className={`text-[9px] font-sans font-bold tracking-[0.28em] uppercase ${currentTheme.textSecondary}`}
            >
              Settings
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-1 opacity-50 hover:opacity-100 transition-opacity ${currentTheme.textMain}`}
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-7">
          {/* Appearance */}
          <div className="space-y-3">
            <p className={sectionLabel}>Theme</p>
            <div className="grid grid-cols-2 gap-3">
              {themes.map((themeId) => {
                const theme = THEME_CONFIG[themeId];
                const isActive = settings.general.theme === themeId;
                const owned = isThemeOwned(themeId);
                return (
                  <button
                    key={theme.id}
                    onClick={() => {
                      if (!owned) {
                        onClose();
                        onGoStore();
                        return;
                      }
                      setPreferences({ theme: themeId });
                      onClose();
                    }}
                    className={`relative rounded-2xl p-4 flex flex-col gap-1 transition-all active:scale-95 text-left overflow-hidden ${
                      isActive ? 'ring-2 ring-offset-2 ring-offset-[#1C1C1E]' : ''
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
                    {!owned && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 rounded-full px-2 py-0.5">
                        <Lock size={9} className="text-white/80" />
                        <span className="text-[9px] text-white/80 font-bold">$0.99</span>
                      </div>
                    )}
                    {isActive && owned && (
                      <div
                        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: theme.preview.accent }}
                      >
                        <Check size={10} className="text-white" />
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
                <Volume2 size={16} className="text-white/50" />
                <p className={sectionLabel}>Sound</p>
              </div>
              <button
                type="button"
                onClick={() => setPreferences({ soundEnabled: !settings.general.soundEnabled })}
                className={`w-12 h-6 rounded-full transition-all relative ${
                  settings.general.soundEnabled
                    ? 'bg-yellow-500'
                    : isDark
                      ? 'bg-white/20'
                      : 'bg-slate-300'
                }`}
                aria-pressed={settings.general.soundEnabled}
              >
                <div
                  className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${
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
                          ? 'border-yellow-500 bg-yellow-500 text-black'
                          : isDark
                            ? 'border-white/10 bg-white/5 text-white/40 hover:text-white/70'
                            : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800'
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
                <Vibrate size={16} className="text-white/50" />
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
                  haptics ? 'bg-yellow-500' : isDark ? 'bg-white/20' : 'bg-slate-300'
                }`}
                aria-pressed={haptics}
              >
                <div
                  className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${
                    haptics ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
            <p
              className={`text-[10px] leading-relaxed ${isDark ? 'text-white/25' : 'text-slate-400'}`}
            >
              Vibration is stored on this device and won&apos;t affect the lobby rules.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
