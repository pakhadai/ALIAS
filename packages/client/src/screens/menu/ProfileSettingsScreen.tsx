import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { AvatarDisplay, PRESET_AVATARS } from '../../components/AvatarDisplay';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import { useAuthContext } from '../../context/AuthContext';
import { updateProfile } from '../../services/api';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { useTelegramApp } from '../../hooks/useTelegramApp';
import { ProviderBadge } from './ProfileScreen';
import { isOAuthAuthProvider, resolvePlayerNameFromProfile } from '../../utils/profilePlayerName';
import { ScreenTitle } from '../../components/typography/ScreenTitle';
import { typographyClass, formLabelClass } from '../../constants/typography';

export const ProfileSettingsScreen = () => {
  const { setGameState, currentTheme } = useGame();
  const { authState, profile, refreshProfile } = useAuthContext();
  const { isTelegram } = useTelegramApp();
  const {
    permission: pushPermission,
    supported: pushSupported,
    loading: pushLoading,
    subscribe: pushSubscribe,
    unsubscribe: pushUnsubscribe,
  } = usePushNotifications();
  const { canInstall, install } = useInstallPrompt();

  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<number>(-1);
  const [skipNamePrompt, setSkipNamePrompt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const email = authState.status === 'authenticated' ? authState.email : '';
  const provider = authState.status === 'authenticated' ? authState.provider : '';
  const showSkipNameToggle = isOAuthAuthProvider(provider);
  const autoNamePreview = profile
    ? resolvePlayerNameFromProfile({ ...profile, displayName: name.trim() || profile.displayName })
    : '';

  useEffect(() => {
    if (profile) {
      setName(profile.displayName || (profile.email ? (profile.email.split('@')[0] ?? '') : ''));
      const idx = profile.avatarId != null ? parseInt(profile.avatarId) : -1;
      setSelectedAvatar(idx >= 0 ? idx : -1);
      setSkipNamePrompt(profile.skipNamePrompt ?? false);
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        displayName: name.trim() || undefined,
        avatarId: selectedAvatar >= 0 ? String(selectedAvatar) : undefined,
        ...(showSkipNameToggle ? { skipNamePrompt } : {}),
      });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (_err) {
      void _err;
    }
    setSaving(false);
  };

  const inputCls = `w-full rounded-2xl px-5 py-4 ${typographyClass.bodyInput} outline-none transition-all bg-ui-surface border border-ui-border text-ui-fg placeholder:text-ui-fg-muted focus:border-ui-accent`;

  return (
    <div className="flex flex-col min-h-screen items-center bg-ui-bg">
      <div className="max-w-2xl w-full flex-1 flex flex-col">
        <header className="flex items-center px-6 md:px-8 pb-4 pt-safe-top gap-3">
          {!isTelegram && (
            <button
              onClick={() => setGameState(GameState.PROFILE)}
              className={`p-2 transition-all active:scale-90 ${currentTheme.iconColor} opacity-50 hover:opacity-100`}
            >
              <ArrowLeft size={22} />
            </button>
          )}
          <ScreenTitle themeClass={currentTheme.textMain}>Налаштування профілю</ScreenTitle>
        </header>

        <div
          className="flex-1 overflow-y-auto px-6 md:px-8 py-4 space-y-8"
          style={{ scrollbarWidth: 'none' }}
        >
          <div className="flex justify-center pt-2">
            <AvatarDisplay
              avatarId={selectedAvatar >= 0 ? String(selectedAvatar) : null}
              imageUrl={selectedAvatar >= 0 ? null : profile?.avatarUrl}
              name={profile?.name || profile?.displayName || null}
              size={64}
            />
          </div>

          <div className="space-y-2">
            <p className={`${formLabelClass} opacity-80`}>Виберіть аватарку</p>
            <div
              className="grid grid-cols-6 gap-2 max-w-xs mx-auto max-h-52 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]"
              style={{ scrollbarGutter: 'stable' }}
            >
              {PRESET_AVATARS.map((av, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedAvatar(idx)}
                  className={`relative flex items-center justify-center rounded-xl aspect-square transition-all active:scale-95 ${selectedAvatar === idx ? 'ring-2 ring-ui-accent scale-105' : 'opacity-70 hover:opacity-100'}`}
                  style={{
                    background: `color-mix(in_srgb, var(--ui-accent) ${av.mix}%, var(--ui-bg))`,
                  }}
                >
                  <span className="text-xl">{av.emoji}</span>
                  {selectedAvatar === idx && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-ui-accent rounded-full flex items-center justify-center">
                      <Check size={7} className="text-ui-accent-contrast" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className={`${formLabelClass} opacity-80`}>{"Ім'я в грі"}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.replace(/<[^>]*>/g, '').slice(0, 20))}
              placeholder={"Твоє ім'я..."}
              className={inputCls}
            />
            <p className={`${typographyClass.label} text-ui-fg-muted opacity-70`}>
              {name.length}/20
            </p>
          </div>

          {showSkipNameToggle && (
            <div className="rounded-2xl bg-ui-card border border-ui-border p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className={`${typographyClass.system} font-medium text-ui-fg`}>
                    Не питати ім&apos;я кожного разу
                  </p>
                  <p
                    className={`${typographyClass.label} text-ui-fg-muted leading-relaxed normal-case`}
                  >
                    Одразу створювати кімнату або підключатись з іменем з акаунту
                    {provider === 'telegram' ? ' Telegram' : ' Google'}.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={skipNamePrompt}
                  onClick={() => setSkipNamePrompt((v) => !v)}
                  className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${
                    skipNamePrompt ? 'bg-ui-accent' : 'bg-ui-surface border border-ui-border'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-ui-fg transition-transform ${
                      skipNamePrompt ? 'translate-x-5 bg-ui-accent-contrast' : ''
                    }`}
                  />
                </button>
              </div>
              {skipNamePrompt && autoNamePreview && (
                <p className={`${typographyClass.label} text-ui-fg-muted`}>
                  Буде використано:{' '}
                  <span className="font-medium text-ui-fg">{autoNamePreview}</span>
                </p>
              )}
            </div>
          )}

          <div className="rounded-2xl bg-ui-card border border-ui-border p-5 space-y-3">
            <p className={`${formLabelClass} opacity-80`}>Акаунт</p>
            {email && (
              <div className="flex justify-between items-center">
                <span className={`${typographyClass.system} text-ui-fg-muted`}>Email</span>
                <span className={`${typographyClass.system} font-medium ${currentTheme.textMain}`}>
                  {email}
                </span>
              </div>
            )}
            {provider && (
              <div className="flex justify-between items-center">
                <span className={`${typographyClass.system} text-ui-fg-muted`}>Провайдер</span>
                <ProviderBadge provider={provider} />
              </div>
            )}
          </div>

          {(pushSupported || canInstall) && (
            <div className="rounded-2xl bg-ui-card border border-ui-border p-5 space-y-4">
              <p className={`${formLabelClass} opacity-80`}>Сповіщення і застосунок</p>
              {pushSupported && (
                <div className="flex justify-between items-center">
                  <span className={`${typographyClass.system} text-ui-fg`}>Push-сповіщення</span>
                  {pushPermission === 'granted' ? (
                    <button
                      onClick={pushUnsubscribe}
                      disabled={pushLoading}
                      className={`${typographyClass.label} font-medium normal-case px-3 py-1.5 rounded-full transition-all bg-[color-mix(in_srgb,var(--ui-success)_16%,transparent)] text-ui-success hover:bg-[color-mix(in_srgb,var(--ui-success)_24%,transparent)] disabled:opacity-50`}
                    >
                      {pushLoading ? '...' : '✓ Увімкнено'}
                    </button>
                  ) : pushPermission === 'denied' ? (
                    <span className={`${typographyClass.label} text-ui-fg-muted`}>Заблоковано</span>
                  ) : (
                    <button
                      onClick={pushSubscribe}
                      disabled={pushLoading}
                      className={`${typographyClass.label} font-medium normal-case px-3 py-1.5 rounded-full transition-all ${currentTheme.button} disabled:opacity-50`}
                    >
                      {pushLoading ? '...' : 'Увімкнути'}
                    </button>
                  )}
                </div>
              )}
              {canInstall && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]! text-ui-fg-muted opacity-80">
                      install_mobile
                    </span>
                    <span className={`${typographyClass.system} text-ui-fg`}>
                      На головний екран
                    </span>
                  </div>
                  <button
                    onClick={install}
                    className={`${typographyClass.label} font-medium normal-case px-3 py-1.5 rounded-full transition-all active:scale-95 ${currentTheme.button}`}
                  >
                    Встановити
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 md:px-8 pt-4 pb-safe-bottom">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full h-14 ${currentTheme.button} rounded-full flex items-center justify-center gap-2 ${typographyClass.label} font-sans tracking-[0.3em] transition-all active:scale-[0.98] disabled:opacity-50`}
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : saved ? (
              <>
                <Check size={14} /> Збережено
              </>
            ) : (
              'Зберегти'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
