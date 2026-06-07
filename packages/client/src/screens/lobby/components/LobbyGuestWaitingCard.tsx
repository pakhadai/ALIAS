import React from 'react';
import { Check, Circle } from 'lucide-react';
import type { ThemeConfig } from '../../../types';
import type { TranslationStrings } from '../../../hooks/useT';
import { typographyClass } from '../../../constants/typography';

type T = TranslationStrings;

export function LobbyGuestWaitingCard(props: {
  theme: ThemeConfig;
  t: T;
  playersCount: number;
  isSolo: boolean;
  myTeamId: string | null;
}): React.ReactNode {
  const { theme, t, playersCount, isSolo, myTeamId } = props;

  const teamStepOk = isSolo || myTeamId != null;
  const teamStepLabel = teamStepOk ? t.lobbyGuestInTeam : t.lobbyGuestPickTeam;

  return (
    <div
      className="w-full max-w-sm rounded-2xl border border-ui-border bg-ui-surface p-4"
      data-testid="lobby-guest-waiting"
    >
      <p className={`font-serif text-base ${theme.textMain}`}>{t.lobbyGuestWaitingTitle}</p>
      <ul className="mt-3 space-y-2">
        {!isSolo ? (
          <li className={`flex items-center gap-2 ${typographyClass.body} text-ui-fg-muted`}>
            {teamStepOk ? (
              <Check size={16} className="shrink-0 text-ui-success" aria-hidden />
            ) : (
              <Circle size={16} className="shrink-0 text-ui-fg-muted" aria-hidden />
            )}
            <span className={teamStepOk ? 'text-ui-fg' : 'text-ui-accent'}>{teamStepLabel}</span>
          </li>
        ) : null}
        <li className={`flex items-center gap-2 ${typographyClass.body} text-ui-fg-muted`}>
          <Check size={16} className="shrink-0 text-ui-success" aria-hidden />
          <span>
            {(t.lobbyGuestPlayerCount ?? '{0} players').replace('{0}', String(playersCount))}
          </span>
        </li>
      </ul>
    </div>
  );
}
