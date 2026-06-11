import React, { useState, useEffect, useMemo } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { AvatarDisplay, PRESET_AVATARS } from '../../components/AvatarDisplay';
import { Button } from '../../components/Button';
import { AppHeader, FixedBottomBar, ScreenShell } from '../../components/layout';
import { UnsavedChangesModal } from '../../components/Settings';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import { useAuthContext } from '../../context/AuthContext';
import { updateProfile } from '../../services/api';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { ProviderBadge } from '../../components/Auth/AccountBadge';
import { isOAuthAuthProvider, resolvePlayerNameFromProfile } from '../../utils/profilePlayerName';
import { ScreenTitle } from '../../components/typography/ScreenTitle';
import { footerIslandClassName } from '../../constants/footerLayout';
import { screenBodyPy, sectionGapXl } from '../../constants/spacing';
import { SURFACE_CARD_CLASS } from '../../constants/surfaceClasses';
import { typographyClass, formLabelClass } from '../../constants/typography';
import { useT } from '../../hooks/useT';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';

type ProfileFormBaseline = {
  name: string;
  avatarId: number;
  skipNamePrompt: boolean;
};

function baselineFromProfile(profile: {
  displayName?: string | null;
  email?: string | null;
  avatarId?: string | null;
  skipNamePrompt?: boolean;
}): ProfileFormBaseline {
  const name = profile.displayName || (profile.email ? (profile.email.split('@')[0] ?? '') : '');
  const idx = profile.avatarId != null ? parseInt(profile.avatarId, 10) : -1;
  return {
    name,
    avatarId: idx >= 0 ? idx : -1,
    skipNamePrompt: profile.skipNamePrompt ?? false,
  };
}

export const ProfileSettingsScreen = () => {
  const { setGameState, currentTheme, showNotification } = useGame();
  const t = useT();
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
  const [skipNamePrompt, setSkipNamePrompt] = useState(false);
  const [savedBaseline, setSavedBaseline] = useState<ProfileFormBaseline>({
    name: '',
    avatarId: -1,
    skipNamePrompt: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const email = authState.status === 'authenticated' ? authState.email : '';
  const provider = authState.status === 'authenticated' ? authState.provider : '';
  const showSkipNameToggle = isOAuthAuthProvider(provider);
  const autoNamePreview = profile
    ? resolvePlayerNameFromProfile({ ...profile, displayName: name.trim() || profile.displayName })
    : '';

  useEffect(() => {
    if (!profile) return;
    const baseline = baselineFromProfile(profile);
    setName(baseline.name);
    setSelectedAvatar(baseline.avatarId);
    setSkipNamePrompt(baseline.skipNamePrompt);
    setSavedBaseline((prev) =>
      prev.name === baseline.name &&
      prev.avatarId === baseline.avatarId &&
      prev.skipNamePrompt === baseline.skipNamePrompt
        ? prev
        : baseline
    );
  }, [profile]);

  const isDirty = useMemo(() => {
    const trimmedName = name.trim();
    const baselineName = savedBaseline.name.trim();
    return (
      trimmedName !== baselineName ||
      selectedAvatar !== savedBaseline.avatarId ||
      (showSkipNameToggle && skipNamePrompt !== savedBaseline.skipNamePrompt)
    );
  }, [name, savedBaseline, selectedAvatar, showSkipNameToggle, skipNamePrompt]);

  const persistProfile = async () => {
    await updateProfile({
      displayName: name.trim() || undefined,
      avatarId: selectedAvatar >= 0 ? String(selectedAvatar) : undefined,
      ...(showSkipNameToggle ? { skipNamePrompt } : {}),
    });
    await refreshProfile();
    setSavedBaseline({
      name: name.trim(),
      avatarId: selectedAvatar,
      skipNamePrompt,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await persistProfile();
    } catch {
      showNotification(t.profileSettingsSaveFailed, 'error');
    } finally {
      setSaving(false);
    }
  };

  const navigateBack = () => setGameState(GameState.PROFILE);

  const {
    guardedNavigate,
    unsavedModalOpen,
    savingLeave,
    closeUnsavedModal,
    confirmDiscard,
    confirmSaveAndLeave,
  } = useUnsavedChangesGuard({
    isDirty,
    onSave: persistProfile,
  });

  const inputCls = `w-full rounded-2xl px-5 py-4 ${typographyClass.bodyInput} outline-none transition-all bg-ui-surface border border-ui-border text-ui-fg placeholder:text-ui-fg-muted focus:border-ui-accent`;

  const sectionCard = `${SURFACE_CARD_CLASS} p-5`;

  const providerLabel = provider === 'telegram' ? 'Telegram' : 'Google';

  return (
    <ScreenShell
      className="relative bg-ui-bg transition-colors duration-500"
      layout="canonical"
      contentClassName={screenBodyPy}
      headerFixed
      footerFixed
      header={
        <AppHeader
          fixed
          title={<ScreenTitle>{t.profileNavProfileSettings}</ScreenTitle>}
          onBack={() => guardedNavigate(navigateBack)}
        />
      }
      footer={
        <FixedBottomBar island contentClassName={footerIslandClassName('canonical')}>
          <Button
            type="button"
            size="xl"
            fullWidth
            themeClass={currentTheme.button}
            className="rounded-full tracking-[0.3em] min-h-[56px] gap-2"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" aria-hidden />
            ) : saved ? (
              <>
                <Check size={14} aria-hidden /> {t.saved}
              </>
            ) : (
              t.save
            )}
          </Button>
        </FixedBottomBar>
      }
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        aria-hidden
        style={{
          backgroundImage: 'radial-gradient(var(--ui-fg) 0.5px, transparent 0.5px)',
          backgroundSize: '20px 20px',
        }}
      />

      <UnsavedChangesModal
        isOpen={unsavedModalOpen}
        title={t.settingsUnsavedTitle}
        message={t.settingsUnsavedMessage}
        saveText={t.settingsUnsavedSave}
        discardText={t.settingsUnsavedDiscard}
        stayText={t.settingsUnsavedStay}
        saving={savingLeave}
        theme={currentTheme}
        onSave={confirmSaveAndLeave}
        onDiscard={confirmDiscard}
        onStay={closeUnsavedModal}
      />

      <div className={`relative ${sectionGapXl}`}>
        <div className="flex justify-center pt-2">
          <AvatarDisplay
            avatarId={selectedAvatar >= 0 ? String(selectedAvatar) : null}
            imageUrl={selectedAvatar >= 0 ? null : profile?.avatarUrl}
            name={name.trim() || null}
            size={64}
          />
        </div>

        <div className="space-y-2">
          <p className={`${formLabelClass} opacity-80`}>{t.profileSettingsChooseAvatar}</p>
          <div
            className="grid grid-cols-5 gap-2 max-w-xs mx-auto max-h-52 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]"
            style={{ scrollbarGutter: 'stable' }}
          >
            {PRESET_AVATARS.map((av, idx) => (
              <button
                key={idx}
                type="button"
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
          <label className={`${formLabelClass} opacity-80`}>{t.profileSettingsGameName}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.replace(/<[^>]*>/g, '').slice(0, 20))}
            placeholder={t.profileSettingsNamePlaceholder}
            className={inputCls}
          />
          <p className={`${typographyClass.label} text-ui-fg-muted opacity-70`}>{name.length}/20</p>
        </div>

        {showSkipNameToggle && (
          <div className={`${sectionCard} space-y-3`}>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className={`${typographyClass.system} font-medium text-ui-fg`}>
                  {t.profileSettingsSkipNameTitle}
                </p>
                <p
                  className={`${typographyClass.label} text-ui-fg-muted leading-relaxed normal-case`}
                >
                  {t.profileSettingsSkipNameBody.replace('{0}', providerLabel)}
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
                {t.profileSettingsSkipNamePreview}{' '}
                <span className="font-medium text-ui-fg">{autoNamePreview}</span>
              </p>
            )}
          </div>
        )}

        <div className={`${sectionCard} space-y-3`}>
          <p className={`${formLabelClass} opacity-80`}>{t.profileSettingsAccount}</p>
          {email && (
            <div className="flex justify-between items-center gap-3 min-w-0">
              <span className={`${typographyClass.system} text-ui-fg-muted shrink-0`}>Email</span>
              <span className={`${typographyClass.system} font-medium min-w-0 truncate text-ui-fg`}>
                {email}
              </span>
            </div>
          )}
          {provider && (
            <div className="flex justify-between items-center">
              <span className={`${typographyClass.system} text-ui-fg-muted`}>
                {t.profileSettingsProvider}
              </span>
              <ProviderBadge provider={provider} />
            </div>
          )}
        </div>

        {(pushSupported || canInstall) && (
          <div className={`${sectionCard} space-y-4`}>
            <p className={`${formLabelClass} opacity-80`}>{t.profileSettingsNotificationsApp}</p>
            {pushSupported && (
              <div className="flex justify-between items-center">
                <span className={`${typographyClass.system} text-ui-fg`}>{t.notifications}</span>
                {pushPermission === 'granted' ? (
                  <button
                    type="button"
                    onClick={pushUnsubscribe}
                    disabled={pushLoading}
                    className={`${typographyClass.label} font-medium normal-case px-3 py-1.5 rounded-full transition-all bg-[color-mix(in_srgb,var(--ui-success)_16%,transparent)] text-ui-success hover:bg-[color-mix(in_srgb,var(--ui-success)_24%,transparent)] disabled:opacity-50`}
                  >
                    {pushLoading ? '...' : `✓ ${t.notificationsOn}`}
                  </button>
                ) : pushPermission === 'denied' ? (
                  <span className={`${typographyClass.label} text-ui-fg-muted`}>
                    {t.notificationsBlocked}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={pushSubscribe}
                    disabled={pushLoading}
                    className={`${typographyClass.label} font-medium normal-case px-3 py-1.5 rounded-full transition-all ${currentTheme.button} disabled:opacity-50`}
                  >
                    {pushLoading ? '...' : t.enableNotifications}
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
                    {t.pwaAddToHomeScreen}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={install}
                  className={`${typographyClass.label} font-medium normal-case px-3 py-1.5 rounded-full transition-all active:scale-95 ${currentTheme.button}`}
                >
                  {t.pwaInstall}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </ScreenShell>
  );
};
