import { typographyClass } from '../../constants/typography';

export type SettingsChipVariant = 'solid' | 'tint';
export type SettingsChipSize = 'default' | 'compact' | 'tab';

/** Uppercase chip label — apply to title text only, not multi-line descriptions. */
export const settingsChipLabelClass = typographyClass.label;

export interface SettingsChipStyleOptions {
  active?: boolean;
  disabled?: boolean;
  variant?: SettingsChipVariant;
  size?: SettingsChipSize;
  className?: string;
}

export function settingsChipClass({
  active = false,
  disabled = false,
  variant = 'solid',
  size = 'default',
  className = '',
}: SettingsChipStyleOptions = {}): string {
  const base =
    'text-ui-label font-sans font-bold tracking-ui-label transition-all duration-200 ease-out active:scale-95';

  const sizeClass =
    size === 'tab'
      ? 'py-2 rounded-xl border text-center tracking-widest'
      : size === 'compact'
        ? `shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-2 rounded-xl border tracking-widest`
        : `p-3 rounded-xl border tracking-widest flex items-center justify-center gap-2 text-center`;

  const disabledClass = disabled ? 'opacity-40 pointer-events-none' : '';

  const activeSolid = 'border-ui-accent bg-ui-accent text-ui-accent-contrast';
  const inactiveSolid =
    'border-ui-border bg-ui-surface text-ui-fg-muted hover:text-ui-fg hover:bg-ui-surface-hover';
  const activeTint =
    'border-ui-accent bg-[color-mix(in_srgb,var(--ui-accent)_14%,transparent)] text-ui-accent';
  const inactiveTint =
    'border-ui-border bg-ui-surface text-ui-fg-muted hover:text-ui-fg hover:bg-ui-surface-hover';

  const stateClass =
    variant === 'tint'
      ? active
        ? activeTint
        : inactiveTint
      : active
        ? activeSolid
        : inactiveSolid;

  return [base, sizeClass, disabledClass, stateClass, className].filter(Boolean).join(' ');
}
