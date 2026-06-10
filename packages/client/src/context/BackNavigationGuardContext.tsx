import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';

export type BackNavigationGuard = {
  isDirty: boolean;
  requestLeave: (proceed: () => void) => void;
};

type BackNavigationGuardContextValue = {
  registerGuard: (guard: BackNavigationGuard | null) => void;
  runGuardedNavigation: (proceed: () => void) => void;
};

const BackNavigationGuardContext = createContext<BackNavigationGuardContextValue | undefined>(
  undefined
);

export const BackNavigationGuardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const guardRef = useRef<BackNavigationGuard | null>(null);

  const registerGuard = useCallback((guard: BackNavigationGuard | null) => {
    guardRef.current = guard;
  }, []);

  const runGuardedNavigation = useCallback((proceed: () => void) => {
    const guard = guardRef.current;
    if (guard?.isDirty) {
      guard.requestLeave(proceed);
      return;
    }
    proceed();
  }, []);

  const value = useMemo(
    () => ({ registerGuard, runGuardedNavigation }),
    [registerGuard, runGuardedNavigation]
  );

  return (
    <BackNavigationGuardContext.Provider value={value}>
      {children}
    </BackNavigationGuardContext.Provider>
  );
};

export function useBackNavigationGuard(): BackNavigationGuardContextValue {
  const ctx = useContext(BackNavigationGuardContext);
  if (!ctx) {
    throw new Error('useBackNavigationGuard must be used within BackNavigationGuardProvider');
  }
  return ctx;
}

/** Read guard runner without throwing — for App-level hooks outside provider edge cases. */
export function useBackNavigationGuardOptional(): BackNavigationGuardContextValue | null {
  return useContext(BackNavigationGuardContext) ?? null;
}
