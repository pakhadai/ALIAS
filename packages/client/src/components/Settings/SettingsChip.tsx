import React from 'react';
import { HAPTIC, vibrate } from '../../utils/haptics';
import {
  settingsChipClass,
  type SettingsChipSize,
  type SettingsChipVariant,
} from './settingsChipStyles';

export interface SettingsChipProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  active?: boolean;
  variant?: SettingsChipVariant;
  size?: SettingsChipSize;
  children: React.ReactNode;
}

export const SettingsChip: React.FC<SettingsChipProps> = ({
  active = false,
  variant = 'solid',
  size = 'default',
  disabled = false,
  className = '',
  onClick,
  children,
  ...props
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={(e) => {
        if (disabled) return;
        vibrate(HAPTIC.nav);
        onClick?.(e);
      }}
      className={settingsChipClass({ active, disabled, variant, size, className })}
      {...props}
    >
      {children}
    </button>
  );
};
