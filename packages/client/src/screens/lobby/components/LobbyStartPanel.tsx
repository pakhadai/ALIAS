import React from 'react';
import { Lock } from 'lucide-react';
import type { LobbyReadiness } from '../deriveLobbyReadiness';
import type { TranslationStrings } from '../../../hooks/useT';
import type { ThemeConfig } from '../../../types';
import { AccentFooterCta } from '../../../components/layout';
import { LobbyReadinessBar } from './LobbyReadinessBar';

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
      <AccentFooterCta
        buttonTestId="lobby-start-btn"
        shellTestId="lobby-start-btn-shell"
        themeButtonClass={theme.button}
        onClick={onStartTap}
        variant={readiness.ok ? 'animated' : 'blocked'}
        trailingIcon={
          !readiness.ok ? (
            <Lock size={18} className="shrink-0 opacity-90" strokeWidth={2.25} aria-hidden />
          ) : undefined
        }
      >
        {t.startGame}
      </AccentFooterCta>
    </div>
  );
}
