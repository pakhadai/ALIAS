import React, { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Analytics {
  games: { total: number; completed: number; completionRate: number };
  revenue: { totalPurchases: number; totalCents: number };
  topPacks: { packId: string; name: string; purchases: number }[];
}

interface DailyStats {
  date: string;
  games: number;
  revenue: number;
}

interface AdminLiveStats {
  activeRooms: number;
  playersOnline: number;
  redisConnected: boolean;
  asOf: string;
}

interface CustomDeckRow {
  id: string;
  name: string;
  accessCode: string | null;
  status: string;
  userId: string;
  wordCount: number;
  createdAt: string;
}

interface WordPackRow {
  id: string;
  slug: string;
  name: string;
  language: string;
  category: string;
  difficulty: string;
  price: number;
  isFree: boolean;
  wordCount: number;
}

interface PackWord {
  id: string;
  text: string;
}

interface ThemeRow {
  id: string;
  slug: string;
  name: string;
  price: number;
  isFree: boolean;
  config: { preview?: { bg: string; accent: string } };
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const API_BASE = getApiBaseUrl();

async function adminFetch<T>(path: string, token: string, opts?: RequestInit): Promise<T> {
  const isJwt = token.includes('.');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (isJwt) headers['Authorization'] = `Bearer ${token}`;
  else headers['x-admin-key'] = token;
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { ...headers, ...((opts?.headers as Record<string, string>) ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-(--ui-surface) border border-(--ui-border) rounded-2xl p-5 flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-widest text-(--ui-fg-muted) font-bold">
        {label}
      </span>
      <span className="text-3xl font-serif font-bold text-(--ui-fg)">{value}</span>
      {sub && <span className="text-xs text-(--ui-fg-muted)">{sub}</span>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    approved:
      'bg-[color-mix(in_srgb,var(--ui-success)_14%,transparent)] text-(--ui-success) border-[color-mix(in_srgb,var(--ui-success)_28%,transparent)]',
    pending:
      'bg-[color-mix(in_srgb,var(--ui-warning)_14%,transparent)] text-(--ui-warning) border-[color-mix(in_srgb,var(--ui-warning)_28%,transparent)]',
    rejected:
      'bg-[color-mix(in_srgb,var(--ui-danger)_14%,transparent)] text-(--ui-danger) border-[color-mix(in_srgb,var(--ui-danger)_28%,transparent)]',
  };
  return (
    <span
      className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${colors[status] ?? 'bg-(--ui-surface) text-(--ui-fg-muted) border-(--ui-border)'}`}
    >
      {status}
    </span>
  );
}

function Bar({ pct, color = 'bg-(--ui-accent)' }: { pct: number; color?: string }) {
  return (
    <div className="flex-1 bg-(--ui-surface) rounded-full h-2 overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all`}
        style={{ width: `${Math.max(1, pct)}%` }}
      />
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

type Tab = 'stats' | 'decks' | 'packs' | 'themes';

export function AdminPanel() {
  const [apiKey, setApiKey] = useState(() => {
    const jwt = localStorage.getItem('alias_auth_token');
    if (jwt) return jwt;
    return sessionStorage.getItem('admin_key') || '';
  });
  const [inputKey, setInputKey] = useState('');
  const [authError, setAuthError] = useState('');

  const [tab, setTab] = useState<Tab>('stats');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Stats
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [daily, setDaily] = useState<DailyStats[]>([]);
  const [liveStats, setLiveStats] = useState<AdminLiveStats | null>(null);

  // Decks
  const [decks, setDecks] = useState<CustomDeckRow[]>([]);

  // Word Packs
  const [packs, setPacks] = useState<WordPackRow[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [packWords, setPackWords] = useState<PackWord[]>([]);
  const [wordsLoading, setWordsLoading] = useState(false);
  const [newWords, setNewWords] = useState('');
  const [wordFilter, setWordFilter] = useState('');
  const [editingPack, setEditingPack] = useState<(Partial<WordPackRow> & { id: string }) | null>(
    null
  );
  const [showCreatePack, setShowCreatePack] = useState(false);
  const [createForm, setCreateForm] = useState({
    slug: '',
    name: '',
    language: 'UA',
    category: 'General',
    difficulty: 'mixed',
    price: '0',
    isFree: true,
  });

  // Themes
  const [themes, setThemes] = useState<ThemeRow[]>([]);
  const [editingTheme, setEditingTheme] = useState<{
    id: string;
    price: string;
    isFree: boolean;
  } | null>(null);

  // Push broadcast
  const [broadcastForm, setBroadcastForm] = useState({ title: '', body: '', url: '' });
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────

  const load = useCallback(async (key: string, activeTab: Tab) => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'stats') {
        const [data, dailyData] = await Promise.all([
          adminFetch<Analytics>('/api/admin/analytics', key),
          adminFetch<DailyStats[]>('/api/admin/analytics/daily?days=30', key),
        ]);
        setAnalytics(data);
        setDaily(dailyData);
      } else if (activeTab === 'decks') {
        setDecks(await adminFetch<CustomDeckRow[]>('/api/admin/custom-decks', key));
      } else if (activeTab === 'packs') {
        setPacks(await adminFetch<WordPackRow[]>('/api/admin/packs', key));
        setSelectedPackId(null);
      } else {
        setThemes(await adminFetch<ThemeRow[]>('/api/admin/themes', key));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (apiKey) load(apiKey, tab);
  }, [apiKey, tab, load]);

  /** Redis live metrics — poll every 15s while Stats tab is open */
  useEffect(() => {
    if (!apiKey || tab !== 'stats') return;
    let cancelled = false;
    const fetchLive = () => {
      adminFetch<AdminLiveStats>('/api/admin/live', apiKey)
        .then((data) => {
          if (!cancelled) setLiveStats(data);
        })
        .catch(() => {
          if (!cancelled) setLiveStats(null);
        });
    };
    fetchLive();
    const id = window.setInterval(fetchLive, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [apiKey, tab]);

  // Load words when pack selected
  useEffect(() => {
    if (!selectedPackId || !apiKey) return;
    setWordsLoading(true);
    adminFetch<{ words: PackWord[] }>(`/api/admin/packs/${selectedPackId}`, apiKey)
      .then((d) => setPackWords(d.words))
      .catch(() => setPackWords([]))
      .finally(() => setWordsLoading(false));
  }, [selectedPackId, apiKey]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await adminFetch('/api/admin/analytics', inputKey);
      sessionStorage.setItem('admin_key', inputKey);
      setApiKey(inputKey);
    } catch {
      setAuthError('Невірний ключ або немає доступу');
    }
  };

  // ── Deck actions ───────────────────────────────────────────────────────────

  const handleDeckAction = async (id: string, action: 'approve' | 'reject' | 'delete') => {
    setActionLoading(id + action);
    try {
      if (action === 'delete') {
        await adminFetch(`/api/admin/custom-decks/${id}`, apiKey, { method: 'DELETE' });
        setDecks((prev) => prev.filter((d) => d.id !== id));
      } else {
        const updated = await adminFetch<CustomDeckRow>(`/api/admin/custom-decks/${id}`, apiKey, {
          method: 'PUT',
          body: JSON.stringify({ status: action === 'approve' ? 'approved' : 'rejected' }),
        });
        setDecks((prev) => prev.map((d) => (d.id === id ? { ...d, status: updated.status } : d)));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Word Pack actions ──────────────────────────────────────────────────────

  const handleAddWords = async () => {
    if (!selectedPackId || !newWords.trim()) return;
    const words = newWords
      .split('\n')
      .map((w) => w.trim())
      .filter(Boolean);
    setActionLoading('add-words');
    try {
      await adminFetch(`/api/admin/packs/${selectedPackId}/words`, apiKey, {
        method: 'POST',
        body: JSON.stringify({ words }),
      });
      setNewWords('');
      // Reload words
      const d = await adminFetch<{ words: PackWord[] }>(
        `/api/admin/packs/${selectedPackId}`,
        apiKey
      );
      setPackWords(d.words);
      setPacks((prev) =>
        prev.map((p) => (p.id === selectedPackId ? { ...p, wordCount: d.words.length } : p))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteWord = async (wordId: string) => {
    if (!selectedPackId) return;
    setActionLoading('del-' + wordId);
    try {
      const res = await adminFetch<{ totalWords: number }>(
        `/api/admin/packs/${selectedPackId}/words/${wordId}`,
        apiKey,
        { method: 'DELETE' }
      );
      setPackWords((prev) => prev.filter((w) => w.id !== wordId));
      setPacks((prev) =>
        prev.map((p) => (p.id === selectedPackId ? { ...p, wordCount: res.totalWords } : p))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSavePack = async () => {
    if (!editingPack) return;
    setActionLoading('save-pack-' + editingPack.id);
    try {
      const updated = await adminFetch<WordPackRow>(`/api/admin/packs/${editingPack.id}`, apiKey, {
        method: 'PUT',
        body: JSON.stringify({
          name: editingPack.name,
          difficulty: editingPack.difficulty,
          price: Number(editingPack.price),
          isFree: editingPack.isFree,
        }),
      });
      setPacks((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
      setEditingPack(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePack = async (id: string) => {
    if (!confirm('Видалити пак і всі слова?')) return;
    setActionLoading('del-pack-' + id);
    try {
      await adminFetch(`/api/admin/packs/${id}`, apiKey, { method: 'DELETE' });
      setPacks((prev) => prev.filter((p) => p.id !== id));
      if (selectedPackId === id) setSelectedPackId(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreatePack = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('create-pack');
    try {
      const created = await adminFetch<WordPackRow>('/api/admin/packs', apiKey, {
        method: 'POST',
        body: JSON.stringify({
          slug: createForm.slug,
          name: createForm.name,
          language: createForm.language,
          category: createForm.category,
          difficulty: createForm.difficulty,
          price: Number(createForm.price),
          isFree: createForm.isFree,
        }),
      });
      setPacks((prev) => [...prev, created]);
      setShowCreatePack(false);
      setCreateForm({
        slug: '',
        name: '',
        language: 'UA',
        category: 'General',
        difficulty: 'mixed',
        price: '0',
        isFree: true,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Theme actions ──────────────────────────────────────────────────────────

  const handleSaveTheme = async () => {
    if (!editingTheme) return;
    setActionLoading('save-theme-' + editingTheme.id);
    try {
      const updated = await adminFetch<ThemeRow>(`/api/admin/themes/${editingTheme.id}`, apiKey, {
        method: 'PUT',
        body: JSON.stringify({ price: Number(editingTheme.price), isFree: editingTheme.isFree }),
      });
      setThemes((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingTheme(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteTheme = async (id: string) => {
    if (!confirm('Видалити тему?')) return;
    setActionLoading('del-theme-' + id);
    try {
      await adminFetch(`/api/admin/themes/${id}`, apiKey, { method: 'DELETE' });
      setThemes((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Input style ────────────────────────────────────────────────────────────

  const inp =
    'bg-(--ui-surface) border border-(--ui-border) rounded-lg px-3 py-2 text-(--ui-fg) text-sm placeholder:text-(--ui-fg-muted) focus:outline-none focus:ring-2 focus:ring-(--ui-accent) focus:border-(--ui-accent)';

  // ── Login screen ───────────────────────────────────────────────────────────

  if (!apiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-(--ui-bg) text-(--ui-fg)">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <h1 className="font-serif text-3xl text-center text-(--ui-fg) mb-8">ALIAS Admin</h1>
          <input
            type="password"
            placeholder="Admin API Key"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            className={inp + ' w-full'}
          />
          {authError && <p className="text-(--ui-danger) text-sm text-center">{authError}</p>}
          <button
            type="submit"
            className="w-full bg-(--ui-accent) text-(--ui-accent-contrast) font-bold py-3 rounded-xl transition-colors hover:opacity-95"
          >
            Увійти
          </button>
        </form>
      </div>
    );
  }

  // ── Main layout ────────────────────────────────────────────────────────────

  const TABS: { id: Tab; label: string }[] = [
    { id: 'stats', label: 'Статистика' },
    { id: 'decks', label: 'Власні колоди' },
    { id: 'packs', label: 'Word Packs' },
    { id: 'themes', label: 'Теми' },
  ];

  const maxGames = Math.max(...daily.map((d) => d.games), 1);

  return (
    <div className="min-h-screen bg-(--ui-bg) text-(--ui-fg)">
      <header className="border-b border-(--ui-border) px-6 py-4 flex items-center justify-between">
        <h1 className="font-serif text-xl text-(--ui-fg) tracking-wide">ALIAS Admin</h1>
        <button
          onClick={() => {
            sessionStorage.removeItem('admin_key');
            setApiKey('');
          }}
          className="text-[10px] uppercase tracking-widest text-(--ui-fg-muted) hover:text-(--ui-fg) transition-colors"
        >
          Вийти
        </button>
      </header>

      <div className="border-b border-(--ui-border) px-6 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`py-3 px-2 text-[11px] uppercase tracking-widest font-bold border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'border-(--ui-accent) text-(--ui-accent)'
                : 'border-transparent text-(--ui-fg-muted) hover:text-(--ui-fg)'
            }`}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={() => load(apiKey, tab)}
          className="ml-auto py-3 px-2 text-[11px] uppercase tracking-widest font-bold text-(--ui-fg-muted) hover:text-(--ui-fg) transition-colors whitespace-nowrap"
        >
          ↻
        </button>
      </div>

      <main className="p-6 max-w-5xl mx-auto">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-(--ui-accent) border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {error && !loading && (
          <div className="bg-[color-mix(in_srgb,var(--ui-danger)_12%,transparent)] border border-[color-mix(in_srgb,var(--ui-danger)_30%,transparent)] rounded-xl px-4 py-3 text-(--ui-danger) text-sm text-center mb-4">
            {error}
          </div>
        )}

        {/* ── Stats tab ── */}
        {tab === 'stats' && !loading && analytics && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Ігор всього" value={analytics.games.total} />
              <StatCard
                label="Завершених"
                value={analytics.games.completed}
                sub={`${analytics.games.completionRate}% completion`}
              />
              <StatCard label="Покупок" value={analytics.revenue.totalPurchases} />
              <StatCard
                label="Дохід"
                value={`$${(analytics.revenue.totalCents / 100).toFixed(2)}`}
              />
            </div>

            <div className="space-y-2">
              <h2 className="text-[10px] uppercase tracking-widest text-(--ui-fg-muted) font-bold">
                Live (Redis) · оновлення кожні 15 с
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  label="Активних кімнат"
                  value={liveStats?.activeRooms ?? '—'}
                  sub={
                    liveStats
                      ? liveStats.redisConnected
                        ? `Станом на ${new Date(liveStats.asOf).toLocaleTimeString('uk-UA')}`
                        : 'Redis недоступний'
                      : 'Завантаження…'
                  }
                />
                <StatCard
                  label="Гравців онлайн"
                  value={liveStats?.playersOnline ?? '—'}
                  sub="Ключі alias:socket:*"
                />
              </div>
            </div>

            {/* Completion bar */}
            <div className="bg-(--ui-surface) border border-(--ui-border) rounded-2xl p-5 space-y-3">
              <h2 className="text-[10px] uppercase tracking-widest text-(--ui-fg-muted) font-bold">
                Показники
              </h2>
              {[
                {
                  label: 'Завершеність ігор',
                  pct: analytics.games.completionRate,
                  color: 'bg-(--ui-success)',
                },
                {
                  label: 'Конверсія покупок',
                  pct:
                    analytics.games.total > 0
                      ? Math.round((analytics.revenue.totalPurchases / analytics.games.total) * 100)
                      : 0,
                  color: 'bg-(--ui-accent)',
                },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="text-xs text-(--ui-fg-muted) w-40 shrink-0">{row.label}</span>
                  <Bar pct={row.pct} color={row.color} />
                  <span className="text-xs text-(--ui-fg) opacity-70 font-bold w-10 text-right">
                    {row.pct}%
                  </span>
                </div>
              ))}
            </div>

            {/* Daily activity chart */}
            {daily.length > 0 && (
              <div className="bg-(--ui-surface) border border-(--ui-border) rounded-2xl p-5">
                <h2 className="text-[10px] uppercase tracking-widest text-(--ui-fg-muted) font-bold mb-4">
                  Активність за 30 днів (ігри)
                </h2>
                <div className="flex items-end gap-0.5 h-24">
                  {daily.map((d) => (
                    <div key={d.date} className="flex-1 flex flex-col items-center group relative">
                      <div
                        className="w-full bg-[color-mix(in_srgb,var(--ui-accent)_55%,transparent)] hover:bg-(--ui-accent) rounded-sm transition-all cursor-default"
                        style={{
                          height: `${(d.games / maxGames) * 100}%`,
                          minHeight: d.games > 0 ? '4px' : '0',
                        }}
                        title={`${d.date}: ${d.games} ігор`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-[9px] text-(--ui-fg-muted) opacity-60">
                  <span>{daily[0]?.date.slice(5)}</span>
                  <span>{daily[Math.floor(daily.length / 2)]?.date.slice(5)}</span>
                  <span>{daily[daily.length - 1]?.date.slice(5)}</span>
                </div>
              </div>
            )}

            {/* Top packs */}
            <div>
              <h2 className="text-[10px] uppercase tracking-widest text-(--ui-fg-muted) font-bold mb-4">
                Топ паки за покупками
              </h2>
              {analytics.topPacks.length === 0 ? (
                <p className="text-(--ui-fg-muted) opacity-60 text-sm text-center py-6">
                  Ще немає покупок
                </p>
              ) : (
                <div className="space-y-2">
                  {analytics.topPacks.map((p, i) => {
                    const max = analytics.topPacks[0].purchases;
                    return (
                      <div key={p.packId} className="flex items-center gap-3">
                        <span className="text-(--ui-fg-muted) opacity-60 font-bold text-xs w-5">
                          #{i + 1}
                        </span>
                        <span className="text-(--ui-fg) text-sm font-medium w-40 truncate">
                          {p.name}
                        </span>
                        <Bar
                          pct={Math.round((p.purchases / max) * 100)}
                          color="bg-(--ui-accent)"
                        />
                        <span className="text-(--ui-accent) font-bold text-xs w-16 text-right">
                          {p.purchases} купівель
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Push broadcast */}
            <div className="bg-(--ui-surface) border border-(--ui-border) rounded-2xl p-5 space-y-4">
              <h2 className="text-[10px] uppercase tracking-widest text-(--ui-fg-muted) font-bold">
                Push-розсилка
              </h2>
              <div className="space-y-3">
                <input
                  value={broadcastForm.title}
                  onChange={(e) => setBroadcastForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Заголовок"
                  className="w-full bg-(--ui-surface) border border-(--ui-border) rounded-xl px-4 py-3 text-sm text-(--ui-fg) placeholder:text-(--ui-fg-muted) outline-none focus:border-(--ui-accent)"
                />
                <input
                  value={broadcastForm.body}
                  onChange={(e) => setBroadcastForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="Текст повідомлення"
                  className="w-full bg-(--ui-surface) border border-(--ui-border) rounded-xl px-4 py-3 text-sm text-(--ui-fg) placeholder:text-(--ui-fg-muted) outline-none focus:border-(--ui-accent)"
                />
                <input
                  value={broadcastForm.url}
                  onChange={(e) => setBroadcastForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="URL (необов'язково)"
                  className="w-full bg-(--ui-surface) border border-(--ui-border) rounded-xl px-4 py-3 text-sm text-(--ui-fg) placeholder:text-(--ui-fg-muted) outline-none focus:border-(--ui-accent)"
                />
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={async () => {
                    if (!broadcastForm.title || !broadcastForm.body) return;
                    setBroadcastLoading(true);
                    setBroadcastResult(null);
                    try {
                      await adminFetch('/api/admin/push/broadcast', apiKey, {
                        method: 'POST',
                        body: JSON.stringify(broadcastForm),
                      });
                      setBroadcastResult('Розіслано!');
                      setBroadcastForm({ title: '', body: '', url: '' });
                    } catch (e: any) {
                      setBroadcastResult(`Помилка: ${e.message}`);
                    } finally {
                      setBroadcastLoading(false);
                    }
                  }}
                  disabled={broadcastLoading || !broadcastForm.title || !broadcastForm.body}
                  className="px-5 py-2.5 rounded-xl bg-(--ui-accent) text-(--ui-accent-contrast) font-bold text-[11px] uppercase tracking-widest transition-all hover:opacity-95 disabled:opacity-40"
                >
                  {broadcastLoading ? '...' : 'Розіслати всім'}
                </button>
                {broadcastResult && (
                  <span
                    className={`text-[12px] ${
                      broadcastResult.startsWith('Помилка') ? 'text-(--ui-danger)' : 'text-(--ui-success)'
                    }`}
                  >
                    {broadcastResult}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Custom Decks tab ── */}
        {tab === 'decks' && !loading && (
          <div className="space-y-3">
            {decks.length === 0 && !error && (
              <p className="text-(--ui-fg-muted) opacity-60 text-sm text-center py-10">
                Немає власних колод
              </p>
            )}
            {decks.map((deck) => (
              <div
                key={deck.id}
                className="bg-(--ui-surface) border border-(--ui-border) rounded-2xl px-5 py-4"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span className="text-(--ui-fg) font-bold text-sm truncate">{deck.name}</span>
                      <StatusBadge status={deck.status} />
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-(--ui-fg-muted)">
                      <span>{deck.wordCount} слів</span>
                      {deck.accessCode && (
                        <span>
                          Код:{' '}
                          <span className="text-(--ui-fg) opacity-70 font-mono">{deck.accessCode}</span>
                        </span>
                      )}
                      <span>{new Date(deck.createdAt).toLocaleDateString('uk')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {deck.status !== 'approved' && (
                      <button
                        onClick={() => handleDeckAction(deck.id, 'approve')}
                        disabled={!!actionLoading}
                        className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-lg bg-[color-mix(in_srgb,var(--ui-success)_14%,transparent)] text-(--ui-success) border border-[color-mix(in_srgb,var(--ui-success)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--ui-success)_22%,transparent)] transition-colors disabled:opacity-40"
                      >
                        {actionLoading === deck.id + 'approve' ? '...' : 'Схвалити'}
                      </button>
                    )}
                    {deck.status !== 'rejected' && (
                      <button
                        onClick={() => handleDeckAction(deck.id, 'reject')}
                        disabled={!!actionLoading}
                        className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-lg bg-[color-mix(in_srgb,var(--ui-warning)_14%,transparent)] text-(--ui-warning) border border-[color-mix(in_srgb,var(--ui-warning)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--ui-warning)_22%,transparent)] transition-colors disabled:opacity-40"
                      >
                        {actionLoading === deck.id + 'reject' ? '...' : 'Відхилити'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeckAction(deck.id, 'delete')}
                      disabled={!!actionLoading}
                      className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-lg bg-[color-mix(in_srgb,var(--ui-danger)_14%,transparent)] text-(--ui-danger) border border-[color-mix(in_srgb,var(--ui-danger)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--ui-danger)_22%,transparent)] transition-colors disabled:opacity-40"
                    >
                      {actionLoading === deck.id + 'delete' ? '...' : 'Видалити'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Word Packs tab ── */}
        {tab === 'packs' && !loading && (
          <div className="space-y-4">
            {/* Create pack form */}
            <div className="flex justify-between items-center">
              <h2 className="text-[10px] uppercase tracking-widest text-(--ui-fg-muted) opacity-80 font-bold">
                {packs.length} паків
              </h2>
              <button
                onClick={() => setShowCreatePack((v) => !v)}
                className="text-[10px] uppercase tracking-widest font-bold px-4 py-2 rounded-lg bg-[color-mix(in_srgb,var(--ui-accent)_14%,transparent)] text-(--ui-accent) border border-[color-mix(in_srgb,var(--ui-accent)_25%,transparent)] hover:bg-[color-mix(in_srgb,var(--ui-accent)_20%,transparent)] transition-colors"
              >
                {showCreatePack ? '✕ Скасувати' : '+ Новий пак'}
              </button>
            </div>

            {showCreatePack && (
              <form
                onSubmit={handleCreatePack}
                className="bg-(--ui-card) border border-(--ui-border) rounded-2xl p-5 space-y-3"
              >
                <h3 className="text-sm font-bold text-(--ui-fg) mb-2">Новий Word Pack</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className={inp}
                    placeholder="slug (ua-general)"
                    value={createForm.slug}
                    onChange={(e) => setCreateForm((f) => ({ ...f, slug: e.target.value }))}
                    required
                  />
                  <input
                    className={inp}
                    placeholder="Назва"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                  <select
                    className={inp}
                    value={createForm.language}
                    onChange={(e) => setCreateForm((f) => ({ ...f, language: e.target.value }))}
                  >
                    <option>UA</option>
                    <option>EN</option>
                    <option>DE</option>
                  </select>
                  <input
                    className={inp}
                    placeholder="Category"
                    value={createForm.category}
                    onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}
                  />
                  <select
                    className={inp}
                    value={createForm.difficulty}
                    onChange={(e) => setCreateForm((f) => ({ ...f, difficulty: e.target.value }))}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="mixed">Mixed</option>
                    <option value="18+">18+</option>
                  </select>
                  <div className="flex items-center gap-3">
                    <input
                      className={inp + ' flex-1'}
                      placeholder="Ціна (центи)"
                      type="number"
                      min="0"
                      value={createForm.price}
                      onChange={(e) => setCreateForm((f) => ({ ...f, price: e.target.value }))}
                    />
                    <label className="flex items-center gap-2 text-xs text-(--ui-fg-muted) cursor-pointer whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={createForm.isFree}
                        onChange={(e) => setCreateForm((f) => ({ ...f, isFree: e.target.checked }))}
                        className="accent-(--ui-accent)"
                      />
                      Безкоштовний
                    </label>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={actionLoading === 'create-pack'}
                  className="w-full bg-(--ui-accent) hover:brightness-110 text-(--ui-accent-contrast) font-bold py-2 rounded-xl transition-colors disabled:opacity-40"
                >
                  {actionLoading === 'create-pack' ? 'Створення...' : 'Створити пак'}
                </button>
              </form>
            )}

            {/* Pack list */}
            <div className="space-y-2">
              {packs.length === 0 && !error && (
                <p className="text-(--ui-fg-muted) opacity-60 text-sm text-center py-10">
                  Немає паків
                </p>
              )}
              {packs.map((pack) => (
                <div
                  key={pack.id}
                  className="bg-(--ui-card) border border-(--ui-border) rounded-xl overflow-hidden"
                >
                  {/* Pack row */}
                  <div className="px-5 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-(--ui-fg) font-medium text-sm">{pack.name}</span>
                        <span className="text-[10px] bg-(--ui-surface) text-(--ui-fg-muted) px-2 py-0.5 rounded-full font-mono border border-(--ui-border)">
                          {pack.slug}
                        </span>
                        <span className="text-[10px] text-(--ui-fg-muted) opacity-80">
                          {pack.language} · {pack.category} · {pack.difficulty}
                        </span>
                        {pack.isFree ? (
                          <span className="text-[10px] text-(--ui-success) font-bold">FREE</span>
                        ) : (
                          <span className="text-[10px] text-(--ui-accent) font-bold">
                            ${(pack.price / 100).toFixed(2)}
                          </span>
                        )}
                        <span className="text-[10px] text-(--ui-fg-muted) opacity-80">
                          {pack.wordCount} слів
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() =>
                          setSelectedPackId(selectedPackId === pack.id ? null : pack.id)
                        }
                        className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-lg bg-[color-mix(in_srgb,var(--ui-accent)_14%,transparent)] text-(--ui-accent) border border-[color-mix(in_srgb,var(--ui-accent)_25%,transparent)] hover:bg-[color-mix(in_srgb,var(--ui-accent)_20%,transparent)] transition-colors"
                      >
                        {selectedPackId === pack.id ? '▲ Закрити' : `▼ Слова`}
                      </button>
                      <button
                        onClick={() =>
                          setEditingPack(
                            editingPack?.id === pack.id
                              ? null
                              : {
                                  id: pack.id,
                                  name: pack.name,
                                  difficulty: pack.difficulty,
                                  price: pack.price,
                                  isFree: pack.isFree,
                                }
                          )
                        }
                        className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-lg bg-(--ui-surface) text-(--ui-fg-muted) border border-(--ui-border) hover:bg-(--ui-surface-hover) transition-colors"
                      >
                        ✏
                      </button>
                      <button
                        onClick={() => handleDeletePack(pack.id)}
                        disabled={!!actionLoading}
                        className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-lg bg-[color-mix(in_srgb,var(--ui-danger)_14%,transparent)] text-(--ui-danger) border border-[color-mix(in_srgb,var(--ui-danger)_25%,transparent)] hover:bg-[color-mix(in_srgb,var(--ui-danger)_20%,transparent)] transition-colors disabled:opacity-40"
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  {/* Edit metadata panel */}
                  {editingPack?.id === pack.id && (
                    <div className="border-t border-(--ui-border) px-5 py-4 bg-(--ui-surface) space-y-3">
                      <h4 className="text-[10px] uppercase tracking-widest text-(--ui-fg-muted) opacity-80 font-bold">
                        Редагувати метадані
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          className={inp}
                          placeholder="Назва"
                          value={editingPack.name ?? ''}
                          onChange={(e) =>
                            setEditingPack((p) => (p ? { ...p, name: e.target.value } : p))
                          }
                        />
                        <select
                          className={inp}
                          value={editingPack.difficulty ?? 'mixed'}
                          onChange={(e) =>
                            setEditingPack((p) => (p ? { ...p, difficulty: e.target.value } : p))
                          }
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                          <option value="mixed">Mixed</option>
                          <option value="18+">18+</option>
                        </select>
                        <input
                          className={inp}
                          type="number"
                          min="0"
                          placeholder="Ціна (центи)"
                          value={editingPack.price ?? 0}
                          onChange={(e) =>
                            setEditingPack((p) => (p ? { ...p, price: Number(e.target.value) } : p))
                          }
                        />
                        <label className="flex items-center gap-2 text-xs text-(--ui-fg-muted) cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingPack.isFree ?? false}
                            onChange={(e) =>
                              setEditingPack((p) => (p ? { ...p, isFree: e.target.checked } : p))
                            }
                            className="accent-(--ui-accent)"
                          />
                          Безкоштовний
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSavePack}
                          disabled={!!actionLoading}
                          className="text-[10px] uppercase tracking-widest font-bold px-4 py-2 rounded-lg bg-[color-mix(in_srgb,var(--ui-success)_14%,transparent)] text-(--ui-success) border border-[color-mix(in_srgb,var(--ui-success)_25%,transparent)] hover:bg-[color-mix(in_srgb,var(--ui-success)_20%,transparent)] transition-colors disabled:opacity-40"
                        >
                          {actionLoading === 'save-pack-' + pack.id ? '...' : 'Зберегти'}
                        </button>
                        <button
                          onClick={() => setEditingPack(null)}
                          className="text-[10px] uppercase tracking-widest font-bold px-4 py-2 rounded-lg bg-(--ui-surface) text-(--ui-fg-muted) border border-(--ui-border) hover:bg-(--ui-surface-hover) transition-colors"
                        >
                          Скасувати
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Words panel */}
                  {selectedPackId === pack.id && (
                    <div className="border-t border-(--ui-border) px-5 py-4 bg-(--ui-surface) space-y-4">
                      <h4 className="text-[10px] uppercase tracking-widest text-(--ui-fg-muted) opacity-80 font-bold">
                        Слова ({packWords.length})
                      </h4>

                      {/* Add words */}
                      <div className="flex gap-2 items-start">
                        <textarea
                          className={inp + ' flex-1 resize-none h-20 text-xs'}
                          placeholder="Додати слова (по одному на рядок)"
                          value={newWords}
                          onChange={(e) => setNewWords(e.target.value)}
                        />
                        <button
                          onClick={handleAddWords}
                          disabled={!newWords.trim() || actionLoading === 'add-words'}
                          className="text-[10px] uppercase tracking-widest font-bold px-4 py-2 rounded-lg bg-[color-mix(in_srgb,var(--ui-accent)_14%,transparent)] text-(--ui-accent) border border-[color-mix(in_srgb,var(--ui-accent)_25%,transparent)] hover:bg-[color-mix(in_srgb,var(--ui-accent)_20%,transparent)] transition-colors disabled:opacity-40 whitespace-nowrap"
                        >
                          {actionLoading === 'add-words' ? '...' : '+ Додати'}
                        </button>
                      </div>

                      {/* Filter */}
                      {packWords.length > 10 && (
                        <input
                          className={inp + ' w-full'}
                          placeholder="Пошук слів..."
                          value={wordFilter}
                          onChange={(e) => setWordFilter(e.target.value)}
                        />
                      )}

                      {/* Word chips */}
                      {wordsLoading ? (
                        <div className="flex justify-center py-4">
                          <div className="w-5 h-5 border-2 border-(--ui-accent) border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                          {packWords
                            .filter(
                              (w) =>
                                !wordFilter ||
                                w.text.toLowerCase().includes(wordFilter.toLowerCase())
                            )
                            .map((w) => (
                              <span
                                key={w.id}
                                className="flex items-center gap-1.5 bg-(--ui-surface) text-(--ui-fg) text-xs px-2.5 py-1 rounded-full border border-(--ui-border)"
                              >
                                {w.text}
                                <button
                                  onClick={() => handleDeleteWord(w.id)}
                                  disabled={actionLoading === 'del-' + w.id}
                                  className="text-(--ui-fg-muted) opacity-70 hover:text-(--ui-danger) transition-colors text-xs leading-none"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          {packWords.length === 0 && (
                            <p className="text-(--ui-fg-muted) opacity-60 text-xs">
                              Слів немає. Додайте вище.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Themes tab ── */}
        {tab === 'themes' && !loading && (
          <div className="space-y-3">
            {themes.length === 0 && !error && (
              <p className="text-(--ui-fg-muted) opacity-60 text-sm text-center py-10">Немає тем</p>
            )}
            {themes.map((theme) => {
              const previewBg = theme.config?.preview?.bg ?? '#1A1A1A';
              const previewAccent = theme.config?.preview?.accent ?? 'var(--ui-accent)';
              const isEditing = editingTheme?.id === theme.id;
              return (
                <div
                  key={theme.id}
                  className="bg-(--ui-card) border border-(--ui-border) rounded-2xl overflow-hidden"
                >
                  <div className="px-5 py-4 flex items-center gap-4">
                    {/* Color swatch */}
                    <div
                      className="w-12 h-12 rounded-xl shrink-0 border border-(--ui-border) overflow-hidden relative"
                      style={{ background: previewBg }}
                    >
                      <div
                        className="absolute bottom-1.5 right-1.5 w-3 h-3 rounded-full border border-(--ui-border)"
                        style={{ background: previewAccent }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-(--ui-fg) font-medium text-sm">{theme.name}</span>
                        <span className="text-[10px] bg-(--ui-surface) text-(--ui-fg-muted) px-2 py-0.5 rounded-full font-mono border border-(--ui-border)">
                          {theme.slug}
                        </span>
                        {theme.isFree ? (
                          <span className="text-[10px] text-(--ui-success) font-bold">FREE</span>
                        ) : (
                          <span className="text-[10px] text-(--ui-accent) font-bold">
                            ${(theme.price / 100).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() =>
                          setEditingTheme(
                            isEditing
                              ? null
                              : { id: theme.id, price: String(theme.price), isFree: theme.isFree }
                          )
                        }
                        className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-lg bg-(--ui-surface) text-(--ui-fg-muted) border border-(--ui-border) hover:bg-(--ui-surface-hover) transition-colors"
                      >
                        {isEditing ? 'Скасувати' : '✏ Ред.'}
                      </button>
                      <button
                        onClick={() => handleDeleteTheme(theme.id)}
                        disabled={!!actionLoading}
                        className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-lg bg-[color-mix(in_srgb,var(--ui-danger)_14%,transparent)] text-(--ui-danger) border border-[color-mix(in_srgb,var(--ui-danger)_25%,transparent)] hover:bg-[color-mix(in_srgb,var(--ui-danger)_20%,transparent)] transition-colors disabled:opacity-40"
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  {/* Inline edit */}
                  {isEditing && editingTheme && (
                    <div className="border-t border-(--ui-border) px-5 py-4 bg-(--ui-surface) flex items-center gap-4 flex-wrap">
                      <label className="flex items-center gap-2 text-xs text-(--ui-fg-muted) cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingTheme.isFree}
                          onChange={(e) =>
                            setEditingTheme((t) => (t ? { ...t, isFree: e.target.checked } : t))
                          }
                          className="accent-(--ui-accent)"
                        />
                        Безкоштовна
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-(--ui-fg-muted) opacity-80">Ціна (центи):</span>
                        <input
                          className={inp + ' w-28'}
                          type="number"
                          min="0"
                          value={editingTheme.price}
                          onChange={(e) =>
                            setEditingTheme((t) => (t ? { ...t, price: e.target.value } : t))
                          }
                        />
                      </div>
                      <button
                        onClick={handleSaveTheme}
                        disabled={!!actionLoading}
                        className="text-[10px] uppercase tracking-widest font-bold px-4 py-2 rounded-lg bg-[color-mix(in_srgb,var(--ui-success)_14%,transparent)] text-(--ui-success) border border-[color-mix(in_srgb,var(--ui-success)_25%,transparent)] hover:bg-[color-mix(in_srgb,var(--ui-success)_20%,transparent)] transition-colors disabled:opacity-40"
                      >
                        {actionLoading === 'save-theme-' + theme.id ? '...' : 'Зберегти'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
