import React, { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import {
  AppHeader,
  FixedBottomBar,
  ScreenShell,
  UI_APP_HEADER_SLOT_CLASS,
} from '../../components/layout';
import { GameState, Language, Category, GameMode } from '../../types';
import { useGame } from '../../context/GameContext';
import { fetchLobbySettings, saveLobbySettings } from '../../services/api';
import { useResourceLoad } from '../../hooks/useResourceLoad';
import type { GameSettings } from '../../types';
import { ScreenTitle } from '../../components/typography/ScreenTitle';
import { typographyClass, labelSectionClass } from '../../constants/typography';

export const LobbySettingsScreen = () => {
  const { setGameState, currentTheme, settings: gameSettings, roomCode } = useGame();
  const isDark = currentTheme.isDark;

  const [local, setLocal] = useState({ ...gameSettings });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { data: remoteSettings, loading } = useResourceLoad(() => fetchLobbySettings(), {
    initialData: null as Partial<GameSettings> | null,
  });

  useEffect(() => {
    if (!remoteSettings) return;
    setLocal((prev) => ({ ...prev, ...(remoteSettings as Partial<typeof gameSettings>) }));
  }, [remoteSettings]);

  const setGeneral = <K extends keyof typeof gameSettings.general>(
    key: K,
    value: (typeof gameSettings.general)[K]
  ) => setLocal((prev) => ({ ...prev, general: { ...prev.general, [key]: value } }));

  const setMode = (patch: Partial<typeof gameSettings.mode>) =>
    setLocal((prev) => ({ ...prev, mode: { ...prev.mode, ...patch } as typeof prev.mode }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const {
        theme: _theme,
        soundEnabled: _soundEnabled,
        soundPreset: _soundPreset,
        ...syncedGeneral
      } = local.general ?? {};
      const syncedOnly: Record<string, unknown> = {
        ...(local as unknown as Record<string, unknown>),
        general: syncedGeneral as unknown as Record<string, unknown>,
      };
      await saveLobbySettings(syncedOnly);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (_err) {
      void _err;
    }
    setSaving(false);
  };

  const handleReset = async () => {
    await saveLobbySettings({}).catch(() => {});
    setLocal({ ...gameSettings });
  };

  const goBack = () => {
    setGameState(roomCode ? GameState.LOBBY : GameState.MENU);
  };

  const cats = [
    Category.GENERAL,
    Category.FOOD,
    Category.TRAVEL,
    Category.SCIENCE,
    Category.MOVIES,
    Category.CUSTOM,
  ];

  const sectionLabel = `${labelSectionClass} ${currentTheme.textMain}`;
  const chip = (active: boolean) =>
    `flex-1 py-3 rounded-xl border font-sans ${typographyClass.label} normal-case transition-all ${
      active
        ? 'bg-ui-accent text-ui-accent-contrast border-ui-accent'
        : 'bg-ui-surface border-ui-border text-ui-fg-muted hover:text-ui-fg hover:bg-ui-surface-hover'
    }`;

  return (
    <ScreenShell
      className="bg-ui-bg"
      contentClassName="max-w-2xl w-full mx-auto px-6 md:px-8 py-4 space-y-8"
      header={
        <AppHeader
          title={<ScreenTitle themeClass={currentTheme.textMain}>Налаштування лоббі</ScreenTitle>}
          onBack={goBack}
          right={
            <button
              type="button"
              onClick={handleReset}
              className={`${UI_APP_HEADER_SLOT_CLASS} min-h-11 px-2 ${typographyClass.label} tracking-widest transition-opacity text-ui-fg-muted hover:text-ui-fg active:scale-95`}
            >
              Скинути
            </button>
          }
        />
      }
      footer={
        <FixedBottomBar contentClassName="max-w-2xl mx-auto w-full px-6 md:px-8">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className={`w-full h-14 ${currentTheme.button} rounded-full flex items-center justify-center gap-2 ${typographyClass.label} font-sans tracking-[0.3em] transition-all active:scale-[0.98] disabled:opacity-50`}
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : saved ? (
              <>
                <Check size={14} /> Збережено
              </>
            ) : (
              'Зберегти як стандартні'
            )}
          </button>
        </FixedBottomBar>
      }
    >
      {loading ? (
        <div className="flex justify-center pt-16">
          <Loader2 size={24} className={`animate-spin ${currentTheme.iconColor} opacity-40`} />
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <p className={sectionLabel}>Мова слів</p>
            <div className="flex gap-2">
              {[Language.UA, Language.DE, Language.EN].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setGeneral('language', l)}
                  className={chip(local.general.language === l)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {local.mode.gameMode === GameMode.IMPOSTER ? (
              <>
                <div className="flex justify-between items-center">
                  <p className={sectionLabel}>Час обговорення</p>
                  <span className={`${typographyClass.body} text-ui-accent font-bold tabular-nums`}>
                    {'imposterDiscussionTime' in local.mode
                      ? Math.round(local.mode.imposterDiscussionTime / 60)
                      : 3}{' '}
                    хв
                  </span>
                </div>
                <input
                  type="range"
                  min="180"
                  max="600"
                  step="60"
                  value={
                    'imposterDiscussionTime' in local.mode ? local.mode.imposterDiscussionTime : 180
                  }
                  onChange={(e) =>
                    setMode({ imposterDiscussionTime: parseInt(e.target.value) } as Partial<
                      typeof gameSettings.mode
                    >)
                  }
                  className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-ui-accent bg-ui-border"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  }}
                />
                <div
                  className={`flex justify-between ${typographyClass.label} opacity-30 ${currentTheme.textMain}`}
                >
                  <span>3 хв</span>
                  <span>10 хв</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <p className={sectionLabel}>Час раунду</p>
                  <span className={`${typographyClass.body} text-ui-accent font-bold tabular-nums`}>
                    {'classicRoundTime' in local.mode ? local.mode.classicRoundTime : 60}с
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="180"
                  step="10"
                  value={'classicRoundTime' in local.mode ? local.mode.classicRoundTime : 60}
                  onChange={(e) =>
                    setMode({ classicRoundTime: parseInt(e.target.value) } as Partial<
                      typeof gameSettings.mode
                    >)
                  }
                  className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-ui-accent bg-ui-border"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  }}
                />
                <div
                  className={`flex justify-between ${typographyClass.label} opacity-30 ${currentTheme.textMain}`}
                >
                  <span>30с</span>
                  <span>180с</span>
                </div>
              </>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className={sectionLabel}>Рахунок для перемоги</p>
              <span className={`${typographyClass.body} text-ui-accent font-bold tabular-nums`}>
                {local.general.scoreToWin}
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={local.general.scoreToWin}
              onChange={(e) => setGeneral('scoreToWin', parseInt(e.target.value))}
              className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-ui-accent bg-ui-border"
              style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className={sectionLabel}>Штраф за пропуск</p>
              <p
                className={`${typographyClass.label} mt-0.5 text-ui-fg-muted opacity-70 normal-case`}
              >
                −1 очко за пропущене слово
              </p>
            </div>
            <button
              type="button"
              onClick={() => setGeneral('skipPenalty', !local.general.skipPenalty)}
              className={`w-12 h-7 rounded-full transition-all relative ${local.general.skipPenalty ? 'bg-ui-accent' : 'bg-ui-border'}`}
            >
              <span
                className={`absolute top-0.5 w-6 h-6 bg-ui-fg rounded-full shadow transition-all ${local.general.skipPenalty ? 'right-0.5' : 'left-0.5'}`}
              />
            </button>
          </div>

          <div className="space-y-3">
            <p className={sectionLabel}>Категорії слів</p>
            <div className="grid grid-cols-2 gap-2">
              {cats.map((cat) => {
                const active = (local.general.categories ?? []).includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      const curr = local.general.categories ?? [];
                      const next = active ? curr.filter((c) => c !== cat) : [...curr, cat];
                      if (next.length > 0) setGeneral('categories', next);
                    }}
                    className={`py-3 rounded-xl border font-sans ${typographyClass.label} tracking-widest transition-all ${
                      active
                        ? 'border-ui-accent bg-[color-mix(in_srgb,var(--ui-accent)_14%,transparent)] text-ui-accent'
                        : 'border-ui-border bg-ui-surface text-ui-fg-muted'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {(local.general.categories ?? []).includes(Category.CUSTOM) && (
            <div className="space-y-3">
              <p className={sectionLabel}>Свої слова</p>
              <textarea
                value={local.general.customWords || ''}
                onChange={(e) => setGeneral('customWords', e.target.value)}
                placeholder="Слова через кому…"
                className={`w-full h-24 p-4 rounded-xl border resize-none bg-ui-surface text-ui-fg border-ui-border focus:border-ui-accent outline-none ${typographyClass.bodyInput}`}
              />
            </div>
          )}
        </>
      )}
    </ScreenShell>
  );
};
