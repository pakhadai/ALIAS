import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  X,
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
  PackChipRow,
  pickDefaultTargetLanguage,
  SettingsChip,
  settingsChipLabelClass,
  SettingsTabBar,
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
    <Button
      type="button"
      variant="ghost"
      size="md"
      fullWidth
      onClick={onToggle}
      aria-expanded={open}
      className="h-auto justify-between rounded-none px-0 py-3 normal-case font-normal hover:bg-transparent active:scale-100"
    >
      <p className={`${typographyClass.label} tracking-widest opacity-50 text-ui-fg`}>{title}</p>
      <ChevronDown
        size={16}
        className={`text-ui-fg-muted transition-transform ${open ? 'rotate-180' : ''}`}
      />
    </Button>
  );
}

function NumericStepper({
  value,
  disabled,
  decrementLabel,
  incrementLabel,
  onDecrement,
  onIncrement,
  accentClass,
  suffix,
  valueTestId,
}: {
  value: number;
  disabled?: boolean;
  decrementLabel: string;
  incrementLabel: string;
  onDecrement: () => void;
  onIncrement: () => void;
  accentClass: string;
  suffix?: string;
  valueTestId?: string;
}) {
  return (
    <div className="flex items-stretch gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled}
        onClick={onDecrement}
        className="min-h-14 min-w-13 shrink-0 px-0 text-2xl font-black leading-none"
        aria-label={decrementLabel}
      >
        −
      </Button>
      <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-ui-border bg-ui-card px-2 py-3">
        <span
          data-testid={valueTestId}
          className={`text-3xl sm:text-4xl font-black tabular-nums leading-none ${accentClass}`}
        >
          {value}
        </span>
        {suffix ? (
          <span
            className={`mt-1 ${typographyClass.label} normal-case font-semibold text-ui-fg-muted`}
          >
            {suffix}
          </span>
        ) : null}
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled}
        onClick={onIncrement}
        className="min-h-14 min-w-13 shrink-0 px-0 text-2xl font-black leading-none"
        aria-label={incrementLabel}
      >
        +
      </Button>
    </div>
  );
}

export const SettingsScreen = () => {
  const { settings, currentTheme, setGameState, isHost, sendAction, gameState, showNotification } =
    useGame();
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

  const handleSaveSettings = () => {
    showNotification(t.settingsSavedSuccess, 'success');
    setGameState(GameState.LOBBY);
  };

  const settingsMenuItems = useMemo(
    () => [
      { id: '1', label: 'Пункт 1', onSelect: () => console.log('settings menu: item 1') },
      { id: '2', label: 'Пункт 2', onSelect: () => console.log('settings menu: item 2') },
      { id: '3', label: 'Пункт 3', onSelect: () => console.log('settings menu: item 3') },
    ],
    []
  );

  const settingsTabLabels = useMemo(
    () =>
      SETTINGS_TABS.map(([id, labelKey]) => ({
        id,
        label:
          labelKey === 'gameMode'
            ? (t.gameMode ?? 'Режим')
            : labelKey === 'content'
              ? (t.content ?? 'Словник')
              : t.rulesTitle,
      })),
    [t.content, t.gameMode, t.rulesTitle]
  );

  const settingsTabBar = (
    <SettingsTabBar tabs={settingsTabLabels} value={activeTab} onChange={setActiveTab} />
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
            type="button"
            variant="primary"
            volume="cta"
            themeClass={currentTheme.button}
            fullWidth
            size="xl"
            onClick={handleSaveSettings}
          >
            {t.save}
          </Button>
        </FixedBottomBar>
      }
    >
      <div className="w-full space-y-6 pb-4 pt-3">
        {/* BLOCK 1: Game Mode */}
        {activeTab === 'mode' && (
          <div className={`${SURFACE_PANEL_CLASS} p-6`}>
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
                    ? (t.gameModeCardHintTranslation ?? t.gameModeHintTranslation)
                    : mode === GameMode.QUIZ
                      ? (t.gameModeCardHintQuiz ?? t.gameModeHintQuiz)
                      : mode === GameMode.SYNONYMS
                        ? (t.gameModeCardHintSynonyms ?? t.gameModeHintSynonyms)
                        : mode === GameMode.HARDCORE
                          ? (t.gameModeCardHintHardcore ?? t.gameModeHintHardcore)
                          : mode === GameMode.IMPOSTER
                            ? (t.gameModeCardHintImposter ?? t.gameModeHintImposter)
                            : (t.gameModeCardHintClassic ?? t.gameModeHintClassic);
                return (
                  <SettingsChip
                    key={mode}
                    active={active}
                    disabled={!isHost}
                    onClick={() => updateMode({ gameMode: mode })}
                    className="py-3 px-2 flex-col hover:-translate-y-0.5 will-change-transform"
                    aria-label={`${label}. ${hint}`}
                  >
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center justify-center gap-2">
                        <span className={active ? 'opacity-95' : 'opacity-70'} aria-hidden>
                          {icon}
                        </span>
                        <span
                          className={`${settingsChipLabelClass} tracking-wide ${
                            active ? 'text-ui-accent-contrast' : 'text-ui-fg'
                          }`}
                        >
                          {label}
                        </span>
                      </div>
                      <p
                        className={`${typographyClass.system} normal-case font-medium leading-snug ${
                          active ? 'text-ui-accent-contrast/90' : 'text-ui-fg-muted'
                        }`}
                      >
                        {hint}
                      </p>
                    </div>
                  </SettingsChip>
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={!isHost}
                          onClick={() => updateGeneral('selectedPackIds', [])}
                          className="tracking-widest"
                        >
                          Скинути
                        </Button>
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
                    <PackChipRow
                      packs={filteredOwnedPacks}
                      selectedIds={settings.general.selectedPackIds ?? []}
                      onToggle={togglePack}
                      disabled={!isHost}
                    />
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearCustomDeck}
                        aria-label={t.close}
                        className="shrink-0 p-1"
                      >
                        <X size={14} />
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    fullWidth
                    disabled={!isHost}
                    icon={<FileText size={14} />}
                    onClick={() => setShowCustomDeckPicker(true)}
                    className="justify-start border-dashed"
                  >
                    Вибрати зі своїх словників…
                  </Button>
                ))}
            </div>
          </div>
        )}

        {/* BLOCK 3: Rules (dynamic) */}
        {activeTab === 'rules' && (
          <div className="p-6 rounded-3xl border border-ui-border bg-ui-surface space-y-5">
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
                            <SettingsChip
                              key={min}
                              active={active}
                              disabled={!isHost}
                              onClick={() => updateMode({ imposterDiscussionTime: min * 60 })}
                              className="hover:-translate-y-0.5 will-change-transform"
                            >
                              <span className={settingsChipLabelClass}>
                                {min} {t.min ?? 'хв'}
                              </span>
                            </SettingsChip>
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
                              <SettingsChip
                                key={id}
                                active={active}
                                disabled={!isHost}
                                onClick={() => updateMode({ hardcoreVariant: id })}
                                className="px-1 leading-tight hover:-translate-y-0.5 will-change-transform"
                              >
                                <span className={settingsChipLabelClass}>{label}</span>
                              </SettingsChip>
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
                            <NumericStepper
                              value={localRoundTime}
                              disabled={!isHost}
                              decrementLabel={t.roundTime + ' −10'}
                              incrementLabel={t.roundTime + ' +10'}
                              accentClass={currentTheme.textAccent}
                              suffix="s"
                              onDecrement={() => {
                                const next = Math.max(30, localRoundTime - 10);
                                setLocalRoundTime(next);
                                lastHapticRoundTime.current = next;
                                vibrate(HAPTIC.nav);
                                updateMode({ classicRoundTime: next });
                              }}
                              onIncrement={() => {
                                const next = Math.min(180, localRoundTime + 10);
                                setLocalRoundTime(next);
                                lastHapticRoundTime.current = next;
                                vibrate(HAPTIC.nav);
                                updateMode({ classicRoundTime: next });
                              }}
                            />
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
                                <SettingsChip
                                  key={k}
                                  active={active}
                                  disabled={!isHost}
                                  onClick={() =>
                                    updateMode({ quizTypes: { ...types, [k]: !active } })
                                  }
                                  className="hover:-translate-y-0.5 will-change-transform"
                                >
                                  <span className={settingsChipLabelClass}>{label}</span>
                                </SettingsChip>
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
                              <SettingsToggle
                                variant="compact"
                                checked={mode.quizWrongPenaltyEnabled}
                                onChange={(v) => updateMode({ quizWrongPenaltyEnabled: v })}
                                enabledLabel={t.lobbyQuizWrongPenaltyOn}
                                disabledLabel={t.lobbyQuizWrongPenaltyOff}
                                titleClassName="text-ui-fg"
                              />
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
                                    <SettingsChip
                                      key={id}
                                      active={active}
                                      disabled={!isHost}
                                      onClick={() => updateMode({ quizTimerMode: id })}
                                      className="hover:-translate-y-0.5 will-change-transform"
                                    >
                                      <span className={settingsChipLabelClass}>{label}</span>
                                    </SettingsChip>
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
                        <NumericStepper
                          value={localRoundTime}
                          disabled={!isHost}
                          decrementLabel={t.roundTime + ' −10'}
                          incrementLabel={t.roundTime + ' +10'}
                          accentClass={currentTheme.textAccent}
                          suffix="s"
                          onDecrement={() => {
                            const next = Math.max(30, localRoundTime - 10);
                            setLocalRoundTime(next);
                            lastHapticRoundTime.current = next;
                            vibrate(HAPTIC.nav);
                            updateMode({ classicRoundTime: next });
                          }}
                          onIncrement={() => {
                            const next = Math.min(180, localRoundTime + 10);
                            setLocalRoundTime(next);
                            lastHapticRoundTime.current = next;
                            vibrate(HAPTIC.nav);
                            updateMode({ classicRoundTime: next });
                          }}
                        />

                        <div className="space-y-3 pt-4 border-t border-ui-border">
                          <p className={`${labelSectionClass} text-ui-fg`}>{t.scoreToWin}</p>
                          <NumericStepper
                            value={localScoreToWin}
                            disabled={!isHost}
                            decrementLabel={`${t.scoreToWin} −5`}
                            incrementLabel={`${t.scoreToWin} +5`}
                            accentClass={currentTheme.textAccent}
                            valueTestId="settings-score-to-win"
                            onDecrement={() => {
                              const next = Math.max(10, localScoreToWin - 5);
                              setLocalScoreToWin(next);
                              lastHapticScoreToWin.current = next;
                              vibrate(HAPTIC.nav);
                              updateGeneral('scoreToWin', next);
                            }}
                            onIncrement={() => {
                              const next = Math.min(100, localScoreToWin + 5);
                              setLocalScoreToWin(next);
                              lastHapticScoreToWin.current = next;
                              vibrate(HAPTIC.nav);
                              updateGeneral('scoreToWin', next);
                            }}
                          />
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
                        <div className="space-y-3 pt-1">
                          <NumericStepper
                            value={localScoreToWin}
                            disabled={!isHost}
                            decrementLabel={`${t.scoreToWin} −5`}
                            incrementLabel={`${t.scoreToWin} +5`}
                            accentClass={currentTheme.textAccent}
                            valueTestId="settings-score-to-win"
                            onDecrement={() => {
                              const next = Math.max(10, localScoreToWin - 5);
                              setLocalScoreToWin(next);
                              lastHapticScoreToWin.current = next;
                              vibrate(HAPTIC.nav);
                              updateGeneral('scoreToWin', next);
                            }}
                            onIncrement={() => {
                              const next = Math.min(100, localScoreToWin + 5);
                              setLocalScoreToWin(next);
                              lastHapticScoreToWin.current = next;
                              vibrate(HAPTIC.nav);
                              updateGeneral('scoreToWin', next);
                            }}
                          />
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
