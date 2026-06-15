import type React from 'react';

type TelegramIconProps = {
  size?: number;
  className?: string;
};

/** Telegram paper-plane mark — sized like lucide icons in modal option rows. */
export function TelegramIcon({ size = 18, className }: TelegramIconProps): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path d="M9.993 15.394 9.5 19.5l2.825-2.017 5.877 4.302 3.002-17.496L2.25 10.337l5.233 1.952 11.01-6.935-8.5 10.04z" />
    </svg>
  );
}
