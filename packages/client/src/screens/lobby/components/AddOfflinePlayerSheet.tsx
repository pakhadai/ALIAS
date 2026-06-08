import React, { useEffect, useState } from 'react';
import { Button } from '../../../components/Button';
import { ModalSheet } from '../../../components/ModalSheet';
import { ModalSheetTitle } from '../../../components/Shared';
import type { ThemeConfig } from '../../../types';
import { AVATARS } from '../../../utils/avatars';
import { MAX_PLAYERS } from '../../../constants';
import {
  keyboardAvoidingBottomPadding,
  scrollElementIntoViewCentered,
} from '../../../hooks/useVisualViewportBottomInset';
import { typographyClass } from '../../../constants/typography';
import type { TranslationStrings } from '../../../hooks/useT';

type T = TranslationStrings;

export function AddOfflinePlayerSheet(props: {
  playersCount: number;
  theme: ThemeConfig;
  t: T;
  keyboardBottomInset: number;
  onClose: () => void;
  addOfflinePlayer: (name: string, avatar: string) => void;
  showNotification: (message: string, type: 'error' | 'success' | 'info') => void;
}): React.ReactNode {
  const {
    playersCount,
    theme,
    t,
    keyboardBottomInset,
    onClose,
    addOfflinePlayer,
    showNotification,
  } = props;

  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerAvatar, setNewPlayerAvatar] = useState(
    AVATARS[(playersCount + 1) % AVATARS.length] ?? AVATARS[0] ?? '🙂'
  );

  useEffect(() => {
    setNewPlayerName('');
    setNewPlayerAvatar(AVATARS[(playersCount + 1) % AVATARS.length] ?? AVATARS[0] ?? '🙂');
  }, [playersCount]);

  const atLimit = playersCount >= MAX_PLAYERS;

  const handleConfirm = () => {
    if (atLimit) {
      showNotification(t.playerLimitReached.replace('{0}', String(MAX_PLAYERS)), 'error');
      return;
    }
    const name = newPlayerName.trim();
    if (!name) return;
    addOfflinePlayer(name, newPlayerAvatar);
    onClose();
  };

  return (
    <ModalSheet
      open
      onClose={onClose}
      size="default"
      showClose
      closeAriaLabel={t.close}
      closeIconSize={24}
      backdropStyle={keyboardAvoidingBottomPadding(keyboardBottomInset)}
      ariaLabelledBy="add-player-title"
      header={
        <ModalSheetTitle id="add-player-title" themeClass={theme.textMain}>
          {t.addPlayerTitle}
        </ModalSheetTitle>
      }
    >
      <div data-testid="add-player-modal" className="space-y-6">
        {atLimit && (
          <div className="mb-6 rounded-2xl border border-[color-mix(in_srgb,var(--ui-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--ui-danger)_10%,transparent)] p-4 text-center">
            <p className={`${typographyClass.label} text-ui-danger tracking-widest`}>
              {t.playerLimitMaxTitle}
            </p>
            <p className={`${typographyClass.label} text-ui-fg-muted mt-2`}>
              {t.playerLimitMaxHint.replace('{0}', String(MAX_PLAYERS))}
            </p>
          </div>
        )}
        <input
          autoFocus
          value={newPlayerName}
          onFocus={(e) => scrollElementIntoViewCentered(e.currentTarget)}
          onChange={(e) => setNewPlayerName(e.target.value.replace(/<[^>]*>/g, '').slice(0, 20))}
          placeholder={t.namePlaceholder}
          className={`w-full bg-ui-surface border border-ui-border text-ui-fg placeholder:text-ui-fg-muted rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-ui-accent focus:border-ui-accent transition-all font-bold text-center ${typographyClass.bodyInput}`}
        />
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 -mx-1 px-1">
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setNewPlayerAvatar(a)}
              className={`shrink-0 text-2xl p-2 rounded-xl transition-all ${
                newPlayerAvatar === a
                  ? 'bg-[color-mix(in_srgb,var(--ui-accent)_18%,transparent)] scale-110 shadow-lg'
                  : 'hover:bg-ui-surface-hover opacity-60 hover:opacity-100'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <Button
          type="button"
          themeClass={theme.button}
          fullWidth
          size="lg"
          onClick={handleConfirm}
          disabled={!newPlayerName.trim() || atLimit}
        >
          {t.add}
        </Button>
      </div>
    </ModalSheet>
  );
}
