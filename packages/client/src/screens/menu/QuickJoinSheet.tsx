import React, { useRef, useState } from 'react';
import { useDeferredSheetInputFocus } from '../../hooks/useBottomSheetPresence';
import { ArrowRight } from 'lucide-react';
import { Button } from '../../components/Button';
import { ModalSheet } from '../../components/ModalSheet';
import { ModalSheetTitle } from '../../components/Shared';
import { ROOM_CODE_LENGTH } from '../../constants';
import type { ThemeConfig } from '../../types';
import type { TranslationStrings } from '../../hooks/useT';
import { typographyClass } from '../../constants/typography';

type T = TranslationStrings;

/** Mount when shown; unmount via `onDismiss` after exit animation (TMA-safe enter). */
export function QuickJoinSheet(props: {
  onDismiss: () => void;
  theme: ThemeConfig;
  t: T;
  canSubmit: boolean;
  checking: boolean;
  code: string;
  onCodeChange: (code: string) => void;
  onSubmit: () => void;
}): React.ReactNode {
  const { onDismiss, theme, t, canSubmit, checking, code, onCodeChange, onSubmit } = props;
  const [open, setOpen] = useState(true);
  const codeInputRef = useRef<HTMLInputElement>(null);
  useDeferredSheetInputFocus(codeInputRef, open);
  const requestClose = () => setOpen(false);

  return (
    <ModalSheet
      open={open}
      onClose={requestClose}
      onExited={onDismiss}
      size="compact"
      showClose
      closeAriaLabel={t.close}
      ariaLabelledBy="quick-join-title"
      header={
        <ModalSheetTitle id="quick-join-title" themeClass={theme.textMain}>
          {t.enterCode}
        </ModalSheetTitle>
      }
    >
      <div data-testid="menu-quick-join-sheet">
        <div className="rounded-3xl bg-ui-surface border border-ui-border px-4 py-3 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                if (val.length <= ROOM_CODE_LENGTH) onCodeChange(val);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSubmit();
              }}
              placeholder="00000"
              data-testid="menu-quick-join-code"
              className={`flex-1 bg-transparent text-ui-fg font-sans font-bold tracking-[0.25em] ${typographyClass.bodyInput} px-2 py-2 outline-none placeholder:text-ui-fg-muted`}
              ref={codeInputRef}
              aria-label={t.enterCode}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onSubmit}
              disabled={!canSubmit || checking}
              data-testid="menu-quick-join-submit"
              className="!px-2.5 !py-2.5 shrink-0"
              aria-label={t.enter}
              icon={
                checking ? (
                  <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                ) : (
                  <ArrowRight size={18} strokeWidth={2.5} />
                )
              }
            >
              <span className="sr-only">{t.enter}</span>
            </Button>
          </div>
        </div>
      </div>
    </ModalSheet>
  );
}
