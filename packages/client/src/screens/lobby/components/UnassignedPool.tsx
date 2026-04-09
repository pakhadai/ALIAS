import React from 'react';
import type { Player } from '../../../types';
import { AvatarDisplay } from '../../../components/AvatarDisplay';

export function UnassignedPool(props: {
  unassigned: Player[];
  canHostAssignOffline: boolean;
  onPick: (p: Player) => void;
}): React.ReactNode {
  const { unassigned, canHostAssignOffline, onPick } = props;

  return (
    <div className="rounded-3xl border border-(--ui-border) bg-(--ui-surface) p-4">
      <p className="text-[9px] uppercase tracking-widest font-bold text-(--ui-fg-muted)">
        Нерозподілені ({unassigned.length})
      </p>
      <div className="flex flex-wrap gap-2 mt-3">
        {unassigned.length === 0 ? (
          <span className="text-[10px] italic text-(--ui-fg-muted) opacity-70">—</span>
        ) : (
          unassigned.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                if (!canHostAssignOffline) return;
                onPick(p);
              }}
              className={`px-3 py-1.5 rounded-full border border-(--ui-border) bg-(--ui-card) text-[10px] font-bold uppercase tracking-widest text-(--ui-fg-muted) inline-flex items-center gap-2 transition-all active:scale-[0.98] ${
                canHostAssignOffline ? 'hover:bg-(--ui-surface-hover)' : 'cursor-default'
              }`}
              aria-label={`Assign ${p.name}`}
            >
              {p.avatarId != null ? <AvatarDisplay avatarId={p.avatarId} size={18} /> : <span>{p.avatar}</span>}
              <span className="max-w-[140px] truncate">{p.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

