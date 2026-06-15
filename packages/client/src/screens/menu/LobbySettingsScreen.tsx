import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '../../components/Button';
import {
  AppHeader,
  AppHeaderOverflowMenu,
  FixedBottomBar,
  ScreenShell,
} from '../../components/layout';
import { hasTelegramInitData } from '../../hooks/useTelegramApp';
import {
  areLobbySettingsEqual,
  CategoryChipGrid,
  DEFAULT_LOBBY_CATEGORIES,
  getCategoryLabel,
  LanguageChipRow,
  SettingsSlider,
  SettingsToggle,
  UnsavedChangesModal,
} from '../../components/Settings';
import { GameState, GameMode, Category } from '../../types';
import { useGame } from '../../context/GameContext';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { fetchLobbySettings, saveLobbySettings } from '../../services/api';
import { applyFactoryLobbyDefaults, isEmptySavedLobbySettings } from '../../context/gameReducer';
import { useResourceLoad } from '../../hooks/useResourceLoad';
import type { GameSettings } from '../../types';
import { ScreenTitle } from '../../components/typography/ScreenTitle';
import { footerIslandClassName } from '../../constants/footerLayout';
import { screenBodyPy, sectionGapXl } from '../../constants/spacing';
import { SURFACE_CARD_CLASS } from '../../constants/surfaceClasses';
import { labelSectionClass, systemStatusClass, typographyClass } from '../../constants/typography';
import { useT } from '../../hooks/useT';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';
import { useAuthContext } from '../../context/AuthContext';
import { toSyncableLobbySettings } from '../../lib/lobbyDefaults';

function mergePartialLobbySettings(
  prev: GameSettings,
  remote: Partial<GameSettings>
): GameSettings {
  return {
    ...prev,
    ...(remote.general != null ? { general: { ...prev.general, ...remote.general } } : {}),
    ...(remote.mode != null
      ? { mode: { ...prev.mode, ...remote.mode } as GameSettings['mode'] }
      : {}),
  };
}

export const LobbySettingsScreen = () => {
  const {
    setGameState,
    currentTheme,
    settings: gameSettings,
    roomCode,
    showNotification,
  } = useGame();
  const { authState } = useAuthContext();
  const t = useT();
  const isDark = currentTheme.isDark;
  const isGuest = authState.status === 'anonymous';

  const [local, setLocal] = useState({ ...gameSettings });
  const [savedBaseline, setSavedBaseline] = useState({ ...gameSettings });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: remoteSettings, loading: remoteLoading } = useResourceLoad(
    () => fetchLobbySettings(),
    {
      initialData: null as Partial<GameSettings> | null,
      enabled: !isGuest,
    }
  );
  const loading = remoteLoading;

  const isDirty = !areLobbySettingsEqual(local, savedBaseline);

  const applyLoadedSettings = (next: GameSettings) => {
    setLocal(next);
    setSavedBaseline(next);
  };

  useEffect(() => {
    if (!isGuest) return;
    showNotification(t.lobbyDefaultsAuthRequired, 'info');
    setGameState(roomCode ? GameState.LOBBY : GameState.PROFILE);
  }, [isGuest, roomCode, setGameState, showNotification, t.lobbyDefaultsAuthRequired]);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isGuest || remoteLoading) return;
    if (isEmptySavedLobbySettings(remoteSettings)) {
      setLocal((prev) => {
        const factory = applyFactoryLobbyDefaults(prev);
        setSavedBaseline(factory);
        return factory;
      });
      return;
    }
    if (remoteSettings == null) return;
    setLocal((prev) => {
      const merged = mergePartialLobbySettings(prev, remoteSettings as Partial<GameSettings>);
      setSavedBaseline(merged);
      return merged;
    });
  }, [remoteSettings, remoteLoading, isGuest]);

  const setGeneral = <K extends keyof typeof gameSettings.general>(
    key: K,
    value: (typeof gameSettings.general)[K]
  ) => setLocal((prev) => ({ ...prev, general: { ...prev.general, [key]: value } }));

  const setMode = (patch: Partial<typeof gameSettings.mode>) =>
    setLocal((prev) => ({ ...prev, mode: { ...prev.mode, ...patch } as typeof prev.mode }));

  const persistSettings = async () => {
    const syncedOnly = toSyncableLobbySettings(local) as Record<string, unknown>;
    await saveLobbySettings(syncedOnly);
    setSavedBaseline(local);
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await persistSettings();
    } catch {
      showNotification(t.lobbyDefaultsSaveFailed, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetConfirm = async () => {
    setResetting(true);
    try {
      await saveLobbySettings({});
      const fresh = await fetchLobbySettings();
      if (isEmptySavedLobbySettings(fresh)) {
        applyLoadedSettings(applyFactoryLobbyDefaults(local));
      } else if (fresh) {
        applyLoadedSettings(mergePartialLobbySettings(local, fresh));
      }
      setShowResetConfirm(false);
    } catch {
      showNotification(t.lobbyDefaultsResetFailed, 'error');
    } finally {
      setResetting(false);
    }
  };

  const navigateBack = () => {
    setGameState(roomCode ? GameState.LOBBY : GameState.MENU);
  };

  const {
    guardedNavigate,
    unsavedModalOpen,
    savingLeave,
    closeUnsavedModal,
    confirmDiscard,
    confirmSaveAndLeave,
  } = useUnsavedChangesGuard({
    isDirty,
    onSave: persistSettings,
  });

  const sectionLabel = `${labelSectionClass} text-ui-fg`;

  const lobbySettingsMenuItems = useMemo(
    () => [
      {
        id: 'reset',
        label: t.reset,
        disabled: resetting || loading,
        onSelect: () => setShowResetConfirm(true),
      },
    ],
    [t.reset, resetting, loading]
  );

  const isTelegramSession = hasTelegramInitData();

  if (isGuest) {
    return null;
  }

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
          title={<ScreenTitle>{t.profileNavLobbySettings}</ScreenTitle>}
          onBack={() => guardedNavigate(navigateBack)}
          menuItems={isTelegramSession ? undefined : lobbySettingsMenuItems}
          right={
            isTelegramSession ? (
              <AppHeaderOverflowMenu items={lobbySettingsMenuItems} ariaLabel={t.reset} />
            ) : undefined
          }
        />
      }
      footer={
        <FixedBottomBar island contentClassName={footerIslandClassName('canonical')}>
          <Button
            type="button"
            variant="primary"
            volume="cta"
            size="xl"
            fullWidth
            themeClass={currentTheme.button}
            className="min-h-[56px] gap-2"
            onClick={() => void handleSave()}
            disabled={saving || loading}
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" aria-hidden />
            ) : saved ? (
              <>
                <Check size={14} aria-hidden /> {t.saved}
              </>
            ) : (
              t.lobbyDefaultsSave
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

      <ConfirmationModal
        isOpen={showResetConfirm}
        title={t.lobbyDefaultsResetTitle}
        message={t.lobbyDefaultsResetMessage}
        isDanger
        theme={currentTheme}
        onCancel={() => {
          if (!resetting) setShowResetConfirm(false);
        }}
        onConfirm={() => {
          if (!resetting) void handleResetConfirm();
        }}
        confirmText={t.lobbyDefaultsResetConfirm}
        cancelText={t.goBack}
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
        {loading ? (
          <div className="flex justify-center pt-16">
            <Loader2 size={24} className={`animate-spin ${currentTheme.iconColor} opacity-40`} />
          </div>
        ) : (
          <>
            <div
              className={`${SURFACE_CARD_CLASS} px-4 py-3 border bg-[color-mix(in_srgb,var(--ui-accent)_8%,transparent)] border-[color-mix(in_srgb,var(--ui-accent)_20%,transparent)]`}
              data-testid="lobby-defaults-info-banner"
            >
              <p className={`${systemStatusClass} text-ui-fg-muted`}>{t.lobbyDefaultsInfoBanner}</p>
            </div>

            <div className="space-y-3">
              <p className={sectionLabel}>{t.lobbyWordLanguage}</p>
              <LanguageChipRow
                value={local.general.language}
                onChange={(l) => setGeneral('language', l)}
              />
            </div>

            <div className="space-y-3">
              {local.mode.gameMode === GameMode.IMPOSTER ? (
                <SettingsSlider
                  label={t.imposterDiscussionTime}
                  value={
                    'imposterDiscussionTime' in local.mode ? local.mode.imposterDiscussionTime : 180
                  }
                  displayValue={t.timeMinShort.replace(
                    '{0}',
                    String(
                      'imposterDiscussionTime' in local.mode
                        ? Math.round(local.mode.imposterDiscussionTime / 60)
                        : 3
                    )
                  )}
                  min={180}
                  max={600}
                  step={60}
                  isDark={isDark}
                  labelClassName={sectionLabel}
                  rangeLabels={[
                    t.timeMinShort.replace('{0}', '3'),
                    t.timeMinShort.replace('{0}', '10'),
                  ]}
                  onChange={(v) =>
                    setMode({ imposterDiscussionTime: v } as Partial<typeof gameSettings.mode>)
                  }
                />
              ) : (
                <SettingsSlider
                  label={t.roundTimeFull}
                  value={'classicRoundTime' in local.mode ? local.mode.classicRoundTime : 60}
                  displayValue={t.timeSecShort.replace(
                    '{0}',
                    String('classicRoundTime' in local.mode ? local.mode.classicRoundTime : 60)
                  )}
                  min={30}
                  max={180}
                  step={10}
                  isDark={isDark}
                  labelClassName={sectionLabel}
                  rangeLabels={[
                    t.timeSecShort.replace('{0}', '30'),
                    t.timeSecShort.replace('{0}', '180'),
                  ]}
                  onChange={(v) =>
                    setMode({ classicRoundTime: v } as Partial<typeof gameSettings.mode>)
                  }
                />
              )}
            </div>

            <SettingsSlider
              label={t.scoreToWinFull}
              value={local.general.scoreToWin}
              displayValue={String(local.general.scoreToWin)}
              min={10}
              max={100}
              step={5}
              isDark={isDark}
              labelClassName={sectionLabel}
              onChange={(v) => setGeneral('scoreToWin', v)}
            />

            <SettingsToggle
              checked={local.general.skipPenalty}
              onChange={(v) => setGeneral('skipPenalty', v)}
              title={t.skipPenaltyFull}
              hint={t.skipPenaltyHint}
              enabledLabel={t.enabled}
              disabledLabel={t.disabled}
              ariaLabel={t.skipPenaltyFull}
              titleClassName={sectionLabel}
            />

            <div className="space-y-3">
              <p className={sectionLabel}>{t.wordCategories}</p>
              <CategoryChipGrid
                categories={DEFAULT_LOBBY_CATEGORIES}
                selected={local.general.categories ?? []}
                getLabel={(cat) => getCategoryLabel(t, cat)}
                onChange={(next) => setGeneral('categories', next)}
              />
            </div>

            {(local.general.categories ?? []).includes(Category.CUSTOM) && (
              <div className="space-y-3">
                <p className={sectionLabel}>{t.customWords}</p>
                <textarea
                  value={local.general.customWords || ''}
                  onChange={(e) => setGeneral('customWords', e.target.value)}
                  placeholder={t.customWordsPlaceholder}
                  className={`w-full h-24 p-4 rounded-xl border resize-none bg-ui-surface text-ui-fg border-ui-border focus:border-ui-accent outline-none ${typographyClass.bodyInput}`}
                />
              </div>
            )}
          </>
        )}
      </div>
    </ScreenShell>
  );
};
