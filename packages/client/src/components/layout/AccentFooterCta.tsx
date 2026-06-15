import React from 'react';
import { Loader2 } from 'lucide-react';
import { typographyClass } from '../../constants/typography';

export type AccentFooterCtaVariant = 'animated' | 'plain' | 'blocked';

export interface AccentFooterCtaProps {
  children: React.ReactNode;
  themeButtonClass: string;
  onClick: () => void;
  /** Explicit visual variant. Takes priority over deprecated `ready` / `blocked`. */
  variant?: AccentFooterCtaVariant;
  /** @deprecated Use `variant="animated"` (default). */
  ready?: boolean;
  /** @deprecated Use `variant="blocked"`. */
  blocked?: boolean;
  disabled?: boolean;
  loading?: boolean;
  trailingIcon?: React.ReactNode;
  buttonTestId?: string;
  shellTestId?: string;
}

function resolveVariant(
  variant: AccentFooterCtaVariant | undefined,
  ready: boolean,
  blocked: boolean
): AccentFooterCtaVariant {
  if (variant) return variant;
  if (blocked || !ready) return 'blocked';
  return 'animated';
}

const SHELL_CLASS: Record<AccentFooterCtaVariant, string> = {
  animated: 'accent-footer-cta-shell--ready',
  blocked: 'accent-footer-cta-shell--blocked',
  plain: 'accent-footer-cta-shell--plain',
};

export function AccentFooterCta({
  children,
  themeButtonClass,
  onClick,
  variant,
  ready = true,
  blocked = false,
  disabled = false,
  loading = false,
  trailingIcon,
  buttonTestId = 'accent-footer-cta',
  shellTestId = 'accent-footer-cta-shell',
}: AccentFooterCtaProps): React.ReactElement {
  const resolvedVariant = resolveVariant(variant, ready, blocked);
  const shellClass = SHELL_CLASS[resolvedVariant];
  const btnClass =
    resolvedVariant === 'blocked'
      ? 'lobby-start-btn--blocked'
      : resolvedVariant === 'plain'
        ? `lobby-start-btn--plain ${themeButtonClass}`
        : `lobby-start-btn--ready ${themeButtonClass}`;

  return (
    <div data-testid={shellTestId} className={`accent-footer-cta-shell ${shellClass}`}>
      <button
        type="button"
        data-testid={buttonTestId}
        onClick={onClick}
        disabled={resolvedVariant !== 'blocked' && disabled}
        aria-disabled={resolvedVariant === 'blocked' ? true : disabled || undefined}
        className={`lobby-start-btn inline-flex w-full items-center justify-center gap-2 rounded-theme px-10 py-5 ${typographyClass.label} font-semibold leading-none tracking-wide transition-transform duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ui-accent-ring focus-visible:ring-offset-ui-bg disabled:opacity-40 ${btnClass}`}
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin shrink-0" aria-hidden />
        ) : (
          <>
            <span>{children}</span>
            {trailingIcon}
          </>
        )}
      </button>
    </div>
  );
}
