import React from 'react';
import { Check } from 'lucide-react';
import { SettingsChip } from './SettingsChip';

export interface PackChipItem {
  id: string;
  name: string;
  wordCount: number;
}

export interface PackChipRowProps {
  packs: readonly PackChipItem[];
  selectedIds: readonly string[];
  onToggle: (packId: string) => void;
  disabled?: boolean;
  className?: string;
}

export const PackChipRow: React.FC<PackChipRowProps> = ({
  packs,
  selectedIds,
  onToggle,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`flex gap-2 overflow-x-auto no-scrollbar py-1 -mx-1 px-1 ${className}`}>
      {packs.map((pack) => {
        const isSelected = selectedIds.includes(pack.id);
        return (
          <SettingsChip
            key={pack.id}
            active={isSelected}
            variant="tint"
            size="compact"
            disabled={disabled}
            onClick={() => onToggle(pack.id)}
            aria-label={`${pack.name} (${pack.wordCount})`}
          >
            {isSelected && <Check size={10} aria-hidden />}
            <span>{pack.name}</span>
            <span className={`font-normal ${isSelected ? 'text-ui-fg-muted' : 'opacity-40'}`}>
              {pack.wordCount}
            </span>
          </SettingsChip>
        );
      })}
    </div>
  );
};
