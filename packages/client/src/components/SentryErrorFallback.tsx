import React from 'react';

export const SentryErrorFallback: React.FC<{
  error?: unknown;
  resetError?: () => void;
}> = ({ error, resetError }) => {
  const message = error instanceof Error ? error.message : '';

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0f1115] text-white px-6 py-16 font-sans">
      <div className="max-w-md w-full rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-sm text-center space-y-6">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 text-2xl font-serif">
          !
        </div>
        <div className="space-y-2">
          <h1 className="text-lg font-semibold tracking-tight text-white">
            Щось пішло не так
          </h1>
          <p className="text-sm text-white/60 leading-relaxed">
            Ми вже отримали звіт про проблему. Спробуйте перезавантажити сторінку — зазвичай це
            допомагає.
          </p>
          {message ? (
            <p className="text-[11px] text-white/35 font-mono break-words pt-1">{message}</p>
          ) : null}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-2xl bg-champagne-gold text-[#1a1a1a] px-6 py-3 text-xs font-bold uppercase tracking-widest hover:opacity-95 transition-opacity"
          >
            Перезавантажити
          </button>
          {resetError ? (
            <button
              type="button"
              onClick={resetError}
              className="rounded-2xl border border-white/15 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white/70 hover:bg-white/5 transition-colors"
            >
              Спробувати знову
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
