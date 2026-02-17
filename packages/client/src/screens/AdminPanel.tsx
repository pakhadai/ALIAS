import React, { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Analytics {
  games: { total: number; completed: number; completionRate: number };
  revenue: { totalPurchases: number; totalCents: number };
  topPacks: { packId: string; name: string; purchases: number }[];
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

// ─── API helpers ──────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

async function adminFetch<T>(path: string, token: string, opts?: RequestInit): Promise<T> {
  // token can be a JWT (Bearer) or a raw API key (x-admin-key)
  const isJwt = token.includes('.');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (isJwt) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    headers['x-admin-key'] = token;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers: { ...headers, ...(opts?.headers as Record<string, string> ?? {}) } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{label}</span>
      <span className="text-3xl font-serif font-bold text-white">{value}</span>
      {sub && <span className="text-xs text-white/40">{sub}</span>}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return (
    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${colors[status] ?? 'bg-white/10 text-white/40 border-white/10'}`}>
      {status}
    </span>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function AdminPanel() {
  // Auto-auth: try JWT from localStorage first, then fall back to stored API key
  const [apiKey, setApiKey] = useState(() => {
    const jwt = localStorage.getItem('alias_auth_token');
    if (jwt) return jwt;
    return sessionStorage.getItem('admin_key') || '';
  });
  const [inputKey, setInputKey] = useState('');
  const [authError, setAuthError] = useState('');

  const [tab, setTab] = useState<'stats' | 'decks' | 'packs'>('stats');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [decks, setDecks] = useState<CustomDeckRow[]>([]);
  const [packs, setPacks] = useState<WordPackRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async (key: string, activeTab: typeof tab) => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'stats') {
        const data = await adminFetch<Analytics>('/api/admin/analytics', key);
        setAnalytics(data);
      } else if (activeTab === 'decks') {
        const data = await adminFetch<CustomDeckRow[]>('/api/admin/custom-decks', key);
        setDecks(data);
      } else {
        const data = await adminFetch<WordPackRow[]>('/api/admin/packs', key);
        setPacks(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // On key set or tab change, reload
  useEffect(() => {
    if (apiKey) load(apiKey, tab);
  }, [apiKey, tab, load]);

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

  const handleDeckAction = async (id: string, action: 'approve' | 'reject' | 'delete') => {
    setActionLoading(id + action);
    try {
      if (action === 'delete') {
        await adminFetch(`/api/admin/custom-decks/${id}`, apiKey, { method: 'DELETE' });
        setDecks(prev => prev.filter(d => d.id !== id));
      } else {
        const updated = await adminFetch<CustomDeckRow>(
          `/api/admin/custom-decks/${id}`,
          apiKey,
          { method: 'PUT', body: JSON.stringify({ status: action === 'approve' ? 'approved' : 'rejected' }) },
        );
        setDecks(prev => prev.map(d => d.id === id ? { ...d, status: updated.status } : d));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Login screen ──────────────────────────────────────────────────────────

  if (!apiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <h1 className="font-serif text-3xl text-center text-white mb-8">ALIAS Admin</h1>
          <input
            type="password"
            placeholder="Admin API Key"
            value={inputKey}
            onChange={e => setInputKey(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF6A]"
          />
          {authError && <p className="text-red-400 text-sm text-center">{authError}</p>}
          <button
            type="submit"
            className="w-full bg-[#D4AF6A] hover:bg-[#C9A55A] text-black font-bold py-3 rounded-xl transition-colors"
          >
            Увійти
          </button>
        </form>
      </div>
    );
  }

  // ── Main panel ────────────────────────────────────────────────────────────

  const TABS: { id: typeof tab; label: string }[] = [
    { id: 'stats', label: 'Статистика' },
    { id: 'decks', label: 'Власні колоди' },
    { id: 'packs', label: 'Word Packs' },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <h1 className="font-serif text-xl text-white tracking-wide">ALIAS Admin</h1>
        <button
          onClick={() => { sessionStorage.removeItem('admin_key'); setApiKey(''); }}
          className="text-[10px] uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors"
        >
          Вийти
        </button>
      </header>

      {/* Tabs */}
      <div className="border-b border-white/10 px-6 flex gap-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`py-3 text-[11px] uppercase tracking-widest font-bold border-b-2 transition-colors ${
              tab === t.id ? 'border-[#D4AF6A] text-[#D4AF6A]' : 'border-transparent text-white/30 hover:text-white/60'
            }`}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={() => load(apiKey, tab)}
          className="ml-auto py-3 text-[11px] uppercase tracking-widest font-bold text-white/20 hover:text-white/50 transition-colors"
        >
          ↻ Оновити
        </button>
      </div>

      {/* Content */}
      <main className="p-6 max-w-5xl mx-auto">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#D4AF6A] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* ── Stats tab ── */}
        {tab === 'stats' && !loading && analytics && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Ігор всього" value={analytics.games.total} />
              <StatCard label="Завершених" value={analytics.games.completed} sub={`${analytics.games.completionRate}% completion`} />
              <StatCard label="Покупок" value={analytics.revenue.totalPurchases} />
              <StatCard
                label="Дохід"
                value={`$${(analytics.revenue.totalCents / 100).toFixed(2)}`}
              />
            </div>

            <div>
              <h2 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-4">Топ паки за покупками</h2>
              {analytics.topPacks.length === 0 ? (
                <p className="text-white/20 text-sm text-center py-6">Ще немає покупок</p>
              ) : (
                <div className="space-y-2">
                  {analytics.topPacks.map((p, i) => (
                    <div key={p.packId} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                      <span className="text-white/20 font-bold text-sm w-6">#{i + 1}</span>
                      <span className="flex-1 text-white text-sm font-medium">{p.name}</span>
                      <span className="text-[#D4AF6A] font-bold text-sm">{p.purchases} купівель</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Custom decks tab ── */}
        {tab === 'decks' && !loading && (
          <div className="space-y-3">
            {decks.length === 0 && !error && (
              <p className="text-white/20 text-sm text-center py-10">Немає власних колод</p>
            )}
            {decks.map(deck => (
              <div key={deck.id} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span className="text-white font-bold text-sm truncate">{deck.name}</span>
                      <StatusBadge status={deck.status} />
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-white/30">
                      <span>{deck.wordCount} слів</span>
                      {deck.accessCode && (
                        <span>Код: <span className="text-white/50 font-mono">{deck.accessCode}</span></span>
                      )}
                      <span>{new Date(deck.createdAt).toLocaleDateString('uk')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {deck.status !== 'approved' && (
                      <button
                        onClick={() => handleDeckAction(deck.id, 'approve')}
                        disabled={!!actionLoading}
                        className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors disabled:opacity-40"
                      >
                        {actionLoading === deck.id + 'approve' ? '...' : 'Схвалити'}
                      </button>
                    )}
                    {deck.status !== 'rejected' && (
                      <button
                        onClick={() => handleDeckAction(deck.id, 'reject')}
                        disabled={!!actionLoading}
                        className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30 transition-colors disabled:opacity-40"
                      >
                        {actionLoading === deck.id + 'reject' ? '...' : 'Відхилити'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeckAction(deck.id, 'delete')}
                      disabled={!!actionLoading}
                      className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors disabled:opacity-40"
                    >
                      {actionLoading === deck.id + 'delete' ? '...' : 'Видалити'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Word packs tab ── */}
        {tab === 'packs' && !loading && (
          <div className="space-y-2">
            {packs.length === 0 && !error && (
              <p className="text-white/20 text-sm text-center py-10">Немає паків</p>
            )}
            {packs.map(pack => (
              <div key={pack.id} className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-0.5 flex-wrap">
                    <span className="text-white font-medium text-sm truncate">{pack.name}</span>
                    <span className="text-[10px] bg-white/10 text-white/50 px-2 py-0.5 rounded-full font-mono">{pack.slug}</span>
                    {!pack.isFree && (
                      <span className="text-[10px] text-[#D4AF6A] font-bold">${(pack.price / 100).toFixed(2)}</span>
                    )}
                    {pack.isFree && (
                      <span className="text-[10px] text-emerald-400 font-bold">FREE</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-white/30">
                    <span>{pack.language}</span>
                    <span>{pack.category}</span>
                    <span>{pack.difficulty}</span>
                    <span>{pack.wordCount} слів</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
