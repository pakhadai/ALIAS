import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ModalSheet, ModalSheetBody } from '../../components/ModalSheet';
import { ModalSheetTitle } from '../../components/Shared';
import { GameMode } from '../../types';
import type { GameSettings, ThemeConfig } from '../../types';
import { useT } from '../../hooks/useT';
import { SURFACE_CARD_CLASS, SURFACE_PANEL_CLASS } from '../../constants/surfaceClasses';
import { typographyClass, labelSectionTitleClass } from '../../constants/typography';

const TABS = ['rules', 'faq', 'privacy', 'impressum', 'agb'] as const;
type TabId = (typeof TABS)[number];

type RulesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  t: ReturnType<typeof useT>;
  currentTheme: ThemeConfig;
  settings: GameSettings;
};

export const RulesModal = ({ isOpen, onClose, t, currentTheme, settings }: RulesModalProps) => {
  const [activeTab, setActiveTab] = useState<TabId>('rules');
  const [allModesOpen, setAllModesOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [settingsDetailOpen, setSettingsDetailOpen] = useState(false);

  const handleClose = () => {
    onClose();
    setActiveTab('rules');
    setAllModesOpen(false);
    setQuickOpen(false);
    setSettingsDetailOpen(false);
  };

  const tabLabels: Record<TabId, string> = {
    rules: t.helpSectionRules,
    faq: t.helpSectionFaq,
    privacy: t.helpSectionPrivacy,
    impressum: t.helpSectionImpressum,
    agb: t.helpSectionAgb,
  };

  const modeCards: { id: GameMode; title: string; hint: string }[] = [
    { id: GameMode.CLASSIC, title: t.gameModeClassic, hint: t.gameModeHintClassic },
    { id: GameMode.TRANSLATION, title: t.gameModeTranslation, hint: t.gameModeHintTranslation },
    { id: GameMode.QUIZ, title: t.gameModeQuiz, hint: t.gameModeHintQuiz },
    { id: GameMode.HARDCORE, title: t.gameModeHardcore, hint: t.gameModeHintHardcore },
    { id: GameMode.SYNONYMS, title: t.gameModeSynonyms, hint: t.gameModeHintSynonyms },
    { id: GameMode.IMPOSTER, title: t.gameModeImposter, hint: t.gameModeHintImposter },
  ];

  const activeMode = settings?.mode?.gameMode as GameMode | undefined;
  const sectionTitle = `${labelSectionTitleClass} text-ui-fg`;
  const panelBase = `${SURFACE_PANEL_CLASS} px-5 py-4`;
  const cardInset = `${SURFACE_CARD_CLASS} px-4 py-3`;

  const renderGameRules = () => {
    const modeGs = settings.mode;
    const roundLabel =
      modeGs.gameMode === GameMode.QUIZ
        ? (modeGs.quizTimerMode ?? 'ROUND') === 'PER_TASK'
          ? `${modeGs.quizQuestionTime}s`
          : `${modeGs.quizRoundTime}s`
        : 'classicRoundTime' in modeGs
          ? `${modeGs.classicRoundTime}s`
          : '—';
    const summaryLine = `${roundLabel} · ${settings?.general?.scoreToWin ?? '—'} ${t.pts} · ${settings?.general?.teamCount ?? '—'} ${t.teams}`;

    const activeCard = modeCards.find((m) => m.id === activeMode) ?? modeCards[0];
    if (!activeCard) return null;

    return (
      <div className="space-y-4">
        <div className={panelBase}>
          <p className={sectionTitle}>{t.helpRulesModesTitle}</p>
          <div
            className={`mt-3 ${SURFACE_CARD_CLASS} px-4 py-3.5 ${activeMode ? 'border border-ui-accent bg-[color-mix(in_srgb,var(--ui-accent)_8%,transparent)]' : ''}`}
          >
            <p className={`${typographyClass.body} font-bold text-ui-fg`}>{activeCard.title}</p>
            <p className={`${typographyClass.body} mt-1.5 leading-relaxed text-ui-fg-muted`}>
              {activeCard.hint}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAllModesOpen((o) => !o)}
            className={`mt-3 w-full flex items-center justify-between gap-2 ${SURFACE_CARD_CLASS} px-4 py-3 text-left transition-colors hover:bg-ui-surface text-ui-fg`}
          >
            <span className={`${typographyClass.label} tracking-widest opacity-50`}>
              {allModesOpen ? t.helpRulesHideModes : t.helpRulesShowAllModes}
            </span>
            <ChevronDown
              size={16}
              className={`shrink-0 text-ui-fg-muted transition-transform ${allModesOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {allModesOpen && (
            <div className="mt-3 grid gap-2">
              {modeCards
                .filter((m) => m.id !== activeMode)
                .map((m) => (
                  <div key={m.id} className={cardInset}>
                    <p className={`${typographyClass.label} text-ui-fg`}>{m.title}</p>
                    <p className={`${typographyClass.body} mt-1 leading-relaxed text-ui-fg-muted`}>
                      {m.hint}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className={panelBase}>
          <button
            type="button"
            onClick={() => setQuickOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-2"
            aria-expanded={quickOpen}
            aria-label={quickOpen ? t.helpRulesQuickCollapse : t.helpRulesQuickExpand}
          >
            <p className={sectionTitle}>{t.helpRulesQuickTitle}</p>
            <ChevronDown
              size={16}
              className={`text-ui-fg-muted transition-transform shrink-0 ${quickOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {!quickOpen && (
            <p className={`mt-2 ${typographyClass.body} leading-relaxed text-ui-fg-muted`}>
              {t.infoRule1}
            </p>
          )}
          {quickOpen && (
            <div className="mt-3 space-y-3">
              {[t.infoRule1, t.infoRule2, t.infoRule3, t.infoRule4, t.infoRule5, t.infoRule6].map(
                (rule: string, i: number) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span
                      className={`font-serif text-base opacity-25 shrink-0 w-4 text-right ${currentTheme.textMain}`}
                    >
                      {i + 1}
                    </span>
                    <p
                      className={`${typographyClass.body} leading-relaxed font-light text-ui-fg-muted`}
                    >
                      {rule}
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className={panelBase}>
          <button
            type="button"
            onClick={() => setSettingsDetailOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-2"
            aria-expanded={settingsDetailOpen}
            aria-label={
              settingsDetailOpen ? t.helpRulesSettingsCollapse : t.helpRulesSettingsExpand
            }
          >
            <p className={sectionTitle}>{t.helpRulesCurrentSettingsTitle}</p>
            <ChevronDown
              size={16}
              className={`text-ui-fg-muted transition-transform shrink-0 ${settingsDetailOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {!settingsDetailOpen && (
            <p className={`mt-2 ${typographyClass.body} font-semibold tabular-nums text-ui-fg`}>
              {summaryLine}
            </p>
          )}
          {settingsDetailOpen && (
            <>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className={cardInset}>
                  <p className={`${sectionTitle} opacity-60`}>{t.roundTime}</p>
                  <p className={`mt-1 ${typographyClass.body} font-bold text-ui-fg`}>
                    {'classicRoundTime' in settings.mode ? settings.mode.classicRoundTime : '—'}s
                  </p>
                </div>
                <div className={cardInset}>
                  <p className={`${sectionTitle} opacity-60`}>{t.scoreToWin}</p>
                  <p className={`mt-1 ${typographyClass.body} font-bold text-ui-fg`}>
                    {settings?.general?.scoreToWin ?? '—'}
                  </p>
                </div>
                <div className={cardInset}>
                  <p className={`${sectionTitle} opacity-60`}>{t.skipPenalty}</p>
                  <p className={`mt-1 ${typographyClass.body} font-bold text-ui-fg`}>
                    {settings?.general?.skipPenalty ? t.enabled : t.disabled}
                  </p>
                </div>
                <div className={cardInset}>
                  <p className={`${sectionTitle} opacity-60`}>{t.teams}</p>
                  <p className={`mt-1 ${typographyClass.body} font-bold text-ui-fg`}>
                    {settings?.general?.teamCount ?? '—'}
                  </p>
                </div>
              </div>
              {activeMode === GameMode.IMPOSTER && (
                <div className={`mt-3 ${cardInset}`}>
                  <p className={`${sectionTitle} opacity-60`}>{t.imposterDiscussionTime}</p>
                  <p className={`mt-1 ${typographyClass.body} font-bold text-ui-fg`}>
                    {'imposterDiscussionTime' in settings.mode
                      ? settings.mode.imposterDiscussionTime
                      : '—'}
                    s
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderFaq = () => (
    <div className="space-y-4">
      {[
        { q: t.helpFaqQ1, a: t.helpFaqA1 },
        { q: t.helpFaqQ2, a: t.helpFaqA2 },
        { q: t.helpFaqQ3, a: t.helpFaqA3 },
        { q: t.helpFaqQ4, a: t.helpFaqA4 },
      ].map((item, idx) => (
        <div key={idx} className={panelBase}>
          <p className={`${typographyClass.body} font-bold text-ui-fg`}>{item.q}</p>
          <p
            className={`mt-1.5 ${typographyClass.body} leading-relaxed font-light text-ui-fg-muted`}
          >
            {item.a}
          </p>
        </div>
      ))}
    </div>
  );

  const renderPrivacy = () => (
    <div className="space-y-4">
      <div className={panelBase}>
        <p className={sectionTitle}>{t.helpPrivacyTitle}</p>
        <p className={`mt-2 ${typographyClass.body} leading-relaxed font-light text-ui-fg-muted`}>
          {t.helpPrivacyIntro}
        </p>
        <ul className="mt-3 space-y-2">
          {[t.helpPrivacyP1, t.helpPrivacyP2, t.helpPrivacyP3, t.helpPrivacyP4].map(
            (line: string, i: number) => (
              <li
                key={i}
                className={`${typographyClass.body} leading-relaxed font-light text-ui-fg-muted`}
              >
                <span className="mr-2 text-ui-fg opacity-30">•</span>
                {line}
              </li>
            )
          )}
        </ul>
      </div>
    </div>
  );

  const renderImpressum = () => (
    <div className="space-y-4">
      <div className={panelBase}>
        <p className={sectionTitle}>{t.helpImpressumTitle}</p>
        <p className={`mt-2 ${typographyClass.body} leading-relaxed font-light text-ui-fg-muted`}>
          {t.helpImpressumBody}
        </p>
        <div className={`mt-3 ${SURFACE_PANEL_CLASS} px-4 py-3`}>
          <p className={`${sectionTitle} opacity-60`}>{t.helpImpressumHost}</p>
          <p className={`mt-1 ${typographyClass.body} font-mono text-ui-fg`}>
            {typeof window !== 'undefined' ? window.location.host : '—'}
          </p>
        </div>
        <p className={`mt-3 ${typographyClass.body} leading-relaxed text-ui-fg-muted`}>
          {t.helpImpressumRepoHint}
        </p>
      </div>
    </div>
  );

  const renderAgb = () => (
    <div className="space-y-4">
      <div className={panelBase}>
        <p className={sectionTitle}>{t.helpAgbTitle}</p>
        <p className={`mt-2 ${typographyClass.body} leading-relaxed font-light text-ui-fg-muted`}>
          {t.helpAgbIntro}
        </p>
        <ul className="mt-3 space-y-2">
          {[t.helpAgbP1, t.helpAgbP2, t.helpAgbP3, t.helpAgbP4].map((line: string, i: number) => (
            <li
              key={i}
              className={`${typographyClass.body} leading-relaxed font-light text-ui-fg-muted`}
            >
              <span className="mr-2 text-ui-fg opacity-30">•</span>
              {line}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const tabContent: Record<TabId, () => React.ReactNode> = {
    rules: renderGameRules,
    faq: renderFaq,
    privacy: renderPrivacy,
    impressum: renderImpressum,
    agb: renderAgb,
  };

  return (
    <ModalSheet
      open={isOpen}
      onClose={handleClose}
      size="tall"
      showClose
      closeAriaLabel={t.close}
      closeIconSize={22}
      paddedContent={false}
      ariaLabelledBy="rules-modal-title"
      header={
        <ModalSheetTitle id="rules-modal-title" themeClass="text-ui-fg">
          {t.rulesTitle}
        </ModalSheetTitle>
      }
    >
      <div className="w-full min-w-0 shrink-0 overflow-x-auto no-scrollbar box-border">
        <div role="tablist" aria-label={t.rulesTitle} className="flex w-max gap-2 px-5 pb-3">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-4 py-2 rounded-full ${typographyClass.label} tracking-[0.15em] whitespace-nowrap transition-all ${activeTab === tab ? currentTheme.button : 'opacity-40 hover:opacity-70 text-ui-fg'}`}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>
      </div>
      <ModalSheetBody className="px-5 py-6 pb-modal-bottom">
        {tabContent[activeTab]()}
      </ModalSheetBody>
    </ModalSheet>
  );
};
