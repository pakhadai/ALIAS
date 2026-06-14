import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  X,
  Check,
  FileText,
  ChevronDown,
  Brain,
  Languages,
  Sparkles,
  GraduationCap,
  Flame,
  UserSearch,
} from 'lucide-react';
import { footerIslandClassName } from '../../constants/footerLayout';
import { SURFACE_PANEL_CLASS } from '../../constants/surfaceClasses';
import {
  typographyClass,
  labelSectionClass,
  labelSectionTitleClass,
} from '../../constants/typography';
import { Button } from '../../components/Button';
import { ScreenTitle } from '../../components/typography/ScreenTitle';
import { AppHeader, FixedBottomBar, ScreenShell } from '../../components/layout';
import { CustomDeckModal } from '../../components/CustomDeck/CustomDeckModal';
import { GameState, Category, GameMode } from '../../types';
import type { GameSettings } from '../../types';
import {
  CategoryChipGrid,
  DEFAULT_LOBBY_CATEGORIES,
  getCategoryLabel,
  LanguageChipRow,
  LOBBY_LANG_FLAG,
  pickDefaultTargetLanguage,
  targetLanguagesForSource,
  SettingsToggle,
} from '../../components/Settings';
import { useGame } from '../../context/GameContext';
import { useAuthContext } from '../../context/AuthContext';
import { fetchStore } from '../../services/api';
import type { WordPackItem } from '../../services/api';
import { useResourceLoad } from '../../hooks/useResourceLoad';
import { useT } from '../../hooks/useT';
import { HAPTIC, vibrate } from '../../utils/haptics';
import { HEADER_ROW_MIN_PX } from '../../constants/tmaLayoutConstants';

const SETTINGS_TABS = [
  ['mode', 'gameMode'] as const,
  ['content', 'content'] as const,
  ['rules', 'rulesTitle'] as const,
] as const;

function SectionHeader({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between py-3"
      aria-expanded={open}
    >
      <p className={`${typographyClass.label} tracking-widest opacity-50 text-ui-fg`}>{title}</p>
      <ChevronDown
        size={16}
        className={`text-ui-fg-muted transition-transform ${open ? 'rotate-180' : ''}`}
      />
    </button>
  );
}

export const SettingsScreen = () => {
  const { settings, currentTheme, setGameState, isHost, sendAction, gameState } = useGame();
  const { isAuthenticated } = useAuthContext();
  const t = useT();
  const [showCustomDeckPicker, setShowCustomDeckPicker] = useState(false);
  const { data: ownedPacks } = useResourceLoad(
    async () => {
      const data = await fetchStore();
      return data.wordPacks.filter((p) => p.owned);
    },
    { initialData: [] as WordPackItem[] }
  );
  const [activeTab, setActiveTab] = useState<'mode' | 'content' | 'rules'>('mode');
  const [contentOpen, setContentOpen] = useState({
    categories: true,
    customWords: true,
    packs: false,
    customDeck: false,
  });
  const [rulesOpen, setRulesOpen] = useState({
    basics: true,
    extras: false,
    quizTypes: true,
    quizMore: false,
  });

  // Local state for sliders to prevent flooding
  const [localRoundTime, setLocalRoundTime] = useState(
    'classicRoundTime' in settings.mode ? settings.mode.classicRoundTime : 60
  );
  const [localQuizRoundTime, setLocalQuizRoundTime] = useState(
    settings.mode.gameMode === GameMode.QUIZ ? settings.mode.quizRoundTime : 60
  );
  const [localQuizQuestionTime, setLocalQuizQuestionTime] = useState(
    settings.mode.gameMode === GameMode.QUIZ ? settings.mode.quizQuestionTime : 10
  );
  const [localScoreToWin, setLocalScoreToWin] = useState(settings.general.scoreToWin);
  const lastHapticRoundTime = useRef(localRoundTime);
  const lastHapticScoreToWin = useRef(localScoreToWin);

  // Sync local state with server changes
  useEffect(() => {
    if ('classicRoundTime' in settings.mode) setLocalRoundTime(settings.mode.classicRoundTime);
  }, [settings.mode]);
  useEffect(() => {
    if (settings.mode.gameMode !== GameMode.QUIZ) return;
    setLocalQuizRoundTime(settings.mode.quizRoundTime);
    setLocalQuizQuestionTime(settings.mode.quizQuestionTime);
  }, [settings.mode]);

  useEffect(() => {
    setLocalScoreToWin(settings.general.scoreToWin);
  }, [settings.general.scoreToWin]);

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
    if (patch.gameMode === GameMode.TRANSLATION) {
      const src = settings.general.language;
      const cur = settings.general.targetLanguage;
      if (!cur || cur === src) {
        updateGeneral('targetLanguage', pickDefaultTargetLanguage(src));
      }
    }
    sendAction({
      action: 'UPDATE_SETTINGS',
      data: { mode: patch as unknown as GameSettings['mode'] },
    });
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

  const deckLanguage = settings.general.language;
  const translationTargetLanguages = useMemo(
    () => targetLanguagesForSource(deckLanguage),
    [deckLanguage]
  );
  const resolvedTargetLanguage = useMemo(() => {
    const current = settings.general.targetLanguage;
    if (current && current !== deckLanguage && translationTargetLanguages.includes(current)) {
      return current;
    }
    return pickDefaultTargetLanguage(deckLanguage);
  }, [settings.general.targetLanguage, deckLanguage, translationTargetLanguages]);
  const filteredOwnedPacks = ownedPacks.filter((p) => String(p.language) === deckLanguage);

  const modeIcon = useMemo(() => {
    const m = settings.mode.gameMode ?? GameMode.CLASSIC;
    const cls = 'opacity-70';
    switch (m) {
      case GameMode.CLASSIC:
        return <Sparkles size={16} className={cls} />;
      case GameMode.TRANSLATION:
        return <Languages size={16} className={cls} />;
      case GameMode.SYNONYMS:
        return <GraduationCap size={16} className={cls} />;
      case GameMode.QUIZ:
        return <Brain size={16} className={cls} />;
      case GameMode.HARDCORE:
        return <Flame size={16} className={cls} />;
      case GameMode.IMPOSTER:
        return <UserSearch size={16} className={cls} />;
      default:
        return <Sparkles size={16} className={cls} />;
    }
  }, [settings.mode.gameMode]);

  const goBackToLobby = () => setGameState(GameState.LOBBY);

  const settingsMenuItems = useMemo(
    () => [
      { id: '1', label: 'Пункт 1', onSelect: () => console.log('settings menu: item 1') },
      { id: '2', label: 'Пункт 2', onSelect: () => console.log('settings menu: item 2') },
      { id: '3', label: 'Пункт 3', onSelect: () => console.log('settings menu: item 3') },
    ],
    []
  );

  const settingsTabBar = (
    <div className="grid w-full grid-cols-3 gap-2">
      {SETTINGS_TABS.map(([id, labelKey]) => {
        const active = activeTab === id;
        const label =
          labelKey === 'gameMode'
            ? (t.gameMode ?? 'Режим')
            : labelKey === 'content'
              ? (t.content ?? 'Словник')
              : t.rulesTitle;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`py-2 rounded-xl border text-center ${typographyClass.label} tracking-widest transition-all duration-200 ease-out active:scale-95 ${
              active
                ? 'bg-ui-accent text-ui-accent-contrast border-ui-accent'
                : 'bg-ui-surface border-ui-border text-ui-fg-muted hover:text-ui-fg hover:bg-ui-surface-hover'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  return (
    <ScreenShell
      className="items-center bg-ui-bg"
      layout="canonical"
      contentClassName="items-center"
      headerFixed
      footerFixed
      header={
        <AppHeader
          fixed
          title={<ScreenTitle>{t.settings}</ScreenTitle>}
          onBack={goBackToLobby}
          backAriaLabel={t.backToLobby}
          backTestId="settings-close"
          menuItems={settingsMenuItems}
          childRowHeightPx={HEADER_ROW_MIN_PX}
        >
          {settingsTabBar}
        </AppHeader>
      }
      footer={
        <FixedBottomBar island contentClassName={footerIslandClassName('canonical')}>
          <Button
            themeClass={currentTheme.button}
            fullWidth
            size="xl"
            onClick={() => setGameState(GameState.LOBBY)}
          >
            {t.save}
          </Button>
        </FixedBottomBar>
      }
    >
      <div className="w-full space-y-6 pb-4 pt-3">
        {/* BLOCK 1: Game Mode */}
        {activeTab === 'mode' && (
          <div className={`${SURFACE_PANEL_CLASS} p-6 space-y-5`}>
            <div className="space-y-2">
              <h3 className={`${labelSectionTitleClass} text-ui-fg !opacity-100`}>
                {t.gameMode ?? 'Режим гри'}
              </h3>
              <div className="h-px w-full bg-ui-border" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  [GameMode.CLASSIC, t.gameModeClassic ?? 'Classic', <Sparkles size={16} />],
                  [
                    GameMode.TRANSLATION,
                    t.gameModeTranslation ?? 'Translation',
                    <Languages size={16} />,
                  ],
                  [
                    GameMode.SYNONYMS,
                    t.gameModeSynonyms ?? 'Synonyms',
                    <GraduationCap size={16} />,
                  ],
                  [GameMode.QUIZ, t.gameModeQuiz ?? 'Quiz', <Brain size={16} />],
                  [GameMode.HARDCORE, t.gameModeHardcore ?? 'Hardcore', <Flame size={16} />],
                  [GameMode.IMPOSTER, t.gameModeImposter ?? 'Imposter', <UserSearch size={16} />],
                ] as const
              ).map(([mode, label, icon]) => {
                const active = (settings.mode.gameMode ?? GameMode.CLASSIC) === mode;
                const hint =
                  mode === GameMode.TRANSLATION
                    ? t.gameModeHintTranslation
                    : mode === GameMode.QUIZ
                      ? t.gameModeHintQuiz
                      : mode === GameMode.SYNONYMS
                        ? t.gameModeHintSynonyms
                        : mode === GameMode.HARDCORE
                          ? t.gameModeHintHardcore
                          : mode === GameMode.IMPOSTER
                            ? t.gameModeHintImposter
                            : t.gameModeHintClassic;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => updateMode({ gameMode: mode })}
                    className={`py-3 px-2 rounded-xl border text-center ${typographyClass.label} tracking-wide transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform leading-tight ${
                      active
                        ? 'bg-ui-accent text-ui-accent-contrast border-ui-accent'
                        : 'bg-ui-surface border-ui-border text-ui-fg-muted hover:text-ui-fg hover:bg-ui-surface-hover'
                    }`}
                    aria-label={`${label}. ${hint}`}
                  >
                    <div className="space-y-1">
                      <div className="inline-flex items-center justify-center gap-2">
                        <span className={active ? 'opacity-95' : 'opacity-60'} aria-hidden>
                          {icon}
                        </span>
                        <span>{label}</span>
                      </div>
                      <div
                        className={`${typographyClass.label} font-normal normal-case leading-snug ${active ? 'opacity-90' : 'opacity-50'}`}
                      >
                        {hint}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* BLOCK 2: Content */}
        {activeTab === 'content' && (
          <div className="p-6 rounded-3xl border border-ui-border bg-ui-surface space-y-6">
            <div className="space-y-2">
              <h3 className={`${labelSectionTitleClass} text-ui-fg !opacity-100`}>
                {t.content ?? 'Словник'}
              </h3>
              <div className="h-px w-full bg-ui-border" />
            </div>

            <div className="flex items-center justify-between">
              <p className={`${labelSectionClass} text-ui-fg`}>{t.gameMode ?? 'Режим'}</p>
              <span
                className={`inline-flex items-center gap-2 ${typographyClass.label} tracking-widest text-ui-fg-muted`}
              >
                {modeIcon}
                {settings.mode.gameMode ?? GameMode.CLASSIC}
              </span>
            </div>

            {(settings.mode.gameMode ?? GameMode.CLASSIC) === GameMode.TRANSLATION && (
              <div className="space-y-3 rounded-2xl border border-[color-mix(in_srgb,var(--ui-accent)_28%,var(--ui-border))] bg-[color-mix(in_srgb,var(--ui-accent)_10%,var(--ui-surface))] p-4">
                <p className={`${typographyClass.label} tracking-widest opacity-60 text-ui-fg`}>
                  {t.targetAnswerLanguage ?? 'Мова відповіді (підказка)'}
                </p>
                <LanguageChipRow
                  value={resolvedTargetLanguage}
                  languages={translationTargetLanguages}
                  onChange={(l) => updateGeneral('targetLanguage', l)}
                  disabled={!isHost}
                />
                <p
                  className={`${typographyClass.label} leading-relaxed text-ui-fg-muted normal-case`}
                >
                  {t.translationLobbyFlowHint
                    .replace('{0}', LOBBY_LANG_FLAG[deckLanguage])
                    .replace('{1}', deckLanguage)
                    .replace('{2}', LOBBY_LANG_FLAG[resolvedTargetLanguage])
                    .replace('{3}', resolvedTargetLanguage)}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <SectionHeader
                title={t.categories}
                open={contentOpen.categories}
                onToggle={() => setContentOpen((s) => ({ ...s, categories: !s.categories }))}
              />
              {contentOpen.categories && (
                <CategoryChipGrid
                  categories={DEFAULT_LOBBY_CATEGORIES}
                  selected={settings.general.categories}
                  getLabel={(cat) => getCategoryLabel(t, cat)}
                  disabled={!isHost}
                  onChange={(next) => updateGeneral('categories', next)}
                />
              )}
            </div>

            {settings.general.categories.includes(Category.CUSTOM) && (
              <div className="space-y-3">
                <SectionHeader
                  title={t.customWords}
                  open={contentOpen.customWords}
                  onToggle={() => setContentOpen((s) => ({ ...s, customWords: !s.customWords }))}
                />
                {contentOpen.customWords && (
                  <textarea
                    value={settings.general.customWords || ''}
                    onChange={(e) => updateGeneral('customWords', e.target.value)}
                    placeholder={t.customWordsPlaceholder || 'Enter words separated by commas...'}
                    className={`w-full h-24 p-4 rounded-xl border resize-none bg-ui-surface text-ui-fg border-ui-border focus:border-ui-accent outline-none ${typographyClass.bodyInput}`}
                  />
                )}
              </div>
            )}

            {ownedPacks.length > 0 && (
              <div className="space-y-3">
                <SectionHeader
                  title={isAuthenticated ? 'Мої набори слів' : 'Доступні набори'}
                  open={contentOpen.packs}
                  onToggle={() => setContentOpen((s) => ({ ...s, packs: !s.packs }))}
                />
                {contentOpen.packs && (
                  <>
                    <div className="flex items-center justify-between">
                      <p className={`${labelSectionClass} text-ui-fg`}>
                        {isAuthenticated ? 'Мої набори слів' : 'Доступні набори'}
                      </p>
                      {(settings.general.selectedPackIds?.length ?? 0) > 0 && (
                        <button
                          onClick={() => isHost && updateGeneral('selectedPackIds', [])}
                          className={`${typographyClass.label} tracking-widest transition-opacity text-ui-fg-muted hover:text-ui-fg ${!isHost ? 'pointer-events-none' : ''}`}
                        >
                          Скинути
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className={`${labelSectionClass} text-ui-fg`}>
                        {t.packLanguage ?? 'Pack language'}
                      </p>
                      <LanguageChipRow
                        value={deckLanguage}
                        onChange={(l) => {
                          updateGeneral('language', l);
                          if (
                            (settings.mode.gameMode ?? GameMode.CLASSIC) === GameMode.TRANSLATION &&
                            (settings.general.targetLanguage === l ||
                              !settings.general.targetLanguage)
                          ) {
                            updateGeneral('targetLanguage', pickDefaultTargetLanguage(l));
                          }
                        }}
                        size="compact"
                        disabled={!isHost}
                      />
                      <p
                        className={`${typographyClass.label} text-ui-fg-muted opacity-70 leading-relaxed`}
                      >
                        {t.packLanguageHint ??
                          'Вибір мови впливає лише на паки/слова, а не на мову інтерфейсу.'}
                      </p>
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 -mx-1 px-1">
                      {filteredOwnedPacks.map((pack) => {
                        const isSelected = (settings.general.selectedPackIds ?? []).includes(
                          pack.id
                        );
                        return (
                          <button
                            key={pack.id}
                            onClick={() => togglePack(pack.id)}
                            disabled={!isHost}
                            className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-2 rounded-xl border ${typographyClass.label} transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform disabled:pointer-events-none ${
                              isSelected
                                ? 'border-ui-accent bg-[color-mix(in_srgb,var(--ui-accent)_14%,transparent)] text-ui-accent'
                                : 'border-ui-border bg-ui-surface text-ui-fg-muted hover:text-ui-fg hover:bg-ui-surface-hover'
                            }`}
                          >
                            {isSelected && <Check size={10} />}
                            <span>{pack.name}</span>
                            <span
                              className={`font-normal ${isSelected ? 'text-ui-fg-muted' : 'opacity-40'}`}
                            >
                              {pack.wordCount}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {filteredOwnedPacks.length === 0 ? (
                      <p className={`${typographyClass.label} text-ui-fg-muted opacity-70`}>
                        {t.noPacksForLanguage ?? 'Немає паків для цієї мови.'}
                      </p>
                    ) : (settings.general.selectedPackIds?.length ?? 0) === 0 ? (
                      <p className={`${typographyClass.label} text-ui-fg-muted opacity-70`}>
                        Не вибрано — використовуються стандартні слова
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            )}

            <div className="space-y-3">
              <SectionHeader
                title={t.customDeckLobbyLabel ?? 'Власний словник'}
                open={contentOpen.customDeck}
                onToggle={() => setContentOpen((s) => ({ ...s, customDeck: !s.customDeck }))}
              />
              {contentOpen.customDeck &&
                (settings.general.customDeckCode ? (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-ui-border bg-ui-surface">
                    <div className="flex items-start gap-2 min-w-0">
                      <FileText size={14} className="text-ui-accent shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p
                          className={`${typographyClass.label} normal-case font-semibold text-ui-fg leading-tight truncate`}
                        >
                          {settings.general.customDeckName || settings.general.customDeckCode}
                        </p>
                        <p className={`${typographyClass.label} text-ui-fg-muted font-mono mt-0.5`}>
                          {settings.general.customDeckCode}
                        </p>
                      </div>
                    </div>
                    {isHost && (
                      <button
                        type="button"
                        onClick={clearCustomDeck}
                        className="text-ui-fg-muted hover:text-ui-fg transition-colors p-1 shrink-0"
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
                    className="w-full p-3 rounded-xl border border-dashed border-ui-border text-ui-fg-muted hover:text-ui-fg hover:border-[color-mix(in_srgb,var(--ui-accent)_35%,var(--ui-border))] transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform flex items-center gap-2 disabled:opacity-30"
                  >
                    <FileText size={14} />
                    <span className={typographyClass.label}>Вибрати зі своїх словників…</span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* BLOCK 3: Rules (dynamic) */}
        {activeTab === 'rules' && (
          <div className="p-6 rounded-3xl border border-ui-border bg-ui-surface space-y-5">
            <div className="space-y-2">
              <h3 className={`${labelSectionTitleClass} text-ui-fg !opacity-100`}>
                {t.rules ?? 'Правила'}
              </h3>
              <div className="h-px w-full bg-ui-border" />
            </div>
            <p className={`${typographyClass.body} text-ui-fg-muted`}>{t.lobbyRulesIntro}</p>

            <div className="space-y-0 divide-y divide-ui-border border-t border-ui-border pt-2">
              {(() => {
                const mode = settings.mode;
                if (mode.gameMode === GameMode.IMPOSTER) {
                  return (
                    <div className="space-y-3 py-4 first:pt-0">
                      <div className="flex justify-between items-center">
                        <p className={`${labelSectionClass} text-ui-fg`}>
                          {t.imposterDiscussionTime ?? 'Час обговорення'}
                        </p>
                        <span className={`${typographyClass.label} ${currentTheme.textAccent}`}>
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
                              className={`py-3 rounded-xl border text-center ${typographyClass.label} tracking-wide transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform ${
                                active
                                  ? 'bg-ui-accent text-ui-accent-contrast border-ui-accent'
                                  : 'bg-ui-surface border-ui-border text-ui-fg-muted hover:text-ui-fg hover:bg-ui-surface-hover'
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

                if (mode.gameMode === GameMode.HARDCORE) {
                  const variant = mode.hardcoreVariant ?? 'SKIP_ENDS_TURN';
                  return (
                    <>
                      <div className="space-y-3 py-4 first:pt-0">
                        <p className={`${labelSectionClass} text-ui-fg`}>
                          {t.lobbyHardcoreVariantTitle ?? 'Hardcore variant'}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {(
                            [
                              ['TABOO', t.lobbyHardcoreVariantTaboo],
                              ['SKIP_ENDS_TURN', t.lobbyHardcoreVariantSkip],
                              ['MAX', t.lobbyHardcoreVariantMax],
                            ] as const
                          ).map(([id, label]) => {
                            const active = variant === id;
                            return (
                              <button
                                key={id}
                                type="button"
                                onClick={() => updateMode({ hardcoreVariant: id })}
                                className={`py-3 px-1 rounded-xl border text-center ${typographyClass.label} tracking-wide transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform leading-tight ${
                                  active
                                    ? 'bg-ui-accent text-ui-accent-contrast border-ui-accent'
                                    : 'bg-ui-surface border-ui-border text-ui-fg-muted hover:text-ui-fg hover:bg-ui-surface-hover'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="py-4">
                        <SectionHeader
                          title={t.lobbyRulesSectionBasics}
                          open={rulesOpen.basics}
                          onToggle={() => setRulesOpen((s) => ({ ...s, basics: !s.basics }))}
                        />
                        {rulesOpen.basics && (
                          <div className="space-y-3 pt-1">
                            <p className={`${labelSectionClass} text-ui-fg`}>{t.roundTime}</p>
                            <div className="flex items-stretch gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const next = Math.max(30, localRoundTime - 10);
                                  setLocalRoundTime(next);
                                  lastHapticRoundTime.current = next;
                                  vibrate(HAPTIC.nav);
                                  updateMode({ classicRoundTime: next });
                                }}
                                disabled={!isHost}
                                className="min-h-14 min-w-13 shrink-0 rounded-2xl border border-ui-border bg-ui-surface text-ui-fg hover:bg-ui-surface-hover text-2xl font-black leading-none transition-all active:scale-95 disabled:opacity-40"
                                aria-label={t.roundTime + ' −10'}
                              >
                                −
                              </button>
                              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-ui-border bg-ui-card px-2 py-3">
                                <span
                                  className={`text-3xl sm:text-4xl font-black tabular-nums leading-none ${currentTheme.textAccent}`}
                                >
                                  {localRoundTime}
                                </span>
                                <span
                                  className={`mt-1 ${typographyClass.label} normal-case font-semibold text-ui-fg-muted`}
                                >
                                  s
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = Math.min(180, localRoundTime + 10);
                                  setLocalRoundTime(next);
                                  lastHapticRoundTime.current = next;
                                  vibrate(HAPTIC.nav);
                                  updateMode({ classicRoundTime: next });
                                }}
                                disabled={!isHost}
                                className="min-h-14 min-w-13 shrink-0 rounded-2xl border border-ui-border bg-ui-surface text-ui-fg hover:bg-ui-surface-hover text-2xl font-black leading-none transition-all active:scale-95 disabled:opacity-40"
                                aria-label={t.roundTime + ' +10'}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  );
                }

                if (mode.gameMode === GameMode.QUIZ) {
                  const types = mode.quizTypes ?? {
                    synonyms: true,
                    antonyms: true,
                    taboo: true,
                    translation: false,
                  };
                  const timerMode = mode.quizTimerMode ?? 'ROUND';

                  return (
                    <>
                      <div className="py-4 first:pt-0">
                        <SectionHeader
                          title={
                            'lobbyRulesSectionQuizTypes' in t
                              ? t.lobbyRulesSectionQuizTypes
                              : 'Quiz'
                          }
                          open={rulesOpen.quizTypes}
                          onToggle={() => setRulesOpen((s) => ({ ...s, quizTypes: !s.quizTypes }))}
                        />
                        {rulesOpen.quizTypes && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            {(
                              [
                                ['synonyms', t.lobbyQuizTypeSynonyms],
                                ['antonyms', t.lobbyQuizTypeAntonyms],
                                ['taboo', t.lobbyQuizTypeTaboo],
                                ['translation', t.lobbyQuizTypeTranslation],
                              ] as const
                            ).map(([k, label]) => {
                              const active = types[k];
                              return (
                                <button
                                  key={k}
                                  type="button"
                                  onClick={() =>
                                    updateMode({ quizTypes: { ...types, [k]: !active } })
                                  }
                                  className={`py-3 rounded-xl border text-center ${typographyClass.label} tracking-wide transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform ${
                                    active
                                      ? 'bg-ui-accent text-ui-accent-contrast border-ui-accent'
                                      : 'bg-ui-surface border-ui-border text-ui-fg-muted hover:text-ui-fg hover:bg-ui-surface-hover'
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="py-4">
                        <SectionHeader
                          title={
                            'lobbyRulesSectionQuizMore' in t ? t.lobbyRulesSectionQuizMore : 'Timer'
                          }
                          open={rulesOpen.quizMore}
                          onToggle={() => setRulesOpen((s) => ({ ...s, quizMore: !s.quizMore }))}
                        />
                        {rulesOpen.quizMore && (
                          <div className="space-y-4 pt-1">
                            <div className="space-y-4">
                              <p className={`${labelSectionClass} text-ui-fg`}>
                                {t.lobbyQuizWrongPenaltyTitle}
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  updateMode({
                                    quizWrongPenaltyEnabled: !mode.quizWrongPenaltyEnabled,
                                  })
                                }
                                className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${
                                  mode.quizWrongPenaltyEnabled
                                    ? 'border-ui-accent bg-[color-mix(in_srgb,var(--ui-accent)_14%,transparent)]'
                                    : 'border-ui-border bg-ui-surface opacity-70'
                                }`}
                              >
                                <span className="text-ui-fg">
                                  {mode.quizWrongPenaltyEnabled
                                    ? t.lobbyQuizWrongPenaltyOn
                                    : t.lobbyQuizWrongPenaltyOff}
                                </span>
                                <div
                                  className={`w-12 h-6 rounded-full transition-all relative ${
                                    mode.quizWrongPenaltyEnabled ? 'bg-ui-accent' : 'bg-ui-border'
                                  }`}
                                >
                                  <div
                                    className={`absolute w-5 h-5 bg-ui-fg rounded-full top-0.5 transition-all ${
                                      mode.quizWrongPenaltyEnabled ? 'right-0.5' : 'left-0.5'
                                    }`}
                                  />
                                </div>
                              </button>
                            </div>

                            <div className="space-y-4">
                              <p className={`${labelSectionClass} text-ui-fg`}>
                                {t.lobbyQuizTimerModeTitle}
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {(
                                  [
                                    ['ROUND', t.lobbyQuizTimerRound],
                                    ['PER_TASK', t.lobbyQuizTimerPerQuestion],
                                  ] as const
                                ).map(([id, label]) => {
                                  const active = timerMode === id;
                                  return (
                                    <button
                                      key={id}
                                      type="button"
                                      onClick={() => updateMode({ quizTimerMode: id })}
                                      className={`py-3 rounded-xl border text-center ${typographyClass.label} tracking-wide transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform ${
                                        active
                                          ? 'bg-ui-accent text-ui-accent-contrast border-ui-accent'
                                          : 'bg-ui-surface border-ui-border text-ui-fg-muted hover:text-ui-fg hover:bg-ui-surface-hover'
                                      }`}
                                    >
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="space-y-3">
                                <div className="flex justify-between">
                                  <p className={`${labelSectionClass} text-ui-fg`}>
                                    {timerMode === 'PER_TASK'
                                      ? t.lobbyQuizLabelQuestionTime
                                      : t.lobbyQuizLabelRoundTime}
                                  </p>
                                  <span
                                    className={`${typographyClass.label} ${currentTheme.textAccent}`}
                                  >
                                    {timerMode === 'PER_TASK'
                                      ? `${mode.quizQuestionTime}s`
                                      : `${mode.quizRoundTime}s`}
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min={timerMode === 'PER_TASK' ? 5 : 30}
                                  max={timerMode === 'PER_TASK' ? 30 : 180}
                                  step={timerMode === 'PER_TASK' ? 1 : 10}
                                  value={
                                    timerMode === 'PER_TASK'
                                      ? localQuizQuestionTime
                                      : localQuizRoundTime
                                  }
                                  onChange={(e) => {
                                    const v = parseInt(e.target.value);
                                    if (timerMode === 'PER_TASK') setLocalQuizQuestionTime(v);
                                    else setLocalQuizRoundTime(v);
                                    vibrate(HAPTIC.nav);
                                  }}
                                  onMouseUp={() =>
                                    timerMode === 'PER_TASK'
                                      ? updateMode({ quizQuestionTime: localQuizQuestionTime })
                                      : updateMode({
                                          quizRoundTime: localQuizRoundTime,
                                          classicRoundTime: localQuizRoundTime,
                                        })
                                  }
                                  onTouchEnd={() =>
                                    timerMode === 'PER_TASK'
                                      ? updateMode({ quizQuestionTime: localQuizQuestionTime })
                                      : updateMode({
                                          quizRoundTime: localQuizRoundTime,
                                          classicRoundTime: localQuizRoundTime,
                                        })
                                  }
                                  className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-ui-accent bg-ui-border"
                                />
                              </div>

                              {timerMode === 'PER_TASK' && (
                                <div className="space-y-3">
                                  <div className="flex justify-between">
                                    <p className={`${labelSectionClass} text-ui-fg`}>
                                      {t.lobbyQuizLabelTotalRound}
                                    </p>
                                    <span
                                      className={`${typographyClass.label} ${currentTheme.textAccent}`}
                                    >
                                      {mode.quizRoundTime}s
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    min="30"
                                    max="180"
                                    step="10"
                                    value={localQuizRoundTime}
                                    onChange={(e) => {
                                      const v = parseInt(e.target.value);
                                      setLocalQuizRoundTime(v);
                                      vibrate(HAPTIC.nav);
                                    }}
                                    onMouseUp={() =>
                                      updateMode({
                                        quizRoundTime: localQuizRoundTime,
                                        classicRoundTime: localQuizRoundTime,
                                      })
                                    }
                                    onTouchEnd={() =>
                                      updateMode({
                                        quizRoundTime: localQuizRoundTime,
                                        classicRoundTime: localQuizRoundTime,
                                      })
                                    }
                                    className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-ui-accent bg-ui-border"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  );
                }

                return (
                  <div className="py-4 first:pt-0">
                    <SectionHeader
                      title={t.lobbyRulesSectionBasics}
                      open={rulesOpen.basics}
                      onToggle={() => setRulesOpen((s) => ({ ...s, basics: !s.basics }))}
                    />
                    {rulesOpen.basics && (
                      <div className="space-y-3 pt-1">
                        <p className={`${labelSectionClass} text-ui-fg`}>{t.roundTime}</p>
                        <div className="flex items-stretch gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.max(30, localRoundTime - 10);
                              setLocalRoundTime(next);
                              lastHapticRoundTime.current = next;
                              vibrate(HAPTIC.nav);
                              updateMode({ classicRoundTime: next });
                            }}
                            disabled={!isHost}
                            className="min-h-14 min-w-13 shrink-0 rounded-2xl border border-ui-border bg-ui-surface text-ui-fg hover:bg-ui-surface-hover text-2xl font-black leading-none transition-all active:scale-95 disabled:opacity-40"
                            aria-label={t.roundTime + ' −10'}
                          >
                            −
                          </button>
                          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-ui-border bg-ui-card px-2 py-3">
                            <span
                              className={`text-3xl sm:text-4xl font-black tabular-nums leading-none ${currentTheme.textAccent}`}
                            >
                              {localRoundTime}
                            </span>
                            <span
                              className={`mt-1 ${typographyClass.label} normal-case font-semibold text-ui-fg-muted`}
                            >
                              s
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.min(180, localRoundTime + 10);
                              setLocalRoundTime(next);
                              lastHapticRoundTime.current = next;
                              vibrate(HAPTIC.nav);
                              updateMode({ classicRoundTime: next });
                            }}
                            disabled={!isHost}
                            className="min-h-14 min-w-13 shrink-0 rounded-2xl border border-ui-border bg-ui-surface text-ui-fg hover:bg-ui-surface-hover text-2xl font-black leading-none transition-all active:scale-95 disabled:opacity-40"
                            aria-label={t.roundTime + ' +10'}
                          >
                            +
                          </button>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-ui-border">
                          <div className="flex justify-between">
                            <p className={`${labelSectionClass} text-ui-fg`}>{t.scoreToWin}</p>
                            <span
                              data-testid="settings-score-to-win"
                              className={`${typographyClass.label} ${currentTheme.textAccent}`}
                            >
                              {settings.general.scoreToWin}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            step="5"
                            value={localScoreToWin}
                            onChange={(e) => {
                              const v = parseInt(e.target.value);
                              setLocalScoreToWin(v);
                              if (v !== lastHapticScoreToWin.current) {
                                lastHapticScoreToWin.current = v;
                                vibrate(HAPTIC.nav);
                              }
                            }}
                            onMouseUp={() => updateGeneral('scoreToWin', localScoreToWin)}
                            onTouchEnd={() => updateGeneral('scoreToWin', localScoreToWin)}
                            className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-ui-accent bg-ui-border"
                          />
                          <div className="flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                const next = Math.max(10, localScoreToWin - 5);
                                setLocalScoreToWin(next);
                                updateGeneral('scoreToWin', next);
                              }}
                              className={`px-3 py-2 rounded-xl border border-ui-border bg-ui-surface text-ui-fg-muted hover:text-ui-fg hover:bg-ui-surface-hover ${typographyClass.label}`}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={10}
                              max={100}
                              step={5}
                              value={localScoreToWin}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                if (!Number.isFinite(v)) return;
                                setLocalScoreToWin(v);
                              }}
                              onBlur={() => {
                                const clamped = Math.max(
                                  10,
                                  Math.min(100, Math.round(localScoreToWin / 5) * 5)
                                );
                                setLocalScoreToWin(clamped);
                                updateGeneral('scoreToWin', clamped);
                              }}
                              className={`w-28 text-center rounded-xl border border-ui-border bg-ui-surface text-ui-fg px-3 py-2 outline-none focus:border-ui-accent ${typographyClass.bodyInput}`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const next = Math.min(100, localScoreToWin + 5);
                                setLocalScoreToWin(next);
                                updateGeneral('scoreToWin', next);
                              }}
                              className={`px-3 py-2 rounded-xl border border-ui-border bg-ui-surface text-ui-fg-muted hover:text-ui-fg hover:bg-ui-surface-hover ${typographyClass.label}`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {(settings.mode.gameMode ?? GameMode.CLASSIC) !== GameMode.IMPOSTER && (
              <>
                {(settings.mode.gameMode ?? GameMode.CLASSIC) === GameMode.QUIZ && (
                  <div className="space-y-0 divide-y divide-ui-border border-t border-ui-border pt-2 -mt-2">
                    <div className="py-4">
                      <SectionHeader
                        title={t.scoreToWin}
                        open={rulesOpen.basics}
                        onToggle={() => setRulesOpen((s) => ({ ...s, basics: !s.basics }))}
                      />
                      {rulesOpen.basics && (
                        <div className="space-y-4 pt-1">
                          <input
                            type="range"
                            min="10"
                            max="100"
                            step="5"
                            value={localScoreToWin}
                            onChange={(e) => {
                              const v = parseInt(e.target.value);
                              setLocalScoreToWin(v);
                              if (v !== lastHapticScoreToWin.current) {
                                lastHapticScoreToWin.current = v;
                                vibrate(HAPTIC.nav);
                              }
                            }}
                            onMouseUp={() => updateGeneral('scoreToWin', localScoreToWin)}
                            onTouchEnd={() => updateGeneral('scoreToWin', localScoreToWin)}
                            className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-ui-accent bg-ui-border"
                          />
                          <div className="flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                const next = Math.max(10, localScoreToWin - 5);
                                setLocalScoreToWin(next);
                                updateGeneral('scoreToWin', next);
                              }}
                              className={`px-3 py-2 rounded-xl border border-ui-border bg-ui-surface text-ui-fg-muted hover:text-ui-fg hover:bg-ui-surface-hover ${typographyClass.label}`}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={10}
                              max={100}
                              step={5}
                              value={localScoreToWin}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                if (!Number.isFinite(v)) return;
                                setLocalScoreToWin(v);
                              }}
                              onBlur={() => {
                                const clamped = Math.max(
                                  10,
                                  Math.min(100, Math.round(localScoreToWin / 5) * 5)
                                );
                                setLocalScoreToWin(clamped);
                                updateGeneral('scoreToWin', clamped);
                              }}
                              className={`w-28 text-center rounded-xl border border-ui-border bg-ui-surface text-ui-fg px-3 py-2 outline-none focus:border-ui-accent ${typographyClass.bodyInput}`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const next = Math.min(100, localScoreToWin + 5);
                                setLocalScoreToWin(next);
                                updateGeneral('scoreToWin', next);
                              }}
                              className={`px-3 py-2 rounded-xl border border-ui-border bg-ui-surface text-ui-fg-muted hover:text-ui-fg hover:bg-ui-surface-hover ${typographyClass.label}`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-0 divide-y divide-ui-border border-t border-ui-border pt-2 -mt-2">
                  <div className="py-4">
                    <SectionHeader
                      title={t.lobbyRulesSectionExtras}
                      open={rulesOpen.extras}
                      onToggle={() => setRulesOpen((s) => ({ ...s, extras: !s.extras }))}
                    />
                    {rulesOpen.extras && (
                      <div className="space-y-4 pt-1">
                        <SettingsToggle
                          variant="compact"
                          checked={settings.general.skipPenalty}
                          onChange={(v) => updateGeneral('skipPenalty', v)}
                          enabledLabel={t.enabled}
                          disabledLabel={t.disabled}
                          titleClassName="text-ui-fg"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
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
    </ScreenShell>
  );
};
