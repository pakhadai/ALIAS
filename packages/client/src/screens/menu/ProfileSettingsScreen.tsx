import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { AvatarDisplay, PRESET_AVATARS } from '../../components/AvatarDisplay';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import { useAuthContext } from '../../context/AuthContext';
import { updateProfile } from '../../services/api';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { ProviderBadge } from './ProfileScreen';

export const ProfileSettingsScreen = () => {
  const { setGameState, currentTheme } = useGame();
  const { authState, profile, refreshProfile } = useAuthContext();
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const email = authState.status === 'authenticated' ? authState.email : '';
  const provider = authState.status === 'authenticated' ? authState.provider : '';

  useEffect(() => {
    if (profile) {
      setName(profile.displayName || (profile.email ? profile.email.split('@')[0] : ''));
      const idx = profile.avatarId != null ? parseInt(profile.avatarId) : -1;
      setSelectedAvatar(idx >= 0 ? idx : -1);
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        displayName: name.trim() || undefined,
        avatarId: selectedAvatar >= 0 ? String(selectedAvatar) : undefined,
      });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const inputCls =
    'w-full rounded-2xl px-5 py-4 text-sm font-sans outline-none transition-all bg-(--ui-surface) border border-(--ui-border) text-(--ui-fg) placeholder:text-(--ui-fg-muted) focus:border-(--ui-accent)';

  return (
    <div className="flex flex-col min-h-screen items-center bg-(--ui-bg)">
      <div className="max-w-2xl w-full flex-1 flex flex-col">
        <header
          className="flex items-center px-6 md:px-8 pb-4 gap-3"
          style={{ paddingTop: 'max(24px, env(safe-area-inset-top))' }}
        >
          <button
            onClick={() => setGameState(GameState.PROFILE)}
            className={`p-2 transition-all active:scale-90 ${currentTheme.iconColor} opacity-50 hover:opacity-100`}
          >
            <ArrowLeft size={22} />
          </button>
          <h2 className={`font-serif text-2xl tracking-wide ${currentTheme.textMain}`}>
            Налаштування профілю
          </h2>
        </header>

        <div
          className="flex-1 overflow-y-auto px-6 md:px-8 py-4 space-y-8"
          style={{ scrollbarWidth: 'none' }}
        >
          <div className="flex justify-center pt-2">
            <AvatarDisplay
              avatarId={selectedAvatar >= 0 ? String(selectedAvatar) : null}
              size={64}
            />
          </div>

          <div className="space-y-2">
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-(--ui-fg-muted) opacity-80">
              Виберіть аватарку
            </p>
            <div className="grid grid-cols-6 gap-2 max-w-xs mx-auto">
              {PRESET_AVATARS.slice(0, 15).map((av, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedAvatar(idx)}
                  className={`relative flex items-center justify-center rounded-xl aspect-square transition-all active:scale-95 ${selectedAvatar === idx ? 'ring-2 ring-(--ui-accent) scale-105' : 'opacity-70 hover:opacity-100'}`}
                  style={{
                    background: `color-mix(in_srgb, var(--ui-accent) ${av.mix}%, var(--ui-bg))`,
                  }}
                >
                  <span className="text-xl">{av.emoji}</span>
                  {selectedAvatar === idx && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-(--ui-accent) rounded-full flex items-center justify-center">
                      <Check size={7} className="text-(--ui-accent-contrast)" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-bold tracking-[0.25em] uppercase text-(--ui-fg-muted) opacity-80">
              {"Ім'я в грі"}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.replace(/<[^>]*>/g, '').slice(0, 20))}
              placeholder={"Твоє ім'я..."}
              className={inputCls}
            />
            <p className="text-[10px] text-(--ui-fg-muted) opacity-70">{name.length}/20</p>
          </div>

          <div className="rounded-2xl bg-(--ui-card) border border-(--ui-border) p-5 space-y-3">
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-(--ui-fg-muted) opacity-80">
              Акаунт
            </p>
            {email && (
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-(--ui-fg-muted)">Email</span>
                <span className={`text-[12px] font-medium ${currentTheme.textMain}`}>{email}</span>
              </div>
            )}
            {provider && (
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-(--ui-fg-muted)">Провайдер</span>
                <ProviderBadge provider={provider} />
              </div>
            )}
          </div>

          {(pushSupported || canInstall) && (
            <div className="rounded-2xl bg-(--ui-card) border border-(--ui-border) p-5 space-y-4">
              <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-(--ui-fg-muted) opacity-80">
                Сповіщення і застосунок
              </p>
              {pushSupported && (
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-(--ui-fg)">Push-сповіщення</span>
                  {pushPermission === 'granted' ? (
                    <button
                      onClick={pushUnsubscribe}
                      disabled={pushLoading}
                      className="text-[11px] font-medium px-3 py-1.5 rounded-full transition-all bg-[color-mix(in_srgb,var(--ui-success)_16%,transparent)] text-(--ui-success) hover:bg-[color-mix(in_srgb,var(--ui-success)_24%,transparent)] disabled:opacity-50"
                    >
                      {pushLoading ? '...' : '✓ Увімкнено'}
                    </button>
                  ) : pushPermission === 'denied' ? (
                    <span className="text-[11px] text-(--ui-fg-muted)">Заблоковано</span>
                  ) : (
                    <button
                      onClick={pushSubscribe}
                      disabled={pushLoading}
                      className={`text-[11px] font-medium px-3 py-1.5 rounded-full transition-all ${currentTheme.button} disabled:opacity-50`}
                    >
                      {pushLoading ? '...' : 'Увімкнути'}
                    </button>
                  )}
                </div>
              )}
              {canInstall && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]! text-(--ui-fg-muted) opacity-80">
                      install_mobile
                    </span>
                    <span className="text-[12px] text-(--ui-fg)">На головний екран</span>
                  </div>
                  <button
                    onClick={install}
                    className={`text-[11px] font-medium px-3 py-1.5 rounded-full transition-all active:scale-95 ${currentTheme.button}`}
                  >
                    Встановити
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className="px-6 md:px-8 py-4"
          style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full h-14 ${currentTheme.button} rounded-full flex items-center justify-center gap-2 font-sans font-bold text-[10px] uppercase tracking-[0.3em] transition-all active:scale-[0.98] disabled:opacity-50`}
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
