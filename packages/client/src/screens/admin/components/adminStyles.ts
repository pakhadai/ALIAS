/** Shared Tailwind class strings for admin panel (uses --ui-* from admin.html). */

export const ADMIN_INPUT_CLASS =
  'bg-ui-bg border border-ui-border rounded-lg px-3 py-2 text-ui-fg text-sm placeholder:text-ui-fg-subtle focus:outline-none focus:border-ui-accent transition-colors';

export const ADMIN_SPINNER_CLASS =
  'border-2 border-ui-accent border-t-transparent rounded-full animate-spin';

/** Soft tinted surface for success / warning / danger actions */
export const adminStatusBtn = (tone: 'success' | 'warning' | 'danger' | 'accent'): string => {
  const varName =
    tone === 'accent'
      ? '--ui-accent'
      : tone === 'success'
        ? '--ui-success'
        : tone === 'warning'
          ? '--ui-warning'
          : '--ui-danger';
  const text =
    tone === 'accent'
      ? 'text-ui-accent'
      : tone === 'success'
        ? 'text-ui-success'
        : tone === 'warning'
          ? 'text-ui-warning'
          : 'text-ui-danger';
  return `bg-[color-mix(in_srgb,var(${varName})_12%,transparent)] ${text} border border-[color-mix(in_srgb,var(${varName})_22%,transparent)] hover:bg-[color-mix(in_srgb,var(${varName})_20%,transparent)] transition-colors`;
};

export const ADMIN_CARD_CLASS = 'bg-ui-surface border border-ui-border rounded-2xl';
export const ADMIN_PANEL_CLASS = 'bg-ui-card border border-ui-border rounded-2xl overflow-hidden';
export const ADMIN_SECTION_INSET_CLASS = 'border-t border-ui-border px-5 py-4 bg-ui-bg';
