import type { LucideIcon } from 'lucide-react';
import { typographyClass, labelSectionTitleClass } from '../../../constants/typography';

export interface PlayerStatsDetailRow {
  label: string;
  value: string;
  icon: LucideIcon;
}

export interface PlayerStatsDetailPanelProps {
  title: string;
  rows: PlayerStatsDetailRow[];
  isDark: boolean;
  themeTextMain: string;
  themeIconColor: string;
}

export function PlayerStatsDetailPanel({
  title,
  rows,
  isDark,
  themeTextMain,
  themeIconColor,
}: PlayerStatsDetailPanelProps) {
  const panelClass = isDark
    ? 'bg-ui-surface border-ui-border'
    : 'bg-ui-card border-ui-border shadow-sm';

  return (
    <div className={`w-full rounded-3xl border overflow-hidden ${panelClass}`}>
      <div className="px-5 py-3.5 border-b border-ui-border-subtle text-center">
        <p className={`${labelSectionTitleClass} text-ui-fg-muted !opacity-100`}>{title}</p>
      </div>
      <ul className="divide-y divide-ui-border-subtle">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <li key={row.label} className="flex items-center justify-between gap-3 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--ui-accent)_10%,var(--ui-surface))]"
                  aria-hidden
                >
                  <Icon size={16} className={themeIconColor} />
                </span>
                <span className={`${typographyClass.body} font-medium text-ui-fg`}>
                  {row.label}
                </span>
              </div>
              <span className={`shrink-0 text-xl font-bold font-serif ${themeTextMain}`}>
                {row.value}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
