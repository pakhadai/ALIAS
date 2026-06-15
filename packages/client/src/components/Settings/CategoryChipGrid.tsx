import React from 'react';
import { Category } from '../../types';
import { categoryIcon } from './categoryUtils';
import { SettingsChip } from './SettingsChip';
import { settingsChipLabelClass } from './settingsChipStyles';

export interface CategoryChipGridProps {
  categories: readonly Category[];
  selected: Category[];
  onChange: (next: Category[]) => void;
  getLabel: (cat: Category) => string;
  disabled?: boolean;
}

export const CategoryChipGrid: React.FC<CategoryChipGridProps> = ({
  categories,
  selected,
  onChange,
  getLabel,
  disabled = false,
}) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {categories.map((cat) => {
        const active = selected.includes(cat);
        const label = getLabel(cat);
        return (
          <SettingsChip
            key={cat}
            active={active}
            disabled={disabled}
            aria-label={label}
            onClick={() => {
              const next = active ? selected.filter((c) => c !== cat) : [...selected, cat];
              if (next.length > 0) onChange(next);
            }}
          >
            {categoryIcon(cat)}
            <span className={`leading-tight ${settingsChipLabelClass}`}>{label}</span>
          </SettingsChip>
        );
      })}
    </div>
  );
};
