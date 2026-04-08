import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Plus,
  Upload,
  Trash2,
  Copy,
  Check,
  Loader2,
  FileText,
  ChevronRight,
  Share2,
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { TRANSLATIONS } from '../../constants';
import { useT } from '../../hooks/useT';
import { buildDeckShareUrl } from '../../utils/deckShare';
import { LoginModal } from '../Auth/LoginModal';
import { bottomSheetBackdropClass, bottomSheetPanelClass } from '../Shared';
import {
  fetchMyDecks,
  createCustomDeck,
  uploadCustomDeckFile,
  deleteCustomDeck,
  type CustomDeckSummary,
} from '../../services/api';

interface CustomDeckModalProps {
  onClose: () => void;
  /** Called when user selects a deck to use in game */
  onSelectDeck?: (accessCode: string, deckName: string) => void;
}

type View = 'list' | 'create' | 'upload';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="p-1.5 rounded-lg hover:bg-(--ui-surface-hover) transition-all duration-200 ease-out active:scale-95"
    >
      {copied ? (
        <Check size={13} className="text-(--ui-success)" />
      ) : (
        <Copy size={13} className="text-(--ui-fg-muted)" />
      )}
    </button>
  );
}

// ─── Deck List Item ───────────────────────────────────────────────────────────
function DeckItem({
  deck,
  onDelete,
  onSelect,
}: {
  deck: CustomDeckSummary;
  onDelete: (id: string) => void;
  onSelect?: (code: string, name: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const { showNotification, settings } = useGame();
  const t = useT();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Видалити "${deck.name}"?`)) return;
    setDeleting(true);
    try {
      await deleteCustomDeck(deck.id);
      onDelete(deck.id);
    } catch {
      /* ignore */
    } finally {
      setDeleting(false);
    }
  };

  const handleShareLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!deck.accessCode) return;
    const url = buildDeckShareUrl(deck.accessCode);
    void navigator.clipboard.writeText(url).then(() => {
      showNotification(t.shareDeckLinkCopied, 'success');
    });
  };

  return (
    <div
      className="bg-(--ui-surface) border border-(--ui-border) rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:bg-(--ui-surface-hover) transition-all duration-200 ease-out active:scale-95 will-change-transform"
      onClick={() => onSelect?.(deck.accessCode, deck.name)}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-(--ui-fg) text-sm truncate">{deck.name}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[10px] text-(--ui-fg-muted)">{deck.wordCount} слів</span>
          <span className="text-(--ui-fg-muted)/60">·</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-(--ui-accent) font-mono font-bold">
              {deck.accessCode}
            </span>
            <CopyButton text={deck.accessCode} />
          </div>
          {deck.accessCode && (
            <button
              type="button"
              onClick={handleShareLink}
              className="ml-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-(--ui-accent) bg-[color-mix(in_srgb,var(--ui-accent)_14%,transparent)] border border-[color-mix(in_srgb,var(--ui-accent)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--ui-accent)_22%,transparent)] transition-colors"
            >
              <Share2 size={12} className="shrink-0" />
              {t.shareDeckLink}
            </button>
          )}
          {deck.status !== 'approved' && (
            <>
              <span className="text-(--ui-fg-muted)/60">·</span>
              <span className="text-[10px] text-(--ui-warning)">{deck.status}</span>
            </>
          )}
        </div>
      </div>
      {onSelect && <ChevronRight size={16} className="text-(--ui-fg-muted) shrink-0" />}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="shrink-0 p-2 rounded-xl hover:bg-[color-mix(in_srgb,var(--ui-danger)_16%,transparent)] text-(--ui-fg-muted) hover:text-(--ui-danger) transition-all duration-200 ease-out active:scale-95 disabled:opacity-50"
      >
        {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      </button>
    </div>
  );
}

// ─── Create Form ─────────────────────────────────────────────────────────────
function CreateForm({ onCreated }: { onCreated: (deck: CustomDeckSummary) => void }) {
  const [name, setName] = useState('');
  const [wordsText, setWordsText] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const wordCount = wordsText
    .split(/[\n,]+/)
    .map((w) => w.trim())
    .filter(Boolean).length;

  const handleSubmit = async () => {
    setError('');
    const words = wordsText
      .split(/[\n,]+/)
      .map((w) => w.trim())
      .filter(Boolean);
    if (!name.trim()) {
      setError('Введіть назву');
      return;
    }
    if (words.length < 5) {
      setError('Мінімум 5 слів');
      return;
    }
    setSaving(true);
    try {
      const deck = await createCustomDeck({
        name: name.trim(),
        words,
        ...(accessCode.trim() ? { accessCode: accessCode.trim() } : {}),
      });
      onCreated(deck);
    } catch (e: any) {
      setError(e.message || 'Помилка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 px-4 py-4">
      <div>
        <label className="text-[10px] text-(--ui-fg-muted) uppercase tracking-wider block mb-1.5">
          Назва словника
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 80))}
          placeholder="Наприклад: Корпоративна вечірка"
          className="w-full bg-(--ui-surface) border border-(--ui-border) rounded-xl px-3 py-2.5 text-(--ui-fg) text-sm focus:outline-none focus:border-(--ui-accent)"
        />
      </div>

      <div>
        <label className="text-[10px] text-(--ui-fg-muted) uppercase tracking-wider block mb-1.5">
          Слова{' '}
          <span className="text-(--ui-fg-muted) normal-case opacity-70">
            (через кому або з нового рядка)
          </span>
        </label>
        <textarea
          value={wordsText}
          onChange={(e) => setWordsText(e.target.value)}
          placeholder={'ноутбук, мишка, клавіатура\nмонітор\nпроцесор'}
          rows={8}
          className="w-full bg-(--ui-surface) border border-(--ui-border) rounded-xl px-3 py-2.5 text-(--ui-fg) text-sm focus:outline-none focus:border-(--ui-accent) resize-none font-mono"
        />
        <p className="text-[10px] text-(--ui-fg-muted) mt-1">{wordCount} слів</p>
      </div>

      <div>
        <label className="text-[10px] text-(--ui-fg-muted) uppercase tracking-wider block mb-1.5">
          Код доступу{' '}
          <span className="text-(--ui-fg-muted) normal-case opacity-70">
            (необов'язково, авто-генерується)
          </span>
        </label>
        <input
          value={accessCode}
          onChange={(e) =>
            setAccessCode(
              e.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .slice(0, 8)
            )
          }
          placeholder="ABCD12"
          className="w-full bg-(--ui-surface) border border-(--ui-border) rounded-xl px-3 py-2.5 text-(--ui-fg) text-sm focus:outline-none focus:border-(--ui-accent) font-mono uppercase"
        />
      </div>

      {error && <p className="text-(--ui-danger) text-xs">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full h-11 rounded-full bg-(--ui-accent) hover:bg-(--ui-accent-hover) active:bg-(--ui-accent-pressed) text-(--ui-accent-contrast) text-xs font-bold tracking-wider disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        Створити словник
      </button>
    </div>
  );
}

// ─── Upload Form ─────────────────────────────────────────────────────────────
function UploadForm({ onCreated }: { onCreated: (deck: CustomDeckSummary) => void }) {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (!name) setName(f.name.replace(/\.[^.]+$/, '').slice(0, 80));
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!file) {
      setError('Виберіть файл');
      return;
    }
    if (!name.trim()) {
      setError('Введіть назву');
      return;
    }
    setSaving(true);
    try {
      const deck = await uploadCustomDeckFile(file, name.trim());
      onCreated(deck);
    } catch (e: any) {
      setError(e.message || 'Помилка завантаження');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 px-4 py-4">
      <div>
        <label className="text-[10px] text-(--ui-fg-muted) uppercase tracking-wider block mb-1.5">
          Назва словника
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 80))}
          placeholder="Назва"
          className="w-full bg-(--ui-surface) border border-(--ui-border) rounded-xl px-3 py-2.5 text-(--ui-fg) text-sm focus:outline-none focus:border-(--ui-accent)"
        />
      </div>

      <div>
        <label className="text-[10px] text-(--ui-fg-muted) uppercase tracking-wider block mb-1.5">
          Файл{' '}
          <span className="text-(--ui-fg-muted) opacity-70 normal-case">
            (.csv або .txt, одне слово на рядок)
          </span>
        </label>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleFile}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full h-24 border-2 border-dashed border-(--ui-border) rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[color-mix(in_srgb,var(--ui-accent)_35%,var(--ui-border))] hover:bg-(--ui-surface) transition-colors"
        >
          <FileText size={20} className="text-(--ui-fg-muted)" />
          <span className="text-xs text-(--ui-fg-muted)">
            {file ? file.name : 'Натисніть для вибору файлу'}
          </span>
          {file && (
            <span className="text-[10px] text-(--ui-fg-muted) opacity-70">
              {(file.size / 1024).toFixed(1)} KB
            </span>
          )}
        </button>
      </div>

      {error && <p className="text-(--ui-danger) text-xs">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={saving || !file}
        className="w-full h-11 rounded-full bg-(--ui-accent) hover:bg-(--ui-accent-hover) active:bg-(--ui-accent-pressed) text-(--ui-accent-contrast) text-xs font-bold tracking-wider disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        Завантажити
      </button>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export function CustomDeckModal({ onClose, onSelectDeck }: CustomDeckModalProps) {
  const { isAuthenticated } = useAuthContext();
  const [view, setView] = useState<View>('list');
  const [decks, setDecks] = useState<CustomDeckSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setSheetOpen(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const requestClose = () => {
    setSheetOpen(false);
    setTimeout(() => onClose(), 280);
  };

  const loadDecks = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await fetchMyDecks();
      setDecks(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  const handleCreated = (deck: CustomDeckSummary) => {
    setDecks((prev) => [deck, ...prev]);
    setView('list');
  };

  const handleDelete = (id: string) => {
    setDecks((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSelect = (code: string, deckName: string) => {
    onSelectDeck?.(code, deckName);
    requestClose();
  };

  const handleLoginSuccess = useCallback(async () => {
    await loadDecks();
  }, [loadDecks]);

  return (
    <>
      <div
        className={bottomSheetBackdropClass(sheetOpen, 'z-50')}
        onClick={requestClose}
        role="presentation"
      >
        <div
          className={bottomSheetPanelClass(
            sheetOpen,
            'flex max-h-[92dvh] flex-col min-h-0 max-w-lg!'
          )}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex justify-center pt-2 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-(--ui-border)" aria-hidden />
          </div>
          {/* Header */}
          <div className="shrink-0 px-5 pt-3 pb-4 border-b border-(--ui-border)">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {view !== 'list' ? (
                  <button
                    onClick={() => setView('list')}
                    className="p-2 rounded-xl text-(--ui-fg-muted) hover:text-(--ui-fg) hover:bg-(--ui-surface) transition-colors"
                  >
                    <X size={18} />
                  </button>
                ) : (
                  <div className="p-2 rounded-xl bg-(--ui-surface) border border-(--ui-border)">
                    <FileText size={20} className="text-(--ui-accent)" />
                  </div>
                )}
                <div>
                  <h1 className="text-lg font-bold text-(--ui-fg)">
                    {view === 'list'
                      ? 'Мої словники'
                      : view === 'create'
                        ? 'Новий словник'
                        : 'Завантажити файл'}
                  </h1>
                  <p className="text-xs text-(--ui-fg-muted)">
                    {view === 'list'
                      ? 'Власні набори слів для гри'
                      : 'Введіть слова для свого словника'}
                  </p>
                </div>
              </div>
              <button
                onClick={requestClose}
                className="p-2 rounded-xl text-(--ui-fg-muted) hover:text-(--ui-fg) hover:bg-(--ui-surface) transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs (only on list view) */}
            {view === 'list' && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      setShowLogin(true);
                      return;
                    }
                    setView('create');
                  }}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-(--ui-accent) hover:bg-(--ui-accent-hover) active:bg-(--ui-accent-pressed) text-(--ui-accent-contrast) text-xs font-bold tracking-wider transition-colors"
                >
                  <Plus size={13} />
                  Створити
                </button>
                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      setShowLogin(true);
                      return;
                    }
                    setView('upload');
                  }}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-(--ui-surface) hover:bg-(--ui-surface-hover) border border-(--ui-border) text-(--ui-fg) text-xs font-bold tracking-wider transition-colors"
                >
                  <Upload size={13} />
                  CSV / TXT
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {view === 'list' && (
              <>
                {!isAuthenticated ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-3">
                    <p className="text-(--ui-fg-muted) text-sm">
                      Увійдіть, щоб створювати словники
                    </p>
                    <button
                      onClick={() => setShowLogin(true)}
                      className="h-9 px-5 rounded-full bg-(--ui-accent) hover:bg-(--ui-accent-hover) active:bg-(--ui-accent-pressed) text-(--ui-accent-contrast) text-xs font-bold tracking-wider transition-colors"
                    >
                      Увійти
                    </button>
                  </div>
                ) : loading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 size={24} className="animate-spin text-(--ui-accent)" />
                  </div>
                ) : decks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-2">
                    <FileText size={32} className="text-(--ui-fg-muted) opacity-50" />
                    <p className="text-(--ui-fg-muted) text-sm">Ще немає словників</p>
                    <p className="text-(--ui-fg-muted) opacity-70 text-xs">
                      Натисніть «Створити» щоб додати перший
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 px-4 py-4">
                    {decks.map((deck) => (
                      <DeckItem
                        key={deck.id}
                        deck={deck}
                        onDelete={handleDelete}
                        onSelect={onSelectDeck ? handleSelect : undefined}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {view === 'create' && <CreateForm onCreated={handleCreated} />}
            {view === 'upload' && <UploadForm onCreated={handleCreated} />}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-5 py-3 border-t border-(--ui-border)">
            <p className="text-center text-(--ui-fg-muted) text-[10px]">
              Поділіться кодом доступу з іншими гравцями
            </p>
          </div>
        </div>
      </div>

      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />
      )}
    </>
  );
}
