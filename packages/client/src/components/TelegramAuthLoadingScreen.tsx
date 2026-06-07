import React from 'react';
import { Logo } from './Shared';
import { THEME_CONFIG, DEFAULT_APP_THEME } from '../constants';

/**
 * Full-screen boot state for Telegram Mini App: matches ALIAS typography and UI tokens.
 * Shown until JWT handshake completes (GameProvider is not mounted yet).
 */
export const TelegramAuthLoadingScreen: React.FC = () => {
  const theme = THEME_CONFIG[DEFAULT_APP_THEME];

  return (
    <div className="min-h-screen w-full bg-ui-bg text-ui-fg font-sans flex flex-col items-center justify-center px-8 relative overflow-hidden selection:bg-ui-accent selection:text-ui-accent-contrast">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 40%, var(--ui-accent) 0%, transparent 65%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] bg-[radial-gradient(var(--ui-fg)_0.5px,transparent_0.5px)] bg-size-[14px_14px]" />

      <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-sm">
        <div className="scale-[0.85] opacity-95">
          <Logo theme={theme} />
        </div>

        <div className="relative h-28 w-28 shrink-0" aria-hidden>
          <span className="absolute inset-0 rounded-full border border-ui-accent/25 telegram-boot-ring" />
          <span
            className="absolute inset-[10%] rounded-full border border-ui-accent/35 telegram-boot-ring"
            style={{ animationDelay: '-0.5s' }}
          />
          <span
            className="absolute inset-[22%] rounded-full border-2 border-ui-accent/50 telegram-boot-ring"
            style={{ animationDelay: '-1s' }}
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="h-2 w-2 rounded-full bg-ui-accent shadow-[0_0_20px_color-mix(in_srgb,var(--ui-accent)_80%,transparent)] telegram-boot-glow" />
          </span>
        </div>

        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-medium tracking-wide text-ui-fg-muted">Авторизація…</p>
          <div className="flex gap-1.5" role="presentation">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-ui-accent telegram-boot-dot"
                style={{ animationDelay: `${i * 160}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
