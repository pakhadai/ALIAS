import React from 'react';
import { Logo } from './Shared';
import { typographyClass } from '../constants/typography';
import { THEME_CONFIG, DEFAULT_APP_THEME } from '../constants';
import { ScreenAccentGlow, SCREEN_ACCENT_GLOW_FOCAL } from './layout/ScreenAccentGlow';
import { ScreenShell } from './layout/ScreenShell';

const BOOT_VIEWPORT =
  'flex flex-col h-[var(--tg-viewport-height,100dvh)] max-h-[var(--tg-viewport-height,100dvh)] w-full min-h-0';

/** Accent wash + dot grid — parent must be `relative` with bounded height. */
export function BootScreenBackdrop() {
  return (
    <>
      <ScreenAccentGlow focalY={SCREEN_ACCENT_GLOW_FOCAL.bootCenter} />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        aria-hidden
        style={{
          backgroundImage: 'radial-gradient(var(--ui-fg) 0.5px, transparent 0.5px)',
          backgroundSize: '18px 18px',
        }}
      />
    </>
  );
}

export interface BootLoadingViewProps {
  message: string;
}

/** Shared boot hero: logo, ring spinner, status line + dots. */
export function BootLoadingView({ message }: BootLoadingViewProps) {
  const theme = THEME_CONFIG[DEFAULT_APP_THEME];

  return (
    <div className="flex flex-col items-center gap-10 w-full max-w-sm">
      <div className="scale-[0.85] opacity-95">
        <Logo theme={theme} />
      </div>

      <div className="relative h-28 w-28 shrink-0" aria-hidden>
        <span className="absolute inset-0 rounded-full border border-ui-accent/25 telegram-boot-ring" />
        <span
          className="absolute inset-[10%] rounded-full border border-ui-accent/35 telegram-boot-ring"
          style={{ animationDelay: '-0.5s' }}
        />
        <span
          className="absolute inset-[22%] rounded-full border-2 border-ui-accent/50 telegram-boot-ring"
          style={{ animationDelay: '-1s' }}
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="h-2 w-2 rounded-full bg-ui-accent shadow-[0_0_20px_color-mix(in_srgb,var(--ui-accent)_80%,transparent)] telegram-boot-glow" />
        </span>
      </div>

      <div className="flex flex-col items-center gap-3">
        <p
          className={`${typographyClass.system} font-medium tracking-wide text-ui-fg-muted`}
          aria-live="polite"
        >
          {message}
        </p>
        <div className="flex gap-1.5" role="presentation">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-ui-accent telegram-boot-dot"
              style={{ animationDelay: `${i * 160}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Full viewport boot — Telegram auth before GameProvider mounts. */
export function FullscreenBootLoading({ message }: BootLoadingViewProps) {
  return (
    <div
      className={`${BOOT_VIEWPORT} bg-ui-bg text-ui-fg font-sans items-center justify-center px-8 relative overflow-hidden selection:bg-ui-accent selection:text-ui-accent-contrast`}
    >
      <BootScreenBackdrop />
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full">
        <BootLoadingView message={message} />
      </div>
    </div>
  );
}

/** In-app boot — lazy route chunks inside the main shell. */
export function EmbeddedBootLoading({ message }: BootLoadingViewProps) {
  return (
    <ScreenShell
      scroll={false}
      className="relative bg-ui-bg overflow-hidden"
      contentClassName="relative flex flex-1 items-center justify-center px-8 overflow-hidden"
    >
      <BootScreenBackdrop />
      <div className="relative z-10">
        <BootLoadingView message={message} />
      </div>
    </ScreenShell>
  );
}
