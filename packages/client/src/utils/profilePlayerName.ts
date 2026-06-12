import type { UserProfile } from '../services/api';
import type { AuthState } from '../hooks/useAuth';
import { AVATARS } from './avatars';
import { PRESET_AVATARS } from '../components/AvatarDisplay';

const OAUTH_PROVIDERS = new Set(['telegram', 'google']);

export function isOAuthAuthProvider(provider: string | null | undefined): boolean {
  return OAUTH_PROVIDERS.has(String(provider ?? '').toLowerCase());
}

/** Resolve in-game name: custom displayName → OAuth name → email local part. */
export function resolvePlayerNameFromProfile(
  profile: Pick<UserProfile, 'displayName' | 'name' | 'email'>
): string {
  const fromDisplay = (profile.displayName ?? '').trim();
  if (fromDisplay) return fromDisplay.replace(/<[^>]*>/g, '').slice(0, 20);

  const fromOAuth = (profile.name ?? '').trim();
  if (fromOAuth) return fromOAuth.replace(/<[^>]*>/g, '').slice(0, 20);

  const email = (profile.email ?? '').trim();
  const at = email.indexOf('@');
  if (at > 0) {
    const local = email.slice(0, at).trim();
    if (local) return local.replace(/<[^>]*>/g, '').slice(0, 20);
  }

  return '';
}

export function canSkipNamePrompt(authState: AuthState, profile: UserProfile | null): boolean {
  if (authState.status !== 'authenticated' || !profile) return false;
  if (!profile.skipNamePrompt) return false;
  if (!isOAuthAuthProvider(profile.authProvider)) return false;
  return Boolean(resolvePlayerNameFromProfile(profile));
}

export function resolvePlayerAvatarFromProfile(profile: UserProfile): {
  emoji: string;
  avatarId: string | null;
  avatarUrl: string | null;
} {
  const defaultAvatar = AVATARS[0] ?? '🙂';
  if (profile.avatarId != null) {
    const idx = parseInt(profile.avatarId, 10);
    const emoji = PRESET_AVATARS[idx]?.emoji ?? defaultAvatar;
    return { emoji, avatarId: profile.avatarId, avatarUrl: null };
  }
  const url = (profile.avatarUrl ?? '').trim();
  return { emoji: defaultAvatar, avatarId: null, avatarUrl: url || null };
}
