import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, ChevronUp, Pencil, Trash2, Upload, Plus, X, RefreshCw } from 'lucide-react';
import { api, type WordPackRow, type PackWord } from '../adminApi';
import type { ShowToast, ConfirmFn } from '../AdminApp';

interface Props {
  showToast: ShowToast;
  confirm: ConfirmFn;
}

const INP =
  'bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white text-sm placeholder:text-[#555] focus:outline-none focus:border-[#E3FF5B] transition-colors';

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
        <div className="w-8 h-8 border-2 border-[#E3FF5B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-serif text-white">Word Packs</h2>
          <p className="text-sm text-[#888] mt-0.5">{packs.length} паків</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-[#888] hover:text-white transition-colors"
          >
            <RefreshCw size={13} />
            Оновити
          </button>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold px-4 py-2 rounded-lg bg-[color-mix(in_srgb,#E3FF5B_14%,transparent)] text-[#E3FF5B] border border-[color-mix(in_srgb,#E3FF5B_25%,transparent)] hover:bg-[color-mix(in_srgb,#E3FF5B_22%,transparent)] transition-colors"
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
        {packs.length === 0 && <div className="text-center py-16 text-[#888]">Паків немає</div>}
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
    <form
      onSubmit={handleSubmit}
      className="bg-[#141414] border border-[#333] rounded-2xl p-5 space-y-4"
    >
      <h3 className="text-sm font-bold text-white">Новий Word Pack</h3>
      <div className="grid grid-cols-2 gap-3">
        <input
          className={INP}
          placeholder="slug (ua-general)"
          value={form.slug}
          onChange={f('slug')}
          required
        />
        <input
          className={INP}
          placeholder="Назва"
          value={form.name}
          onChange={f('name')}
          required
        />
        <select className={INP} value={form.language} onChange={f('language')}>
          {['UA', 'EN', 'DE'].map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <input
          className={INP}
          placeholder="Category"
          value={form.category}
          onChange={f('category')}
        />
        <select className={INP} value={form.difficulty} onChange={f('difficulty')}>
          {['easy', 'medium', 'hard', 'mixed', '18+'].map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <input
          className={INP}
          type="number"
          min="0"
          placeholder="Ціна (центи)"
          value={form.price}
          onChange={f('price')}
        />
        <input
          className={INP + ' col-span-2'}
          placeholder="Опис (необов'язково)"
          value={form.description}
          onChange={f('description')}
        />
        <label className="flex items-center gap-2 text-xs text-[#888] cursor-pointer col-span-2">
          <input
            type="checkbox"
            checked={form.isFree}
            onChange={(e) => setForm((v) => ({ ...v, isFree: e.target.checked }))}
            className="accent-[#E3FF5B]"
          />
          Безкоштовний
        </label>
      </div>
      <button
        type="submit"
        disabled={acting.has('create-pack')}
        className="w-full bg-[#E3FF5B] text-black font-bold py-2.5 rounded-xl text-sm hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-40"
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
    <div className="bg-[#141414] border border-[#333] rounded-2xl overflow-hidden">
      {/* Header row */}
      <div className="px-5 py-3.5 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-medium text-sm">{pack.name}</span>
            <span className="text-[10px] font-mono text-[#888] bg-[#111] px-2 py-0.5 rounded border border-[#333]">
              {pack.slug}
            </span>
            <span className="text-[10px] text-[#666]">
              {pack.language} · {pack.category} · {pack.difficulty}
            </span>
            {pack.isFree ? (
              <span className="text-[10px] text-[#44ff44] font-bold">FREE</span>
            ) : (
              <span className="text-[10px] text-[#E3FF5B] font-bold">
                ${(pack.price / 100).toFixed(2)}
              </span>
            )}
            <span className="text-[10px] text-[#666]">{pack.wordCount} слів</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg bg-[color-mix(in_srgb,#E3FF5B_12%,transparent)] text-[#E3FF5B] border border-[color-mix(in_srgb,#E3FF5B_22%,transparent)] hover:bg-[color-mix(in_srgb,#E3FF5B_20%,transparent)] transition-colors"
          >
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Слова
          </button>
          <button
            onClick={onToggleEdit}
            className="p-1.5 rounded-lg bg-[#222] border border-[#333] text-[#888] hover:text-white hover:bg-[#2a2a2a] transition-colors"
            title="Редагувати"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(pack)}
            disabled={acting.has(`del-${pack.id}`)}
            className="p-1.5 rounded-lg bg-[color-mix(in_srgb,#ff4444_12%,transparent)] border border-[color-mix(in_srgb,#ff4444_22%,transparent)] text-[#ff4444] hover:bg-[color-mix(in_srgb,#ff4444_20%,transparent)] transition-colors disabled:opacity-40"
            title="Видалити пак"
          >
            {acting.has(`del-${pack.id}`) ? (
              <span className="w-3.5 h-3.5 border border-[#ff4444] border-t-transparent rounded-full animate-spin block" />
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
    <div className="border-t border-[#333] px-5 py-4 bg-[#111] space-y-3">
      <p className="text-[10px] uppercase tracking-widest text-[#888] font-bold">
        Редагувати метадані
      </p>
      <div className="grid grid-cols-2 gap-3">
        <input
          className={INP}
          placeholder="Назва"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <select
          className={INP}
          value={form.difficulty}
          onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
        >
          {['easy', 'medium', 'hard', 'mixed', '18+'].map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <input
          className={INP}
          type="number"
          min="0"
          placeholder="Ціна (центи)"
          value={form.price}
          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
        />
        <label className="flex items-center gap-2 text-xs text-[#888] cursor-pointer">
          <input
            type="checkbox"
            checked={form.isFree}
            onChange={(e) => setForm((f) => ({ ...f, isFree: e.target.checked }))}
            className="accent-[#E3FF5B]"
          />
          Безкоштовний
        </label>
        <input
          className={INP + ' col-span-2'}
          placeholder="Опис"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={acting.has(key)}
          className="text-[10px] uppercase tracking-wider font-bold px-4 py-2 rounded-lg bg-[color-mix(in_srgb,#44ff44_12%,transparent)] text-[#44ff44] border border-[color-mix(in_srgb,#44ff44_22%,transparent)] hover:bg-[color-mix(in_srgb,#44ff44_20%,transparent)] transition-colors disabled:opacity-40"
        >
          {acting.has(key) ? 'Збереження...' : 'Зберегти'}
        </button>
        <button
          onClick={onCancel}
          className="text-[10px] uppercase tracking-wider font-bold px-4 py-2 rounded-lg bg-[#1a1a1a] text-[#888] border border-[#333] hover:bg-[#222] transition-colors"
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
    <div className="border-t border-[#333] px-5 py-4 bg-[#111] space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-[#888] font-bold">
          Слова ({words.length})
        </p>
        {acting.has(`csv-${pack.id}`) && (
          <span className="text-[11px] text-[#E3FF5B] animate-pulse">Завантаження CSV...</span>
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
          className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold px-3 py-2 rounded-lg bg-[#1a1a1a] text-[#888] border border-[#333] hover:text-white hover:bg-[#222] transition-colors disabled:opacity-40"
        >
          <Upload size={12} />
          Завантажити CSV
        </button>
        <span className="text-[10px] text-[#555]">
          difficulty, word_ua, synonyms_ua, taboo_ua, word_en…
        </span>
      </div>

      {/* Add words */}
      <div className="flex gap-2 items-start">
        <textarea
          className={INP + ' flex-1 resize-none h-20 text-xs font-mono'}
          placeholder="Нові слова (по одному на рядок)"
          value={newWords}
          onChange={(e) => setNewWords(e.target.value)}
        />
        <button
          onClick={handleAdd}
          disabled={!newWords.trim() || acting.has('add-words')}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-4 py-2 rounded-lg bg-[color-mix(in_srgb,#E3FF5B_14%,transparent)] text-[#E3FF5B] border border-[color-mix(in_srgb,#E3FF5B_22%,transparent)] hover:bg-[color-mix(in_srgb,#E3FF5B_22%,transparent)] transition-colors disabled:opacity-40 whitespace-nowrap"
        >
          <Plus size={12} />
          {acting.has('add-words') ? '...' : 'Додати'}
        </button>
      </div>

      {/* Filter */}
      {words.length > 10 && (
        <input
          className={INP + ' w-full'}
          placeholder="Фільтр слів..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}

      {/* Word chips */}
      {wordsLoading ? (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-[#E3FF5B] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
          {filtered.map((w) => (
            <span
              key={w.id}
              className="flex items-center gap-1 bg-[#1a1a1a] text-white text-xs px-2.5 py-1 rounded-full border border-[#333]"
            >
              {w.text}
              <button
                onClick={() => handleDeleteWord(w)}
                disabled={acting.has(`del-word-${w.id}`)}
                className="text-[#666] hover:text-[#ff4444] transition-colors ml-0.5 leading-none disabled:opacity-40"
              >
                <X size={11} />
              </button>
            </span>
          ))}
          {filtered.length === 0 && words.length > 0 && (
            <p className="text-[#666] text-xs">Нічого не знайдено</p>
          )}
          {words.length === 0 && (
            <p className="text-[#666] text-xs">Слів немає — додайте вище або завантажте CSV</p>
          )}
        </div>
      )}
    </div>
  );
}
