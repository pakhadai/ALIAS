/** Preset vertical focal points — ellipse 70×45% of the positioned screen shell. */
export const SCREEN_ACCENT_GLOW_FOCAL = {
  /** Menu home — logo band */
  menuHome: '15%',
  /** Profile hero — avatar band below header */
  profileHero: '20%',
  /** Boot / auth loading — vertically centered hero */
  bootCenter: '40%',
} as const;

export type ScreenAccentGlowFocal =
  (typeof SCREEN_ACCENT_GLOW_FOCAL)[keyof typeof SCREEN_ACCENT_GLOW_FOCAL];

export interface ScreenAccentGlowProps {
  /** Vertical focal point (`at 50% …`). */
  focalY?: ScreenAccentGlowFocal | string;
  className?: string;
}

/**
 * Full-viewport accent wash — must sit in a `relative` screen shell (`absolute inset-0`).
 * Do not constrain height; radial ellipses clip sharply on fixed-height boxes.
 */
export function ScreenAccentGlow({
  focalY = SCREEN_ACCENT_GLOW_FOCAL.menuHome,
  className = '',
}: ScreenAccentGlowProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 opacity-[0.07] ${className}`.trim()}
      aria-hidden
      style={{
        background: `radial-gradient(ellipse 70% 45% at 50% ${focalY}, var(--ui-accent) 0%, transparent 70%)`,
      }}
    />
  );
}
