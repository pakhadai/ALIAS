import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, BookOpen, Copy, Loader2, Upload, ShoppingBag, Lock } from 'lucide-react';
import { footerIslandClassName } from '../../constants/footerLayout';
import { typographyClass, formLabelClass } from '../../constants/typography';
import { AppHeader, FixedBottomBar, ScreenShell } from '../../components/layout';
import { Button } from '../../components/Button';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import { useAuthContext } from '../../context/AuthContext';
import { ScreenTitle } from '../../components/typography/ScreenTitle';
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

  const cardBg = 'bg-ui-card border border-ui-border';
  const inputCls = `w-full rounded-2xl px-5 py-4 ${typographyClass.bodyInput} outline-none transition-all ${
    isDark
      ? 'bg-ui-surface border border-ui-border text-ui-fg placeholder:text-ui-fg-muted focus:border-ui-accent'
      : 'bg-ui-surface border border-ui-border text-ui-fg placeholder:text-ui-fg-muted focus:border-ui-accent'
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setWordsText(typeof ev.target?.result === 'string' ? ev.target.result : '');
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
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : '';
      setCreateError(msg || 'Помилка створення');
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

  const goBack = () => setGameState(GameState.MENU);

  if (checkingAccess) {
    return (
      <ScreenShell className="bg-ui-bg items-center justify-center">
        <Loader2 size={24} className={`animate-spin ${currentTheme.iconColor} opacity-40`} />
      </ScreenShell>
    );
  }

  if (!isUnlocked) {
    return (
      <ScreenShell
        className="bg-ui-bg"
        layout="canonical"
        contentClassName="flex flex-col items-center justify-center gap-6 text-center"
        headerFixed
        header={
          <AppHeader fixed title={<ScreenTitle>Мої паки слів</ScreenTitle>} onBack={goBack} />
        }
      >
        <div className="w-20 h-20 rounded-full bg-ui-surface flex items-center justify-center border border-ui-border">
          <Lock size={32} className={`${currentTheme.iconColor} opacity-30`} />
        </div>
        <div>
          <ScreenTitle as="h3" className="mb-2">
            Функція заблокована
          </ScreenTitle>
          <p className={`${typographyClass.body} leading-relaxed text-ui-fg-muted opacity-80`}>
            Створюйте власні паки слів для корпоративів, вечірок або класів.{'\n'}Розблокуйте цю
            функцію в Магазині.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          volume="cta"
          size="xl"
          fullWidth
          themeClass={currentTheme.button}
          onClick={() => setGameState(GameState.STORE)}
          icon={<ShoppingBag size={16} aria-hidden />}
          className="font-sans normal-case tracking-normal"
        >
          Відкрити магазин
        </Button>
      </ScreenShell>
    );
  }

  if (view === 'create') {
    return (
      <ScreenShell
        className="bg-ui-bg"
        layout="canonical"
        contentClassName="py-4 space-y-5"
        headerFixed
        footerFixed
        header={
          <AppHeader fixed title={<ScreenTitle>Новий пак</ScreenTitle>} onBack={exitCreateView} />
        }
        footer={
          <FixedBottomBar island contentClassName={footerIslandClassName('canonical')}>
            <Button
              type="button"
              variant="primary"
              volume="cta"
              size="xl"
              fullWidth
              themeClass={currentTheme.button}
              onClick={handleCreate}
              disabled={creating}
              className="font-sans normal-case tracking-normal"
            >
              {creating ? (
                <Loader2 size={16} className="animate-spin" aria-hidden />
              ) : (
                'Створити пак'
              )}
            </Button>
          </FixedBottomBar>
        }
      >
        <div className="space-y-2">
          <label className={`${formLabelClass} opacity-80`}>Назва паку</label>
          <input
            value={deckName}
            onChange={(e) => setDeckName(e.target.value.slice(0, 60))}
            placeholder="наприклад: Офісна вечірка"
            className={inputCls}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={`${formLabelClass} opacity-80`}>
              Слова
              <span
                className={`ml-2 font-normal normal-case tracking-normal ${typographyClass.label} opacity-60`}
              >
                (кожне з нового рядка або через кому)
              </span>
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="font-sans normal-case tracking-normal gap-1.5"
            >
              <Upload size={12} aria-hidden />
              Завантажити .txt/.csv
            </Button>
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
          <p className={`${typographyClass.label} text-ui-fg-muted opacity-70`}>
            {wordsText.split(/[\n,;]+/).filter((w) => w.trim()).length} слів
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
      layout="canonical"
      contentClassName="space-y-4"
      headerFixed
      footerFixed={decks.length < MAX_USER_PACKS}
      header={
        <AppHeader
          fixed
          title={
            <div className="text-center">
              <ScreenTitle>Мої паки слів</ScreenTitle>
              <p className={`${typographyClass.label} mt-1 text-ui-fg-muted opacity-70`}>
                {decks.length} / {MAX_USER_PACKS}
              </p>
            </div>
          }
          onBack={goBack}
        />
      }
      footer={
        decks.length < MAX_USER_PACKS ? (
          <FixedBottomBar island contentClassName={footerIslandClassName('canonical')}>
            <Button
              type="button"
              variant="primary"
              volume="cta"
              size="xl"
              fullWidth
              themeClass={currentTheme.button}
              onClick={() => setView('create')}
              icon={<Plus size={16} aria-hidden />}
              className="font-sans normal-case tracking-normal"
            >
              Створити пак
            </Button>
          </FixedBottomBar>
        ) : undefined
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
            className={`${typographyClass.system} font-sans text-center text-ui-fg-muted opacity-50`}
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
                  className={`font-serif text-lg leading-tight ${currentTheme.textMain} truncate`}
                >
                  {deck.name}
                </h3>
                <p
                  className={`${typographyClass.label} font-sans mt-1 normal-case text-ui-fg-muted`}
                >
                  {deck.wordCount} слів
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(deck.id)}
                disabled={deleting === deck.id}
                className="ml-4 min-h-11 min-w-11 px-0 text-ui-danger opacity-70 hover:opacity-100 hover:bg-[color-mix(in_srgb,var(--ui-danger)_12%,transparent)]"
                aria-label="Видалити пак"
              >
                {deleting === deck.id ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                ) : (
                  <Trash2 size={16} aria-hidden />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span
                className={`${typographyClass.label} tracking-wider ${STATUS_COLORS[deck.status] ?? 'text-ui-fg-muted'}`}
              >
                {deck.status === 'approved'
                  ? 'Активний'
                  : deck.status === 'pending'
                    ? 'На розгляді'
                    : 'Відхилено'}
              </span>
              {deck.accessCode && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopyCode(deck.accessCode!)}
                  className="font-mono normal-case tracking-normal gap-1.5"
                >
                  <Copy size={11} aria-hidden />
                  {copied === deck.accessCode ? 'Скопійовано!' : deck.accessCode}
                </Button>
              )}
            </div>
          </div>
        ))
      )}
    </ScreenShell>
  );
};
