import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, Trash2, RefreshCw } from 'lucide-react';
import { api, type CustomDeckRow } from '../adminApi';
import type { ShowToast, ConfirmFn } from '../AdminApp';
import { ADMIN_CARD_CLASS, ADMIN_SPINNER_CLASS, adminStatusBtn } from '../components/adminStyles';
import { typographyClass } from '../../../constants/typography';

interface Props {
  showToast: ShowToast;
  confirm: ConfirmFn;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved:
      'bg-[color-mix(in_srgb,var(--ui-success)_14%,transparent)] text-ui-success border-[color-mix(in_srgb,var(--ui-success)_28%,transparent)]',
    pending:
      'bg-[color-mix(in_srgb,var(--ui-warning)_14%,transparent)] text-ui-warning border-[color-mix(in_srgb,var(--ui-warning)_28%,transparent)]',
    rejected:
      'bg-[color-mix(in_srgb,var(--ui-danger)_14%,transparent)] text-ui-danger border-[color-mix(in_srgb,var(--ui-danger)_28%,transparent)]',
  };
  const labels: Record<string, string> = {
    approved: 'Схвалено',
    pending: 'На розгляді',
    rejected: 'Відхилено',
  };
  return (
    <span
      className={`${typographyClass.label} tracking-wider px-2.5 py-0.5 rounded-full border ${styles[status] ?? 'bg-ui-surface-hover text-ui-fg-muted border-ui-border'}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

export function DecksTab({ showToast, confirm }: Props) {
  const [decks, setDecks] = useState<CustomDeckRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<Set<string>>(new Set());

  const addActing = (key: string) => setActing((s) => new Set(s).add(key));
  const delActing = (key: string) =>
    setActing((s) => {
      const n = new Set(s);
      n.delete(key);
      return n;
    });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDecks(await api.getDecks());
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : '';
      showToast(msg || 'Помилка', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (deck: CustomDeckRow) => {
    const key = `${deck.id}-approve`;
    addActing(key);
    try {
      const updated = await api.updateDeckStatus(deck.id, 'approved');
      setDecks((prev) =>
        prev.map((d) => (d.id === deck.id ? { ...d, status: updated.status } : d))
      );
      showToast(`«${deck.name}» схвалено`, 'success');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : '';
      showToast(msg || 'Помилка', 'error');
    } finally {
      delActing(key);
    }
  };

  const handleReject = async (deck: CustomDeckRow) => {
    const key = `${deck.id}-reject`;
    addActing(key);
    try {
      const updated = await api.updateDeckStatus(deck.id, 'rejected');
      setDecks((prev) =>
        prev.map((d) => (d.id === deck.id ? { ...d, status: updated.status } : d))
      );
      showToast(`«${deck.name}» відхилено`, 'info');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : '';
      showToast(msg || 'Помилка', 'error');
    } finally {
      delActing(key);
    }
  };

  const handleDelete = async (deck: CustomDeckRow) => {
    const ok = await confirm({
      title: 'Видалити колоду?',
      message: `«${deck.name}» буде видалено назавжди. Цю дію не можна скасувати.`,
      confirmLabel: 'Видалити',
      danger: true,
    });
    if (!ok) return;
    const key = `${deck.id}-delete`;
    addActing(key);
    try {
      await api.deleteDeck(deck.id);
      setDecks((prev) => prev.filter((d) => d.id !== deck.id));
      showToast(`«${deck.name}» видалено`, 'success');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : '';
      showToast(msg || 'Помилка', 'error');
    } finally {
      delActing(key);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center pt-24">
        <div className={`w-8 h-8 ${ADMIN_SPINNER_CLASS}`} />
      </div>
    );
  }

  const pending = decks.filter((d) => d.status === 'pending');
  const rest = decks.filter((d) => d.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-serif text-ui-fg">Власні колоди</h2>
          <p className="text-sm text-ui-fg-muted mt-0.5">
            {decks.length} всього · {pending.length} на розгляді
          </p>
        </div>
        <button
          onClick={load}
          className={`flex items-center gap-2 ${typographyClass.label} tracking-widest text-ui-fg-muted hover:text-ui-fg transition-colors`}
        >
          <RefreshCw size={13} />
          Оновити
        </button>
      </div>

      {pending.length > 0 && (
        <section>
          <h3 className={`${typographyClass.label} tracking-widest text-ui-warning font-bold mb-3`}>
            На розгляді ({pending.length})
          </h3>
          <div className="space-y-2">
            {pending.map((deck) => (
              <DeckRow
                key={deck.id}
                deck={deck}
                acting={acting}
                onApprove={handleApprove}
                onReject={handleReject}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section>
          <h3
            className={`${typographyClass.label} tracking-widest text-ui-fg-muted font-bold mb-3`}
          >
            Решта ({rest.length})
          </h3>
          <div className="space-y-2">
            {rest.map((deck) => (
              <DeckRow
                key={deck.id}
                deck={deck}
                acting={acting}
                onApprove={handleApprove}
                onReject={handleReject}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </section>
      )}

      {decks.length === 0 && (
        <div className="text-center py-16 text-ui-fg-muted">Власних колод немає</div>
      )}
    </div>
  );
}

function DeckRow({
  deck,
  acting,
  onApprove,
  onReject,
  onDelete,
}: {
  deck: CustomDeckRow;
  acting: Set<string>;
  onApprove: (d: CustomDeckRow) => void;
  onReject: (d: CustomDeckRow) => void;
  onDelete: (d: CustomDeckRow) => void;
}) {
  const isApproving = acting.has(`${deck.id}-approve`);
  const isRejecting = acting.has(`${deck.id}-reject`);
  const isDeleting = acting.has(`${deck.id}-delete`);

  return (
    <div className={`${ADMIN_CARD_CLASS} px-5 py-4 flex items-start gap-4`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1.5 flex-wrap">
          <span className="text-ui-fg font-semibold text-sm">{deck.name}</span>
          <StatusBadge status={deck.status} />
          {deck.accessCode && (
            <span
              className={`${typographyClass.label} font-mono normal-case text-ui-fg-muted bg-ui-bg px-2 py-0.5 rounded border border-ui-border`}
            >
              {deck.accessCode}
            </span>
          )}
        </div>
        <div className={`flex items-center gap-4 ${typographyClass.label} text-ui-fg-muted`}>
          <span>{deck.wordCount} слів</span>
          <span>{new Date(deck.createdAt).toLocaleDateString('uk')}</span>
          <span
            className={`text-ui-fg-subtle font-mono ${typographyClass.label} normal-case truncate max-w-[120px]`}
          >
            {deck.userId.slice(0, 8)}…
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {deck.status !== 'approved' && (
          <button
            onClick={() => onApprove(deck)}
            disabled={isApproving}
            className={`flex items-center gap-1.5 ${typographyClass.label} tracking-wider px-3 py-1.5 rounded-lg disabled:opacity-40 ${adminStatusBtn('success')}`}
          >
            {isApproving ? (
              <span className="w-3 h-3 border border-ui-success border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check size={11} />
            )}
            Схвалити
          </button>
        )}
        {deck.status !== 'rejected' && (
          <button
            onClick={() => onReject(deck)}
            disabled={isRejecting}
            className={`flex items-center gap-1.5 ${typographyClass.label} tracking-wider px-3 py-1.5 rounded-lg disabled:opacity-40 ${adminStatusBtn('warning')}`}
          >
            {isRejecting ? (
              <span className="w-3 h-3 border border-ui-warning border-t-transparent rounded-full animate-spin" />
            ) : (
              <X size={11} />
            )}
            Відхилити
          </button>
        )}
        <button
          onClick={() => onDelete(deck)}
          disabled={isDeleting}
          className={`flex items-center gap-1.5 ${typographyClass.label} tracking-wider px-3 py-1.5 rounded-lg disabled:opacity-40 ${adminStatusBtn('danger')}`}
        >
          {isDeleting ? (
            <span className="w-3 h-3 border border-ui-danger border-t-transparent rounded-full animate-spin" />
          ) : (
            <Trash2 size={11} />
          )}
          Видалити
        </button>
      </div>
    </div>
  );
}
