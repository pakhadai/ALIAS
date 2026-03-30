function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

// Prefer same-origin by default. This avoids CORS surprises in local Docker/proxy setups.
const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL && normalizeBaseUrl(import.meta.env.VITE_SERVER_URL)) ||
  (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost:3001');

/** Storage keys */
export const AUTH_TOKEN_KEY = 'alias_auth_token';
export const DEVICE_ID_KEY = 'alias_device_id';
export const PLAYER_ID_KEY = 'alias_player_id';
export const ROOM_CODE_KEY = 'alias_room_code';

/** Generate or retrieve a persistent device ID */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/** Get stored JWT */
export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/** Store JWT */
export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

/** Remove JWT (logout) */
export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

/** Authenticated fetch wrapper */
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${SERVER_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Auth API ──────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  userId: string;
  email?: string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  authProvider: string;
  displayName: string | null;
  avatarId: string | null;
  isAdmin: boolean;
  createdAt: string;
  purchases: {
    id: string;
    wordPackId: string | null;
    wordPack?: { slug: string } | null;
    themeId: string | null;
    soundPackId: string | null;
    createdAt: string;
  }[];
}

/** Update display name and/or avatar preset */
export async function updateProfile(payload: {
  displayName?: string;
  avatarId?: string;
}): Promise<{ displayName: string | null; avatarId: string | null }> {
  return apiFetch('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** In-memory cache for lobby settings (avoids duplicate fetches from multiple screens) */
let lobbySettingsCache: { data: Record<string, unknown> | null; ts: number } | null = null;
const LOBBY_CACHE_TTL_MS = 30_000;

/** Get saved default lobby settings (cached 30s to avoid rate limit from repeated mounts) */
export async function fetchLobbySettings(): Promise<Record<string, unknown> | null> {
  const now = Date.now();
  if (lobbySettingsCache && now - lobbySettingsCache.ts < LOBBY_CACHE_TTL_MS) {
    return lobbySettingsCache.data;
  }
  const data = await apiFetch<{ settings: Record<string, unknown> | null }>('/api/auth/lobby-settings');
  lobbySettingsCache = { data: data.settings, ts: now };
  return data.settings;
}

/** Invalidate lobby cache after save (so next fetch gets fresh data) */
export function invalidateLobbySettingsCache(): void {
  lobbySettingsCache = null;
}

/** Save default lobby settings */
export async function saveLobbySettings(settings: Record<string, unknown>): Promise<void> {
  await apiFetch('/api/auth/lobby-settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  invalidateLobbySettingsCache();
}

/** Get anonymous JWT (creates User record on server if needed) */
export async function fetchAnonymousToken(): Promise<AuthResponse> {
  const deviceId = getDeviceId();
  const data = await apiFetch<AuthResponse>('/api/auth/anonymous', {
    method: 'POST',
    body: JSON.stringify({ deviceId }),
  });
  setAuthToken(data.token);
  return data;
}

/** Sign in with Google ID token */
export async function signInWithGoogle(idToken: string): Promise<AuthResponse> {
  const deviceId = getDeviceId();
  const data = await apiFetch<AuthResponse>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken, deviceId }),
  });
  setAuthToken(data.token);
  return data;
}


/** Get current user profile */
export async function fetchProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/api/auth/me');
}

// ─── Store API ─────────────────────────────────────────────────────────

export interface StoreItem {
  id: string;
  slug: string;
  name: string;
  price: number;   // cents
  isFree: boolean;
  owned: boolean;
}

export interface WordPackItem extends StoreItem {
  language: string;
  category: string;
  difficulty: string;
  wordCount: number;
  description: string | null;
  isDefault: boolean;
}

export interface ThemeItem extends StoreItem {
  config: Record<string, unknown>;
}

export interface SoundPackItem extends StoreItem {
  config: Record<string, unknown>;
}

export interface StoreData {
  wordPacks: WordPackItem[];
  themes: ThemeItem[];
  soundPacks: SoundPackItem[];
}

export async function fetchStore(): Promise<StoreData> {
  return apiFetch<StoreData>('/api/store');
}

// ─── Purchases API ─────────────────────────────────────────────────────

export interface CheckoutResponse {
  checkoutUrl: string;
  purchaseId: string;
}

export async function createCheckout(
  itemType: 'wordPack' | 'theme' | 'soundPack',
  itemId: string,
): Promise<CheckoutResponse> {
  return apiFetch<CheckoutResponse>('/api/purchases/checkout', {
    method: 'POST',
    body: JSON.stringify({ itemType, itemId }),
  });
}

export interface PaymentIntentResponse {
  clientSecret: string;
  purchaseId: string;
  amount: number;
  itemName: string;
}

/** Create a Stripe PaymentIntent for in-app quick pay (Apple Pay / Google Pay / card) */
export async function createPaymentIntent(
  itemType: 'wordPack' | 'theme' | 'soundPack',
  itemId: string,
): Promise<PaymentIntentResponse> {
  return apiFetch<PaymentIntentResponse>('/api/purchases/payment-intent', {
    method: 'POST',
    body: JSON.stringify({ itemType, itemId }),
  });
}

/** Claim a free item — instantly marks it as owned (idempotent) */
export async function claimFreeItem(
  itemType: 'wordPack' | 'theme' | 'soundPack',
  itemId: string,
): Promise<void> {
  return apiFetch<void>('/api/purchases/claim', {
    method: 'POST',
    body: JSON.stringify({ itemType, itemId }),
  });
}

// ─── Custom Decks API ───────────────────────────────────────────────────

export interface CustomDeckSummary {
  id: string;
  name: string;
  accessCode: string;
  status: string;
  wordCount: number;
  branding: { logoUrl?: string; primaryColor?: string; companyName?: string } | null;
  createdAt: string;
}

export interface CustomDeckDetail extends CustomDeckSummary {
  words: string[];
}

export async function fetchMyDecks(): Promise<CustomDeckSummary[]> {
  return apiFetch<CustomDeckSummary[]>('/api/custom-decks/my');
}

export async function createCustomDeck(payload: {
  name: string;
  words: string[];
  branding?: { logoUrl?: string; primaryColor?: string; companyName?: string };
  accessCode?: string;
}): Promise<CustomDeckSummary> {
  return apiFetch<CustomDeckSummary>('/api/custom-decks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function uploadCustomDeckFile(file: File, name: string): Promise<CustomDeckSummary> {
  const token = getAuthToken();
  const form = new FormData();
  form.append('file', file);
  form.append('name', name);
  const res = await fetch(`${SERVER_URL}/api/custom-decks/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchDeckByCode(code: string): Promise<CustomDeckDetail> {
  return apiFetch<CustomDeckDetail>(`/api/custom-decks/access/${code}`);
}

export async function deleteCustomDeck(id: string): Promise<void> {
  return apiFetch<void>(`/api/custom-decks/${id}`, { method: 'DELETE' });
}

// ─── Push Notifications ────────────────────────────────────────────────────

export async function fetchVapidPublicKey(): Promise<string> {
  const data = await apiFetch<{ publicKey: string }>('/api/push/vapid-key');
  return data.publicKey;
}

export async function savePushSubscription(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON();
  await apiFetch('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
    }),
  });
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await apiFetch('/api/push/unsubscribe', {
    method: 'DELETE',
    body: JSON.stringify({ endpoint }),
  });
}
