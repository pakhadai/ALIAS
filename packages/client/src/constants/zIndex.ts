/**
 * Stacking order for overlays. Values live in `styles.css` (`:root`).
 * Low → high: page < statusBanner (25) < liquidChrome (30) < fx (40) < banner (60) < modalLow (80) < modal (100) < toast (1000).
 * Fixed glass chrome uses CSS `var(--z-liquid-chrome)` in `styles/glass.css` — must stay below modal-low.
 */
export const zIndex = {
  header: 'z-[var(--z-header)]',
  /** Top reconnect banner — below glass header; z-index on `.ui-status-banner` in styles.css */
  statusBanner: 'z-[var(--z-status-banner)]',
  /** Sticky + fixed liquid glass header + footer island — above status banners, below PWA/modals */
  liquidChrome: 'z-[var(--z-liquid-chrome)]',
  /** Decorative overlays (confetti, floating score text) — below sheets */
  fx: 'z-[var(--z-fx)]',
  /** Connection / PWA banners — above page chrome, below sheets */
  banner: 'z-[var(--z-banner)]',
  /** Pause dim, lightweight overlays */
  modalLow: 'z-[var(--z-modal-low)]',
  /** Standard bottom sheets and modals */
  modal: 'z-[var(--z-modal)]',
  /** Sheets stacked on top of another modal (e.g. logout on profile, QR) */
  modalNested: 'z-[var(--z-modal-nested)]',
  /** Large in-game celebration card */
  milestone: 'z-[var(--z-milestone)]',
  /** App-wide confirmation (destructive / blocking) */
  modalConfirm: 'z-[var(--z-modal-confirm)]',
  /** Toasts — top of stack */
  toast: 'z-[var(--z-toast)]',
} as const;
