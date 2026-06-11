import type { LucideIcon } from 'lucide-react';
import { typographyClass, labelSectionTitleClass } from '../../../constants/typography';
import {
  PROFILE_LIST_CLASS,
  PROFILE_PANEL_CLASS,
  PROFILE_PANEL_HEADER_CLASS,
} from './profileSurfaceClasses';

export interface PlayerStatsDetailRow {
  label: string;
  value: string;
  icon: LucideIcon;
}

export interface PlayerStatsDetailPanelProps {
  title: string;
  rows: PlayerStatsDetailRow[];
  themeIconColor: string;
}

export function PlayerStatsDetailPanel({
  title,
  rows,
  themeIconColor,
}: PlayerStatsDetailPanelProps) {
  return (
    <div className={`w-full overflow-hidden ${PROFILE_PANEL_CLASS}`}>
      <div className={PROFILE_PANEL_HEADER_CLASS}>
        <p className={`${labelSectionTitleClass} text-ui-fg-muted !opacity-100`}>{title}</p>
      </div>
      <ul className={PROFILE_LIST_CLASS}>
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
              <span className="shrink-0 text-xl font-bold font-serif text-ui-fg">{row.value}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
