import React, { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, X, RefreshCw } from 'lucide-react';
import { api, type ThemeRow } from '../adminApi';
import type { ShowToast, ConfirmFn } from '../AdminApp';

interface Props {
  showToast: ShowToast;
  confirm: ConfirmFn;
}

const INP =
  'bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-white text-sm placeholder:text-[#555] focus:outline-none focus:border-[#E3FF5B] transition-colors';

export function ThemesTab({ showToast, confirm }: Props) {
  const [themes, setThemes] = useState<ThemeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
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
      setThemes(await api.getThemes());
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (theme: ThemeRow) => {
    const ok = await confirm({
      title: 'Видалити тему?',
      message: `«${theme.name}» (${theme.slug}) буде видалено.`,
      confirmLabel: 'Видалити',
      danger: true,
    });
    if (!ok) return;
    addA(`del-${theme.id}`);
    try {
      await api.deleteTheme(theme.id);
      setThemes((t) => t.filter((x) => x.id !== theme.id));
      if (editingId === theme.id) setEditingId(null);
      showToast(`«${theme.name}» видалено`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      delA(`del-${theme.id}`);
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
          <h2 className="text-lg font-serif text-white">Теми</h2>
          <p className="text-sm text-[#888] mt-0.5">{themes.length} тем</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-[#888] hover:text-white transition-colors"
        >
          <RefreshCw size={13} />
          Оновити
        </button>
      </div>

      <div className="space-y-2">
        {themes.map((theme) => {
          const previewBg = theme.config?.preview?.bg ?? '#1A1A1A';
          const previewAccent = theme.config?.preview?.accent ?? '#E3FF5B';
          const isEditing = editingId === theme.id;

          return (
            <div
              key={theme.id}
              className="bg-[#141414] border border-[#333] rounded-2xl overflow-hidden"
            >
              <div className="px-5 py-4 flex items-center gap-4">
                {/* Color swatch */}
                <div
                  className="w-12 h-12 rounded-xl shrink-0 border border-[#333] relative overflow-hidden"
                  style={{ background: previewBg }}
                >
                  <div
                    className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 rounded-full border border-white/20"
                    style={{ background: previewAccent }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium text-sm">{theme.name}</span>
                    <span className="text-[10px] font-mono text-[#888] bg-[#111] px-2 py-0.5 rounded border border-[#333]">
                      {theme.slug}
                    </span>
                    {theme.isFree ? (
                      <span className="text-[10px] text-[#44ff44] font-bold">FREE</span>
                    ) : (
                      <span className="text-[10px] text-[#E3FF5B] font-bold">
                        ${(theme.price / 100).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setEditingId(isEditing ? null : theme.id)}
                    className="p-1.5 rounded-lg bg-[#222] border border-[#333] text-[#888] hover:text-white hover:bg-[#2a2a2a] transition-colors"
                    title="Редагувати"
                  >
                    {isEditing ? <X size={14} /> : <Pencil size={14} />}
                  </button>
                  <button
                    onClick={() => handleDelete(theme)}
                    disabled={acting.has(`del-${theme.id}`)}
                    className="p-1.5 rounded-lg bg-[color-mix(in_srgb,#ff4444_12%,transparent)] border border-[color-mix(in_srgb,#ff4444_22%,transparent)] text-[#ff4444] hover:bg-[color-mix(in_srgb,#ff4444_20%,transparent)] transition-colors disabled:opacity-40"
                    title="Видалити"
                  >
                    {acting.has(`del-${theme.id}`) ? (
                      <span className="w-3.5 h-3.5 border border-[#ff4444] border-t-transparent rounded-full animate-spin block" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>

              {/* Inline edit */}
              {isEditing && (
                <EditThemePanel
                  theme={theme}
                  acting={acting}
                  addA={addA}
                  delA={delA}
                  onSaved={(updated) => {
                    setThemes((t) => t.map((x) => (x.id === updated.id ? updated : x)));
                    setEditingId(null);
                    showToast('Тему збережено', 'success');
                  }}
                  onCancel={() => setEditingId(null)}
                  showToast={showToast}
                />
              )}
            </div>
          );
        })}
        {themes.length === 0 && <div className="text-center py-16 text-[#888]">Тем немає</div>}
      </div>
    </div>
  );
}

function EditThemePanel({
  theme,
  acting,
  addA,
  delA,
  onSaved,
  onCancel,
  showToast,
}: {
  theme: ThemeRow;
  acting: Set<string>;
  addA: (k: string) => void;
  delA: (k: string) => void;
  onSaved: (t: ThemeRow) => void;
  onCancel: () => void;
  showToast: ShowToast;
}) {
  const [form, setForm] = useState({
    price: String(theme.price),
    isFree: theme.isFree,
    name: theme.name,
  });
  const key = `save-theme-${theme.id}`;

  const handleSave = async () => {
    addA(key);
    try {
      const updated = await api.updateTheme(theme.id, {
        name: form.name,
        price: Number(form.price),
        isFree: form.isFree,
      });
      onSaved(updated);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      delA(key);
    }
  };

  return (
    <div className="border-t border-[#333] px-5 py-4 bg-[#111]">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          className={INP + ' w-40'}
          placeholder="Назва теми"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#888]">Ціна (центи):</span>
          <input
            className={INP + ' w-28'}
            type="number"
            min="0"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-[#888] cursor-pointer">
          <input
            type="checkbox"
            checked={form.isFree}
            onChange={(e) => setForm((f) => ({ ...f, isFree: e.target.checked }))}
            className="accent-[#E3FF5B]"
          />
          Безкоштовна
        </label>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={acting.has(key)}
            className="text-[10px] uppercase tracking-wider font-bold px-4 py-2 rounded-lg bg-[color-mix(in_srgb,#44ff44_12%,transparent)] text-[#44ff44] border border-[color-mix(in_srgb,#44ff44_22%,transparent)] hover:bg-[color-mix(in_srgb,#44ff44_20%,transparent)] transition-colors disabled:opacity-40"
          >
            {acting.has(key) ? '...' : 'Зберегти'}
          </button>
          <button
            onClick={onCancel}
            className="text-[10px] uppercase tracking-wider font-bold px-4 py-2 rounded-lg bg-[#1a1a1a] text-[#888] border border-[#333] hover:bg-[#222] transition-colors"
          >
            Скасувати
          </button>
        </div>
      </div>
    </div>
  );
}
