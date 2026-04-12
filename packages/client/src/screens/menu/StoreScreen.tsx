import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Check, ShieldCheck, Loader2 } from 'lucide-react';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import { useAuthContext } from '../../context/AuthContext';
import { fetchStore, claimFreeItem, type WordPackItem, type ThemeItem } from '../../services/api';
import { QuickBuyModal } from '../../components/Store/QuickBuyModal';

const LANG_LABEL: Record<string, string> = { UA: '🇺🇦 UA', DE: '🇩🇪 DE', EN: '🇬🇧 EN' };
const LANG_FULL: Record<string, string> = {
  ALL: 'Усі',
  UA: 'Українська',
  EN: 'Англійська',
  DE: 'Німецька',
};
const LANG_FILTERS = ['ALL', 'UA', 'EN', 'DE'] as const;
type LangFilter = (typeof LANG_FILTERS)[number];
const STORE_TABS = ['packs', 'themes'] as const;
type StoreTab = (typeof STORE_TABS)[number];

export const StoreScreen = () => {
  const { setGameState, currentTheme } = useGame();
  const { isAuthenticated } = useAuthContext();
  const isDark = currentTheme.isDark;

  const [tab, setTab] = useState<StoreTab>('packs');
  const [langFilter, setLangFilter] = useState<LangFilter>('ALL');
  const [wordPacks, setWordPacks] = useState<WordPackItem[]>([]);
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [quickBuy, setQuickBuy] = useState<{
    itemType: 'wordPack' | 'theme' | 'soundPack';
    itemId: string;
  } | null>(null);

  const purchaseResult = useMemo(() => {
    const p = new URLSearchParams(window.location.search).get('purchase');
    return p === 'success' ? 'success' : p === 'cancelled' ? 'cancelled' : null;
  }, []);
  const [banner, setBanner] = useState<'success' | 'cancelled' | null>(purchaseResult);

  void isDark;

  const loadStore = useCallback(
    () =>
      fetchStore()
        .then((data) => {
          setWordPacks(data.wordPacks);
          setThemes(data.themes);
        })
        .catch((_err) => {
          void _err;
        })
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    loadStore();
    if (purchaseResult) {
      window.history.replaceState({}, '', window.location.pathname);
      const t = setTimeout(() => setBanner(null), 4000);
      return () => clearTimeout(t);
    }
  }, [loadStore, purchaseResult]);

  const handleAddFree = async (itemType: 'wordPack' | 'theme', itemId: string) => {
    if (!isAuthenticated) {
      setGameState(GameState.PROFILE);
      return;
    }
    setActing(itemId);
    try {
      await claimFreeItem(itemType, itemId);
      if (itemType === 'wordPack') {
        setWordPacks((prev) => prev.map((p) => (p.id === itemId ? { ...p, owned: true } : p)));
      } else {
        setThemes((prev) => prev.map((t) => (t.id === itemId ? { ...t, owned: true } : t)));
      }
    } catch (_err) {
      void _err;
    }
    setActing(null);
  };

  const handleBuy = (itemType: 'wordPack' | 'theme' | 'soundPack', itemId: string) => {
    if (!isAuthenticated) {
      setGameState(GameState.PROFILE);
      return;
    }
    setQuickBuy({ itemType, itemId });
  };

  const featurePacks = wordPacks.filter((p) => p.category === 'Feature');
  const visiblePacks = wordPacks
    .filter((p) => p.category !== 'Feature' && (langFilter === 'ALL' || p.language === langFilter))
    .sort((a, b) => {
      if (a.isFree && !b.isFree) return -1;
      if (!a.isFree && b.isFree) return 1;
      return a.name.localeCompare(b.name);
    });

  const TAB_LABELS: Record<StoreTab, string> = { packs: 'Набори слів', themes: 'Теми' };
  const cardBg = 'bg-ui-card border border-ui-border';
  const divider = 'border-ui-border';
  const chipBase = 'border border-ui-border text-ui-fg-muted bg-ui-surface';
  const chipActive =
    'border-ui-accent text-ui-accent bg-[color-mix(in_srgb,var(--ui-accent)_12%,transparent)]';

  return (
    <div className="flex flex-col h-screen items-center bg-ui-bg transition-colors duration-500">
      <div className="max-w-2xl w-full flex-1 flex flex-col overflow-hidden">
        {banner && (
          <div
            className={`mx-6 md:mx-8 mt-3 mb-0 px-4 py-3 rounded-2xl flex items-center gap-3 transition-all shrink-0 border ${banner === 'success' ? 'bg-[color-mix(in_srgb,var(--ui-success)_16%,transparent)] border-[color-mix(in_srgb,var(--ui-success)_30%,transparent)]' : 'bg-[color-mix(in_srgb,var(--ui-danger)_12%,transparent)] border-[color-mix(in_srgb,var(--ui-danger)_25%,transparent)]'}`}
          >
            <span className="text-xl">{banner === 'success' ? '🎉' : '↩️'}</span>
            <div className="flex-1">
              <p
                className={`text-[12px] font-bold ${banner === 'success' ? 'text-ui-success' : 'text-ui-danger'}`}
              >
                {banner === 'success' ? 'Оплату прийнято!' : 'Оплату скасовано'}
              </p>
              <p className="text-[10px] text-ui-fg-muted opacity-80">
                {banner === 'success' ? 'Ваша покупка активована' : 'Спробуй ще раз'}
              </p>
            </div>
            <button onClick={() => setBanner(null)} className="opacity-40 hover:opacity-100">
              <X size={14} className={currentTheme.iconColor} />
            </button>
          </div>
        )}

        <div className="flex justify-center pt-4 pb-2 shrink-0">
          <div className="w-12 h-1 bg-ui-border rounded-full" />
        </div>
        <div className="px-6 md:px-8 pb-4 pt-2 flex justify-between items-center shrink-0">
          <h2 className={`font-serif text-3xl tracking-wide ${currentTheme.textMain}`}>Магазин</h2>
          <button
            onClick={() => setGameState(GameState.PROFILE)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-ui-surface hover:bg-ui-surface-hover border border-ui-border"
          >
            <X size={16} className={`${currentTheme.iconColor} opacity-70`} />
          </button>
        </div>

        <div className={`px-6 md:px-8 border-b ${divider} shrink-0`}>
          <div className="flex space-x-8">
            {STORE_TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-3 border-b-2 font-sans font-bold text-[11px] tracking-wider uppercase transition-all duration-200 ease-out active:scale-[0.99] ${tab === t ? 'border-ui-accent text-ui-accent' : 'border-transparent text-ui-fg-muted'}`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {tab === 'packs' && (
          <div
            className="px-6 md:px-8 pt-4 pb-2 flex gap-2 overflow-x-auto shrink-0"
            style={{ scrollbarWidth: 'none' }}
          >
            {LANG_FILTERS.map((lang) => (
              <button
                key={lang}
                onClick={() => setLangFilter(lang)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wide transition-all ${langFilter === lang ? chipActive : chipBase}`}
              >
                {LANG_FULL[lang]}
              </button>
            ))}
          </div>
        )}

        <div
          className="flex-1 overflow-y-auto px-6 md:px-8 py-4 space-y-4 pb-20 min-h-0"
          style={{ scrollbarWidth: 'none' }}
        >
          {loading ? (
            <div className="flex justify-center pt-16">
              <Loader2 size={24} className={`animate-spin ${currentTheme.iconColor} opacity-40`} />
            </div>
          ) : tab === 'packs' ? (
            <>
              {featurePacks.map((pack) => (
                <div
                  key={pack.id}
                  className={`rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden border-2 transition-all duration-200 ease-out active:scale-95 ${pack.owned ? 'bg-[color-mix(in_srgb,var(--ui-success)_12%,transparent)] border-[color-mix(in_srgb,var(--ui-success)_30%,transparent)]' : 'border-[color-mix(in_srgb,var(--ui-accent)_40%,transparent)] bg-linear-to-br from-[color-mix(in_srgb,var(--ui-accent)_10%,transparent)] to-transparent'}`}
                >
                  <div className="flex justify-between items-start z-10">
                    <div className="max-w-[60%]">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] font-bold border rounded px-1.5 py-0.5 border-[color-mix(in_srgb,var(--ui-accent)_40%,transparent)] text-ui-accent">
                          ФУНКЦІЯ
                        </span>
                      </div>
                      <h3
                        className={`font-serif text-[18px] leading-tight mb-1 ${currentTheme.textMain}`}
                      >
                        {pack.name}
                      </h3>
                      <p className={`text-[11px] font-sans ${currentTheme.textSecondary}`}>
                        {pack.description}
                      </p>
                    </div>
                    {pack.owned ? (
                      <div className="flex items-center gap-1 px-3 py-1 rounded-full shrink-0 bg-[color-mix(in_srgb,var(--ui-success)_14%,transparent)] border border-[color-mix(in_srgb,var(--ui-success)_25%,transparent)]">
                        <Check size={11} className="text-ui-success" />
                        <span className="text-[10px] font-bold uppercase tracking-wide text-ui-success">
                          Куплено
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleBuy('wordPack', pack.id)}
                        disabled={acting === pack.id}
                        className="shrink-0 bg-ui-accent hover:brightness-110 active:scale-95 text-ui-accent-contrast px-5 py-2 rounded-full font-bold text-[12px] shadow-lg min-w-[90px] disabled:opacity-50"
                      >
                        {acting === pack.id ? (
                          <Loader2 size={12} className="animate-spin inline" />
                        ) : (
                          `$${(pack.price / 100).toFixed(2)}`
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {visiblePacks.length === 0 ? (
                <p className={`text-center text-sm pt-12 ${currentTheme.textSecondary} opacity-40`}>
                  Немає доступних наборів
                </p>
              ) : (
                visiblePacks.map((pack) => (
                  <div
                    key={pack.id}
                    className={`${cardBg} rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden transition-all duration-150 ease-out active:scale-95`}
                  >
                    <div className="flex justify-between items-start z-10">
                      <div className="max-w-[60%]">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[9px] font-bold border rounded px-1.5 py-0.5 border-ui-border text-ui-fg-muted">
                            {LANG_LABEL[pack.language] ?? pack.language}
                          </span>
                          <span className="text-[9px] font-bold border rounded px-1.5 py-0.5 border-ui-border text-ui-fg-muted">
                            {pack.difficulty.toUpperCase()}
                          </span>
                        </div>
                        <h3
                          className={`font-serif text-[18px] leading-tight mb-1 ${currentTheme.textMain}`}
                        >
                          {pack.name}
                        </h3>
                        <p className={`text-[11px] font-sans ${currentTheme.textSecondary}`}>
                          {pack.wordCount} слів{pack.description ? ` • ${pack.description}` : ''}
                        </p>
                      </div>
                      {pack.owned ? (
                        <div
                          className={`flex items-center gap-1 px-3 py-1 rounded-full shrink-0 border ${pack.isFree ? 'bg-[color-mix(in_srgb,var(--ui-accent)_12%,transparent)] border-[color-mix(in_srgb,var(--ui-accent)_22%,transparent)]' : 'bg-[color-mix(in_srgb,var(--ui-success)_14%,transparent)] border-[color-mix(in_srgb,var(--ui-success)_25%,transparent)]'}`}
                        >
                          <Check
                            size={11}
                            className={pack.isFree ? 'text-ui-accent' : 'text-ui-success'}
                          />
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wide ${pack.isFree ? 'text-ui-accent' : 'text-ui-success'}`}
                          >
                            {pack.isFree ? 'Додано' : 'Куплено'}
                          </span>
                        </div>
                      ) : pack.isFree ? (
                        <button
                          onClick={() => handleAddFree('wordPack', pack.id)}
                          disabled={acting === pack.id}
                          className="shrink-0 px-5 py-2 rounded-full font-bold text-[12px] transition-all active:scale-95 disabled:opacity-50 bg-ui-surface hover:bg-ui-surface-hover text-ui-fg border border-ui-border"
                        >
                          {acting === pack.id ? (
                            <Loader2 size={12} className="animate-spin inline" />
                          ) : (
                            '+ Додати'
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBuy('wordPack', pack.id)}
                          disabled={acting === pack.id}
                          className="shrink-0 bg-ui-accent hover:brightness-110 active:scale-95 transition-all text-ui-accent-contrast px-5 py-2 rounded-full font-bold text-[12px] shadow-lg min-w-[90px] disabled:opacity-50"
                        >
                          {acting === pack.id ? (
                            <Loader2 size={12} className="animate-spin inline" />
                          ) : (
                            `$${(pack.price / 100).toFixed(2)}`
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          ) : themes.length === 0 ? (
            <div
              className={`${cardBg} rounded-2xl px-6 py-12 flex flex-col items-center gap-3 mt-2`}
            >
              <p
                className={`text-[12px] font-sans text-center ${currentTheme.textSecondary} opacity-40`}
              >
                Теми незабаром
              </p>
            </div>
          ) : (
            <>
              {themes.map((theme) => {
                const cfg = theme.config as {
                  preview?: { bg: string; accent: string };
                  fonts?: { heading: string };
                };
                const previewBg = cfg.preview?.bg ?? '#1A1A1A';
                const previewAccent = cfg.preview?.accent ?? '#F3E5AB';
                const fontName = cfg.fonts?.heading?.match(/^'?([^']+)/)?.[1] ?? 'Default';
                const isBuiltIn = theme.slug === 'premium-dark' || theme.slug === 'premium-light';
                const alreadyOwned = theme.owned || isBuiltIn;
                return (
                  <div key={theme.id} className={`${cardBg} rounded-2xl overflow-hidden`}>
                    <div className="flex items-stretch">
                      <div
                        className="w-20 shrink-0 flex flex-col items-center justify-center gap-1.5 p-3"
                        style={{ background: previewBg }}
                      >
                        <div
                          className="w-5 h-5 rounded-full"
                          style={{ background: previewAccent }}
                        />
                        <div
                          className="w-8 h-1 rounded-full opacity-40"
                          style={{ background: previewAccent }}
                        />
                        <div
                          className="w-6 h-1 rounded-full opacity-25"
                          style={{ background: previewAccent }}
                        />
                      </div>
                      <div className="flex-1 p-4 flex flex-col justify-center gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`font-serif text-[16px] leading-tight ${currentTheme.textMain}`}
                          >
                            {theme.name}
                          </p>
                          {theme.isFree && !isBuiltIn && (
                            <span className="text-[8px] font-bold tracking-[0.15em] uppercase px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--ui-accent)_12%,transparent)] text-ui-accent border border-[color-mix(in_srgb,var(--ui-accent)_25%,transparent)]">
                              FREE
                            </span>
                          )}
                          {isBuiltIn && (
                            <span className="text-[8px] font-bold tracking-[0.15em] uppercase px-1.5 py-0.5 rounded bg-ui-surface text-ui-fg-muted border border-ui-border">
                              БАЗОВА
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-[11px] font-sans ${currentTheme.textSecondary} opacity-70`}
                        >
                          {fontName}
                        </p>
                      </div>
                      <div className="px-3 flex items-center shrink-0">
                        {alreadyOwned ? (
                          <div
                            className={`flex items-center gap-1 px-3 py-1 rounded-full border ${isBuiltIn ? 'bg-ui-surface border-ui-border' : 'bg-[color-mix(in_srgb,var(--ui-success)_14%,transparent)] border-[color-mix(in_srgb,var(--ui-success)_25%,transparent)]'}`}
                          >
                            <Check
                              size={10}
                              className={isBuiltIn ? 'text-ui-fg-muted' : 'text-ui-success'}
                            />
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wide ${isBuiltIn ? 'text-ui-fg-muted' : 'text-ui-success'}`}
                            >
                              {isBuiltIn ? 'Стандарт' : 'Отримано'}
                            </span>
                          </div>
                        ) : theme.isFree ? (
                          <button
                            onClick={() => handleAddFree('theme', theme.id)}
                            disabled={acting === theme.id}
                            className="px-4 py-2 rounded-full font-bold text-[11px] transition-all active:scale-95 disabled:opacity-50 bg-ui-surface hover:bg-ui-surface-hover text-ui-accent border border-ui-border"
                          >
                            {acting === theme.id ? (
                              <Loader2 size={11} className="animate-spin inline" />
                            ) : (
                              'Отримати'
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBuy('theme', theme.id)}
                            disabled={acting === theme.id}
                            className="bg-ui-accent hover:brightness-110 active:scale-95 text-ui-accent-contrast px-4 py-2 rounded-full font-bold text-[11px] shadow-lg disabled:opacity-50"
                          >
                            {acting === theme.id ? (
                              <Loader2 size={11} className="animate-spin inline" />
                            ) : (
                              `$${(theme.price / 100).toFixed(2)}`
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div className="px-6 md:px-8 pt-4 pb-safe-bottom-sm border-t border-ui-border bg-[color-mix(in_srgb,var(--ui-bg)_92%,transparent)] backdrop-blur shrink-0">
          <div className="flex items-center justify-center gap-1.5">
            <ShieldCheck size={12} className="text-ui-fg-muted opacity-70" />
            <p className="text-[10px] uppercase tracking-widest text-ui-fg-muted opacity-70">
              Оплата через Stripe · Безпечно
            </p>
          </div>
        </div>

        {quickBuy && (
          <QuickBuyModal
            itemType={quickBuy.itemType}
            itemId={quickBuy.itemId}
            isDark={currentTheme.isDark}
            onClose={() => setQuickBuy(null)}
            onSuccess={() => {
              setQuickBuy(null);
              setBanner('success');
              loadStore();
              const t = setTimeout(() => setBanner(null), 4000);
              return () => clearTimeout(t);
            }}
          />
        )}
      </div>
    </div>
  );
};
