import React from 'react';

export const SentryErrorFallback: React.FC<{
  error?: unknown;
  resetError?: () => void;
}> = ({ error, resetError }) => {
  const message = error instanceof Error ? error.message : '';

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-(--ui-bg) text-(--ui-fg) px-6 py-16 font-sans">
      <div className="max-w-md w-full rounded-3xl border border-(--ui-border) bg-(--ui-card) p-8 shadow-2xl backdrop-blur-lg text-center space-y-6">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--ui-warning)_18%,transparent)] text-(--ui-warning) text-2xl font-serif">
          !
        </div>
        <div className="space-y-2">
          <h1 className="text-lg font-semibold tracking-tight text-(--ui-fg)">Щось пішло не так</h1>
          <p className="text-sm text-(--ui-fg-muted) leading-relaxed">
            Ми вже отримали звіт про проблему. Спробуйте перезавантажити сторінку — зазвичай це
            допомагає.
          </p>
          {message ? (
            <p className="text-[11px] text-(--ui-fg-muted) font-mono wrap-break-word pt-1">
              {message}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-2xl bg-(--ui-accent) text-(--ui-accent-contrast) px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-(--ui-accent-hover) active:bg-(--ui-accent-pressed) transition-colors"
          >
            Перезавантажити
          </button>
          {resetError ? (
            <button
              type="button"
              onClick={resetError}
              className="rounded-2xl border border-(--ui-border) px-6 py-3 text-xs font-bold uppercase tracking-widest text-(--ui-fg-muted) hover:bg-(--ui-surface) hover:text-(--ui-fg) transition-colors"
            >
              Спробувати знову
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
