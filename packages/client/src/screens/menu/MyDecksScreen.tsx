import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Plus, Trash2, BookOpen, Copy, Loader2 } from 'lucide-react';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import {
  fetchMyDecks,
  createCustomDeck,
  deleteCustomDeck,
  type CustomDeckSummary,
} from '../../services/api';

type CreateDeckView = 'list' | 'create';

export const MyDecksScreen = () => {
  const { setGameState, currentTheme } = useGame();

  const [view, setView] = useState<CreateDeckView>('list');
  const [decks, setDecks] = useState<CustomDeckSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [deckName, setDeckName] = useState('');
  const [wordsText, setWordsText] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const cardBg = 'bg-ui-card border border-ui-border';
  const inputCls =
    'bg-ui-surface border border-ui-border text-ui-fg placeholder:text-ui-fg-muted focus:border-ui-accent';

  useEffect(() => {
    fetchMyDecks()
      .then(setDecks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteCustomDeck(id);
      setDecks((prev) => prev.filter((d) => d.id !== id));
    } catch (_err) {
      void _err;
    }
    setDeleting(null);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCreate = async () => {
    const name = deckName.trim();
    const words = wordsText
      .split(/[\n,]+/)
      .map((w) => w.trim())
      .filter(Boolean);
    if (!name) {
      setCreateError('Enter a deck name');
      return;
    }
    if (words.length < 5) {
      setCreateError('Add at least 5 words');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const deck = await createCustomDeck({ name, words });
      setDecks((prev) => [deck, ...prev]);
      setDeckName('');
      setWordsText('');
      setView('list');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : '';
      setCreateError(msg || 'Failed to create deck');
    }
    setCreating(false);
  };

  const STATUS_COLORS: Record<string, string> = {
    approved: 'text-ui-success',
    pending: 'text-ui-accent',
    rejected: 'text-ui-danger',
  };

  if (view === 'create') {
    return (
      <div className="flex flex-col h-screen bg-ui-bg">
        <header className="flex items-center px-6 pb-4 pt-safe-top gap-3">
          <button
            onClick={() => {
              setView('list');
              setCreateError('');
            }}
            className={`p-2 transition-all active:scale-90 ${currentTheme.iconColor} opacity-50 hover:opacity-100`}
          >
            <ArrowLeft size={22} />
          </button>
          <h2 className={`font-serif text-2xl tracking-wide ${currentTheme.textMain}`}>New Deck</h2>
        </header>
        <div
          className="flex-1 overflow-y-auto px-6 py-4 space-y-5"
          style={{ scrollbarWidth: 'none' }}
        >
          <div className="space-y-2">
            <label
              className={`text-[9px] font-bold tracking-[0.25em] uppercase ${currentTheme.textSecondary}`}
            >
              Deck Name
            </label>
            <input
              value={deckName}
              onChange={(e) => setDeckName(e.target.value.slice(0, 60))}
              placeholder="e.g. Office Party Pack"
              className={`w-full rounded-2xl px-5 py-4 text-sm font-sans outline-none transition-all ${inputCls}`}
            />
          </div>
          <div className="space-y-2">
            <label
              className={`text-[9px] font-bold tracking-[0.25em] uppercase ${currentTheme.textSecondary}`}
            >
              Words
              <span
                className={`ml-2 font-normal normal-case tracking-normal text-[11px] ${currentTheme.textSecondary} opacity-50`}
              >
                (one per line or comma-separated)
              </span>
            </label>
            <textarea
              value={wordsText}
              onChange={(e) => setWordsText(e.target.value)}
              placeholder={'apple\nbanana\ncucumber\n...'}
              rows={10}
              className={`w-full rounded-2xl px-5 py-4 text-sm font-sans outline-none transition-all resize-none ${inputCls}`}
            />
            <p className={`text-[11px] ${currentTheme.textSecondary} opacity-40`}>
              {wordsText.split(/[\n,]+/).filter((w) => w.trim()).length} words
            </p>
          </div>
          {createError && <p className="text-ui-danger text-[12px] font-sans">{createError}</p>}
        </div>
        <div className="px-6 pt-4 pb-safe-bottom">
          <button
            onClick={handleCreate}
            disabled={creating}
            className={`w-full h-14 ${currentTheme.button} rounded-full flex items-center justify-center gap-2 font-sans font-bold text-[10px] uppercase tracking-[0.3em] transition-all active:scale-[0.98] disabled:opacity-50`}
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : 'Create Deck'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-ui-bg">
      <div className="flex justify-center pt-4 pb-2">
        <div className="w-12 h-1 bg-ui-border rounded-full" />
      </div>
      <div className="px-6 pb-5 pt-2 flex justify-between items-center">
        <h2 className={`font-serif text-3xl tracking-wide ${currentTheme.textMain}`}>My Decks</h2>
        <button
          onClick={() => setGameState(GameState.PROFILE)}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-ui-surface hover:bg-ui-surface-hover border border-ui-border"
        >
          <X size={16} className={`${currentTheme.iconColor} opacity-70`} />
        </button>
      </div>
      <div
        className="flex-1 overflow-y-auto px-6 space-y-4 pb-28"
        style={{ scrollbarWidth: 'none' }}
      >
        {loading ? (
          <div className="flex justify-center pt-16">
            <Loader2 size={24} className={`animate-spin ${currentTheme.iconColor} opacity-40`} />
          </div>
        ) : decks.length === 0 ? (
          <div className={`${cardBg} rounded-2xl px-6 py-12 flex flex-col items-center gap-3 mt-4`}>
            <BookOpen size={28} className={`${currentTheme.iconColor} opacity-20`} />
            <p
              className={`text-[12px] font-sans text-center ${currentTheme.textSecondary} opacity-50`}
            >
              No custom decks yet
            </p>
          </div>
        ) : (
          decks.map((deck) => (
            <div key={deck.id} className={`${cardBg} rounded-2xl p-5 space-y-3`}>
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3
                    className={`font-serif text-[18px] leading-tight ${currentTheme.textMain} truncate`}
                  >
                    {deck.name}
                  </h3>
                  <p className={`text-[11px] font-sans mt-1 ${currentTheme.textSecondary}`}>
                    {deck.wordCount} words
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(deck.id)}
                  disabled={deleting === deck.id}
                  className="ml-4 p-2 rounded-xl transition-all duration-200 ease-out active:scale-95 disabled:opacity-30 text-ui-danger opacity-70 hover:opacity-100 hover:bg-[color-mix(in_srgb,var(--ui-danger)_12%,transparent)]"
                >
                  {deleting === deck.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[deck.status] ?? currentTheme.textSecondary}`}
                >
                  {deck.status}
                </span>
                {deck.accessCode && (
                  <button
                    onClick={() => handleCopyCode(deck.accessCode!)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold transition-all bg-ui-surface hover:bg-ui-surface-hover text-ui-fg-muted border border-ui-border"
                  >
                    <Copy size={11} />
                    {copied === deck.accessCode ? 'Copied!' : deck.accessCode}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 px-6 pt-4 pb-safe-bottom pointer-events-none">
        <button
          onClick={() => setView('create')}
          className={`pointer-events-auto w-full h-14 ${currentTheme.button} rounded-full flex items-center justify-center gap-2 font-sans font-bold text-[10px] uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-[0.98]`}
        >
          <Plus size={16} />
          Create New Deck
        </button>
      </div>
    </div>
  );
};
