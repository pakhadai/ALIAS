import { ChevronRight } from 'lucide-react';
import { typographyClass, labelSectionTitleClass } from '../../../constants/typography';

export interface ProfileBenefitItem {
  emoji: string;
  label: string;
  sub: string;
  onPress?: () => void;
}

export interface ProfileBenefitsListProps {
  title: string;
  subtitle?: string;
  items: ProfileBenefitItem[];
  isDark: boolean;
  themeTextSecondary: string;
}

export function ProfileBenefitsList({
  title,
  subtitle,
  items,
  isDark,
  themeTextSecondary,
}: ProfileBenefitsListProps) {
  const panelClass = isDark
    ? 'bg-ui-surface border-ui-border'
    : 'bg-ui-card border-ui-border shadow-sm';

  return (
    <div className={`w-full max-w-md mx-auto rounded-3xl border overflow-hidden ${panelClass}`}>
      <div className="px-5 py-3.5 border-b border-ui-border-subtle text-center">
        <p className={`${labelSectionTitleClass} text-ui-fg-muted !opacity-100`}>{title}</p>
        {subtitle ? (
          <p className={`${typographyClass.body} mt-1 leading-snug ${themeTextSecondary}`}>
            {subtitle}
          </p>
        ) : null}
      </div>
      <ul className="divide-y divide-ui-border-subtle">
        {items.map((item) => {
          const rowContent = (
            <>
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg leading-none bg-[color-mix(in_srgb,var(--ui-accent)_10%,var(--ui-surface))]"
                aria-hidden
              >
                {item.emoji}
              </span>
              <div className="min-w-0 flex-1 pt-0.5 text-left">
                <p className={`${typographyClass.label} font-sans tracking-[0.16em] text-ui-fg`}>
                  {item.label}
                </p>
                <p className={`${typographyClass.body} mt-0.5 leading-snug ${themeTextSecondary}`}>
                  {item.sub}
                </p>
              </div>
              {item.onPress ? (
                <ChevronRight
                  size={16}
                  className="shrink-0 text-ui-fg-muted opacity-30"
                  aria-hidden
                />
              ) : null}
            </>
          );

          if (item.onPress) {
            return (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={item.onPress}
                  className="flex w-full items-center gap-3.5 px-5 py-4 transition-all duration-200 ease-out active:bg-ui-surface-hover active:scale-[0.99]"
                >
                  {rowContent}
                </button>
              </li>
            );
          }

          return (
            <li key={item.label} className="flex gap-3.5 px-5 py-4">
              {rowContent}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
