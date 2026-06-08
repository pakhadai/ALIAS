import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, ChevronUp, Pencil, Trash2, Upload, Plus, X, RefreshCw } from 'lucide-react';
import { api, type WordPackRow, type PackWord } from '../adminApi';
import type { ShowToast, ConfirmFn } from '../AdminApp';
import { AdminInput, AdminSelect, AdminTextarea } from '../components/AdminInput';
import {
  ADMIN_PANEL_CLASS,
  ADMIN_SECTION_INSET_CLASS,
  ADMIN_SPINNER_CLASS,
  adminStatusBtn,
} from '../components/adminStyles';
import { typographyClass } from '../../../constants/typography';

interface Props {
  showToast: ShowToast;
  confirm: ConfirmFn;
}

export function PacksTab({ showToast, confirm }: Props) {
  const [packs, setPacks] = useState<WordPackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [acting, setActing] = useState<Set<string>>(new Set());
  const addA = (k: string) => setActing((s) => new Set(s).add(k));
  const delA = (k: string) =>
    setActing((s) => {
      const n = new Set(s);
      n.delete(k);
      return n;
    });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPacks(await api.getPacks());
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

  const handleDelete = async (pack: WordPackRow) => {
    const ok = await confirm({
      title: 'Видалити пак?',
      message: `«${pack.name}» та усі ${pack.wordCount} слів будуть видалені назавжди.`,
      confirmLabel: 'Видалити',
      danger: true,
    });
    if (!ok) return;
    addA(`del-${pack.id}`);
    try {
      await api.deletePack(pack.id);
      setPacks((p) => p.filter((x) => x.id !== pack.id));
      if (expandedId === pack.id) setExpandedId(null);
      if (editingId === pack.id) setEditingId(null);
      showToast(`«${pack.name}» видалено`, 'success');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : '';
      showToast(msg || 'Помилка', 'error');
    } finally {
      delA(`del-${pack.id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center pt-24">
        <div className={`w-8 h-8 ${ADMIN_SPINNER_CLASS}`} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-serif text-ui-fg">Word Packs</h2>
          <p className="text-sm text-ui-fg-muted mt-0.5">{packs.length} паків</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className={`flex items-center gap-1.5 ${typographyClass.label} tracking-widest text-ui-fg-muted hover:text-ui-fg transition-colors`}
          >
            <RefreshCw size={13} />
            Оновити
          </button>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className={`flex items-center gap-2 ${typographyClass.label} tracking-widest px-4 py-2 rounded-lg ${adminStatusBtn('accent')}`}
          >
            <Plus size={13} />
            {showCreate ? 'Скасувати' : 'Новий пак'}
          </button>
        </div>
      </div>

      {showCreate && (
        <CreatePackForm
          onCreated={(pack) => {
            setPacks((p) => [...p, pack]);
            setShowCreate(false);
            showToast(`«${pack.name}» створено`, 'success');
          }}
          showToast={showToast}
          acting={acting}
          addA={addA}
          delA={delA}
        />
      )}

      <div className="space-y-2">
        {packs.map((pack) => (
          <PackRow
            key={pack.id}
            pack={pack}
            isExpanded={expandedId === pack.id}
            isEditing={editingId === pack.id}
            acting={acting}
            addA={addA}
            delA={delA}
            onToggleExpand={() => setExpandedId(expandedId === pack.id ? null : pack.id)}
            onToggleEdit={() => setEditingId(editingId === pack.id ? null : pack.id)}
            onDelete={handleDelete}
            onPackUpdated={(updated) =>
              setPacks((p) => p.map((x) => (x.id === updated.id ? updated : x)))
            }
            onEditClosed={() => setEditingId(null)}
            showToast={showToast}
          />
        ))}
        {packs.length === 0 && (
          <div className="text-center py-16 text-ui-fg-muted">Паків немає</div>
        )}
      </div>
    </div>
  );
}

// ─── Create pack form ─────────────────────────────────────────────────────────

function CreatePackForm({
  onCreated,
  showToast,
  acting,
  addA,
  delA,
}: {
  onCreated: (p: WordPackRow) => void;
  showToast: ShowToast;
  acting: Set<string>;
  addA: (k: string) => void;
  delA: (k: string) => void;
}) {
  const [form, setForm] = useState({
    slug: '',
    name: '',
    language: 'UA',
    category: 'General',
    difficulty: 'mixed',
    price: '0',
    isFree: true,
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    addA('create-pack');
    try {
      const created = await api.createPack({
        slug: form.slug,
        name: form.name,
        language: form.language,
        category: form.category,
        difficulty: form.difficulty,
        price: Number(form.price),
        isFree: form.isFree,
        description: form.description || null,
      });
      onCreated(created);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : '';
      showToast(msg || 'Помилка', 'error');
    } finally {
      delA('create-pack');
    }
  };

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((v) => ({ ...v, [field]: e.target.value }));

  return (
    <form onSubmit={handleSubmit} className={`${ADMIN_PANEL_CLASS} p-5 space-y-4`}>
      <h3 className="text-sm font-bold text-ui-fg">Новий Word Pack</h3>
      <div className="grid grid-cols-2 gap-3">
        <AdminInput
          placeholder="slug (ua-general)"
          value={form.slug}
          onChange={f('slug')}
          required
        />
        <AdminInput placeholder="Назва" value={form.name} onChange={f('name')} required />
        <AdminSelect value={form.language} onChange={f('language')}>
          {['UA', 'EN', 'DE'].map((l) => (
            <option key={l}>{l}</option>
          ))}
        </AdminSelect>
        <AdminInput placeholder="Category" value={form.category} onChange={f('category')} />
        <AdminSelect value={form.difficulty} onChange={f('difficulty')}>
          {['easy', 'medium', 'hard', 'mixed', '18+'].map((d) => (
            <option key={d}>{d}</option>
          ))}
        </AdminSelect>
        <AdminInput
          type="number"
          min="0"
          placeholder="Ціна (центи)"
          value={form.price}
          onChange={f('price')}
        />
        <AdminInput
          className="col-span-2"
          placeholder="Опис (необов'язково)"
          value={form.description}
          onChange={f('description')}
        />
        <label className="flex items-center gap-2 text-xs text-ui-fg-muted cursor-pointer col-span-2">
          <input
            type="checkbox"
            checked={form.isFree}
            onChange={(e) => setForm((v) => ({ ...v, isFree: e.target.checked }))}
            className="accent-ui-accent"
          />
          Безкоштовний
        </label>
      </div>
      <button
        type="submit"
        disabled={acting.has('create-pack')}
        className="w-full bg-ui-accent text-ui-accent-contrast font-bold py-2.5 rounded-xl text-sm hover:bg-ui-accent-hover transition-all active:scale-[0.98] disabled:opacity-40"
      >
        {acting.has('create-pack') ? 'Створення...' : 'Створити пак'}
      </button>
    </form>
  );
}

// ─── Pack row ─────────────────────────────────────────────────────────────────

function PackRow({
  pack,
  isExpanded,
  isEditing,
  acting,
  addA,
  delA,
  onToggleExpand,
  onToggleEdit,
  onDelete,
  onPackUpdated,
  onEditClosed,
  showToast,
}: {
  pack: WordPackRow;
  isExpanded: boolean;
  isEditing: boolean;
  acting: Set<string>;
  addA: (k: string) => void;
  delA: (k: string) => void;
  onToggleExpand: () => void;
  onToggleEdit: () => void;
  onDelete: (p: WordPackRow) => void;
  onPackUpdated: (p: WordPackRow) => void;
  onEditClosed: () => void;
  showToast: ShowToast;
}) {
  return (
    <div className={ADMIN_PANEL_CLASS}>
      {/* Header row */}
      <div className="px-5 py-3.5 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-ui-fg font-medium text-sm">{pack.name}</span>
            <span
              className={`${typographyClass.label} font-mono normal-case text-ui-fg-muted bg-ui-bg px-2 py-0.5 rounded border border-ui-border`}
            >
              {pack.slug}
            </span>
            <span className={`${typographyClass.label} text-ui-fg-subtle normal-case`}>
              {pack.language} · {pack.category} · {pack.difficulty}
            </span>
            {pack.isFree ? (
              <span className={`${typographyClass.label} text-ui-success normal-case`}>FREE</span>
            ) : (
              <span className={`${typographyClass.label} text-ui-accent normal-case`}>
                ${(pack.price / 100).toFixed(2)}
              </span>
            )}
            <span className={`${typographyClass.label} text-ui-fg-subtle normal-case`}>
              {pack.wordCount} слів
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleExpand}
            className={`flex items-center gap-1 ${typographyClass.label} tracking-wider px-3 py-1.5 rounded-lg ${adminStatusBtn('accent')}`}
          >
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Слова
          </button>
          <button
            onClick={onToggleEdit}
            className="p-1.5 rounded-lg bg-ui-surface-hover border border-ui-border text-ui-fg-muted hover:text-ui-fg hover:bg-ui-elevated transition-colors"
            title="Редагувати"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(pack)}
            disabled={acting.has(`del-${pack.id}`)}
            className={`p-1.5 rounded-lg disabled:opacity-40 ${adminStatusBtn('danger')}`}
            title="Видалити пак"
          >
            {acting.has(`del-${pack.id}`) ? (
              <span className="w-3.5 h-3.5 border border-ui-danger border-t-transparent rounded-full animate-spin block" />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        </div>
      </div>

      {/* Edit panel */}
      {isEditing && (
        <EditPackPanel
          pack={pack}
          acting={acting}
          addA={addA}
          delA={delA}
          onSaved={(updated) => {
            onPackUpdated(updated);
            onEditClosed();
            showToast('Збережено', 'success');
          }}
          onCancel={onEditClosed}
          showToast={showToast}
        />
      )}

      {/* Words panel */}
      {isExpanded && (
        <WordsPanel
          pack={pack}
          acting={acting}
          addA={addA}
          delA={delA}
          onWordsChanged={(wordCount) => onPackUpdated({ ...pack, wordCount })}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ─── Edit pack ────────────────────────────────────────────────────────────────

function EditPackPanel({
  pack,
  acting,
  addA,
  delA,
  onSaved,
  onCancel,
  showToast,
}: {
  pack: WordPackRow;
  acting: Set<string>;
  addA: (k: string) => void;
  delA: (k: string) => void;
  onSaved: (p: WordPackRow) => void;
  onCancel: () => void;
  showToast: ShowToast;
}) {
  const [form, setForm] = useState({
    name: pack.name,
    difficulty: pack.difficulty,
    price: String(pack.price),
    isFree: pack.isFree,
    description: pack.description ?? '',
  });
  const key = `save-pack-${pack.id}`;

  const handleSave = async () => {
    addA(key);
    try {
      const updated = await api.updatePack(pack.id, {
        name: form.name,
        difficulty: form.difficulty,
        price: Number(form.price),
        isFree: form.isFree,
        description: form.description || undefined,
      });
      onSaved(updated);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : '';
      showToast(msg || 'Помилка', 'error');
    } finally {
      delA(key);
    }
  };

  return (
    <div className={`${ADMIN_SECTION_INSET_CLASS} space-y-3`}>
      <p className={`${typographyClass.label} tracking-widest text-ui-fg-muted font-bold`}>
        Редагувати метадані
      </p>
      <div className="grid grid-cols-2 gap-3">
        <AdminInput
          placeholder="Назва"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <AdminSelect
          value={form.difficulty}
          onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
        >
          {['easy', 'medium', 'hard', 'mixed', '18+'].map((d) => (
            <option key={d}>{d}</option>
          ))}
        </AdminSelect>
        <AdminInput
          type="number"
          min="0"
          placeholder="Ціна (центи)"
          value={form.price}
          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
        />
        <label className="flex items-center gap-2 text-xs text-ui-fg-muted cursor-pointer">
          <input
            type="checkbox"
            checked={form.isFree}
            onChange={(e) => setForm((f) => ({ ...f, isFree: e.target.checked }))}
            className="accent-ui-accent"
          />
          Безкоштовний
        </label>
        <AdminInput
          className="col-span-2"
          placeholder="Опис"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={acting.has(key)}
          className={`${typographyClass.label} tracking-wider px-4 py-2 rounded-lg disabled:opacity-40 ${adminStatusBtn('success')}`}
        >
          {acting.has(key) ? 'Збереження...' : 'Зберегти'}
        </button>
        <button
          onClick={onCancel}
          className={`${typographyClass.label} tracking-wider px-4 py-2 rounded-lg bg-ui-surface text-ui-fg-muted border border-ui-border hover:bg-ui-surface-hover transition-colors`}
        >
          Скасувати
        </button>
      </div>
    </div>
  );
}

// ─── Words panel ──────────────────────────────────────────────────────────────

function WordsPanel({
  pack,
  acting,
  addA,
  delA,
  onWordsChanged,
  showToast,
}: {
  pack: WordPackRow;
  acting: Set<string>;
  addA: (k: string) => void;
  delA: (k: string) => void;
  onWordsChanged: (count: number) => void;
  showToast: ShowToast;
}) {
  const [words, setWords] = useState<PackWord[]>([]);
  const [wordsLoading, setWordsLoading] = useState(true);
  const [newWords, setNewWords] = useState('');
  const [filter, setFilter] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setWordsLoading(true);
    api
      .getPack(pack.id)
      .then((d) => {
        if (!cancelled) setWords(d.words);
      })
      .catch((err: unknown) => {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message?: unknown }).message)
            : '';
        if (!cancelled) showToast(msg || 'Помилка', 'error');
      })
      .finally(() => {
        if (!cancelled) setWordsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pack.id, showToast]);

  const refresh = async () => {
    const d = await api.getPack(pack.id);
    setWords(d.words);
    onWordsChanged(d.words.length);
  };

  const handleAdd = async () => {
    const list = newWords
      .split('\n')
      .map((w) => w.trim())
      .filter(Boolean);
    if (!list.length) return;
    addA('add-words');
    try {
      await api.addWords(pack.id, list);
      setNewWords('');
      await refresh();
      showToast(`Додано ${list.length} слів`, 'success');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : '';
      showToast(msg || 'Помилка', 'error');
    } finally {
      delA('add-words');
    }
  };

  const handleDeleteWord = async (word: PackWord) => {
    addA(`del-word-${word.id}`);
    try {
      const res = await api.deleteWord(pack.id, word.id);
      setWords((w) => w.filter((x) => x.id !== word.id));
      onWordsChanged(res.totalWords);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : '';
      showToast(msg || 'Помилка', 'error');
    } finally {
      delA(`del-word-${word.id}`);
    }
  };

  const handleCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    addA(`csv-${pack.id}`);
    try {
      const result = await api.uploadCsv(pack.id, file);
      await refresh();
      showToast(result.message || 'CSV завантажено', 'success');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : '';
      showToast(msg || 'Помилка', 'error');
    } finally {
      delA(`csv-${pack.id}`);
      e.target.value = '';
    }
  };

  const filtered = words.filter(
    (w) => !filter || w.text.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className={`${ADMIN_SECTION_INSET_CLASS} space-y-4`}>
      <div className="flex items-center justify-between">
        <p className={`${typographyClass.label} tracking-widest text-ui-fg-muted font-bold`}>
          Слова ({words.length})
        </p>
        {acting.has(`csv-${pack.id}`) && (
          <span className={`${typographyClass.label} text-ui-accent normal-case animate-pulse`}>
            Завантаження CSV...
          </span>
        )}
      </div>

      {/* CSV upload */}
      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleCsv}
          disabled={acting.has(`csv-${pack.id}`)}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={acting.has(`csv-${pack.id}`)}
          className={`flex items-center gap-2 ${typographyClass.label} tracking-wider px-3 py-2 rounded-lg bg-ui-surface text-ui-fg-muted border border-ui-border hover:text-ui-fg hover:bg-ui-surface-hover transition-colors disabled:opacity-40`}
        >
          <Upload size={12} />
          Завантажити CSV
        </button>
        <span className={`${typographyClass.label} text-ui-fg-subtle normal-case`}>
          difficulty, word_ua, synonyms_ua, taboo_ua, word_en…
        </span>
      </div>

      {/* Add words */}
      <div className="flex gap-2 items-start">
        <AdminTextarea
          className="flex-1 resize-none h-20 text-xs font-mono"
          placeholder="Нові слова (по одному на рядок)"
          value={newWords}
          onChange={(e) => setNewWords(e.target.value)}
        />
        <button
          onClick={handleAdd}
          disabled={!newWords.trim() || acting.has('add-words')}
          className={`flex items-center gap-1.5 ${typographyClass.label} tracking-wider px-4 py-2 rounded-lg disabled:opacity-40 whitespace-nowrap ${adminStatusBtn('accent')}`}
        >
          <Plus size={12} />
          {acting.has('add-words') ? '...' : 'Додати'}
        </button>
      </div>

      {/* Filter */}
      {words.length > 10 && (
        <AdminInput
          className="w-full"
          placeholder="Фільтр слів..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}

      {/* Word chips */}
      {wordsLoading ? (
        <div className="flex justify-center py-4">
          <div className={`w-5 h-5 ${ADMIN_SPINNER_CLASS}`} />
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
          {filtered.map((w) => (
            <span
              key={w.id}
              className="flex items-center gap-1 bg-ui-surface text-ui-fg text-xs px-2.5 py-1 rounded-full border border-ui-border"
            >
              {w.text}
              <button
                onClick={() => handleDeleteWord(w)}
                disabled={acting.has(`del-word-${w.id}`)}
                className="text-ui-fg-subtle hover:text-ui-danger transition-colors ml-0.5 leading-none disabled:opacity-40"
              >
                <X size={11} />
              </button>
            </span>
          ))}
          {filtered.length === 0 && words.length > 0 && (
            <p className="text-ui-fg-subtle text-xs">Нічого не знайдено</p>
          )}
          {words.length === 0 && (
            <p className="text-ui-fg-subtle text-xs">
              Слів немає — додайте вище або завантажте CSV
            </p>
          )}
        </div>
      )}
    </div>
  );
}
