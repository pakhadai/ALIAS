import { getApiBaseUrl } from '../../services/api';

const API_BASE = getApiBaseUrl();

// ─── Auth error ───────────────────────────────────────────────────────────────

export class AdminAuthError extends Error {
  constructor(public status: 401 | 403) {
    super(status === 403 ? 'Немає прав адміністратора' : 'Не авторизовано');
  }
}

// ─── Fetch wrapper ────────────────────────────────────────────────────────────

export async function adminFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = localStorage.getItem('alias_auth_token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((opts?.headers as Record<string, string>) ?? {}),
    },
  });

  if (res.status === 401) throw new AdminAuthError(401);
  if (res.status === 403) throw new AdminAuthError(403);

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string | null;
  isAdmin: boolean;
  authProvider: string;
}

export interface AdminAnalytics {
  games: { total: number; completed: number; completionRate: number };
  revenue: { totalPurchases: number; totalCents: number };
  topPacks: { packId: string; name: string; purchases: number }[];
}

export interface AdminDailyStats {
  date: string;
  games: number;
  revenue: number;
}

export interface AdminLiveStats {
  activeRooms: number;
  playersOnline: number;
  redisConnected: boolean;
  asOf: string;
}

export interface CustomDeckRow {
  id: string;
  name: string;
  accessCode: string | null;
  status: string;
  userId: string;
  wordCount: number;
  createdAt: string;
}

export interface WordPackRow {
  id: string;
  slug: string;
  name: string;
  language: string;
  category: string;
  difficulty: string;
  price: number;
  isFree: boolean;
  wordCount: number;
  description?: string | null;
}

export interface PackWord {
  id: string;
  text: string;
}

export interface ThemeRow {
  id: string;
  slug: string;
  name: string;
  price: number;
  isFree: boolean;
  config: { preview?: { bg: string; accent: string } };
}

// ─── API functions ────────────────────────────────────────────────────────────

export const api = {
  // Auth
  getMe: () => adminFetch<AdminUser>('/api/auth/me'),

  // Stats
  getAnalytics: () => adminFetch<AdminAnalytics>('/api/admin/analytics'),
  getDailyStats: (days = 30) =>
    adminFetch<AdminDailyStats[]>(`/api/admin/analytics/daily?days=${days}`),
  getLiveStats: () => adminFetch<AdminLiveStats>('/api/admin/live'),

  // Decks
  getDecks: () => adminFetch<CustomDeckRow[]>('/api/admin/custom-decks'),
  updateDeckStatus: (id: string, status: 'approved' | 'rejected' | 'pending') =>
    adminFetch<CustomDeckRow>(`/api/admin/custom-decks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  deleteDeck: (id: string) => adminFetch(`/api/admin/custom-decks/${id}`, { method: 'DELETE' }),

  // Packs
  getPacks: () => adminFetch<WordPackRow[]>('/api/admin/packs'),
  getPack: (id: string) =>
    adminFetch<WordPackRow & { words: PackWord[] }>(`/api/admin/packs/${id}`),
  createPack: (data: Omit<WordPackRow, 'id' | 'wordCount'>) =>
    adminFetch<WordPackRow>('/api/admin/packs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePack: (
    id: string,
    data: {
      name?: string;
      difficulty?: string;
      price?: number;
      isFree?: boolean;
      description?: string;
    }
  ) =>
    adminFetch<WordPackRow>(`/api/admin/packs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deletePack: (id: string) => adminFetch(`/api/admin/packs/${id}`, { method: 'DELETE' }),
  addWords: (packId: string, words: string[]) =>
    adminFetch(`/api/admin/packs/${packId}/words`, {
      method: 'POST',
      body: JSON.stringify({ words }),
    }),
  deleteWord: (packId: string, wordId: string) =>
    adminFetch<{ totalWords: number }>(`/api/admin/packs/${packId}/words/${wordId}`, {
      method: 'DELETE',
    }),
  uploadCsv: async (packId: string, file: File): Promise<{ message: string }> => {
    const token = localStorage.getItem('alias_auth_token');
    const form = new FormData();
    form.append('file', file);
    form.append('packId', packId);
    const res = await fetch(`${API_BASE}/api/admin/upload-csv`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  // Themes
  getThemes: () => adminFetch<ThemeRow[]>('/api/admin/themes'),
  updateTheme: (id: string, data: { price?: number; isFree?: boolean; name?: string }) =>
    adminFetch<ThemeRow>(`/api/admin/themes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteTheme: (id: string) => adminFetch(`/api/admin/themes/${id}`, { method: 'DELETE' }),

  // Push
  broadcastPush: (title: string, body: string, url?: string) =>
    adminFetch('/api/admin/push/broadcast', {
      method: 'POST',
      body: JSON.stringify({ title, body, url }),
    }),
};
