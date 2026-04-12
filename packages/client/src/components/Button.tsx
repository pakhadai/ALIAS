import React from 'react';
import { playSoundEffect } from '../utils/audio';
import { SoundPreset } from '../types';
import { vibrate, HAPTIC } from '../utils/haptics';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  themeClass?: string;
  clickSound?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  icon,
  themeClass,
  clickSound = true,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center rounded-[var(--theme-radius)] font-semibold transition-all duration-200 ease-out active:scale-95 active:opacity-95 disabled:opacity-30 disabled:pointer-events-none uppercase tracking-wide text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ui-accent-ring focus-visible:ring-offset-ui-bg';

  // Strict theme integration
  const getVariantStyle = () => {
    if (themeClass && variant === 'primary') return themeClass;

    switch (variant) {
      case 'outline':
        return 'bg-transparent border border-ui-border text-ui-fg hover:bg-ui-surface-hover';
      case 'danger':
        return 'bg-[color-mix(in_srgb,var(--ui-danger)_14%,transparent)] border border-[color-mix(in_srgb,var(--ui-danger)_28%,transparent)] text-ui-danger hover:bg-[color-mix(in_srgb,var(--ui-danger)_22%,transparent)]';
      case 'success':
        return 'bg-[color-mix(in_srgb,var(--ui-success)_14%,transparent)] border border-[color-mix(in_srgb,var(--ui-success)_28%,transparent)] text-ui-success hover:bg-[color-mix(in_srgb,var(--ui-success)_22%,transparent)]';
      case 'secondary':
        return 'bg-ui-surface text-ui-fg-muted hover:text-ui-fg border border-ui-border hover:bg-ui-surface-hover';
      case 'ghost':
        return 'bg-transparent text-ui-fg-muted hover:text-ui-fg hover:bg-ui-surface-hover';
      default:
        return 'bg-ui-accent text-ui-accent-contrast hover:bg-ui-accent-hover active:bg-ui-accent-pressed';
    }
  };

  const handlePointerDown: React.PointerEventHandler<HTMLButtonElement> = (e) => {
    props.onPointerDown?.(e);
    if (e.defaultPrevented) return;
    if (!props.disabled) {
      vibrate(HAPTIC.nav);
    }
    if (!clickSound || props.disabled) return;

    try {
      const rawPrefs = localStorage.getItem('alias_preferences');
      const prefs = rawPrefs ? JSON.parse(rawPrefs) : null;
      const soundEnabled = prefs?.soundEnabled !== false;
      const soundPreset: SoundPreset | undefined = prefs?.soundPreset;
      if (soundEnabled) playSoundEffect('click', soundPreset);
    } catch {
      // no-op: keep button interaction resilient (e.g. private mode / JSON errors)
    }
  };

  const sizes = {
    sm: 'px-4 py-2',
    md: 'px-6 py-3',
    lg: 'px-8 py-4',
    xl: 'px-10 py-5 text-sm tracking-wide',
  };

  return (
    <button
      className={`
        ${baseStyles} 
        ${getVariantStyle()} 
        ${sizes[size]} 
        ${fullWidth ? 'w-full' : ''} 
        ${className}
      `}
      onPointerDown={handlePointerDown}
      {...props}
    >
      {icon && <span className="mr-3">{icon}</span>}
      {children}
    </button>
  );
};
