import { useCallback, useEffect, useState } from 'react';
import { useBackNavigationGuard } from '../context/BackNavigationGuardContext';

export type UseUnsavedChangesGuardArgs = {
  isDirty: boolean;
  onSave?: () => void | Promise<void>;
};

export function useUnsavedChangesGuard({ isDirty, onSave }: UseUnsavedChangesGuardArgs) {
  const { registerGuard } = useBackNavigationGuard();
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  const [savingLeave, setSavingLeave] = useState(false);

  const requestLeave = useCallback(
    (proceed: () => void) => {
      if (!isDirty) {
        proceed();
        return;
      }
      setPendingLeave(() => proceed);
    },
    [isDirty]
  );

  useEffect(() => {
    registerGuard({ isDirty, requestLeave });
    return () => registerGuard(null);
  }, [isDirty, registerGuard, requestLeave]);

  const guardedNavigate = useCallback(
    (proceed: () => void) => {
      requestLeave(proceed);
    },
    [requestLeave]
  );

  const closeModal = useCallback(() => {
    if (!savingLeave) setPendingLeave(null);
  }, [savingLeave]);

  const confirmDiscard = useCallback(() => {
    const proceed = pendingLeave;
    setPendingLeave(null);
    proceed?.();
  }, [pendingLeave]);

  const confirmSaveAndLeave = useCallback(async () => {
    if (!onSave || !pendingLeave) return;
    setSavingLeave(true);
    try {
      await onSave();
      const proceed = pendingLeave;
      setPendingLeave(null);
      proceed();
    } finally {
      setSavingLeave(false);
    }
  }, [onSave, pendingLeave]);

  return {
    guardedNavigate,
    unsavedModalOpen: pendingLeave !== null,
    savingLeave,
    closeUnsavedModal: closeModal,
    confirmDiscard,
    confirmSaveAndLeave,
  };
}
