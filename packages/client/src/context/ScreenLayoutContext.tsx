import { createContext, useContext, type ReactNode } from 'react';
import type { ScreenLayoutConfig } from '../constants/screenLayout';

const ScreenLayoutContext = createContext<ScreenLayoutConfig | null>(null);

export function ScreenLayoutProvider({
  value,
  children,
}: {
  value: ScreenLayoutConfig | null;
  children: ReactNode;
}) {
  return <ScreenLayoutContext.Provider value={value}>{children}</ScreenLayoutContext.Provider>;
}

/** Layout from parent {@link ScreenShell} — survives {@link GlassChromePortal} (React context). */
export function useScreenLayoutOptional(): ScreenLayoutConfig | null {
  return useContext(ScreenLayoutContext);
}
