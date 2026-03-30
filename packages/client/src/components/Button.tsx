
import React from 'react';
import { playSoundEffect } from '../utils/audio';
import { SoundPreset } from '../types';

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
  const baseStyles = "inline-flex items-center justify-center rounded-[var(--theme-radius)] font-medium transition-all duration-150 ease-out active:scale-95 disabled:opacity-30 disabled:pointer-events-none uppercase tracking-[0.2em] text-[10px]";
  
  // Strict theme integration
  const getVariantStyle = () => {
    if (themeClass && variant === 'primary') return themeClass;
    
    switch (variant) {
      case 'outline': return "bg-transparent border border-[color:var(--ui-border)] text-[color:var(--ui-fg)] hover:bg-[color:var(--ui-surface-hover)]";
      case 'danger': return "bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white";
      case 'success': return "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white";
      case 'secondary': return "bg-[color:var(--ui-surface)] text-[color:var(--ui-fg-muted)] hover:text-[color:var(--ui-fg)] border border-[color:var(--ui-border)] hover:bg-[color:var(--ui-surface-hover)]";
      case 'ghost': return "bg-transparent text-[color:var(--ui-fg-muted)] hover:text-[color:var(--ui-fg)] hover:bg-[color:var(--ui-surface-hover)]";
      default: return "bg-[color:var(--ui-fg)] text-[color:var(--ui-bg)]";
    }
  };

  const handlePointerDown: React.PointerEventHandler<HTMLButtonElement> = (e) => {
    props.onPointerDown?.(e);
    if (e.defaultPrevented) return;
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
    sm: "px-4 py-2",
    md: "px-6 py-3",
    lg: "px-8 py-4",
    xl: "px-10 py-5 text-[11px] tracking-[0.3em]"
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
