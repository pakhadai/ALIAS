import React from 'react';
import { SettingsChip } from './SettingsChip';
import { settingsChipLabelClass } from './settingsChipStyles';

export interface SettingsTabBarProps<T extends string> {
  tabs: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}

export function SettingsTabBar<T extends string>({
  tabs,
  value,
  onChange,
  className = '',
}: SettingsTabBarProps<T>) {
  return (
    <div className={`grid w-full grid-cols-3 gap-2 ${className}`} role="tablist">
      {tabs.map(({ id, label }) => {
        const active = value === id;
        return (
          <SettingsChip
            key={id}
            role="tab"
            aria-selected={active}
            active={active}
            size="tab"
            onClick={() => onChange(id)}
          >
            <span className={settingsChipLabelClass}>{label}</span>
          </SettingsChip>
        );
      })}
    </div>
  );
}
