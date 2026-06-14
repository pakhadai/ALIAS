import React, { useCallback, useEffect, useRef, useState } from 'react';
import { typographyClass } from '../../../constants/typography';

type TPlaying = Record<string, string>;

export const SWIPE_THRESHOLD_PX = 52;
const SWIPE_MAX_DRAG = 72;

export interface ClassicWordCardProps {
  displayPrompt: string;
  hint?: string;
  tabooWords?: string[];
  showTaboo?: boolean;
  isCriticalTime: boolean;
  onSwipe?: (direction: 'correct' | 'skip', origin: { x: number; y: number }) => void;
  swipeDisabled?: boolean;
  hintLabel?: string;
  /** Front-side tap hint when flip is available (defaults to hintLabel). */
  flipTapLabel?: string;
  tabooLabel?: string;
}

export interface ClassicActionFooterProps {
  t: TPlaying;
  onCorrect: (e: React.MouseEvent) => void;
  onSkip: (e: React.MouseEvent) => void;
}

const skipFooterBg =
  'bg-[linear-gradient(180deg,color-mix(in_srgb,var(--ui-danger)_52%,var(--ui-surface))_0%,color-mix(in_srgb,var(--ui-danger)_36%,var(--ui-surface))_55%,color-mix(in_srgb,var(--ui-danger)_28%,var(--ui-bg))_100%)]';
const skipFooterActive =
  'active:bg-[linear-gradient(180deg,color-mix(in_srgb,var(--ui-danger)_62%,var(--ui-surface))_0%,color-mix(in_srgb,var(--ui-danger)_48%,var(--ui-surface))_100%)]';

const correctFooterBg =
  'bg-[linear-gradient(180deg,color-mix(in_srgb,var(--ui-success)_52%,var(--ui-surface))_0%,color-mix(in_srgb,var(--ui-success)_36%,var(--ui-surface))_55%,color-mix(in_srgb,var(--ui-success)_28%,var(--ui-bg))_100%)]';
const correctFooterActive =
  'active:bg-[linear-gradient(180deg,color-mix(in_srgb,var(--ui-success)_62%,var(--ui-surface))_0%,color-mix(in_srgb,var(--ui-success)_48%,var(--ui-surface))_100%)]';

function splitPrompt(displayPrompt: string): { main: string; hint: string | null } {
  const i = displayPrompt.indexOf('|');
  if (i < 0) {
    const m = displayPrompt.trim();
    return { main: m, hint: null };
  }
  const main = displayPrompt.slice(0, i).trim();
  const hint = displayPrompt.slice(i + 1).trim();
  return {
    main: main || displayPrompt.trim(),
    hint: hint.length > 0 ? hint : null,
  };
}

export function ClassicWordCard({
  displayPrompt,
  hint: hintProp,
  tabooWords,
  showTaboo = false,
  isCriticalTime,
  onSwipe,
  swipeDisabled,
  hintLabel = 'Hint',
  flipTapLabel,
  tabooLabel = 'Taboo',
}: ClassicWordCardProps): React.ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setFlipped(false);
  }, [displayPrompt, hintProp]);

  const { main: mainWord, hint: legacyHint } = splitPrompt(displayPrompt);
  const flipHint = hintProp ?? legacyHint ?? undefined;
  const frontTapLabel = flipTapLabel ?? hintLabel;
  const visibleTaboo = showTaboo && tabooWords && tabooWords.length > 0;
  const swipeEnabled = Boolean(onSwipe) && !swipeDisabled;

  const clampDrag = useCallback((dx: number, dy: number) => {
    const m = SWIPE_MAX_DRAG;
    const len = Math.hypot(dx, dy) || 1;
    return {
      x: (dx / len) * Math.min(len, m),
      y: (dy / len) * Math.min(len, m),
    };
  }, []);

  const cardOrigin = useCallback(() => {
    const el = rootRef.current;
    if (!el) {
      return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (swipeDisabled || !onSwipe || e.button !== 0) return;
      startRef.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
      setDrag({ x: 0, y: 0 });
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [onSwipe, swipeDisabled]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!startRef.current || startRef.current.pointerId !== e.pointerId) return;
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      setDrag(clampDrag(dx, dy));
    },
    [clampDrag]
  );

  const finishPointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!startRef.current || startRef.current.pointerId !== e.pointerId) return;
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      startRef.current = null;
      setDrag({ x: 0, y: 0 });
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }

      const th = SWIPE_THRESHOLD_PX;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);

      if (ax < th && ay < th) {
        if (flipHint) setFlipped((f) => !f);
        return;
      }

      if (!onSwipe || swipeDisabled) return;

      const origin = cardOrigin();
      if (ax >= ay) {
        if (dx > th) onSwipe('correct', origin);
        else if (dx < -th) onSwipe('skip', origin);
      } else {
        if (dy < -th) onSwipe('correct', origin);
        else if (dy > th) onSwipe('skip', origin);
      }
    },
    [cardOrigin, flipHint, onSwipe, swipeDisabled]
  );

  const onPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!startRef.current || startRef.current.pointerId !== e.pointerId) return;
    startRef.current = null;
    setDrag({ x: 0, y: 0 });
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }, []);

  const cardShellClass = `w-full max-w-sm aspect-3/4 max-h-[55vh] rounded-4xl shadow-2xl relative border bg-ui-word-card-bg transition-all duration-200 ease-out animate-pop-in select-none ${
    isCriticalTime
      ? 'border-[color-mix(in_srgb,var(--ui-danger)_45%,var(--ui-word-card-border))] shadow-[0_0_0_1px_color-mix(in_srgb,var(--ui-danger)_25%,transparent),0_20px_40px_-10px_color-mix(in_srgb,var(--ui-fg)_14%,transparent)]'
      : 'border-ui-word-card-border shadow-[0_20px_40px_-10px_color-mix(in_srgb,var(--ui-fg)_12%,transparent)]'
  } ${swipeEnabled ? 'cursor-grab active:cursor-grabbing active:scale-[0.99]' : ''}`;

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3">
      <div
        ref={rootRef}
        key={displayPrompt}
        data-word-card
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={onPointerCancel}
        style={{
          transform:
            drag.x !== 0 || drag.y !== 0 ? `translate(${drag.x}px, ${drag.y}px)` : undefined,
          touchAction: swipeEnabled ? 'none' : undefined,
          perspective: '1200px',
        }}
        className={cardShellClass}
      >
        <div
          className="relative h-full w-full transition-transform duration-500 ease-out"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : undefined,
          }}
        >
          <div
            className="absolute inset-0 flex items-center justify-center p-10"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-8 h-px bg-[color-mix(in_srgb,var(--ui-word-card-fg)_12%,transparent)]" />
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-8 h-px bg-[color-mix(in_srgb,var(--ui-word-card-fg)_12%,transparent)]" />
            <div className="pointer-events-none flex w-full max-w-full flex-col items-center justify-center gap-3 px-1 sm:gap-4">
              <h2 className="font-sans text-5xl font-black leading-tight tracking-tight text-ui-word-card-fg wrap-break-word text-center antialiased [text-rendering:optimizeLegibility] sm:text-6xl">
                {mainWord}
              </h2>
              {flipHint && !flipped ? (
                <p
                  className={`${typographyClass.caption} text-[color-mix(in_srgb,var(--ui-word-card-fg)_45%,var(--ui-fg-muted)_55%)] normal-case tracking-normal`}
                >
                  {frontTapLabel}
                </p>
              ) : null}
            </div>
          </div>

          {flipHint ? (
            <div
              className="absolute inset-0 flex items-center justify-center p-10"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <div className="pointer-events-none flex w-full max-w-full flex-col items-center justify-center gap-2 px-2">
                <p
                  className={`${typographyClass.label} text-[color-mix(in_srgb,var(--ui-word-card-fg)_50%,var(--ui-fg-muted)_50%)] normal-case tracking-wide`}
                >
                  {hintLabel}
                </p>
                <p className="max-w-full wrap-break-word text-center font-serif text-2xl font-medium leading-snug tracking-normal text-[color-mix(in_srgb,var(--ui-word-card-fg)_72%,var(--ui-fg-muted)_28%)] antialiased normal-case sm:text-3xl">
                  {flipHint}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {visibleTaboo ? (
        <div className="w-full space-y-2 px-1">
          <p
            className={`${typographyClass.label} text-center text-ui-fg-muted normal-case tracking-wide`}
          >
            {tabooLabel}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {tabooWords.map((word) => (
              <span
                key={word}
                className={`rounded-full border border-[color-mix(in_srgb,var(--ui-danger)_35%,var(--ui-border))] bg-[color-mix(in_srgb,var(--ui-danger)_10%,var(--ui-surface))] px-3 py-1.5 ${typographyClass.system} text-ui-danger normal-case tracking-normal`}
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ClassicActionFooter({
  t,
  onCorrect,
  onSkip,
}: ClassicActionFooterProps): React.ReactElement {
  return (
    <footer className="w-full fixed bottom-0 left-0 z-20 flex pb-safe-bottom-sm">
      <button
        type="button"
        onClick={onSkip}
        className={`flex-1 min-h-[60px] h-24 sm:h-28 ${skipFooterBg} ${skipFooterActive} transition-all duration-200 ease-out flex flex-col items-center justify-center gap-1.5 group border-t border-ui-border active:scale-[0.98] active:opacity-95`}
      >
        <span className="material-symbols-outlined text-ui-danger text-5xl leading-none group-active:scale-90 transition-transform duration-200 [font-variation-settings:'FILL'_0,'wght'_600,'GRAD'_0,'opsz'_48]">
          close
        </span>
        <span className="text-ui-danger text-sm tracking-wide uppercase font-bold group-hover:opacity-100 opacity-90 transition-opacity duration-200">
          {t.skip}
        </span>
      </button>
      <button
        type="button"
        onClick={onCorrect}
        className={`flex-1 min-h-[60px] h-24 sm:h-28 ${correctFooterBg} ${correctFooterActive} transition-all duration-200 ease-out flex flex-col items-center justify-center gap-1.5 group border-t border-ui-border border-l border-ui-border active:scale-[0.98] active:opacity-95`}
      >
        <span className="material-symbols-outlined text-ui-success text-5xl leading-none group-active:scale-90 transition-transform duration-200 font-bold [font-variation-settings:'FILL'_0,'wght'_700,'GRAD'_0,'opsz'_48]">
          check
        </span>
        <span className="text-ui-success text-sm tracking-wide uppercase font-bold group-hover:opacity-100 opacity-90 transition-opacity duration-200">
          {t.correct}
        </span>
      </button>
    </footer>
  );
}
