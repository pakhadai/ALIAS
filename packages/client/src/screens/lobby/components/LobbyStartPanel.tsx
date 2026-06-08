import React from 'react';
import { Lock } from 'lucide-react';
import type { LobbyReadiness } from '../deriveLobbyReadiness';
import type { TranslationStrings } from '../../../hooks/useT';
import type { ThemeConfig } from '../../../types';
import { LobbyReadinessBar } from './LobbyReadinessBar';
import { typographyClass } from '../../../constants/typography';

type T = TranslationStrings;

export function LobbyStartPanel(props: {
  readiness: LobbyReadiness;
  t: T;
  theme: ThemeConfig;
  onStartTap: () => void;
}): React.ReactNode {
  const { readiness, t, theme, onStartTap } = props;

  return (
    <div data-testid="lobby-start-panel" className="w-full space-y-3">
      <LobbyReadinessBar readiness={readiness} t={t} />
      <div
        data-testid="lobby-start-btn-shell"
        className={`lobby-start-btn-shell w-full rounded-[var(--theme-radius)] ${
          readiness.ok ? 'lobby-start-btn-shell--ready' : 'lobby-start-btn-shell--blocked'
        }`}
      >
        <button
          type="button"
          data-testid="lobby-start-btn"
          onClick={onStartTap}
          aria-disabled={!readiness.ok}
          className={`lobby-start-btn relative z-[1] inline-flex w-full items-center justify-center gap-2 rounded-[var(--theme-radius)] px-10 py-5 ${typographyClass.label} font-semibold tracking-wide transition-transform duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ui-accent-ring focus-visible:ring-offset-ui-bg ${
            readiness.ok ? `lobby-start-btn--ready ${theme.button}` : 'lobby-start-btn--blocked'
          }`}
        >
          <span>{t.startGame}</span>
          {!readiness.ok ? (
            <Lock size={18} className="shrink-0 opacity-90" strokeWidth={2.25} aria-hidden />
          ) : null}
        </button>
      </div>
    </div>
  );
}
