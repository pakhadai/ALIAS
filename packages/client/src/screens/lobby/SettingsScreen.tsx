import React, { useState, useEffect } from 'react';
import { X, Check, FileText } from 'lucide-react';
import { Button } from '../../components/Button';
import { CustomDeckModal } from '../../components/CustomDeck/CustomDeckModal';
import { GameState, Language, Category, GameMode } from '../../types';
import type { GameSettings } from '../../types';
import { useGame } from '../../context/GameContext';
import { useAuthContext } from '../../context/AuthContext';
import { fetchStore } from '../../services/api';
import type { WordPackItem } from '../../services/api';
import { TRANSLATIONS } from '../../constants';
import { useT } from '../../hooks/useT';

export const SettingsScreen = () => {
  const { settings, currentTheme, setGameState, isHost, sendAction, gameState } = useGame();
  const { isAuthenticated } = useAuthContext();
  const t = useT();
  const [showCustomDeckPicker, setShowCustomDeckPicker] = useState(false);
  const [ownedPacks, setOwnedPacks] = useState<WordPackItem[]>([]);

  // Local state for sliders to prevent flooding
  const [localRoundTime, setLocalRoundTime] = useState(
    'classicRoundTime' in settings.mode ? settings.mode.classicRoundTime : 60
  );
  const [localScoreToWin, setLocalScoreToWin] = useState(settings.general.scoreToWin);
  const [localTeamCount, setLocalTeamCount] = useState(settings.general.teamCount);

  // Sync local state with server changes
  useEffect(() => {
    if ('classicRoundTime' in settings.mode) setLocalRoundTime(settings.mode.classicRoundTime);
  }, [settings.mode]);

  useEffect(() => {
    setLocalScoreToWin(settings.general.scoreToWin);
  }, [settings.general.scoreToWin]);

  useEffect(() => {
    setLocalTeamCount(settings.general.teamCount);
  }, [settings.general.teamCount]);

  useEffect(() => {
    fetchStore()
      .then((data) => setOwnedPacks(data.wordPacks.filter((p) => p.owned)))
      .catch(() => {});
  }, []);

  const updateGeneral = <K extends keyof GameSettings['general']>(
    key: K,
    value: GameSettings['general'][K]
  ) => {
    if (!isHost) return;
    if (
      gameState !== GameState.LOBBY &&
      gameState !== GameState.MENU &&
      gameState !== GameState.SETTINGS
    )
      return;
    sendAction({ action: 'UPDATE_SETTINGS', data: { general: { [key]: value } } });
  };

  const updateMode = (patch: Partial<GameSettings['mode']>) => {
    if (!isHost) return;
    if (
      gameState !== GameState.LOBBY &&
      gameState !== GameState.MENU &&
      gameState !== GameState.SETTINGS
    )
      return;
    sendAction({ action: 'UPDATE_SETTINGS', data: { mode: patch as any } });
  };

  const clearCustomDeck = () => {
    if (!isHost) return;
    sendAction({
      action: 'UPDATE_SETTINGS',
      data: { general: { customDeckCode: undefined, customDeckName: undefined } },
    });
  };

  const applyCustomDeck = (code: string, name: string) => {
    if (!isHost) return;
    sendAction({
      action: 'UPDATE_SETTINGS',
      data: { general: { customDeckCode: code, customDeckName: name } },
    });
  };

  const togglePack = (packId: string) => {
    if (!isHost) return;
    const current = settings.general.selectedPackIds ?? [];
    const next = current.includes(packId)
      ? current.filter((id) => id !== packId)
      : [...current, packId];
    updateGeneral('selectedPackIds', next);
  };

  const categoriesList = [
    Category.GENERAL,
    Category.FOOD,
    Category.TRAVEL,
    Category.SCIENCE,
    Category.MOVIES,
    Category.CUSTOM,
  ];
  const packLanguage = (settings.general.targetLanguage ?? settings.general.language) as Language;
  const filteredOwnedPacks = ownedPacks.filter((p) => String(p.language) === packLanguage);

  return (
    <div
      className={`flex flex-col min-h-screen items-center ${currentTheme.bg} p-6 md:p-8 overflow-y-auto no-scrollbar`}
    >
      <div className="max-w-2xl w-full">
        <header className="flex justify-between items-center py-6 mb-8">
          <button
            onClick={() => setGameState(GameState.LOBBY)}
            className="p-2 opacity-30 hover:opacity-100 transition-opacity"
          >
            <X size={20} className={currentTheme.iconColor} />
          </button>
          <h2
            className={`text-[10px] font-sans uppercase tracking-[0.4em] font-bold ${currentTheme.textSecondary}`}
          >
            {t.settings}
          </h2>
          <div className="w-10"></div>
        </header>

        <div className="w-full space-y-6 pb-32">
          {/* BLOCK 1: Game Mode */}
          <div className="p-6 rounded-3xl border border-(--ui-border) bg-(--ui-surface) space-y-5">
            <div className="space-y-2">
              <h3
                className={`text-xs font-bold tracking-[0.35em] uppercase ${currentTheme.textMain}`}
              >
                {t.gameMode ?? 'Режим гри'}
              </h3>
              <div className="h-px w-full bg-(--ui-border)" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  [GameMode.CLASSIC, t.gameModeClassic ?? 'Classic'],
                  [GameMode.TRANSLATION, t.gameModeTranslation ?? 'Translation'],
                  [GameMode.SYNONYMS, t.gameModeSynonyms ?? 'Synonyms'],
                  [GameMode.QUIZ, t.gameModeQuiz ?? 'Quiz'],
                  [GameMode.HARDCORE, t.gameModeHardcore ?? 'Hardcore'],
                  [GameMode.IMPOSTER, t.gameModeImposter ?? 'Imposter'],
                ] as const
              ).map(([mode, label]) => {
                const active = (settings.mode.gameMode ?? GameMode.CLASSIC) === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => updateMode({ gameMode: mode })}
                    className={`py-3 px-2 rounded-xl border text-center text-[10px] font-bold uppercase tracking-wide transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform leading-tight ${
                      active
                        ? 'bg-(--ui-accent) text-(--ui-accent-contrast) border-(--ui-accent)'
                        : 'bg-(--ui-surface) border-(--ui-border) text-(--ui-fg-muted) hover:text-(--ui-fg) hover:bg-(--ui-surface-hover)'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {(() => {
              const m = settings.mode.gameMode ?? GameMode.CLASSIC;
              const hint =
                m === GameMode.TRANSLATION
                  ? (t.gameModeHintTranslation ??
                    'У колоді використовуйте формат «Слово|Переклад» (кастомні слова або свій словник).')
                  : m === GameMode.QUIZ
                    ? (t.gameModeHintQuiz ??
                      'Усі обирають варіант на екрані; перша правильна відповідь дає бал команді.')
                    : m === GameMode.SYNONYMS
                      ? (t.gameModeHintSynonyms ??
                        "Поки що як класика — окрема колода синонімів з'явиться пізніше.")
                      : m === GameMode.HARDCORE
                        ? (t.gameModeHintHardcore as string | undefined)
                        : m === GameMode.IMPOSTER
                          ? (t.gameModeHintImposter as string | undefined)
                          : (t.gameModeHintClassic as string | undefined);
              if (!hint) return null;
              return (
                <p
                  className={`text-[10px] leading-relaxed opacity-50 ${currentTheme.textSecondary}`}
                >
                  {hint}
                </p>
              );
            })()}
          </div>

          {/* BLOCK 2: Content */}
          <div className="p-6 rounded-3xl border border-(--ui-border) bg-(--ui-surface) space-y-6">
            <div className="space-y-2">
              <h3
                className={`text-xs font-bold tracking-[0.35em] uppercase ${currentTheme.textMain}`}
              >
                {t.content ?? 'Словник'}
              </h3>
              <div className="h-px w-full bg-(--ui-border)" />
            </div>

            {(settings.mode.gameMode ?? GameMode.CLASSIC) === GameMode.TRANSLATION && (
              <div className="space-y-2">
                <p
                  className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}
                >
                  {t.targetAnswerLanguage ?? 'Мова відповіді (підказка)'}
                </p>
                <div className="flex gap-2">
                  {[Language.UA, Language.DE, Language.EN].map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => updateGeneral('targetLanguage', l)}
                      className={`flex-1 py-2.5 rounded-xl border text-[10px] font-bold transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform ${
                        (settings.general.targetLanguage ?? Language.EN) === l
                          ? `border-(--ui-accent) bg-[color-mix(in_srgb,var(--ui-accent)_14%,transparent)] text-(--ui-accent)`
                          : 'bg-(--ui-surface) border-(--ui-border) text-(--ui-fg-muted)'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p
                className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}
              >
                {t.categories}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {categoriesList.map((cat) => {
                  const catKey = `cat_${cat.toLowerCase()}` as keyof typeof t;
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        const newCats = settings.general.categories.includes(cat)
                          ? settings.general.categories.filter((c) => c !== cat)
                          : [...settings.general.categories, cat];
                        if (newCats.length > 0) updateGeneral('categories', newCats);
                      }}
                      className={`p-3 rounded-xl border text-[10px] uppercase tracking-widest font-bold transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform ${
                        settings.general.categories.includes(cat)
                          ? 'border-(--ui-accent) bg-(--ui-accent) text-(--ui-accent-contrast)'
                          : 'border-(--ui-border) bg-(--ui-surface) text-(--ui-fg-muted) hover:text-(--ui-fg) hover:bg-(--ui-surface-hover)'
                      }`}
                    >
                      {t[catKey] || cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {settings.general.categories.includes(Category.CUSTOM) && (
              <div className="space-y-3">
                <p
                  className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}
                >
                  {t.customWords}
                </p>
                <textarea
                  value={settings.general.customWords || ''}
                  onChange={(e) => updateGeneral('customWords', e.target.value)}
                  placeholder={t.customWordsPlaceholder || 'Enter words separated by commas...'}
                  className="w-full h-24 p-4 rounded-xl border resize-none bg-(--ui-surface) text-(--ui-fg) border-(--ui-border) focus:border-(--ui-accent) outline-none"
                />
              </div>
            )}

            {ownedPacks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p
                    className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}
                  >
                    {isAuthenticated ? 'Мої набори слів' : 'Доступні набори'}
                  </p>
                  {(settings.general.selectedPackIds?.length ?? 0) > 0 && (
                    <button
                      onClick={() => isHost && updateGeneral('selectedPackIds', [])}
                      className={`text-[9px] uppercase tracking-widest font-bold transition-opacity text-(--ui-fg-muted) hover:text-(--ui-fg) ${!isHost ? 'pointer-events-none' : ''}`}
                    >
                      Скинути
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <p
                    className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}
                  >
                    {t.packLanguage ?? 'Pack language'}
                  </p>
                  <div className="flex gap-2">
                    {[Language.UA, Language.DE, Language.EN].map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => updateGeneral('targetLanguage', l)}
                        className={`flex-1 py-2.5 rounded-xl border text-[10px] font-bold transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform ${
                          packLanguage === l
                            ? `border-(--ui-accent) bg-[color-mix(in_srgb,var(--ui-accent)_14%,transparent)] text-(--ui-accent)`
                            : 'bg-(--ui-surface) border-(--ui-border) text-(--ui-fg-muted)'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-(--ui-fg-muted) opacity-70 leading-relaxed">
                    {t.packLanguageHint ??
                      'Вибір мови впливає лише на паки/слова, а не на мову інтерфейсу.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filteredOwnedPacks.map((pack) => {
                    const isSelected = (settings.general.selectedPackIds ?? []).includes(pack.id);
                    return (
                      <button
                        key={pack.id}
                        onClick={() => togglePack(pack.id)}
                        disabled={!isHost}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-bold transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform disabled:pointer-events-none ${
                          isSelected
                            ? 'border-(--ui-accent) bg-[color-mix(in_srgb,var(--ui-accent)_14%,transparent)] text-(--ui-accent)'
                            : 'border-(--ui-border) bg-(--ui-surface) text-(--ui-fg-muted) hover:text-(--ui-fg) hover:bg-(--ui-surface-hover)'
                        }`}
                      >
                        {isSelected && <Check size={10} />}
                        <span>{pack.name}</span>
                        <span
                          className={`font-normal ${isSelected ? 'text-(--ui-fg-muted)' : 'opacity-40'}`}
                        >
                          {pack.wordCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {filteredOwnedPacks.length === 0 ? (
                  <p className="text-[10px] text-(--ui-fg-muted) opacity-70">
                    {t.noPacksForLanguage ?? 'Немає паків для цієї мови.'}
                  </p>
                ) : (settings.general.selectedPackIds?.length ?? 0) === 0 ? (
                  <p className="text-[10px] text-(--ui-fg-muted) opacity-70">
                    Не вибрано — використовуються стандартні слова
                  </p>
                ) : null}
              </div>
            )}

            <div className="space-y-3">
              <p
                className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}
              >
                {t.customDeckLobbyLabel ?? 'Власний словник'}
              </p>
              {settings.general.customDeckCode ? (
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-(--ui-border) bg-(--ui-surface)">
                  <div className="flex items-start gap-2 min-w-0">
                    <FileText size={14} className="text-(--ui-accent) shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-(--ui-fg) leading-tight truncate">
                        {settings.general.customDeckName || settings.general.customDeckCode}
                      </p>
                      <p className="text-[10px] text-(--ui-fg-muted) font-mono mt-0.5">
                        {settings.general.customDeckCode}
                      </p>
                    </div>
                  </div>
                  {isHost && (
                    <button
                      type="button"
                      onClick={clearCustomDeck}
                      className="text-(--ui-fg-muted) hover:text-(--ui-fg) transition-colors p-1 shrink-0"
                      aria-label={t.close}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => isHost && setShowCustomDeckPicker(true)}
                  disabled={!isHost}
                  className="w-full p-3 rounded-xl border border-dashed border-(--ui-border) text-(--ui-fg-muted) hover:text-(--ui-fg) hover:border-[color-mix(in_srgb,var(--ui-accent)_35%,var(--ui-border))] transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform flex items-center gap-2 disabled:opacity-30"
                >
                  <FileText size={14} />
                  <span className="text-xs">Вибрати зі своїх словників…</span>
                </button>
              )}
            </div>
          </div>

          {/* BLOCK 3: Rules (dynamic) */}
          <div className="p-6 rounded-3xl border border-(--ui-border) bg-(--ui-surface) space-y-6">
            <div className="space-y-2">
              <h3
                className={`text-xs font-bold tracking-[0.35em] uppercase ${currentTheme.textMain}`}
              >
                {t.rules ?? 'Правила'}
              </h3>
              <div className="h-px w-full bg-(--ui-border)" />
            </div>

            {(() => {
              const mode = settings.mode;
              if (mode.gameMode === GameMode.IMPOSTER) {
                return (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p
                        className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}
                      >
                        {t.imposterDiscussionTime ?? 'Час обговорення'}
                      </p>
                      <span className={`text-xs font-bold ${currentTheme.textAccent}`}>
                        {Math.round(mode.imposterDiscussionTime / 60)} хв
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {([3, 5, 10] as const).map((min) => {
                        const active = mode.imposterDiscussionTime === min * 60;
                        return (
                          <button
                            key={min}
                            type="button"
                            onClick={() => updateMode({ imposterDiscussionTime: min * 60 })}
                            className={`py-3 rounded-xl border text-center text-[10px] font-bold uppercase tracking-wide transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform ${
                              active
                                ? 'bg-(--ui-accent) text-(--ui-accent-contrast) border-(--ui-accent)'
                                : 'bg-(--ui-surface) border-(--ui-border) text-(--ui-fg-muted) hover:text-(--ui-fg) hover:bg-(--ui-surface-hover)'
                            }`}
                          >
                            {min} {t.min ?? 'хв'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <p
                      className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}
                    >
                      {t.roundTime}
                    </p>
                    <span className={`text-xs font-bold ${currentTheme.textAccent}`}>
                      {'classicRoundTime' in mode ? mode.classicRoundTime : 0}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="180"
                    step="10"
                    value={localRoundTime}
                    onChange={(e) => setLocalRoundTime(parseInt(e.target.value))}
                    onMouseUp={() => updateMode({ classicRoundTime: localRoundTime })}
                    onTouchEnd={() => updateMode({ classicRoundTime: localRoundTime })}
                    className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-(--ui-accent) bg-(--ui-border)"
                  />
                </div>
              );
            })()}

            {(settings.mode.gameMode ?? GameMode.CLASSIC) !== GameMode.IMPOSTER && (
              <>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <p
                      className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}
                    >
                      {t.scoreToWin}
                    </p>
                    <span className={`text-xs font-bold ${currentTheme.textAccent}`}>
                      {settings.general.scoreToWin}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={localScoreToWin}
                    onChange={(e) => setLocalScoreToWin(parseInt(e.target.value))}
                    onMouseUp={() => updateGeneral('scoreToWin', localScoreToWin)}
                    onTouchEnd={() => updateGeneral('scoreToWin', localScoreToWin)}
                    className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-(--ui-accent) bg-(--ui-border)"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <p
                      className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}
                    >
                      {t.teamCount}
                    </p>
                    <span className={`text-xs font-bold ${currentTheme.textAccent}`}>
                      {settings.general.teamCount}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    step="1"
                    value={localTeamCount}
                    onChange={(e) => setLocalTeamCount(parseInt(e.target.value))}
                    onMouseUp={() => updateGeneral('teamCount', localTeamCount)}
                    onTouchEnd={() => updateGeneral('teamCount', localTeamCount)}
                    className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-(--ui-accent) bg-(--ui-border)"
                  />
                </div>

                <div className="space-y-4">
                  <p
                    className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}
                  >
                    {t.skipPenalty}
                  </p>
                  <button
                    onClick={() => updateGeneral('skipPenalty', !settings.general.skipPenalty)}
                    className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                      settings.general.skipPenalty
                        ? 'border-(--ui-accent) bg-[color-mix(in_srgb,var(--ui-accent)_14%,transparent)]'
                        : 'border-(--ui-border) bg-(--ui-surface) opacity-50'
                    }`}
                  >
                    <span className={currentTheme.textMain}>
                      {settings.general.skipPenalty ? t.enabled : t.disabled}
                    </span>
                    <div
                      className={`w-12 h-6 rounded-full transition-all relative ${settings.general.skipPenalty ? 'bg-(--ui-accent)' : 'bg-(--ui-border)'}`}
                    >
                      <div
                        className={`absolute w-5 h-5 bg-(--ui-fg) rounded-full top-0.5 transition-all ${
                          settings.general.skipPenalty ? 'right-0.5' : 'left-0.5'
                        }`}
                      />
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 md:p-8 bg-linear-to-t from-[color-mix(in_srgb,var(--ui-bg)_85%,transparent)] to-transparent pointer-events-none flex justify-center">
        <div className="max-w-2xl w-full pointer-events-auto">
          <Button
            themeClass={currentTheme.button}
            fullWidth
            size="xl"
            onClick={() => setGameState(GameState.LOBBY)}
          >
            {t.save}
          </Button>
        </div>
      </div>

      {showCustomDeckPicker && (
        <CustomDeckModal
          onClose={() => setShowCustomDeckPicker(false)}
          onSelectDeck={(code, name) => {
            applyCustomDeck(code, name);
            setShowCustomDeckPicker(false);
          }}
        />
      )}
    </div>
  );
};
