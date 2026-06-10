import React from 'react';
import { HAPTIC, vibrate } from '../../utils/haptics';
import { typographyClass } from '../../constants/typography';

export interface SettingsToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Full switch aria-label when title/hint layout is used */
  ariaLabel?: string;
  title?: string;
  hint?: string;
  enabledLabel: string;
  disabledLabel: string;
  titleClassName?: string;
  /** Compact row — label on left, switch on right (in-lobby SettingsScreen) */
  variant?: 'card' | 'compact';
  className?: string;
}

export const SettingsToggle: React.FC<SettingsToggleProps> = ({
  checked,
  onChange,
  ariaLabel,
  title,
  hint,
  enabledLabel,
  disabledLabel,
  titleClassName,
  variant = 'card',
  className = '',
}) => {
  const handleClick = () => {
    vibrate(HAPTIC.nav);
    onChange(!checked);
  };

  const statusLabel = checked ? enabledLabel : disabledLabel;

  if (variant === 'compact') {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        onClick={handleClick}
        className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
          checked
            ? 'border-ui-accent bg-[color-mix(in_srgb,var(--ui-accent)_14%,transparent)]'
            : 'border-ui-border bg-ui-surface'
        } ${className}`}
      >
        <span className={titleClassName ?? 'text-ui-fg'}>{statusLabel}</span>
        <ToggleTrack checked={checked} />
      </button>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? title}
      onClick={handleClick}
      className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
        checked
          ? 'border-ui-accent bg-[color-mix(in_srgb,var(--ui-accent)_14%,transparent)]'
          : 'border-ui-border bg-ui-surface'
      } ${className}`}
    >
      <div className="min-w-0">
        {title ? <p className={`${titleClassName ?? ''} !mb-0`}>{title}</p> : null}
        {hint ? (
          <p className={`${typographyClass.label} mt-0.5 text-ui-fg-muted opacity-70 normal-case`}>
            {hint}
          </p>
        ) : null}
      </div>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className={`${typographyClass.label} text-ui-fg-muted`}>{statusLabel}</span>
        <ToggleTrack checked={checked} />
      </span>
    </button>
  );
};

function ToggleTrack({ checked }: { checked: boolean }) {
  return (
    <span
      className={`relative h-7 w-12 rounded-full transition-colors duration-200 ease-out ${
        checked ? 'bg-ui-accent' : 'bg-ui-border'
      }`}
      aria-hidden
    >
      <span
        className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-ui-fg shadow-md ring-1 ring-[color-mix(in_srgb,var(--ui-fg)_12%,var(--ui-border))] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] will-change-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </span>
  );
}
