import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, Trash2, RefreshCw } from 'lucide-react';
import { api, type CustomDeckRow } from '../adminApi';
import type { ShowToast, ConfirmFn } from '../AdminApp';

interface Props {
  showToast: ShowToast;
  confirm: ConfirmFn;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved:
      'bg-[color-mix(in_srgb,#44ff44_14%,transparent)] text-[#44ff44] border-[color-mix(in_srgb,#44ff44_28%,transparent)]',
    pending:
      'bg-[color-mix(in_srgb,#ffaa00_14%,transparent)] text-[#ffaa00] border-[color-mix(in_srgb,#ffaa00_28%,transparent)]',
    rejected:
      'bg-[color-mix(in_srgb,#ff4444_14%,transparent)] text-[#ff4444] border-[color-mix(in_srgb,#ff4444_28%,transparent)]',
  };
  const labels: Record<string, string> = {
    approved: 'Схвалено',
    pending: 'На розгляді',
    rejected: 'Відхилено',
  };
  return (
    <span
      className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border ${styles[status] ?? 'bg-[#222] text-[#888] border-[#333]'}`}
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
        <div className="w-8 h-8 border-2 border-[#E3FF5B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pending = decks.filter((d) => d.status === 'pending');
  const rest = decks.filter((d) => d.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-serif text-white">Власні колоди</h2>
          <p className="text-sm text-[#888] mt-0.5">
            {decks.length} всього · {pending.length} на розгляді
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-[#888] hover:text-white transition-colors"
        >
          <RefreshCw size={13} />
          Оновити
        </button>
      </div>

      {pending.length > 0 && (
        <section>
          <h3 className="text-[10px] uppercase tracking-widest text-[#ffaa00] font-bold mb-3">
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
          <h3 className="text-[10px] uppercase tracking-widest text-[#888] font-bold mb-3">
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
        <div className="text-center py-16 text-[#888]">Власних колод немає</div>
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
    <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl px-5 py-4 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1.5 flex-wrap">
          <span className="text-white font-semibold text-sm">{deck.name}</span>
          <StatusBadge status={deck.status} />
          {deck.accessCode && (
            <span className="text-[10px] font-mono text-[#888] bg-[#111] px-2 py-0.5 rounded border border-[#333]">
              {deck.accessCode}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-[11px] text-[#888]">
          <span>{deck.wordCount} слів</span>
          <span>{new Date(deck.createdAt).toLocaleDateString('uk')}</span>
          <span className="text-[#555] font-mono text-[10px] truncate max-w-[120px]">
            {deck.userId.slice(0, 8)}…
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {deck.status !== 'approved' && (
          <button
            onClick={() => onApprove(deck)}
            disabled={isApproving}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg bg-[color-mix(in_srgb,#44ff44_12%,transparent)] text-[#44ff44] border border-[color-mix(in_srgb,#44ff44_25%,transparent)] hover:bg-[color-mix(in_srgb,#44ff44_20%,transparent)] transition-colors disabled:opacity-40"
          >
            {isApproving ? (
              <span className="w-3 h-3 border border-[#44ff44] border-t-transparent rounded-full animate-spin" />
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
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg bg-[color-mix(in_srgb,#ffaa00_12%,transparent)] text-[#ffaa00] border border-[color-mix(in_srgb,#ffaa00_25%,transparent)] hover:bg-[color-mix(in_srgb,#ffaa00_20%,transparent)] transition-colors disabled:opacity-40"
          >
            {isRejecting ? (
              <span className="w-3 h-3 border border-[#ffaa00] border-t-transparent rounded-full animate-spin" />
            ) : (
              <X size={11} />
            )}
            Відхилити
          </button>
        )}
        <button
          onClick={() => onDelete(deck)}
          disabled={isDeleting}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg bg-[color-mix(in_srgb,#ff4444_12%,transparent)] text-[#ff4444] border border-[color-mix(in_srgb,#ff4444_25%,transparent)] hover:bg-[color-mix(in_srgb,#ff4444_20%,transparent)] transition-colors disabled:opacity-40"
        >
          {isDeleting ? (
            <span className="w-3 h-3 border border-[#ff4444] border-t-transparent rounded-full animate-spin" />
          ) : (
            <Trash2 size={11} />
          )}
          Видалити
        </button>
      </div>
    </div>
  );
}
