/**
 * Stacking order for overlays. Values live in `styles.css` (`:root`).
 * Use these classes with `bottomSheetBackdropClass(..., zIndex.modal)` etc.
 */
export const zIndex = {
  header: 'z-[var(--z-header)]',
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
