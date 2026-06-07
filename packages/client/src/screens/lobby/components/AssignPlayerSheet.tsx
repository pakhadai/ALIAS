import React, { useId } from 'react';
import type { Player, Team, GameActionPayload } from '../../../types';
import { Button } from '../../../components/Button';
import { ModalSheet } from '../../../components/ModalSheet';
import { ModalSheetTitle } from '../../../components/Shared';
import { AvatarDisplay } from '../../../components/AvatarDisplay';
import type { TranslationStrings } from '../../../hooks/useT';
import {
  typographyClass,
  labelSectionClass,
  labelSectionTitleClass,
  formLabelClass,
} from '../../../constants/typography';

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
  const titleId = useId();

  if (!target) return null;

  const dismiss = () => onClose();

  return (
    <ModalSheet
      open={isOpen}
      onClose={dismiss}
      zLayer="modalNested"
      size="default"
      ariaLabelledBy={titleId}
    >
      <div className="flex items-center gap-3 mb-4">
        {target.avatarId != null ? (
          <AvatarDisplay avatarId={target.avatarId} size={36} />
        ) : (
          <span className="text-2xl">{target.avatar}</span>
        )}
        <div className="min-w-0">
          <ModalSheetTitle id={titleId}>{target.name}</ModalSheetTitle>
          <p className={`${typographyClass.body} text-ui-fg-muted`}>{t.assignPlayerSheetHint}</p>
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
              dismiss();
            }}
            className="w-full py-3 rounded-2xl border border-ui-border bg-ui-surface hover:bg-ui-surface-hover transition-all active:scale-[0.98] flex items-center justify-between px-4"
          >
            <span className="inline-flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: team.colorHex || undefined }}
              />
              <span className={`${typographyClass.label} tracking-wide text-ui-fg-muted truncate`}>
                {team.name}
              </span>
            </span>
            <span className={`${typographyClass.body} font-bold text-ui-fg-muted tabular-nums`}>
              {team.players.length}
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={() => {
            sendAction({ action: 'TEAM_LEAVE', data: { playerId: target.id } });
            dismiss();
          }}
          className={`w-full py-3 rounded-2xl border border-ui-border bg-ui-surface hover:bg-ui-surface-hover transition-all active:scale-[0.98] ${typographyClass.label} tracking-wide text-ui-fg-muted`}
        >
          {t.makeUnassigned}
        </button>
      </div>

      <Button variant="ghost" fullWidth size="lg" className="mt-4" onClick={dismiss}>
        <span className="opacity-40 hover:opacity-100 transition-opacity font-sans">
          {t.cancel}
        </span>
      </Button>
    </ModalSheet>
  );
}
