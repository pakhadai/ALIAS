import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ArrowLeft,
  Plus,
  Trash2,
  BookOpen,
  Copy,
  Loader2,
  Upload,
  ShoppingBag,
  Lock,
} from 'lucide-react';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import { useAuthContext } from '../../context/AuthContext';
import {
  fetchMyDecks,
  createCustomDeck,
  deleteCustomDeck,
  type CustomDeckSummary,
} from '../../services/api';

const MAX_USER_PACKS = 5;

export const MyWordPacksScreen = () => {
  const { setGameState, currentTheme } = useGame();
  const { authState, profile } = useAuthContext();
  const isDark = currentTheme.isDark;

  const isUnlocked =
    profile?.purchases?.some((pu) => pu.wordPack?.slug === 'feature-custom-packs') ?? false;
  const checkingAccess = authState.status === 'loading';
  const [view, setView] = useState<'list' | 'create'>('list');
  const [decks, setDecks] = useState<CustomDeckSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [deckName, setDeckName] = useState('');
  const [wordsText, setWordsText] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cardBg = 'bg-(--ui-card) border border-(--ui-border)';
  const inputCls = `w-full rounded-2xl px-5 py-4 text-sm font-sans outline-none transition-all ${
    isDark
      ? 'bg-(--ui-surface) border border-(--ui-border) text-(--ui-fg) placeholder:text-(--ui-fg-muted) focus:border-(--ui-accent)'
      : 'bg-(--ui-surface) border border-(--ui-border) text-(--ui-fg) placeholder:text-(--ui-fg-muted) focus:border-(--ui-accent)'
  }`;

  useEffect(() => {
    if (authState.status === 'loading') return;
    if (isUnlocked) {
      fetchMyDecks()
        .then(setDecks)
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [authState.status, isUnlocked]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteCustomDeck(id);
      setDecks((prev) => prev.filter((d) => d.id !== id));
    } catch {}
    setDeleting(null);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setWordsText(ev.target?.result as string);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleCreate = async () => {
    const name = deckName.trim();
    const words = wordsText
      .split(/[\n,;]+/)
      .map((w) => w.trim())
      .filter(Boolean);
    if (!name) {
      setCreateError('Введіть назву паку');
      return;
    }
    if (words.length < 5) {
      setCreateError('Додайте щонайменше 5 слів');
      return;
    }
    if (decks.length >= MAX_USER_PACKS) {
      setCreateError(`Максимум ${MAX_USER_PACKS} паків`);
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
    } catch (err: any) {
      setCreateError(err.message || 'Помилка створення');
    }
    setCreating(false);
  };

  const STATUS_COLORS: Record<string, string> = {
    approved: 'text-(--ui-success)',
    pending: 'text-(--ui-accent)',
    rejected: 'text-(--ui-danger)',
  };

  if (checkingAccess)
    return (
      <div className="flex flex-col h-screen bg-(--ui-bg) items-center justify-center">
        <Loader2 size={24} className={`animate-spin ${currentTheme.iconColor} opacity-40`} />
      </div>
    );

  if (!isUnlocked)
    return (
      <div className="flex flex-col h-screen items-center bg-(--ui-bg)">
        <div className="max-w-2xl w-full flex-1 flex flex-col">
          <header
            className="flex items-center px-6 md:px-8 pb-4 gap-3"
            style={{ paddingTop: 'max(24px, env(safe-area-inset-top))' }}
          >
            <button
              onClick={() => setGameState(GameState.PROFILE)}
              className={`p-2 transition-all active:scale-90 ${currentTheme.iconColor} opacity-50 hover:opacity-100`}
            >
              <ArrowLeft size={22} />
            </button>
            <h2 className={`font-serif text-2xl tracking-wide ${currentTheme.textMain}`}>
              Мої паки слів
            </h2>
          </header>
          <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6 text-center">
            <div className="w-20 h-20 rounded-full bg-(--ui-surface) flex items-center justify-center border border-(--ui-border)">
              <Lock size={32} className={`${currentTheme.iconColor} opacity-30`} />
            </div>
            <div>
              <h3 className={`font-serif text-2xl mb-2 ${currentTheme.textMain}`}>
                Функція заблокована
              </h3>
              <p className="text-sm leading-relaxed text-(--ui-fg-muted) opacity-80">
                Створюйте власні паки слів для корпоративів, вечірок або класів.{'\n'}Розблокуйте цю
                функцію в Магазині.
              </p>
            </div>
            <button
              onClick={() => setGameState(GameState.STORE)}
              className={`w-full h-14 ${currentTheme.button} rounded-full flex items-center justify-center gap-2 font-sans font-bold text-[10px] uppercase tracking-[0.3em] transition-all active:scale-[0.98]`}
            >
              <ShoppingBag size={16} />
              Відкрити магазин
            </button>
          </div>
        </div>
      </div>
    );

  if (view === 'create')
    return (
      <div className="flex flex-col h-screen items-center bg-(--ui-bg)">
        <div className="max-w-2xl w-full flex-1 flex flex-col">
          <header
            className="flex items-center px-6 md:px-8 pb-4 gap-3"
            style={{ paddingTop: 'max(24px, env(safe-area-inset-top))' }}
          >
            <button
              onClick={() => {
                setView('list');
                setCreateError('');
              }}
              className={`p-2 transition-all active:scale-90 ${currentTheme.iconColor} opacity-50 hover:opacity-100`}
            >
              <ArrowLeft size={22} />
            </button>
            <h2 className={`font-serif text-2xl tracking-wide ${currentTheme.textMain}`}>
              Новий пак
            </h2>
          </header>
          <div
            className="flex-1 overflow-y-auto px-6 md:px-8 py-4 space-y-5"
            style={{ scrollbarWidth: 'none' }}
          >
            <div className="space-y-2">
              <label className="text-[9px] font-bold tracking-[0.25em] uppercase text-(--ui-fg-muted) opacity-80">
                Назва паку
              </label>
              <input
                value={deckName}
                onChange={(e) => setDeckName(e.target.value.slice(0, 60))}
                placeholder="наприклад: Офісна вечірка"
                className={inputCls}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-bold tracking-[0.25em] uppercase text-(--ui-fg-muted) opacity-80">
                  Слова
                  <span className="ml-2 font-normal normal-case tracking-normal text-[10px] opacity-60">
                    (кожне з нового рядка або через кому)
                  </span>
                </label>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-(--ui-fg-muted) hover:text-(--ui-fg) transition-colors"
                >
                  <Upload size={12} />
                  Завантажити .txt/.csv
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
              <textarea
                value={wordsText}
                onChange={(e) => setWordsText(e.target.value)}
                placeholder={'яблуко\nбанан\nогірок\n...'}
                rows={10}
                className={`${inputCls} resize-none`}
              />
              <p className="text-[11px] text-(--ui-fg-muted) opacity-70">
                {wordsText.split(/[\n,;]+/).filter((w) => w.trim()).length} слів
              </p>
            </div>
            {createError && (
              <p className="text-(--ui-danger) text-[12px] font-sans">{createError}</p>
            )}
          </div>
          <div
            className="px-6 md:px-8 py-4"
            style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
          >
            <button
              onClick={handleCreate}
              disabled={creating}
              className={`w-full h-14 ${currentTheme.button} rounded-full flex items-center justify-center gap-2 font-sans font-bold text-[10px] uppercase tracking-[0.3em] transition-all active:scale-[0.98] disabled:opacity-50`}
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : 'Створити пак'}
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="flex flex-col h-screen bg-(--ui-bg)">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col overflow-hidden">
        <div className="flex justify-center pt-4 pb-2">
          <div className="w-12 h-1 bg-(--ui-border) rounded-full" />
        </div>
        <div className="px-6 md:px-8 pb-5 pt-2 flex justify-between items-center">
          <div>
            <h2 className={`font-serif text-3xl tracking-wide ${currentTheme.textMain}`}>
              Мої паки слів
            </h2>
            <p className="text-[10px] mt-1 text-(--ui-fg-muted) opacity-70">
              {decks.length} / {MAX_USER_PACKS}
            </p>
          </div>
          <button
            onClick={() => setGameState(GameState.PROFILE)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-(--ui-surface) hover:bg-(--ui-surface-hover) border border-(--ui-border)"
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
            <div
              className={`${cardBg} rounded-2xl px-6 py-12 flex flex-col items-center gap-3 mt-4`}
            >
              <BookOpen size={28} className={`${currentTheme.iconColor} opacity-20`} />
              <p
                className={`text-[12px] font-sans text-center ${currentTheme.textSecondary} opacity-50`}
              >
                Немає паків
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
                      {deck.wordCount} слів
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(deck.id)}
                    disabled={deleting === deck.id}
                    className="ml-4 p-2 rounded-xl transition-all active:scale-90 disabled:opacity-30 text-(--ui-danger) opacity-70 hover:opacity-100 hover:bg-[color-mix(in_srgb,var(--ui-danger)_12%,transparent)]"
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
                    {deck.status === 'approved'
                      ? 'Активний'
                      : deck.status === 'pending'
                        ? 'На розгляді'
                        : 'Відхилено'}
                  </span>
                  {deck.accessCode && (
                    <button
                      onClick={() => handleCopyCode(deck.accessCode!)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold transition-all bg-(--ui-surface) hover:bg-(--ui-surface-hover) text-(--ui-fg-muted) border border-(--ui-border)"
                    >
                      <Copy size={11} />
                      {copied === deck.accessCode ? 'Скопійовано!' : deck.accessCode}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        {decks.length < MAX_USER_PACKS && (
          <div
            className="absolute bottom-0 left-0 right-0 px-6 md:px-8 py-4 pointer-events-none flex justify-center"
            style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
          >
            <div className="w-full max-w-2xl pointer-events-auto">
              <button
                onClick={() => setView('create')}
                className={`pointer-events-auto w-full h-14 ${currentTheme.button} rounded-full flex items-center justify-center gap-2 font-sans font-bold text-[10px] uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-[0.98]`}
              >
                <Plus size={16} />
                Створити пак
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
