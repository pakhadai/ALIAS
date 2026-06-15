import React, { useCallback, useEffect, useRef } from 'react';
import { playSoundEffect } from '../utils/audio';
import { SoundPreset } from '../types';
import { HAPTIC } from '../utils/haptics';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { typographyClass } from '../constants/typography';
import { PREFS_KEY } from '../context/gameReducer';

const PREFS_PARSE_COOLDOWN_MS = 800;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'danger'
    | 'dangerSolid'
    | 'success'
    | 'outline'
    | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  themeClass?: string;
  /** Primary only: `cta` = accent soft-pill depth (`.lobby-start-btn--plain`); default `flat`. */
  volume?: 'flat' | 'cta';
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
  volume = 'flat',
  clickSound = true,
  ...props
}) => {
  const haptic = useHapticFeedback();
  const prefsCacheRef = useRef<{ prefs: unknown; at: number } | null>(null);

  const readClickSoundPrefs = useCallback((): unknown => {
    const now = performance.now();
    const hit = prefsCacheRef.current;
    if (hit && now - hit.at < PREFS_PARSE_COOLDOWN_MS) return hit.prefs;
    try {
      const rawPrefs = localStorage.getItem(PREFS_KEY);
      const prefs = rawPrefs ? JSON.parse(rawPrefs) : null;
      prefsCacheRef.current = { prefs, at: now };
      return prefs;
    } catch {
      prefsCacheRef.current = { prefs: null, at: now };
      return null;
    }
  }, []);

  useEffect(() => {
    const invalidate = () => {
      prefsCacheRef.current = null;
    };
    window.addEventListener('focus', invalidate);
    document.addEventListener('visibilitychange', invalidate);
    return () => {
      window.removeEventListener('focus', invalidate);
      document.removeEventListener('visibilitychange', invalidate);
    };
  }, []); // Legitimate: window/document subscription for prefs cache invalidation.

  const isCtaVolume = variant === 'primary' && volume === 'cta';
  const isSoftPill = variant === 'secondary' || variant === 'tertiary' || isCtaVolume;

  const softPillBaseStyles =
    'inline-flex items-center justify-center gap-2 rounded-theme font-semibold leading-none tracking-wide disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ui-accent-ring focus-visible:ring-offset-ui-bg';

  const baseStyles = isSoftPill
    ? `${softPillBaseStyles} ${isCtaVolume ? 'transition-transform duration-200 ease-out' : 'transition-all duration-200 ease-out'}`
    : 'inline-flex items-center justify-center gap-2 rounded-theme transition-all duration-200 ease-out active:scale-95 active:opacity-95 disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ui-accent-ring focus-visible:ring-offset-ui-bg';
  const labelStyles = typographyClass.label;

  // Strict theme integration
  const getVariantStyle = () => {
    if (variant === 'primary' && volume === 'cta') {
      const theme =
        themeClass ??
        'bg-ui-accent text-ui-accent-contrast hover:bg-ui-accent-hover active:bg-ui-accent-pressed font-sans';
      return `lobby-start-btn lobby-start-btn--plain ${theme}`;
    }
    if (themeClass && variant === 'primary') return themeClass;

    switch (variant) {
      case 'outline':
        return 'bg-transparent border border-ui-border text-ui-fg hover:bg-ui-surface-hover';
      case 'danger':
        return 'bg-[color-mix(in_srgb,var(--ui-danger)_14%,transparent)] border border-[color-mix(in_srgb,var(--ui-danger)_28%,transparent)] text-ui-danger hover:bg-[color-mix(in_srgb,var(--ui-danger)_22%,transparent)]';
      case 'dangerSolid':
        return 'bg-[var(--ui-danger)] border border-[var(--ui-danger)] text-white hover:bg-[color-mix(in_srgb,var(--ui-danger)_88%,black)] active:bg-[color-mix(in_srgb,var(--ui-danger)_78%,black)] focus-visible:ring-[color-mix(in_srgb,var(--ui-danger)_55%,transparent)]';
      case 'success':
        return 'bg-[color-mix(in_srgb,var(--ui-success)_14%,transparent)] border border-[color-mix(in_srgb,var(--ui-success)_28%,transparent)] text-ui-success hover:bg-[color-mix(in_srgb,var(--ui-success)_22%,transparent)]';
      case 'secondary':
        return 'ui-soft-btn ui-soft-btn--neutral font-sans';
      case 'tertiary':
        return 'ui-soft-btn ui-soft-btn--neutral-muted font-sans';
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
      haptic.pattern(HAPTIC.nav);
    }
    if (!clickSound || props.disabled) return;

    try {
      const prefs = readClickSoundPrefs() as {
        soundEnabled?: boolean;
        soundPreset?: SoundPreset;
      } | null;
      const soundEnabled = prefs?.soundEnabled !== false;
      const soundPreset: SoundPreset | undefined = prefs?.soundPreset;
      if (soundEnabled) playSoundEffect('click', soundPreset);
    } catch {
      // no-op: keep button interaction resilient (e.g. private mode / JSON errors)
    }
  };

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    props.onClick?.(e);
    if (e.defaultPrevented) return;
    if (!props.disabled) {
      haptic.impactOccurred('light');
    }
  };

  const sizes = {
    sm: 'px-4 py-2',
    md: 'px-6 py-3',
    lg: 'px-8 py-4',
    xl: 'px-10 py-5',
  };

  return (
    <button
      className={`
        ${labelStyles}
        ${baseStyles} 
        ${getVariantStyle()} 
        ${sizes[size]} 
        ${fullWidth ? 'w-full' : ''} 
        ${className}
      `}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      {...props}
    >
      {icon ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span className="inline-flex size-4 shrink-0 items-center justify-center" aria-hidden>
            {icon}
          </span>
          <span>{children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};
