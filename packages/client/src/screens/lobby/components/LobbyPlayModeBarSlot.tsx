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

export function LobbyPlayModeBarSlot(props: {
  open: boolean;
  children: React.ReactNode;
}): React.ReactNode {
  const { open, children } = props;
  const innerRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  const prevOpenRef = useRef<boolean | null>(null);

  openRef.current = open;

  const [shell, setShell] = useState<ShellState>(() =>
    open
      ? { mounted: true, phase: 'enter', heightPx: 0, liftPx: -12, opacity: 0 }
      : { mounted: false, phase: 'exit', heightPx: 0, liftPx: 0, opacity: 0 }
  );

  const measureHeight = useCallback((): number => {
    const el = innerRef.current;
    if (!el) return 0;
    return el.scrollHeight;
  }, []);

  useEffect(() => {
    if (!open) return;
    setShell((s) => {
      if (s.mounted) return s;
      return { mounted: true, phase: 'enter', heightPx: 0, liftPx: -12, opacity: 0 };
    });
  }, [open]);

  useLayoutEffect(() => {
    if (!shell.mounted) return;

    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (open && wasOpen !== true) {
      const h = measureHeight();
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

    return undefined;
  }, [open, shell.mounted, measureHeight]);

  if (!shell.mounted) return null;

  const motionAttr: 'enter' | 'idle' | 'exit' =
    shell.phase === 'idle' ? 'idle' : shell.phase === 'enter' ? 'enter' : 'exit';

  const animMs = `${LOBBY_PLAY_MODE_BAR_ANIM_MS}ms`;

  return (
    <div
      className="lobby-play-mode-slot"
      data-motion={motionAttr}
      data-testid="lobby-play-mode-bar-slot"
      style={{
        height: shell.heightPx,
        opacity: shell.opacity,
        transition: `height ${animMs} ${EASE}, opacity ${animMs} ${EASE}`,
      }}
    >
      <div
        ref={innerRef}
        className="lobby-play-mode-slot__inner"
        style={{
          transform: `translateY(${shell.liftPx}px)`,
          transition: `transform ${animMs} ${EASE}`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
