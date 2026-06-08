import React from 'react';
import { X } from 'lucide-react';
import { typographyClass } from '../constants/typography';

export type ToastVisualType = 'info' | 'error' | 'success';

export interface ToastItemProps {
  message: string;
  type?: ToastVisualType;
  onDismiss?: () => void;
  className?: string;
  dismissLabel?: string;
}

export function ToastItem({
  message,
  type = 'info',
  onDismiss,
  className = '',
  dismissLabel = 'Close',
}: ToastItemProps) {
  const typeModifier =
    type === 'error'
      ? 'ui-toast-glass--error'
      : type === 'success'
        ? 'ui-toast-glass--success'
        : '';

  return (
    <div
      role="status"
      className={[
        'ui-toast-glass',
        typeModifier,
        'flex w-fit max-w-[min(calc(100vw-2rem),22rem)] items-center gap-2.5 rounded-2xl px-3.5 py-2.5',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <p
        className={`ui-toast-fg min-w-0 flex-1 text-left ${typographyClass.body} font-medium leading-snug`}
      >
        {message}
      </p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="ui-toast-dismiss ui-toast-fg-muted shrink-0 rounded-md p-1 transition-colors"
          aria-label={dismissLabel}
        >
          <X size={16} strokeWidth={2.25} />
        </button>
      ) : null}
    </div>
  );
}
