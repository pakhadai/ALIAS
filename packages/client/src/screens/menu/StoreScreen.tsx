import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Check, ShieldCheck, Loader2 } from 'lucide-react';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import { useAuthContext } from '../../context/AuthContext';
import { useAppLogin } from '../../context/AppLoginContext';
import { fetchStore, claimFreeItem, type WordPackItem, type ThemeItem } from '../../services/api';
import { QuickBuyModal } from '../../components/Store/QuickBuyModal';
import { Button } from '../../components/Button';
import { SettingsChip } from '../../components/Settings';
import { settingsChipLabelClass } from '../../components/Settings/settingsChipStyles';
import { AppHeader, FixedBottomBar, ScreenShell } from '../../components/layout';
import { ScreenTitle } from '../../components/typography/ScreenTitle';
import { footerIslandClassName } from '../../constants/footerLayout';
import { SURFACE_CARD_CLASS } from '../../constants/surfaceClasses';
import { typographyClass } from '../../constants/typography';
import { HEADER_ROW_MIN_PX } from '../../constants/tmaLayoutConstants';
import { useT } from '../../hooks/useT';

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

const TAB_LABELS: Record<StoreTab, string> = { packs: 'Набори слів', themes: 'Теми' };

export const StoreScreen = () => {
  const { setGameState, currentTheme, showNotification } = useGame();
  const { isAuthenticated } = useAuthContext();
  const { requestLogin } = useAppLogin();
  const t = useT();

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
      const timer = setTimeout(() => setBanner(null), 4000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [loadStore, purchaseResult]);

  const goBack = () => setGameState(GameState.MENU);

  const storeMenuItems = useMemo(
    () => [
      { id: '1', label: 'Пункт 1', onSelect: () => console.log('store menu: item 1') },
      { id: '2', label: 'Пункт 2', onSelect: () => console.log('store menu: item 2') },
      { id: '3', label: 'Пункт 3', onSelect: () => console.log('store menu: item 3') },
      { id: '4', label: 'Пункт 4', onSelect: () => console.log('store menu: item 4') },
    ],
    []
  );

  const redirectGuestToProfile = () => {
    showNotification(t.storeAuthRequiredToast, 'info');
    setGameState(GameState.PROFILE);
    requestLogin();
  };

  const handleAddFree = async (itemType: 'wordPack' | 'theme', itemId: string) => {
    if (!isAuthenticated) {
      redirectGuestToProfile();
      return;
    }
    setActing(itemId);
    try {
      await claimFreeItem(itemType, itemId);
      if (itemType === 'wordPack') {
        setWordPacks((prev) => prev.map((p) => (p.id === itemId ? { ...p, owned: true } : p)));
      } else {
        setThemes((prev) => prev.map((th) => (th.id === itemId ? { ...th, owned: true } : th)));
      }
    } catch (_err) {
      void _err;
    }
    setActing(null);
  };

  const handleBuy = (itemType: 'wordPack' | 'theme' | 'soundPack', itemId: string) => {
    if (!isAuthenticated) {
      redirectGuestToProfile();
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

  const cardShell = SURFACE_CARD_CLASS;
  const divider = 'border-ui-border';
  const storeTabItems = STORE_TABS.map((id) => ({ id, label: TAB_LABELS[id] }));

  return (
    <ScreenShell
      className="bg-ui-bg transition-colors duration-500"
      layout="canonical"
      headerFixed
      footerFixed
      header={
        <AppHeader
          fixed
          title={<ScreenTitle>Магазин</ScreenTitle>}
          onBack={goBack}
          menuItems={storeMenuItems}
          childRowHeightPx={HEADER_ROW_MIN_PX}
        >
          <div className={`w-full border-b ${divider} pb-3`}>
            <div className="grid grid-cols-2 gap-2" role="tablist">
              {storeTabItems.map(({ id, label }) => (
                <SettingsChip
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  active={tab === id}
                  size="tab"
                  variant="tint"
                  onClick={() => setTab(id)}
                >
                  <span className={settingsChipLabelClass}>{label}</span>
                </SettingsChip>
              ))}
            </div>
          </div>
        </AppHeader>
      }
      footer={
        <FixedBottomBar island contentClassName={footerIslandClassName('canonical')}>
          <div className="flex items-center justify-center gap-1.5 border-t border-ui-border pt-4">
            <ShieldCheck size={12} className="text-ui-fg-muted opacity-70" aria-hidden />
            <p className={`${typographyClass.label} tracking-widest text-ui-fg-muted opacity-70`}>
              Оплата через Stripe · Безпечно
            </p>
          </div>
        </FixedBottomBar>
      }
    >
      {banner && (
        <div
          className={`mt-3 mb-0 px-4 py-3 rounded-2xl flex items-center gap-3 transition-all shrink-0 border ${banner === 'success' ? 'bg-[color-mix(in_srgb,var(--ui-success)_16%,transparent)] border-[color-mix(in_srgb,var(--ui-success)_30%,transparent)]' : 'bg-[color-mix(in_srgb,var(--ui-danger)_12%,transparent)] border-[color-mix(in_srgb,var(--ui-danger)_25%,transparent)]'}`}
        >
          <span className="text-xl" aria-hidden>
            {banner === 'success' ? '🎉' : '↩️'}
          </span>
          <div className="flex-1 min-w-0">
            <p
              className={`${typographyClass.system} font-bold ${banner === 'success' ? 'text-ui-success' : 'text-ui-danger'}`}
            >
              {banner === 'success' ? 'Оплату прийнято!' : 'Оплату скасовано'}
            </p>
            <p className={`${typographyClass.label} text-ui-fg-muted opacity-80`}>
              {banner === 'success' ? 'Ваша покупка активована' : 'Спробуй ще раз'}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setBanner(null)}
            className="min-h-11 min-w-11 px-0 opacity-40 active:opacity-100"
            aria-label="Закрити"
          >
            <X size={14} className={currentTheme.iconColor} aria-hidden />
          </Button>
        </div>
      )}

      {tab === 'packs' && (
        <div className="pt-4 pb-2 flex gap-2 overflow-x-auto shrink-0 [-ms-overflow-style:none] [scrollbar-width:none]">
          {LANG_FILTERS.map((lang) => (
            <SettingsChip
              key={lang}
              active={langFilter === lang}
              variant="tint"
              size="compact"
              className="shrink-0 normal-case tracking-wide"
              onClick={() => setLangFilter(lang)}
            >
              {LANG_FULL[lang]}
            </SettingsChip>
          ))}
        </div>
      )}

      <div className="py-4 space-y-4">
        {loading ? (
          <div className="flex justify-center pt-16">
            <Loader2 size={24} className={`animate-spin ${currentTheme.iconColor} opacity-40`} />
          </div>
        ) : tab === 'packs' ? (
          <>
            {featurePacks.map((pack) => (
              <div
                key={pack.id}
                className={`${SURFACE_CARD_CLASS} p-5 flex flex-col gap-3 relative overflow-hidden border-2 transition-all duration-200 ease-out active:scale-95 ${pack.owned ? 'bg-[color-mix(in_srgb,var(--ui-success)_12%,transparent)] border-[color-mix(in_srgb,var(--ui-success)_30%,transparent)]' : 'border-[color-mix(in_srgb,var(--ui-accent)_40%,transparent)] bg-linear-to-br from-[color-mix(in_srgb,var(--ui-accent)_10%,transparent)] to-transparent'}`}
              >
                <div className="flex justify-between items-start z-10">
                  <div className="max-w-[60%]">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`${typographyClass.label} border rounded px-1.5 py-0.5 border-[color-mix(in_srgb,var(--ui-accent)_40%,transparent)] text-ui-accent`}
                      >
                        ФУНКЦІЯ
                      </span>
                    </div>
                    <h3
                      className={`font-serif text-lg leading-tight mb-1 ${currentTheme.textMain}`}
                    >
                      {pack.name}
                    </h3>
                    <p
                      className={`${typographyClass.label} font-sans normal-case text-ui-fg-muted`}
                    >
                      {pack.description}
                    </p>
                  </div>
                  {pack.owned ? (
                    <div className="flex items-center gap-1 px-3 py-1 rounded-full shrink-0 bg-[color-mix(in_srgb,var(--ui-success)_14%,transparent)] border border-[color-mix(in_srgb,var(--ui-success)_25%,transparent)]">
                      <Check size={11} className="text-ui-success" aria-hidden />
                      <span className={`${typographyClass.label} tracking-wide text-ui-success`}>
                        Куплено
                      </span>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      volume="cta"
                      size="sm"
                      themeClass={currentTheme.button}
                      onClick={() => handleBuy('wordPack', pack.id)}
                      disabled={acting === pack.id}
                      className="shrink-0 min-w-[90px] font-sans normal-case tracking-normal"
                    >
                      {acting === pack.id ? (
                        <Loader2 size={12} className="animate-spin" aria-hidden />
                      ) : (
                        `$${(pack.price / 100).toFixed(2)}`
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {visiblePacks.length === 0 ? (
              <p
                className={`text-center ${typographyClass.body} pt-12 text-ui-fg-muted opacity-40`}
              >
                Немає доступних наборів
              </p>
            ) : (
              visiblePacks.map((pack) => (
                <div
                  key={pack.id}
                  className={`${cardShell} p-5 flex flex-col gap-3 relative overflow-hidden transition-all duration-150 ease-out active:scale-95`}
                >
                  <div className="flex justify-between items-start z-10">
                    <div className="max-w-[60%]">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`${typographyClass.label} border rounded px-1.5 py-0.5 border-ui-border text-ui-fg-muted`}
                        >
                          {LANG_LABEL[pack.language] ?? pack.language}
                        </span>
                        <span
                          className={`${typographyClass.label} border rounded px-1.5 py-0.5 border-ui-border text-ui-fg-muted`}
                        >
                          {pack.difficulty.toUpperCase()}
                        </span>
                      </div>
                      <h3
                        className={`font-serif text-lg leading-tight mb-1 ${currentTheme.textMain}`}
                      >
                        {pack.name}
                      </h3>
                      <p
                        className={`${typographyClass.label} font-sans normal-case text-ui-fg-muted`}
                      >
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
                          aria-hidden
                        />
                        <span
                          className={`${typographyClass.label} tracking-wide ${pack.isFree ? 'text-ui-accent' : 'text-ui-success'}`}
                        >
                          {pack.isFree ? 'Додано' : 'Куплено'}
                        </span>
                      </div>
                    ) : pack.isFree ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAddFree('wordPack', pack.id)}
                        disabled={acting === pack.id}
                        className="shrink-0 font-sans normal-case tracking-normal"
                      >
                        {acting === pack.id ? (
                          <Loader2 size={12} className="animate-spin" aria-hidden />
                        ) : (
                          '+ Додати'
                        )}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="primary"
                        volume="cta"
                        size="sm"
                        themeClass={currentTheme.button}
                        onClick={() => handleBuy('wordPack', pack.id)}
                        disabled={acting === pack.id}
                        className="shrink-0 min-w-[90px] font-sans normal-case tracking-normal"
                      >
                        {acting === pack.id ? (
                          <Loader2 size={12} className="animate-spin" aria-hidden />
                        ) : (
                          `$${(pack.price / 100).toFixed(2)}`
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </>
        ) : themes.length === 0 ? (
          <div className={`${cardShell} px-6 py-12 flex flex-col items-center gap-3 mt-2`}>
            <p
              className={`${typographyClass.system} font-sans text-center text-ui-fg-muted opacity-40`}
            >
              Теми незабаром
            </p>
          </div>
        ) : (
          themes.map((theme) => {
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
              <div key={theme.id} className={`${cardShell} overflow-hidden`}>
                <div className="flex items-stretch">
                  <div
                    className="w-20 shrink-0 flex flex-col items-center justify-center gap-1.5 p-3"
                    style={{ background: previewBg }}
                  >
                    <div className="w-5 h-5 rounded-full" style={{ background: previewAccent }} />
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
                      <p className={`font-serif text-base leading-tight ${currentTheme.textMain}`}>
                        {theme.name}
                      </p>
                      {theme.isFree && !isBuiltIn && (
                        <span
                          className={`${typographyClass.label} tracking-[0.15em] px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--ui-accent)_12%,transparent)] text-ui-accent border border-[color-mix(in_srgb,var(--ui-accent)_25%,transparent)]`}
                        >
                          FREE
                        </span>
                      )}
                      {isBuiltIn && (
                        <span
                          className={`${typographyClass.label} tracking-[0.15em] px-1.5 py-0.5 rounded bg-ui-surface text-ui-fg-muted border border-ui-border`}
                        >
                          БАЗОВА
                        </span>
                      )}
                    </div>
                    <p
                      className={`${typographyClass.label} font-sans normal-case text-ui-fg-muted opacity-70`}
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
                          aria-hidden
                        />
                        <span
                          className={`${typographyClass.label} uppercase tracking-wide ${isBuiltIn ? 'text-ui-fg-muted' : 'text-ui-success'}`}
                        >
                          {isBuiltIn ? 'Стандарт' : 'Отримано'}
                        </span>
                      </div>
                    ) : theme.isFree ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAddFree('theme', theme.id)}
                        disabled={acting === theme.id}
                        className="font-sans normal-case tracking-normal"
                      >
                        {acting === theme.id ? (
                          <Loader2 size={11} className="animate-spin" aria-hidden />
                        ) : (
                          'Отримати'
                        )}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="primary"
                        volume="cta"
                        size="sm"
                        themeClass={currentTheme.button}
                        onClick={() => handleBuy('theme', theme.id)}
                        disabled={acting === theme.id}
                        className="font-sans normal-case tracking-normal"
                      >
                        {acting === theme.id ? (
                          <Loader2 size={11} className="animate-spin" aria-hidden />
                        ) : (
                          `$${(theme.price / 100).toFixed(2)}`
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
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
            const timer = setTimeout(() => setBanner(null), 4000);
            return () => clearTimeout(timer);
          }}
        />
      )}
    </ScreenShell>
  );
};
