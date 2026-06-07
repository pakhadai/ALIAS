import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * Defers `open` to the next animation frame so bottom-sheet CSS transitions run (closed → open).
 * Legitimate subscription: one rAF while `enabled`; cleanup cancels pending frame.
 */
export function useDeferredOpen(enabled = true): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setOpen(false);
      return;
    }
    const raf = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  return [open, setOpen];
}
