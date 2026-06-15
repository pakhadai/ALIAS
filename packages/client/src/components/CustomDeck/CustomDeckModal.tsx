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
import { useAppLogin } from '../../context/AppLoginContext';
import { useGame } from '../../context/GameContext';
import { useT } from '../../hooks/useT';
import { buildDeckShareUrl } from '../../utils/deckShare';
import { ModalSheet, ModalSheetBody, ModalSheetFooter } from '../ModalSheet';
import { ModalSheetTitle } from '../Shared';
import { Button } from '../Button';
import { SettingsChip } from '../Settings';
import { settingsChipLabelClass } from '../Settings/settingsChipStyles';
import { typographyClass, captionMutedClass, formLabelClass } from '../../constants/typography';
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
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={copy}
      className="min-h-8 min-w-8 px-1.5"
      aria-label="Copy access code"
    >
      {copied ? (
        <Check size={13} className="text-ui-success" aria-hidden />
      ) : (
        <Copy size={13} className="text-ui-fg-muted" aria-hidden />
      )}
    </Button>
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
  const { showNotification } = useGame();
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
      className="bg-ui-surface border border-ui-border rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:bg-ui-surface-hover transition-all duration-200 ease-out active:scale-95 will-change-transform"
      onClick={() => onSelect?.(deck.accessCode, deck.name)}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-ui-fg text-ui-body truncate">{deck.name}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`${typographyClass.label} text-ui-fg-muted`}>{deck.wordCount} слів</span>
          <span className="text-ui-fg-muted/60">·</span>
          <div className="flex items-center gap-1">
            <span className={`${typographyClass.label} text-ui-accent font-mono`}>
              {deck.accessCode}
            </span>
            <CopyButton text={deck.accessCode} />
          </div>
          {deck.accessCode && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleShareLink}
              className="ml-1 font-sans normal-case tracking-normal gap-1 text-ui-accent"
            >
              <Share2 size={12} className="shrink-0" aria-hidden />
              {t.shareDeckLink}
            </Button>
          )}
          {deck.status !== 'approved' && (
            <>
              <span className="text-ui-fg-muted/60">·</span>
              <span className={`${typographyClass.label} text-ui-warning`}>{deck.status}</span>
            </>
          )}
        </div>
      </div>
      {onSelect && <ChevronRight size={16} className="text-ui-fg-muted shrink-0" />}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={deleting}
        className="shrink-0 min-h-11 min-w-11 px-0 text-ui-fg-muted hover:text-ui-danger hover:bg-[color-mix(in_srgb,var(--ui-danger)_16%,transparent)]"
        aria-label="Delete deck"
      >
        {deleting ? (
          <Loader2 size={14} className="animate-spin" aria-hidden />
        ) : (
          <Trash2 size={14} aria-hidden />
        )}
      </Button>
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
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: unknown }).message)
          : '';
      setError(msg || 'Помилка');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 px-4 py-4">
      <div>
        <label className={`${formLabelClass} mb-1.5`}>Назва словника</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 80))}
          placeholder="Наприклад: Корпоративна вечірка"
          className="w-full bg-ui-surface border border-ui-border rounded-xl px-3 py-2.5 text-ui-fg text-ui-body-input focus:outline-none focus:border-ui-accent"
        />
      </div>

      <div>
        <label className={`${formLabelClass} mb-1.5`}>
          Слова{' '}
          <span className="text-ui-fg-muted normal-case opacity-70">
            (через кому або з нового рядка)
          </span>
        </label>
        <textarea
          value={wordsText}
          onChange={(e) => setWordsText(e.target.value)}
          placeholder={'ноутбук, мишка, клавіатура\nмонітор\nпроцесор'}
          rows={8}
          className="w-full bg-ui-surface border border-ui-border rounded-xl px-3 py-2.5 text-ui-fg text-ui-body-input focus:outline-none focus:border-ui-accent resize-none font-mono"
        />
        <p className={`${typographyClass.label} text-ui-fg-muted mt-1`}>{wordCount} слів</p>
      </div>

      <div>
        <label className={`${formLabelClass} mb-1.5`}>
          Код доступу{' '}
          <span className="text-ui-fg-muted normal-case opacity-70">
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
          className="w-full bg-ui-surface border border-ui-border rounded-xl px-3 py-2.5 text-ui-fg text-ui-body-input focus:outline-none focus:border-ui-accent font-mono uppercase"
        />
      </div>

      {error && <p className={`${typographyClass.system} text-ui-danger`}>{error}</p>}

      <Button
        type="button"
        variant="primary"
        volume="cta"
        fullWidth
        size="lg"
        disabled={saving}
        onClick={() => void handleSubmit()}
        className="font-sans normal-case tracking-normal"
      >
        {saving ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 size={14} className="animate-spin" aria-hidden />
            Створення…
          </span>
        ) : (
          <span className="inline-flex items-center justify-center gap-2">
            <Plus size={14} aria-hidden />
            Створити словник
          </span>
        )}
      </Button>
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
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message?: unknown }).message)
          : '';
      setError(msg || 'Помилка завантаження');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 px-4 py-4">
      <div>
        <label className={`${formLabelClass} mb-1.5`}>Назва словника</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 80))}
          placeholder="Назва"
          className="w-full bg-ui-surface border border-ui-border rounded-xl px-3 py-2.5 text-ui-fg text-ui-body-input focus:outline-none focus:border-ui-accent"
        />
      </div>

      <div>
        <label className={`${formLabelClass} mb-1.5`}>
          Файл{' '}
          <span className="text-ui-fg-muted opacity-70 normal-case">
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
        <Button
          type="button"
          variant="tertiary"
          fullWidth
          size="md"
          onClick={() => fileRef.current?.click()}
          className="h-24 border-2 border-dashed flex-col gap-2 font-sans normal-case tracking-normal"
        >
          <FileText size={20} className="text-ui-fg-muted" aria-hidden />
          <span className={`${captionMutedClass} text-ui-fg-muted`}>
            {file ? file.name : 'Натисніть для вибору файлу'}
          </span>
          {file && (
            <span className={`${typographyClass.label} text-ui-fg-muted opacity-70`}>
              {(file.size / 1024).toFixed(1)} KB
            </span>
          )}
        </Button>
      </div>

      {error && <p className={`${typographyClass.system} text-ui-danger`}>{error}</p>}

      <Button
        type="button"
        variant="primary"
        volume="cta"
        fullWidth
        size="lg"
        disabled={saving || !file}
        onClick={() => void handleSubmit()}
        className="font-sans normal-case tracking-normal"
      >
        {saving ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 size={14} className="animate-spin" aria-hidden />
            Завантаження…
          </span>
        ) : (
          <span className="inline-flex items-center justify-center gap-2">
            <Upload size={14} aria-hidden />
            Завантажити
          </span>
        )}
      </Button>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export function CustomDeckModal({ onClose, onSelectDeck }: CustomDeckModalProps) {
  const { isAuthenticated } = useAuthContext();
  const { requestLogin } = useAppLogin();
  const { currentTheme } = useGame();
  const [view, setView] = useState<View>('list');
  const [decks, setDecks] = useState<CustomDeckSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(true);

  const requestClose = () => setSheetOpen(false);

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

  return (
    <>
      <ModalSheet
        open={sheetOpen}
        onClose={requestClose}
        onExited={onClose}
        size="tall"
        maxWidth="lg"
        showClose
        closeAriaLabel="Закрити"
        closeIconSize={20}
        paddedContent={false}
      >
        <div className="shrink-0 px-5 pb-4 border-b border-ui-border">
          <div className="flex items-center gap-3 min-w-0">
            {view !== 'list' ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setView('list')}
                aria-label="Назад до списку"
                className="min-h-11 min-w-11 px-0 shrink-0"
              >
                <X size={18} aria-hidden />
              </Button>
            ) : (
              <div className="p-2 rounded-xl bg-ui-surface border border-ui-border">
                <FileText size={20} className="text-ui-accent" />
              </div>
            )}
            <div className="min-w-0">
              <ModalSheetTitle as="h1" themeClass={currentTheme.textMain}>
                {view === 'list'
                  ? 'Мої словники'
                  : view === 'create'
                    ? 'Новий словник'
                    : 'Завантажити файл'}
              </ModalSheetTitle>
              <p className={`${captionMutedClass} text-ui-fg-muted`}>
                {view === 'list'
                  ? 'Власні набори слів для гри'
                  : 'Введіть слова для свого словника'}
              </p>
            </div>
          </div>

          {/* Tabs (only on list view) */}
          {view === 'list' && (
            <div className="flex gap-2 mt-4">
              <SettingsChip
                size="compact"
                variant="solid"
                className="font-sans normal-case tracking-normal"
                onClick={() => {
                  if (!isAuthenticated) {
                    requestLogin();
                    return;
                  }
                  setView('create');
                }}
              >
                <Plus size={13} aria-hidden />
                <span className={settingsChipLabelClass}>Створити</span>
              </SettingsChip>
              <SettingsChip
                size="compact"
                variant="tint"
                className="font-sans normal-case tracking-normal"
                onClick={() => {
                  if (!isAuthenticated) {
                    requestLogin();
                    return;
                  }
                  setView('upload');
                }}
              >
                <Upload size={13} aria-hidden />
                <span className={settingsChipLabelClass}>CSV / TXT</span>
              </SettingsChip>
            </div>
          )}
        </div>

        {/* Content */}
        <ModalSheetBody>
          {view === 'list' && (
            <>
              {!isAuthenticated ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <p className={`text-ui-fg-muted ${typographyClass.body}`}>
                    Увійдіть, щоб створювати словники
                  </p>
                  <Button
                    type="button"
                    variant="primary"
                    volume="cta"
                    size="md"
                    onClick={requestLogin}
                    className="font-sans normal-case tracking-normal"
                  >
                    Увійти
                  </Button>
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 size={24} className="animate-spin text-ui-accent" />
                </div>
              ) : decks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2">
                  <FileText size={32} className="text-ui-fg-muted opacity-50" />
                  <p className={`text-ui-fg-muted ${typographyClass.body}`}>Ще немає словників</p>
                  <p className={`${captionMutedClass} text-ui-fg-muted`}>
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
        </ModalSheetBody>

        <ModalSheetFooter className="border-t border-ui-border px-5 py-3">
          <p className={`text-center text-ui-fg-muted ${typographyClass.label}`}>
            Поділіться кодом доступу з іншими гравцями
          </p>
        </ModalSheetFooter>
      </ModalSheet>
    </>
  );
}
