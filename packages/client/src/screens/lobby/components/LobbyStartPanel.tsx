import React from 'react';
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
    <div data-testid="lobby-start-panel" className="lobby-start-glass rounded-3xl p-4 space-y-3">
      <LobbyReadinessBar readiness={readiness} t={t} />
      <div
        data-testid="lobby-start-btn-shell"
        className={`lobby-start-btn-shell w-full rounded-[var(--theme-radius)] ${
          readiness.ok ? 'lobby-start-btn-shell--ready' : ''
        }`}
      >
        <button
          type="button"
          onClick={onStartTap}
          aria-disabled={!readiness.ok}
          className={`relative z-[1] inline-flex w-full items-center justify-center rounded-[var(--theme-radius)] px-10 py-5 ${typographyClass.label} font-semibold tracking-wide transition-all duration-200 ease-out active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ui-accent-ring focus-visible:ring-offset-ui-bg ${theme.button} ${
            readiness.ok
              ? 'shadow-[0_0_24px_color-mix(in_srgb,var(--ui-accent)_40%,transparent)]'
              : 'opacity-30'
          }`}
        >
          {t.startGame}
        </button>
      </div>
    </div>
  );
}
