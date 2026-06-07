import React from 'react';
import type { Player } from '../../../types';
import { AvatarDisplay } from '../../../components/AvatarDisplay';

import type { TranslationStrings } from '../../../hooks/useT';
import { typographyClass } from '../../../constants/typography';

type T = TranslationStrings;

export function UnassignedPool(props: {
  unassigned: Player[];
  canHostAssignOffline: boolean;
  onPick: (p: Player) => void;
  t: T;
}): React.ReactNode {
  const { unassigned, canHostAssignOffline, onPick, t } = props;

  if (unassigned.length === 0) return null;

  return (
    <div className="rounded-2xl border border-ui-border bg-ui-surface p-3">
      <p className={`${typographyClass.body} font-medium text-ui-fg-muted`}>
        {(t.unassignedPool ?? 'Unassigned ({0})').replace('{0}', String(unassigned.length))}
      </p>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {unassigned.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              if (!canHostAssignOffline) return;
              onPick(p);
            }}
            className={`px-2 py-1 rounded-full border border-ui-border bg-ui-card ${typographyClass.body} text-ui-fg-muted inline-flex items-center gap-1.5 transition-all duration-200 ease-out active:scale-[0.98] ${
              canHostAssignOffline ? 'hover:bg-ui-surface-hover' : 'cursor-default'
            }`}
            aria-label={(t.assignPlayerAria ?? 'Assign {0}').replace('{0}', p.name)}
          >
            {p.avatarId != null ? (
              <AvatarDisplay avatarId={p.avatarId} size={16} />
            ) : (
              <span className="text-sm">{p.avatar}</span>
            )}
            <span className="max-w-[100px] truncate">{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
