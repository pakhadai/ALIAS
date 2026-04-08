import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart2,
  BookOpen,
  Palette,
  Users,
  LogOut,
  ExternalLink,
  AlertCircle,
  X,
} from 'lucide-react';
import { api, AdminAuthError, type AdminUser } from './adminApi';
import { StatsTab } from './tabs/StatsTab';
import { DecksTab } from './tabs/DecksTab';
import { PacksTab } from './tabs/PacksTab';
import { ThemesTab } from './tabs/ThemesTab';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info';
export type ShowToast = (message: string, type?: ToastType) => void;

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

type Tab = 'stats' | 'decks' | 'packs' | 'themes';

// ─── Toast system ─────────────────────────────────────────────────────────────

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-xl pointer-events-auto animate-slide-in ${
            t.type === 'success'
              ? 'bg-[color-mix(in_srgb,#44ff44_12%,#111)] border-[color-mix(in_srgb,#44ff44_28%,transparent)] text-[#44ff44]'
              : t.type === 'error'
                ? 'bg-[color-mix(in_srgb,#ff4444_12%,#111)] border-[color-mix(in_srgb,#ff4444_28%,transparent)] text-[#ff4444]'
                : 'bg-[#1a1a1a] border-[#333] text-white'
          }`}
          style={{ animation: 'toast-in 0.2s ease-out' }}
        >
          <span className="flex-1 text-sm leading-snug">{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="opacity-50 hover:opacity-100 transition-opacity shrink-0 mt-0.5"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Confirm modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  opts,
  onConfirm,
  onCancel,
}: {
  opts: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-6 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          {opts.danger && <AlertCircle size={20} className="text-[#ff4444] shrink-0 mt-0.5" />}
          <div>
            <h3 className="text-white font-bold text-base">{opts.title}</h3>
            <p className="text-[#888] text-sm mt-1 leading-relaxed">{opts.message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-bold text-[#888] bg-[#222] border border-[#333] hover:bg-[#2a2a2a] transition-colors"
          >
            Скасувати
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
              opts.danger
                ? 'bg-[#ff4444] text-white hover:bg-[#ff5555]'
                : 'bg-[#E3FF5B] text-black hover:brightness-110'
            }`}
          >
            {opts.confirmLabel ?? 'Підтвердити'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Auth screens ─────────────────────────────────────────────────────────────

function NotAuthorizedScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[#111] text-white">
      <div className="max-w-md text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-[color-mix(in_srgb,#ff4444_14%,transparent)] border border-[color-mix(in_srgb,#ff4444_28%,transparent)] flex items-center justify-center mx-auto">
          <AlertCircle size={28} className="text-[#ff4444]" />
        </div>
        <div>
          <h1 className="text-2xl font-serif mb-2">Доступ закрито</h1>
          <p className="text-[#888] text-sm leading-relaxed">{message}</p>
        </div>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E3FF5B] text-black font-bold text-sm hover:brightness-110 transition-all"
        >
          <ExternalLink size={16} />
          Перейти в головний додаток
        </a>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#111]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[#E3FF5B] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#888] text-sm">Перевірка авторизації…</p>
      </div>
    </div>
  );
}

// ─── Main admin app ───────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'stats', label: 'Статистика', icon: <BarChart2 size={16} /> },
  { id: 'decks', label: 'Колоди', icon: <Users size={16} /> },
  { id: 'packs', label: 'Word Packs', icon: <BookOpen size={16} /> },
  { id: 'themes', label: 'Теми', icon: <Palette size={16} /> },
];

export function AdminApp() {
  const [authState, setAuthState] = useState<'loading' | 'ok' | 'unauthorized' | 'not_admin'>(
    'loading'
  );
  const [user, setUser] = useState<AdminUser | null>(null);
  const [tab, setTab] = useState<Tab>('stats');

  // Toast
  const toastIdRef = useRef(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback<ShowToast>((message, type = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  // Confirm modal
  const [confirmState, setConfirmState] = useState<{
    opts: ConfirmOptions;
    resolve: (v: boolean) => void;
  } | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ opts, resolve });
    });
  }, []);

  const handleConfirm = () => {
    confirmState?.resolve(true);
    setConfirmState(null);
  };

  const handleCancel = () => {
    confirmState?.resolve(false);
    setConfirmState(null);
  };

  // Check auth on mount.
  // Strategy: 1) identify the user via /api/auth/me, 2) verify admin access by
  // probing /api/admin/live. The server enforces ADMIN_ALLOWED_EMAILS (.env) and
  // the isAdmin DB flag — if the probe returns 200 the user is allowed in.
  // We deliberately do NOT check u.isAdmin on the client: the source of truth is
  // the server (email whitelist takes priority over the DB flag).
  useEffect(() => {
    const token = localStorage.getItem('alias_auth_token');
    if (!token) {
      setAuthState('unauthorized');
      return;
    }

    let resolvedUser: AdminUser | null = null;

    api
      .getMe()
      .then((u) => {
        resolvedUser = u;
        // Verify admin access by hitting a lightweight admin endpoint.
        // The server checks: email whitelist (.env) OR isAdmin=true (DB).
        return api.getLiveStats();
      })
      .then(() => {
        setUser(resolvedUser);
        setAuthState('ok');
      })
      .catch((err) => {
        if (err instanceof AdminAuthError) {
          setAuthState(err.status === 403 ? 'not_admin' : 'unauthorized');
        } else {
          setAuthState('unauthorized');
        }
      });
  }, []);

  const handleLogout = () => {
    // Don't clear the main app token — just redirect to main app
    window.location.href = '/';
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (authState === 'loading') return <LoadingScreen />;

  if (authState === 'unauthorized') {
    return (
      <NotAuthorizedScreen message="Щоб отримати доступ до панелі адміністратора, увійдіть у систему через головний додаток з облікового запису адміністратора." />
    );
  }

  if (authState === 'not_admin') {
    return (
      <NotAuthorizedScreen message="Ваш акаунт не має прав адміністратора. Зверніться до власника системи." />
    );
  }

  const tabProps = { showToast, confirm };

  return (
    <div className="min-h-screen bg-[#111] text-white flex flex-col">
      {/* Top bar */}
      <header className="border-b border-[#222] px-6 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-lg tracking-wide text-white">ALIAS</h1>
          <span className="text-[10px] uppercase tracking-widest text-[#555] font-bold border border-[#333] px-2 py-0.5 rounded">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-4">
          {user?.email && (
            <span className="text-[11px] text-[#666] hidden sm:block">{user.email}</span>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-[#666] hover:text-white transition-colors"
          >
            <LogOut size={13} />
            Вийти
          </button>
        </div>
      </header>

      {/* Nav tabs */}
      <nav className="border-b border-[#222] px-4 flex gap-1 overflow-x-auto shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 py-3 px-4 text-[11px] uppercase tracking-widest font-bold border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'border-[#E3FF5B] text-[#E3FF5B]'
                : 'border-transparent text-[#666] hover:text-[#aaa]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {tab === 'stats' && <StatsTab {...tabProps} />}
          {tab === 'decks' && <DecksTab {...tabProps} />}
          {tab === 'packs' && <PacksTab {...tabProps} />}
          {tab === 'themes' && <ThemesTab {...tabProps} />}
        </div>
      </main>

      {/* Toast stack */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Confirm modal */}
      {confirmState && (
        <ConfirmModal opts={confirmState.opts} onConfirm={handleConfirm} onCancel={handleCancel} />
      )}

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
