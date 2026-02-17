import React from 'react';

export const PRESET_AVATARS = [
  { emoji: '🦊', bg: '#FF6B6B' }, { emoji: '🐺', bg: '#4ECDC4' },
  { emoji: '🦁', bg: '#FFD166' }, { emoji: '🐯', bg: '#F4A261' },
  { emoji: '🐻', bg: '#8ECAE6' }, { emoji: '🐼', bg: '#95D5B2' },
  { emoji: '🦋', bg: '#C77DFF' }, { emoji: '🦅', bg: '#E76F51' },
  { emoji: '🐬', bg: '#48CAE4' }, { emoji: '🦄', bg: '#F8A5C2' },
  { emoji: '🐉', bg: '#52B788' }, { emoji: '🦉', bg: '#B5C4B1' },
  { emoji: '🐸', bg: '#80B918' }, { emoji: '🦈', bg: '#56CFE1' },
  { emoji: '🦚', bg: '#2EC4B6' }, { emoji: '🦝', bg: '#FFBF69' },
  { emoji: '🐊', bg: '#40916C' }, { emoji: '🦭', bg: '#74B3CE' },
  { emoji: '🦩', bg: '#FF8FAB' }, { emoji: '🐙', bg: '#9B5DE5' },
];

export function AvatarDisplay({ avatarId, size = 44 }: { avatarId?: string | null; size?: number }) {
  const idx = avatarId != null ? parseInt(avatarId) : -1;
  const preset = idx >= 0 && idx < PRESET_AVATARS.length ? PRESET_AVATARS[idx] : null;
  if (preset) {
    return (
      <div style={{ width: size, height: size, background: preset.bg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.5 }}>
        {preset.emoji}
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 44 44" fill="none">
        <circle cx="22" cy="16" r="8" fill="rgba(255,255,255,0.25)" />
        <path d="M4 40c0-9.94 8.06-18 18-18s18 8.06 18 18" stroke="rgba(255,255,255,0.25)" strokeWidth="2" fill="none" strokeLinecap="round"/>
      </svg>
    </div>
  );
}
