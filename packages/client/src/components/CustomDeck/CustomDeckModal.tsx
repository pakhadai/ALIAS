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
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { LoginModal } from '../Auth/LoginModal';
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
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
      {copied ? (
        <Check size={13} className="text-emerald-400" />
      ) : (
        <Copy size={13} className="text-slate-400" />
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

  return (
    <div
      className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:bg-white/8 transition-colors"
      onClick={() => onSelect?.(deck.accessCode, deck.name)}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm truncate">{deck.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-slate-400">{deck.wordCount} слів</span>
          <span className="text-slate-600">·</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-indigo-400 font-mono font-bold">
              {deck.accessCode}
            </span>
            <CopyButton text={deck.accessCode} />
          </div>
          {deck.status !== 'approved' && (
            <>
              <span className="text-slate-600">·</span>
              <span className="text-[10px] text-amber-400">{deck.status}</span>
            </>
          )}
        </div>
      </div>
      {onSelect && <ChevronRight size={16} className="text-slate-500 shrink-0" />}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="shrink-0 p-2 rounded-xl hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
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
        <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">
          Назва словника
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 80))}
          placeholder="Наприклад: Корпоративна вечірка"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div>
        <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">
          Слова <span className="text-slate-500 normal-case">(через кому або з нового рядка)</span>
        </label>
        <textarea
          value={wordsText}
          onChange={(e) => setWordsText(e.target.value)}
          placeholder={'ноутбук, мишка, клавіатура\nмонітор\nпроцесор'}
          rows={8}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none font-mono"
        />
        <p className="text-[10px] text-slate-500 mt-1">{wordCount} слів</p>
      </div>

      <div>
        <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">
          Код доступу{' '}
          <span className="text-slate-500 normal-case">(необов'язково, авто-генерується)</span>
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
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 font-mono uppercase"
        />
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full h-11 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold tracking-wider disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
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
        <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">
          Назва словника
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 80))}
          placeholder="Назва"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div>
        <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">
          Файл{' '}
          <span className="text-slate-500 normal-case">(.csv або .txt, одне слово на рядок)</span>
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
          className="w-full h-24 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-indigo-500/50 hover:bg-white/3 transition-colors"
        >
          <FileText size={20} className="text-slate-500" />
          <span className="text-xs text-slate-400">
            {file ? file.name : 'Натисніть для вибору файлу'}
          </span>
          {file && (
            <span className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
          )}
        </button>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={saving || !file}
        className="w-full h-11 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold tracking-wider disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
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
    onClose();
  };

  const handleLoginSuccess = useCallback(async () => {
    await loadDecks();
  }, [loadDecks]);

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-12 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {view !== 'list' ? (
                <button
                  onClick={() => setView('list')}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              ) : (
                <div className="p-2 rounded-xl bg-indigo-500/20">
                  <FileText size={20} className="text-indigo-400" />
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold text-white">
                  {view === 'list'
                    ? 'Мої словники'
                    : view === 'create'
                      ? 'Новий словник'
                      : 'Завантажити файл'}
                </h1>
                <p className="text-xs text-slate-400">
                  {view === 'list'
                    ? 'Власні набори слів для гри'
                    : 'Введіть слова для свого словника'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
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
                className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold tracking-wider transition-colors"
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
                className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-bold tracking-wider transition-colors"
              >
                <Upload size={13} />
                CSV / TXT
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {view === 'list' && (
            <>
              {!isAuthenticated ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <p className="text-slate-400 text-sm">Увійдіть, щоб створювати словники</p>
                  <button
                    onClick={() => setShowLogin(true)}
                    className="h-9 px-5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold tracking-wider transition-colors"
                  >
                    Увійти
                  </button>
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 size={24} className="animate-spin text-indigo-400" />
                </div>
              ) : decks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2">
                  <FileText size={32} className="text-slate-700" />
                  <p className="text-slate-500 text-sm">Ще немає словників</p>
                  <p className="text-slate-600 text-xs">Натисніть «Створити» щоб додати перший</p>
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
        <div className="flex-shrink-0 px-5 py-3 border-t border-white/5">
          <p className="text-center text-slate-500 text-[10px]">
            Поділіться кодом доступу з іншими гравцями
          </p>
        </div>
      </div>

      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />
      )}
    </>
  );
}
