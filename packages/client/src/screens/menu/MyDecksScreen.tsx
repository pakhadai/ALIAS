import React, { useState } from 'react';
import { useResourceLoad } from '../../hooks/useResourceLoad';
import { Plus, Trash2, BookOpen, Copy, Loader2 } from 'lucide-react';
import { AppHeader, FixedBottomBar, ScreenShell } from '../../components/layout';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import {
  fetchMyDecks,
  createCustomDeck,
  deleteCustomDeck,
  type CustomDeckSummary,
} from '../../services/api';
import { typographyClass } from '../../constants/typography';
import { ScreenTitle } from '../../components/typography/ScreenTitle';

type CreateDeckView = 'list' | 'create';

export const MyDecksScreen = () => {
  const { setGameState, currentTheme } = useGame();

  const [view, setView] = useState<CreateDeckView>('list');
  const {
    data: decks,
    loading,
    reload: reloadDecks,
  } = useResourceLoad(() => fetchMyDecks(), { initialData: [] as CustomDeckSummary[] });
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [deckName, setDeckName] = useState('');
  const [wordsText, setWordsText] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const cardBg = 'bg-ui-card border border-ui-border';
  const inputCls =
    'bg-ui-surface border border-ui-border text-ui-fg placeholder:text-ui-fg-muted focus:border-ui-accent';

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteCustomDeck(id);
      reloadDecks();
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
      await createCustomDeck({ name, words });
      setDeckName('');
      setWordsText('');
      setView('list');
      reloadDecks();
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

  const exitCreateView = () => {
    setView('list');
    setCreateError('');
  };

  if (view === 'create') {
    return (
      <ScreenShell
        className="bg-ui-bg"
        layout="fullPx6"
        contentClassName="py-4 space-y-5"
        headerFixed
        footerFixed
        header={
          <AppHeader
            fixed
            title={<ScreenTitle themeClass={currentTheme.textMain}>New Deck</ScreenTitle>}
            onBack={exitCreateView}
          />
        }
        footer={
          <FixedBottomBar island contentClassName="w-full px-6">
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className={`w-full h-14 ${currentTheme.button} rounded-full flex items-center justify-center gap-2 ${typographyClass.label} font-sans tracking-[0.3em] transition-all active:scale-[0.98] disabled:opacity-50`}
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : 'Create Deck'}
            </button>
          </FixedBottomBar>
        }
      >
        <div className="space-y-2">
          <label
            className={`${typographyClass.label} tracking-[0.25em] ${currentTheme.textSecondary}`}
          >
            Deck Name
          </label>
          <input
            value={deckName}
            onChange={(e) => setDeckName(e.target.value.slice(0, 60))}
            placeholder="e.g. Office Party Pack"
            className={`w-full rounded-2xl px-5 py-4 ${typographyClass.bodyInput} outline-none transition-all ${inputCls}`}
          />
        </div>
        <div className="space-y-2">
          <label
            className={`${typographyClass.label} tracking-[0.25em] ${currentTheme.textSecondary}`}
          >
            Words
            <span
              className={`ml-2 font-normal normal-case tracking-normal ${typographyClass.label} ${currentTheme.textSecondary} opacity-50`}
            >
              (one per line or comma-separated)
            </span>
          </label>
          <textarea
            value={wordsText}
            onChange={(e) => setWordsText(e.target.value)}
            placeholder={'apple\nbanana\ncucumber\n...'}
            rows={10}
            className={`w-full rounded-2xl px-5 py-4 ${typographyClass.bodyInput} outline-none transition-all resize-none ${inputCls}`}
          />
          <p
            className={`${typographyClass.label} normal-case ${currentTheme.textSecondary} opacity-40`}
          >
            {wordsText.split(/[\n,]+/).filter((w) => w.trim()).length} words
          </p>
        </div>
        {createError && (
          <p className={`text-ui-danger ${typographyClass.system} font-sans`}>{createError}</p>
        )}
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      className="bg-ui-bg"
      layout="fullPx6"
      contentClassName="space-y-4"
      headerFixed
      footerFixed
      header={
        <AppHeader
          fixed
          title={<ScreenTitle themeClass={currentTheme.textMain}>My Decks</ScreenTitle>}
          onBack={() => setGameState(GameState.MENU)}
        />
      }
      footer={
        <FixedBottomBar island contentClassName="w-full px-6">
          <button
            type="button"
            onClick={() => setView('create')}
            className={`w-full h-14 ${currentTheme.button} rounded-full flex items-center justify-center gap-2 ${typographyClass.label} font-sans tracking-[0.3em] shadow-2xl transition-all active:scale-[0.98]`}
          >
            <Plus size={16} />
            Create New Deck
          </button>
        </FixedBottomBar>
      }
    >
      {loading ? (
        <div className="flex justify-center pt-16">
          <Loader2 size={24} className={`animate-spin ${currentTheme.iconColor} opacity-40`} />
        </div>
      ) : decks.length === 0 ? (
        <div className={`${cardBg} rounded-2xl px-6 py-12 flex flex-col items-center gap-3 mt-4`}>
          <BookOpen size={28} className={`${currentTheme.iconColor} opacity-20`} />
          <p
            className={`${typographyClass.system} font-sans text-center ${currentTheme.textSecondary} opacity-50`}
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
                  className={`font-serif text-lg leading-tight ${currentTheme.textMain} truncate`}
                >
                  {deck.name}
                </h3>
                <p
                  className={`${typographyClass.label} font-sans mt-1 normal-case ${currentTheme.textSecondary}`}
                >
                  {deck.wordCount} words
                </p>
              </div>
              <button
                type="button"
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
                className={`${typographyClass.label} tracking-wider ${STATUS_COLORS[deck.status] ?? currentTheme.textSecondary}`}
              >
                {deck.status}
              </span>
              {deck.accessCode && (
                <button
                  type="button"
                  onClick={() => handleCopyCode(deck.accessCode!)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${typographyClass.label} font-mono normal-case transition-all bg-ui-surface hover:bg-ui-surface-hover text-ui-fg-muted border border-ui-border`}
                >
                  <Copy size={11} />
                  {copied === deck.accessCode ? 'Copied!' : deck.accessCode}
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </ScreenShell>
  );
};
