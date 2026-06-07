import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDeferredOpen } from '../../hooks/useDeferredOpen';
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
import { ModalSheet } from '../../components/ModalSheet';
import { zIndex } from '../../constants/zIndex';
import { StatsTab } from './tabs/StatsTab';
import { DecksTab } from './tabs/DecksTab';
import { PacksTab } from './tabs/PacksTab';
import { ThemesTab } from './tabs/ThemesTab';
import { ADMIN_SPINNER_CLASS } from './components/adminStyles';

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
    <div
      className={`fixed top-4 right-4 ${zIndex.toast} flex flex-col gap-2 pointer-events-none max-w-sm w-full`}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-xl pointer-events-auto animate-slide-in ${
            t.type === 'success'
              ? 'bg-[color-mix(in_srgb,var(--ui-success)_12%,var(--ui-bg))] border-[color-mix(in_srgb,var(--ui-success)_28%,transparent)] text-ui-success'
              : t.type === 'error'
                ? 'bg-[color-mix(in_srgb,var(--ui-danger)_12%,var(--ui-bg))] border-[color-mix(in_srgb,var(--ui-danger)_28%,transparent)] text-ui-danger'
                : 'bg-ui-surface border-ui-border text-ui-fg'
          }`}
          style={{ animation: 'toast-in 0.2s ease-out' }}
        >
          <span className="flex-1 text-sm leading-snug">{t.message}</span>
          <button
            type="button"
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
  const [open] = useDeferredOpen();

  return (
    <ModalSheet
      open={open}
      onClose={onCancel}
      zLayer="modalConfirm"
      maxWidth="sm"
      showHandle
      paddedContent={false}
      panelClassName="px-5 pt-0 pb-safe-bottom-8"
      role="alertdialog"
    >
      <div className="flex items-start gap-3 mb-5 pt-1">
        {opts.danger && (
          <AlertCircle size={20} className="text-ui-danger shrink-0 mt-0.5" aria-hidden />
        )}
        <div className="min-w-0">
          <h3 className="text-ui-fg font-bold text-base font-sans leading-snug">{opts.title}</h3>
          <p className="text-ui-fg-muted text-sm mt-1.5 leading-relaxed">{opts.message}</p>
        </div>
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-bold text-ui-fg-muted bg-ui-surface border border-ui-border hover:bg-ui-surface-hover transition-colors"
        >
          Скасувати
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${
            opts.danger
              ? 'bg-ui-danger text-ui-accent-contrast hover:opacity-90'
              : 'bg-ui-accent text-ui-accent-contrast hover:bg-ui-accent-hover'
          }`}
        >
          {opts.confirmLabel ?? 'Підтвердити'}
        </button>
      </div>
    </ModalSheet>
  );
}

// ─── Auth screens ─────────────────────────────────────────────────────────────

function NotAuthorizedScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-ui-bg text-ui-fg">
      <div className="max-w-md text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-[color-mix(in_srgb,var(--ui-danger)_14%,transparent)] border border-[color-mix(in_srgb,var(--ui-danger)_28%,transparent)] flex items-center justify-center mx-auto">
          <AlertCircle size={28} className="text-ui-danger" />
        </div>
        <div>
          <h1 className="text-2xl font-serif mb-2">Доступ закрито</h1>
          <p className="text-ui-fg-muted text-sm leading-relaxed">{message}</p>
        </div>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-ui-accent text-ui-accent-contrast font-bold text-sm hover:bg-ui-accent-hover transition-all"
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
    <div className="min-h-screen flex items-center justify-center bg-ui-bg">
      <div className="flex flex-col items-center gap-4">
        <div className={`w-10 h-10 ${ADMIN_SPINNER_CLASS}`} />
        <p className="text-ui-fg-muted text-sm">Перевірка авторизації…</p>
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

  // Admin auth probe on mount — deferred: requires token from main app localStorage (bootstrap).
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

  const handleBackToApp = () => {
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
    <div className="min-h-screen bg-ui-bg text-ui-fg flex flex-col">
      {/* Top bar */}
      <header className="border-b border-ui-border-subtle px-6 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-lg tracking-wide text-ui-fg">ALIAS</h1>
          <span className="text-[10px] uppercase tracking-widest text-ui-fg-subtle font-bold border border-ui-border px-2 py-0.5 rounded">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToApp}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-ui-fg-subtle hover:text-ui-fg transition-colors"
            title="Повернутися в додаток"
          >
            <ExternalLink size={13} />В додаток
          </button>
          {user?.email && (
            <span className="text-[11px] text-ui-fg-subtle hidden sm:block">{user.email}</span>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-ui-fg-subtle hover:text-ui-fg transition-colors"
          >
            <LogOut size={13} />
            Вийти
          </button>
        </div>
      </header>

      {/* Nav tabs */}
      <nav className="border-b border-ui-border-subtle px-4 flex gap-1 overflow-x-auto shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 py-3 px-4 text-[11px] uppercase tracking-widest font-bold border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'border-ui-accent text-ui-accent'
                : 'border-transparent text-ui-fg-subtle hover:text-ui-fg-muted'
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
