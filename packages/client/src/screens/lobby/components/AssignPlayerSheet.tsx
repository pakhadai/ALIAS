import React, { useEffect, useId, useState } from 'react';
import type { Player, Team, GameActionPayload } from '../../../types';
import { ModalSheet } from '../../../components/ModalSheet';
import { AvatarDisplay } from '../../../components/AvatarDisplay';
import type { TranslationStrings } from '../../../hooks/useT';

type T = TranslationStrings;

export function AssignPlayerSheet(props: {
  isOpen: boolean;
  target: Player | null;
  teamShells: Team[];
  t: T;
  onClose: () => void;
  sendAction: (a: GameActionPayload) => void;
}): React.ReactNode {
  const { isOpen, target, teamShells, t, onClose, sendAction } = props;
  const [sheetOpen, setSheetOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (isOpen && target) {
      const r = requestAnimationFrame(() => setSheetOpen(true));
      return () => cancelAnimationFrame(r);
    }
    setSheetOpen(false);
    return undefined;
  }, [isOpen, target]);

  const requestClose = () => {
    setSheetOpen(false);
    setTimeout(onClose, 300);
  };

  if (!isOpen || !target) return null;

  return (
    <ModalSheet
      open={sheetOpen}
      onClose={requestClose}
      zLayer="modalNested"
      maxWidth="sm"
      showHandle
      paddedContent
      ariaLabelledBy={titleId}
    >
      <div className="flex items-center gap-3 mb-4">
        {target.avatarId != null ? (
          <AvatarDisplay avatarId={target.avatarId} size={36} />
        ) : (
          <span className="text-2xl">{target.avatar}</span>
        )}
        <div className="min-w-0">
          <p id={titleId} className="text-ui-fg font-sans font-semibold">
            {target.name}
          </p>
          <p className="text-ui-fg-muted text-xs">Розподілити в команду</p>
        </div>
      </div>

      <div className="space-y-2">
        {teamShells.map((team) => (
          <button
            key={team.id}
            type="button"
            onClick={() => {
              sendAction({
                action: 'TEAM_JOIN',
                data: { teamId: team.id, playerId: target.id },
              });
              setSheetOpen(false);
              setTimeout(onClose, 300);
            }}
            className="w-full py-3 rounded-2xl border border-ui-border bg-ui-surface hover:bg-ui-surface-hover transition-all active:scale-[0.98] flex items-center justify-between px-4"
          >
            <span className="inline-flex items-center gap-2 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full ${team.color}`} />
              <span className="text-[11px] font-bold uppercase tracking-widest text-ui-fg-muted truncate">
                {team.name}
              </span>
            </span>
            <span className="text-[10px] font-bold text-ui-fg-muted opacity-60">
              {team.players.length}
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={() => {
            sendAction({ action: 'TEAM_LEAVE', data: { playerId: target.id } });
            setSheetOpen(false);
            setTimeout(onClose, 300);
          }}
          className="w-full py-3 rounded-2xl border border-ui-border bg-ui-surface hover:bg-ui-surface-hover transition-all active:scale-[0.98] text-[10px] uppercase tracking-widest font-bold text-ui-fg-muted"
        >
          Зробити нерозподіленим
        </button>
      </div>

      <button
        type="button"
        onClick={requestClose}
        className="mt-4 w-full py-3 rounded-2xl font-sans text-xs font-bold uppercase tracking-widest bg-ui-surface text-ui-fg border border-ui-border hover:bg-ui-surface-hover transition-all active:scale-[0.98]"
      >
        {t.cancel}
      </button>
    </ModalSheet>
  );
}
