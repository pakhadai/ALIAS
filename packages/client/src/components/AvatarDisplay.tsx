import React from 'react';

export const PRESET_AVATARS = [
  // Use theme-derived colors (no hardcoded HEX)
  { emoji: '🦊', mix: 72 },
  { emoji: '🐺', mix: 64 },
  { emoji: '🦁', mix: 78 },
  { emoji: '🐯', mix: 60 },
  { emoji: '🐻', mix: 68 },
  { emoji: '🐼', mix: 52 },
  { emoji: '🦋', mix: 70 },
  { emoji: '🦅', mix: 58 },
  { emoji: '🐬', mix: 66 },
  { emoji: '🦄', mix: 74 },
  { emoji: '🐉', mix: 56 },
  { emoji: '🦉', mix: 48 },
  { emoji: '🐸', mix: 62 },
  { emoji: '🦈', mix: 54 },
  { emoji: '🦚', mix: 67 },
  { emoji: '🦝', mix: 76 },
  { emoji: '🐊', mix: 50 },
  { emoji: '🦭', mix: 59 },
  { emoji: '🦩', mix: 73 },
  { emoji: '🐙', mix: 65 },
];

export function AvatarDisplay({
  avatarId,
  size = 44,
}: {
  avatarId?: string | null;
  size?: number;
}) {
  const idx = avatarId != null ? parseInt(avatarId) : -1;
  const preset = idx >= 0 && idx < PRESET_AVATARS.length ? PRESET_AVATARS[idx] : null;
  if (preset) {
    return (
      <div
        style={{
          width: size,
          height: size,
          background: `color-mix(in_srgb, var(--ui-accent) ${preset.mix}%, var(--ui-bg))`,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.5,
        }}
      >
        {preset.emoji}
      </div>
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        background: 'color-mix(in_srgb,var(--ui-fg)_10%,transparent)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 44 44" fill="none">
        <circle cx="22" cy="16" r="8" fill="color-mix(in_srgb,var(--ui-fg)_20%,transparent)" />
        <path
          d="M4 40c0-9.94 8.06-18 18-18s18 8.06 18 18"
          stroke="color-mix(in_srgb,var(--ui-fg)_20%,transparent)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
