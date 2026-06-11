import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';

type LobbyExitContextValue = {
  registerLobbyExitHandler: (handler: (() => void) | null) => void;
  requestLobbyExit: () => void;
};

const LobbyExitContext = createContext<LobbyExitContextValue | undefined>(undefined);

export const LobbyExitProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const handlerRef = useRef<(() => void) | null>(null);

  const registerLobbyExitHandler = useCallback((handler: (() => void) | null) => {
    handlerRef.current = handler;
  }, []);

  const requestLobbyExit = useCallback(() => {
    handlerRef.current?.();
  }, []);

  const value = useMemo(
    () => ({ registerLobbyExitHandler, requestLobbyExit }),
    [registerLobbyExitHandler, requestLobbyExit]
  );

  return <LobbyExitContext.Provider value={value}>{children}</LobbyExitContext.Provider>;
};

export function useLobbyExit(): LobbyExitContextValue {
  const ctx = useContext(LobbyExitContext);
  if (!ctx) {
    throw new Error('useLobbyExit must be used within LobbyExitProvider');
  }
  return ctx;
}

/** Read lobby exit runner without throwing — for App-level hooks. */
export function useLobbyExitOptional(): LobbyExitContextValue | null {
  return useContext(LobbyExitContext) ?? null;
}
