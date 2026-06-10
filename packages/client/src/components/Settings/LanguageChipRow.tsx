import React from 'react';
import { Language } from '../../types';
import { typographyClass } from '../../constants/typography';
import { HAPTIC, vibrate } from '../../utils/haptics';
import { LOBBY_LANG_FLAG, LOBBY_LANGUAGES } from './constants';

export interface LanguageChipRowProps {
  value: Language;
  onChange: (lang: Language) => void;
  languages?: readonly Language[];
  /** Smaller chips for pack-language picker in in-lobby settings */
  size?: 'default' | 'compact';
  disabled?: boolean;
}

export const LanguageChipRow: React.FC<LanguageChipRowProps> = ({
  value,
  onChange,
  languages = LOBBY_LANGUAGES,
  size = 'default',
  disabled = false,
}) => {
  const isCompact = size === 'compact';

  const chipClass = (active: boolean) => {
    const base = isCompact
      ? `flex flex-1 flex-col items-center gap-0.5 rounded-xl border py-2.5 ${typographyClass.label} transition-all duration-200 ease-out active:scale-95`
      : `flex flex-1 flex-col items-center gap-1 rounded-2xl border py-3 ${typographyClass.label} transition-all duration-200 ease-out active:scale-[0.98]`;
    if (disabled) return `${base} opacity-40 pointer-events-none`;
    return active
      ? isCompact
        ? `${base} border-ui-accent bg-[color-mix(in_srgb,var(--ui-accent)_14%,transparent)] text-ui-accent`
        : `${base} border-ui-accent bg-[color-mix(in_srgb,var(--ui-accent)_18%,transparent)] text-ui-fg`
      : `${base} border-ui-border bg-ui-surface text-ui-fg-muted hover:bg-ui-surface-hover`;
  };

  return (
    <div className="flex gap-2">
      {languages.map((lang) => {
        const active = value === lang;
        return (
          <button
            key={lang}
            type="button"
            disabled={disabled}
            onClick={() => {
              vibrate(HAPTIC.nav);
              onChange(lang);
            }}
            className={chipClass(active)}
            aria-pressed={active}
          >
            <span
              className={isCompact ? 'text-lg leading-none' : 'text-2xl leading-none'}
              aria-hidden
            >
              {LOBBY_LANG_FLAG[lang]}
            </span>
            <span>{lang}</span>
          </button>
        );
      })}
    </div>
  );
};
