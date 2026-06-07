import React from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import type { LobbyReadiness } from '../deriveLobbyReadiness';
import type { TranslationStrings } from '../../../hooks/useT';

type T = TranslationStrings;

export function LobbyReadinessBar(props: { readiness: LobbyReadiness; t: T }): React.ReactNode {
  const { readiness, t } = props;

  if (readiness.ok) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-1.5 text-center"
        data-testid="lobby-readiness-bar"
      >
        <div className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--ui-success)_25%,transparent)] bg-[color-mix(in_srgb,var(--ui-success)_10%,transparent)] px-3 py-2.5 text-sm font-sans text-ui-success">
          <Check size={16} className="shrink-0" aria-hidden />
          <span>{t.lobbyReadinessReady}</span>
        </div>
        {readiness.hasOverfilledTeams ? (
          <p
            className="flex items-center justify-center gap-1.5 text-xs font-sans text-ui-warning"
            data-testid="lobby-readiness-overfilled"
          >
            <AlertTriangle size={14} className="shrink-0" aria-hidden />
            <span>{t.teamTooMany}</span>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <p
      role="status"
      aria-live="polite"
      className="text-center text-sm font-sans text-ui-fg-muted"
      data-testid="lobby-readiness-bar"
    >
      <span data-testid="lobby-start-validation">{readiness.firstBlockingReason}</span>
    </p>
  );
}
