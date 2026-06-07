import React, { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, X, RefreshCw } from 'lucide-react';
import { api, type ThemeRow } from '../adminApi';
import type { ShowToast, ConfirmFn } from '../AdminApp';
import { AdminInput } from '../components/AdminInput';
import {
  ADMIN_PANEL_CLASS,
  ADMIN_SECTION_INSET_CLASS,
  ADMIN_SPINNER_CLASS,
  adminStatusBtn,
} from '../components/adminStyles';
import {
  typographyClass,
  labelSectionClass,
  labelSectionTitleClass,
  formLabelClass,
} from '../../../constants/typography';

interface Props {
  showToast: ShowToast;
  confirm: ConfirmFn;
}

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
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message)
          : '';
      showToast(msg || 'Помилка', 'error');
    } finally {
      delA(`del-${theme.id}`);
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
          <h2 className="text-lg font-serif text-ui-fg">Теми</h2>
          <p className="text-sm text-ui-fg-muted mt-0.5">{themes.length} тем</p>
        </div>
        <button
          onClick={load}
          className={`flex items-center gap-1.5 ${typographyClass.label} tracking-widest text-ui-fg-muted hover:text-ui-fg transition-colors`}
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
            <div key={theme.id} className={ADMIN_PANEL_CLASS}>
              <div className="px-5 py-4 flex items-center gap-4">
                {/* Color swatch — theme preview hex allowed */}
                <div
                  className="w-12 h-12 rounded-xl shrink-0 border border-ui-border relative overflow-hidden"
                  style={{ background: previewBg }}
                >
                  <div
                    className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 rounded-full border border-white/20"
                    style={{ background: previewAccent }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-ui-fg font-medium text-sm">{theme.name}</span>
                    <span
                      className={`${typographyClass.label} font-mono normal-case text-ui-fg-muted bg-ui-bg px-2 py-0.5 rounded border border-ui-border`}
                    >
                      {theme.slug}
                    </span>
                    {theme.isFree ? (
                      <span className={`${typographyClass.label} text-ui-success normal-case`}>
                        FREE
                      </span>
                    ) : (
                      <span className={`${typographyClass.label} text-ui-accent normal-case`}>
                        ${(theme.price / 100).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setEditingId(isEditing ? null : theme.id)}
                    className="p-1.5 rounded-lg bg-ui-surface-hover border border-ui-border text-ui-fg-muted hover:text-ui-fg hover:bg-ui-elevated transition-colors"
                    title="Редагувати"
                  >
                    {isEditing ? <X size={14} /> : <Pencil size={14} />}
                  </button>
                  <button
                    onClick={() => handleDelete(theme)}
                    disabled={acting.has(`del-${theme.id}`)}
                    className={`p-1.5 rounded-lg disabled:opacity-40 ${adminStatusBtn('danger')}`}
                    title="Видалити"
                  >
                    {acting.has(`del-${theme.id}`) ? (
                      <span className="w-3.5 h-3.5 border border-ui-danger border-t-transparent rounded-full animate-spin block" />
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
        {themes.length === 0 && <div className="text-center py-16 text-ui-fg-muted">Тем немає</div>}
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
    <div className={ADMIN_SECTION_INSET_CLASS}>
      <div className="flex items-center gap-3 flex-wrap">
        <AdminInput
          className="w-40"
          placeholder="Назва теми"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-ui-fg-muted">Ціна (центи):</span>
          <AdminInput
            className="w-28"
            type="number"
            min="0"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-ui-fg-muted cursor-pointer">
          <input
            type="checkbox"
            checked={form.isFree}
            onChange={(e) => setForm((f) => ({ ...f, isFree: e.target.checked }))}
            className="accent-ui-accent"
          />
          Безкоштовна
        </label>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={acting.has(key)}
            className={`${typographyClass.label} tracking-wider px-4 py-2 rounded-lg disabled:opacity-40 ${adminStatusBtn('success')}`}
          >
            {acting.has(key) ? '...' : 'Зберегти'}
          </button>
          <button
            onClick={onCancel}
            className={`${typographyClass.label} tracking-wider px-4 py-2 rounded-lg bg-ui-surface text-ui-fg-muted border border-ui-border hover:bg-ui-surface-hover transition-colors`}
          >
            Скасувати
          </button>
        </div>
      </div>
    </div>
  );
}
