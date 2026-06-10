import React from 'react';
import { Category } from '../../types';
import { typographyClass } from '../../constants/typography';
import { HAPTIC, vibrate } from '../../utils/haptics';
import { categoryIcon } from './categoryUtils';

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
          <button
            key={cat}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            aria-label={label}
            onClick={() => {
              if (disabled) return;
              vibrate(HAPTIC.nav);
              const next = active ? selected.filter((c) => c !== cat) : [...selected, cat];
              if (next.length > 0) onChange(next);
            }}
            className={`p-3 rounded-xl border ${typographyClass.label} tracking-widest transition-all duration-200 ease-out active:scale-95 flex items-center justify-center gap-2 text-center ${
              disabled ? 'opacity-40 pointer-events-none' : ''
            } ${
              active
                ? 'border-ui-accent bg-ui-accent text-ui-accent-contrast'
                : 'border-ui-border bg-ui-surface text-ui-fg-muted hover:text-ui-fg hover:bg-ui-surface-hover'
            }`}
          >
            {categoryIcon(cat)}
            <span className="leading-tight">{label}</span>
          </button>
        );
      })}
    </div>
  );
};
