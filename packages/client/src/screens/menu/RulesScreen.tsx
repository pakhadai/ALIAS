import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../components/Button';
import { Logo, bottomSheetBackdropClass, bottomSheetPanelClass } from '../../components/Shared';
import { GameState, GameMode } from '../../types';
import { useGame } from '../../context/GameContext';
import { useT } from '../../hooks/useT';

const TABS = ['rules', 'faq', 'privacy', 'impressum', 'agb'] as const;
type TabId = (typeof TABS)[number];

export const RulesModal = ({ isOpen, onClose, t, currentTheme, settings }: any) => {
  const [isClosing, setIsClosing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('rules');
  const [visible, setVisible] = useState(false);
  const shouldRender = isOpen || isClosing;

  useEffect(() => {
    if (!isOpen) {
      setVisible(false);
      return;
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  if (!shouldRender) return null;

  const handleClose = () => {
    setIsClosing(true);
    setVisible(false);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setActiveTab('rules');
    }, 300);
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
  const sectionTitle = `text-[9px] uppercase tracking-[0.28em] font-bold opacity-40 ${currentTheme.textMain}`;
  const cardBase = 'rounded-3xl border border-(--ui-border) bg-(--ui-surface) px-5 py-4';

  const renderGameRules = () => (
    <div className="space-y-4">
      <div className={cardBase}>
        <p className={sectionTitle}>{t.helpRulesQuickTitle}</p>
        <div className="mt-3 space-y-3">
          {[t.infoRule1, t.infoRule2, t.infoRule3, t.infoRule4, t.infoRule5, t.infoRule6].map(
            (rule: string, i: number) => (
              <div key={i} className="flex gap-4 items-start">
                <span
                  className={`font-serif text-lg opacity-20 shrink-0 w-5 text-right ${currentTheme.textMain}`}
                >
                  {i + 1}
                </span>
                <p
                  className={`text-sm leading-relaxed tracking-wide font-light ${currentTheme.textSecondary}`}
                >
                  {rule}
                </p>
              </div>
            )
          )}
        </div>
      </div>
      <div className={cardBase}>
        <p className={sectionTitle}>{t.helpRulesModesTitle}</p>
        <div className="mt-3 grid gap-3">
          {modeCards.map((m) => {
            const isActive = activeMode === m.id;
            return (
              <div
                key={m.id}
                className={`rounded-3xl border px-5 py-4 transition-colors ${isActive ? 'border-(--ui-accent) bg-[color-mix(in_srgb,var(--ui-accent)_10%,transparent)]' : 'border-(--ui-border) bg-(--ui-surface)'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-sm font-bold ${currentTheme.textMain}`}>{m.title}</p>
                    <p className={`text-xs mt-1 leading-relaxed ${currentTheme.textSecondary}`}>
                      {m.hint}
                    </p>
                  </div>
                  {isActive && (
                    <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.18em] text-(--ui-accent)">
                      {t.enabled}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className={cardBase}>
        <p className={sectionTitle}>{t.helpRulesCurrentSettingsTitle}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-(--ui-border) bg-(--ui-bg) px-4 py-3">
            <p className={`${sectionTitle} opacity-60`}>{t.roundTime}</p>
            <p className={`mt-1 text-sm font-bold ${currentTheme.textMain}`}>
              {settings?.mode?.classicRoundTime ?? '—'}s
            </p>
          </div>
          <div className="rounded-3xl border border-(--ui-border) bg-(--ui-bg) px-4 py-3">
            <p className={`${sectionTitle} opacity-60`}>{t.scoreToWin}</p>
            <p className={`mt-1 text-sm font-bold ${currentTheme.textMain}`}>
              {settings?.general?.scoreToWin ?? '—'}
            </p>
          </div>
          <div className="rounded-3xl border border-(--ui-border) bg-(--ui-bg) px-4 py-3">
            <p className={`${sectionTitle} opacity-60`}>{t.skipPenalty}</p>
            <p className={`mt-1 text-sm font-bold ${currentTheme.textMain}`}>
              {settings?.general?.skipPenalty ? t.enabled : t.disabled}
            </p>
          </div>
          <div className="rounded-3xl border border-(--ui-border) bg-(--ui-bg) px-4 py-3">
            <p className={`${sectionTitle} opacity-60`}>{t.teams}</p>
            <p className={`mt-1 text-sm font-bold ${currentTheme.textMain}`}>
              {settings?.general?.teamCount ?? '—'}
            </p>
          </div>
        </div>
        {activeMode === GameMode.IMPOSTER && (
          <div className="mt-3 rounded-3xl border border-(--ui-border) bg-(--ui-bg) px-4 py-3">
            <p className={`${sectionTitle} opacity-60`}>{t.imposterDiscussionTime}</p>
            <p className={`mt-1 text-sm font-bold ${currentTheme.textMain}`}>
              {settings?.mode?.imposterDiscussionTime ?? '—'}s
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderFaq = () => (
    <div className="space-y-4">
      {[
        { q: t.helpFaqQ1, a: t.helpFaqA1 },
        { q: t.helpFaqQ2, a: t.helpFaqA2 },
        { q: t.helpFaqQ3, a: t.helpFaqA3 },
        { q: t.helpFaqQ4, a: t.helpFaqA4 },
      ].map((item, idx) => (
        <div key={idx} className={cardBase}>
          <p className={`text-sm font-bold ${currentTheme.textMain}`}>{item.q}</p>
          <p className={`mt-1.5 text-sm leading-relaxed font-light ${currentTheme.textSecondary}`}>
            {item.a}
          </p>
        </div>
      ))}
    </div>
  );

  const renderPrivacy = () => (
    <div className="space-y-4">
      <div className={cardBase}>
        <p className={sectionTitle}>{t.helpPrivacyTitle}</p>
        <p className={`mt-2 text-sm leading-relaxed font-light ${currentTheme.textSecondary}`}>
          {t.helpPrivacyIntro}
        </p>
        <ul className="mt-3 space-y-2">
          {[t.helpPrivacyP1, t.helpPrivacyP2, t.helpPrivacyP3, t.helpPrivacyP4].map(
            (line: string, i: number) => (
              <li
                key={i}
                className={`text-sm leading-relaxed font-light ${currentTheme.textSecondary}`}
              >
                <span className={`mr-2 ${currentTheme.textMain} opacity-30`}>•</span>
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
      <div className={cardBase}>
        <p className={sectionTitle}>{t.helpImpressumTitle}</p>
        <p className={`mt-2 text-sm leading-relaxed font-light ${currentTheme.textSecondary}`}>
          {t.helpImpressumBody}
        </p>
        <div className="mt-3 rounded-3xl border border-(--ui-border) bg-(--ui-bg) px-4 py-3">
          <p className={`${sectionTitle} opacity-60`}>{t.helpImpressumHost}</p>
          <p className={`mt-1 text-sm font-mono ${currentTheme.textMain}`}>
            {typeof window !== 'undefined' ? window.location.host : '—'}
          </p>
        </div>
        <p className={`mt-3 text-xs leading-relaxed ${currentTheme.textSecondary}`}>
          {t.helpImpressumRepoHint}
        </p>
      </div>
    </div>
  );

  const renderAgb = () => (
    <div className="space-y-4">
      <div className={cardBase}>
        <p className={sectionTitle}>{t.helpAgbTitle}</p>
        <p className={`mt-2 text-sm leading-relaxed font-light ${currentTheme.textSecondary}`}>
          {t.helpAgbIntro}
        </p>
        <ul className="mt-3 space-y-2">
          {[t.helpAgbP1, t.helpAgbP2, t.helpAgbP3, t.helpAgbP4].map((line: string, i: number) => (
            <li
              key={i}
              className={`text-sm leading-relaxed font-light ${currentTheme.textSecondary}`}
            >
              <span className={`mr-2 ${currentTheme.textMain} opacity-30`}>•</span>
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
    <div
      className={`${bottomSheetBackdropClass(visible, 'z-100')}`}
      onClick={handleClose}
      role="presentation"
    >
      <div
        className={bottomSheetPanelClass(visible, 'flex max-h-[90dvh] flex-col min-h-0')}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t.rulesTitle}
      >
        <div className="flex justify-center pt-2 pb-0 shrink-0">
          <div className="h-1 w-10 rounded-full bg-(--ui-border)" />
        </div>
        <div className="shrink-0 px-7 pt-2 pb-3 flex items-center justify-between">
          <h2 className={`text-2xl font-serif ${currentTheme.textMain}`}>{t.rulesTitle}</h2>
          <button
            onClick={handleClose}
            className="opacity-40 hover:opacity-100 transition-opacity p-2"
          >
            <X size={22} className={currentTheme.iconColor} />
          </button>
        </div>
        <div className="shrink-0 px-6 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] whitespace-nowrap transition-all ${activeTab === tab ? `${currentTheme.button} shadow-lg` : `opacity-40 hover:opacity-70 ${currentTheme.textMain}`}`}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">{tabContent[activeTab]()}</div>
        <div className="shrink-0 px-8 pb-8 pt-4">
          <Button themeClass={currentTheme.button} fullWidth onClick={handleClose} size="lg">
            {t.close}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const RulesScreen = () => {
  const { setGameState, settings, currentTheme } = useGame();
  const t = useT();
  return (
    <div
      className={`flex flex-col min-h-screen ${currentTheme.bg} p-6 md:p-10 justify-center items-center`}
    >
      <div
        className={`w-full max-w-2xl space-y-10 p-8 md:p-12 rounded-[2.5rem] ${currentTheme.card} overflow-y-auto`}
        style={{ maxHeight: '85vh' }}
      >
        <h2 className={`text-3xl font-serif mb-6 text-center ${currentTheme.textMain}`}>
          {t.infoRules}
        </h2>
        <div className="space-y-5 mb-8">
          {[t.infoRule1, t.infoRule2, t.infoRule3, t.infoRule4, t.infoRule5, t.infoRule6].map(
            (rule: string, i: number) => (
              <div key={i} className="flex gap-4 items-start">
                <span
                  className={`font-serif text-xl opacity-20 shrink-0 w-5 text-right ${currentTheme.textMain}`}
                >
                  {i + 1}
                </span>
                <p
                  className={`text-sm leading-relaxed tracking-wide font-light ${currentTheme.textSecondary}`}
                >
                  {rule}
                </p>
              </div>
            )
          )}
        </div>
        <Button
          themeClass={currentTheme.button}
          fullWidth
          onClick={() => setGameState(GameState.MENU)}
          size="xl"
        >
          {t.close}
        </Button>
      </div>
    </div>
  );
};
