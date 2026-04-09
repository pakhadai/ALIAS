import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { GameState, Language, Category, GameMode } from '../../types';
import { useGame } from '../../context/GameContext';
import { fetchLobbySettings, saveLobbySettings } from '../../services/api';

export const LobbySettingsScreen = () => {
  const { setGameState, currentTheme, settings: gameSettings } = useGame();
  const isDark = currentTheme.isDark;

  const [local, setLocal] = useState({ ...gameSettings });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLobbySettings()
      .then((s) => {
        if (s) setLocal((prev) => ({ ...prev, ...(s as Partial<typeof gameSettings>) }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

  const cats = [
    Category.GENERAL,
    Category.FOOD,
    Category.TRAVEL,
    Category.SCIENCE,
    Category.MOVIES,
    Category.CUSTOM,
  ];

  const sectionLabel = `text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`;
  const chip = (active: boolean) =>
    `flex-1 py-3 rounded-xl border font-sans font-bold text-[11px] transition-all ${
      active
        ? 'bg-(--ui-accent) text-(--ui-accent-contrast) border-(--ui-accent)'
        : 'bg-(--ui-surface) border-(--ui-border) text-(--ui-fg-muted) hover:text-(--ui-fg) hover:bg-(--ui-surface-hover)'
    }`;

  return (
    <div className="flex flex-col min-h-screen items-center bg-(--ui-bg)">
      <div className="max-w-2xl w-full flex-1 flex flex-col">
        <header
          className="flex items-center justify-between px-6 md:px-8 pb-4"
          style={{ paddingTop: 'max(24px, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setGameState(GameState.PROFILE)}
              className={`p-2 transition-all active:scale-90 ${currentTheme.iconColor} opacity-50 hover:opacity-100`}
            >
              <ArrowLeft size={22} />
            </button>
            <h2 className={`font-serif text-2xl tracking-wide ${currentTheme.textMain}`}>
              Налаштування лоббі
            </h2>
          </div>
          <button
            onClick={handleReset}
            className="text-[9px] uppercase tracking-widest font-bold transition-opacity text-(--ui-fg-muted) hover:text-(--ui-fg)"
          >
            Скинути
          </button>
        </header>

        {loading ? (
          <div className="flex-1 flex justify-center pt-16">
            <Loader2 size={24} className={`animate-spin ${currentTheme.iconColor} opacity-40`} />
          </div>
        ) : (
          <div
            className="flex-1 overflow-y-auto px-6 md:px-8 py-4 space-y-8 pb-28"
            style={{ scrollbarWidth: 'none' }}
          >
            <div className="space-y-3">
              <p className={sectionLabel}>Мова слів</p>
              <div className="flex gap-2">
                {[Language.UA, Language.DE, Language.EN].map((l) => (
                  <button
                    key={l}
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
                    <span className="text-(--ui-accent) font-bold text-sm">
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
                    value={'imposterDiscussionTime' in local.mode ? local.mode.imposterDiscussionTime : 180}
                    onChange={(e) =>
                      setMode({ imposterDiscussionTime: parseInt(e.target.value) } as Partial<
                        typeof gameSettings.mode
                      >)
                    }
                    className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-(--ui-accent) bg-(--ui-border)"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    }}
                  />
                  <div
                    className={`flex justify-between text-[9px] opacity-30 ${currentTheme.textMain}`}
                  >
                    <span>3 хв</span>
                    <span>10 хв</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <p className={sectionLabel}>Час раунду</p>
                    <span className="text-(--ui-accent) font-bold text-sm">
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
                    className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-(--ui-accent) bg-(--ui-border)"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    }}
                  />
                  <div
                    className={`flex justify-between text-[9px] opacity-30 ${currentTheme.textMain}`}
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
                <span className="text-(--ui-accent) font-bold text-sm">
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
                className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-(--ui-accent) bg-(--ui-border)"
                style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className={sectionLabel}>Штраф за пропуск</p>
                <p className="text-[11px] mt-0.5 text-(--ui-fg-muted) opacity-70">
                  −1 очко за пропущене слово
                </p>
              </div>
              <button
                onClick={() => setGeneral('skipPenalty', !local.general.skipPenalty)}
                className={`w-12 h-7 rounded-full transition-all relative ${local.general.skipPenalty ? 'bg-(--ui-accent)' : 'bg-(--ui-border)'}`}
              >
                <span
                  className={`absolute top-0.5 w-6 h-6 bg-(--ui-fg) rounded-full shadow transition-all ${local.general.skipPenalty ? 'right-0.5' : 'left-0.5'}`}
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
                      onClick={() => {
                        const curr = local.general.categories ?? [];
                        const next = active ? curr.filter((c) => c !== cat) : [...curr, cat];
                        if (next.length > 0) setGeneral('categories', next);
                      }}
                      className={`py-3 rounded-xl border font-sans font-bold text-[10px] uppercase tracking-widest transition-all ${
                        active
                          ? 'border-(--ui-accent) bg-[color-mix(in_srgb,var(--ui-accent)_14%,transparent)] text-(--ui-accent)'
                          : 'border-(--ui-border) bg-(--ui-surface) text-(--ui-fg-muted)'
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
                  className="w-full h-24 p-4 rounded-xl border resize-none bg-(--ui-surface) text-(--ui-fg) border-(--ui-border) focus:border-(--ui-accent) outline-none"
                />
              </div>
            )}
          </div>
        )}

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
              'Зберегти як стандартні'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
