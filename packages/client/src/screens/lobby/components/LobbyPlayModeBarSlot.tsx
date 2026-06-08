import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Must match `--lobby-play-mode-anim-ms` in styles.css */
export const LOBBY_PLAY_MODE_BAR_ANIM_MS = 520;

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

type MotionPhase = 'enter' | 'idle' | 'exit';

type ShellState = {
  mounted: boolean;
  phase: MotionPhase;
  heightPx: number;
  liftPx: number;
  opacity: number;
};

function idleShell(heightPx: number): ShellState {
  return { mounted: true, phase: 'idle', heightPx, liftPx: 0, opacity: 1 };
}

export function LobbyPlayModeBarSlot(props: {
  open: boolean;
  children: React.ReactNode;
}): React.ReactNode {
  const { open, children } = props;
  const innerRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  const prevOpenRef = useRef<boolean | null>(null);
  /** Skip enter animation on first paint — avoids invisible reserved gap in lobby. */
  const skipEnterAnimRef = useRef(true);

  openRef.current = open;

  const [shell, setShell] = useState<ShellState>(() =>
    open
      ? { mounted: true, phase: 'enter', heightPx: 0, liftPx: 0, opacity: 1 }
      : { mounted: false, phase: 'exit', heightPx: 0, liftPx: 0, opacity: 0 }
  );

  const measureHeight = useCallback((): number => {
    const el = innerRef.current;
    if (!el) return 0;
    return el.scrollHeight;
  }, []);

  const syncHeight = useCallback(() => {
    const h = measureHeight();
    if (h <= 0) return;
    setShell((s) => (s.mounted && s.heightPx === h ? s : { ...s, heightPx: h }));
  }, [measureHeight]);

  useEffect(() => {
    if (!open) return;
    setShell((s) => {
      if (s.mounted) return s;
      return { mounted: true, phase: 'enter', heightPx: 0, liftPx: 0, opacity: 1 };
    });
  }, [open]);

  useLayoutEffect(() => {
    if (!shell.mounted) return;

    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (open && wasOpen !== true) {
      const h = measureHeight();

      if (skipEnterAnimRef.current) {
        skipEnterAnimRef.current = false;
        setShell(idleShell(h));
        return undefined;
      }

      setShell((s) => ({ ...s, heightPx: h, phase: 'enter', liftPx: -12, opacity: 0 }));

      let enterRaf = 0;
      enterRaf = requestAnimationFrame(() => {
        enterRaf = requestAnimationFrame(() => {
          if (!openRef.current) return;
          setShell((s) => ({ ...s, phase: 'idle', heightPx: h, liftPx: 0, opacity: 1 }));
        });
      });
      return () => cancelAnimationFrame(enterRaf);
    }

    if (!open && wasOpen === true) {
      const h = measureHeight();
      setShell((s) => ({ ...s, phase: 'exit', heightPx: h, liftPx: 0, opacity: 1 }));

      let exitRaf = 0;
      let timer = 0;

      exitRaf = requestAnimationFrame(() => {
        exitRaf = requestAnimationFrame(() => {
          setShell((s) => ({ ...s, heightPx: 0, liftPx: -16, opacity: 0 }));
          timer = window.setTimeout(() => {
            setShell((s) => ({ ...s, mounted: false }));
          }, LOBBY_PLAY_MODE_BAR_ANIM_MS + 48);
        });
      });

      return () => {
        cancelAnimationFrame(exitRaf);
        clearTimeout(timer);
      };
    }

    syncHeight();
    return undefined;
  }, [open, shell.mounted, measureHeight, syncHeight]);

  useEffect(() => {
    if (!shell.mounted || !open) return undefined;
    const el = innerRef.current;
    if (!el) return undefined;

    const ro = new ResizeObserver(() => {
      syncHeight();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [shell.mounted, open, syncHeight]);

  if (!shell.mounted) return null;

  const motionAttr: 'enter' | 'idle' | 'exit' =
    shell.phase === 'idle' ? 'idle' : shell.phase === 'enter' ? 'enter' : 'exit';

  const animMs = `${LOBBY_PLAY_MODE_BAR_ANIM_MS}ms`;
  const animate = shell.phase !== 'idle';

  return (
    <div
      className="lobby-play-mode-slot"
      data-motion={motionAttr}
      data-testid="lobby-play-mode-bar-slot"
      style={{
        height: shell.heightPx,
        opacity: shell.opacity,
        transition: animate ? `height ${animMs} ${EASE}, opacity ${animMs} ${EASE}` : undefined,
      }}
    >
      <div
        ref={innerRef}
        className="lobby-play-mode-slot__inner"
        style={{
          transform: `translateY(${shell.liftPx}px)`,
          transition: animate ? `transform ${animMs} ${EASE}` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
