import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ShoppingBag,
  BookOpen,
  Palette,
  Music,
  Check,
  Loader2,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { LoginModal } from '../Auth/LoginModal';
import { bottomSheetBackdropClass, bottomSheetPanelClass } from '../Shared';
import {
  fetchStore,
  createCheckout,
  type StoreData,
  type WordPackItem,
  type ThemeItem,
  type SoundPackItem,
} from '../../services/api';

interface StoreModalProps {
  onClose: () => void;
}

type TabId = 'packs' | 'themes' | 'sounds';

const LANG_FLAGS: Record<string, string> = { UA: '🇺🇦', EN: '🇬🇧', DE: '🇩🇪' };
const DIFF_LABELS: Record<string, string> = {
  easy: 'Легко',
  medium: 'Середньо',
  hard: 'Важко',
  '18+': '18+',
  mixed: 'Змішано',
};

function formatPrice(cents: number): string {
  if (cents === 0) return 'Безкоштовно';
  return `$${(cents / 100).toFixed(2)}`;
}

// ─── Word Pack Card ────────────────────────────────────────────────────
function PackCard({
  pack,
  onBuy,
  buying,
}: {
  pack: WordPackItem;
  onBuy: (id: string) => void;
  buying: string | null;
}) {
  return (
    <div className="bg-(--ui-surface) border border-(--ui-border) rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{LANG_FLAGS[pack.language] || '🌐'}</span>
            <span className="font-semibold text-(--ui-fg) text-sm">
              {pack.name.replace(/🇺🇦|🇬🇧|🇩🇪/g, '').trim()}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-(--ui-fg-muted) uppercase tracking-wider">
              {pack.category}
            </span>
            <span className="text-(--ui-fg-muted)">·</span>
            <span className="text-[10px] text-(--ui-fg-muted)">{pack.wordCount} слів</span>
            {pack.difficulty !== 'mixed' && (
              <>
                <span className="text-(--ui-fg-muted)">·</span>
                <span className="text-[10px] text-(--ui-fg-muted)">
                  {DIFF_LABELS[pack.difficulty] || pack.difficulty}
                </span>
              </>
            )}
          </div>
        </div>

        {pack.owned ? (
          <div className="flex items-center gap-1.5 text-(--ui-success) shrink-0">
            <Check size={14} />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Куплено</span>
          </div>
        ) : (
          <button
            onClick={() => onBuy(pack.id)}
            disabled={buying !== null}
            className="shrink-0 h-8 px-3 rounded-full bg-(--ui-accent) hover:bg-(--ui-accent-hover) active:bg-(--ui-accent-pressed) text-(--ui-accent-contrast) text-xs font-bold tracking-wider disabled:opacity-50 flex items-center gap-1.5 transition-all duration-150 ease-out active:scale-95"
          >
            {buying === pack.id ? <Loader2 size={12} className="animate-spin" /> : null}
            {pack.isFree ? 'Отримати' : formatPrice(pack.price)}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Theme Card ─────────────────────────────────────────────────────────
function ThemeCard({
  theme,
  onBuy,
  buying,
}: {
  theme: ThemeItem;
  onBuy: (id: string) => void;
  buying: string | null;
}) {
  const cfg = theme.config as Record<string, string>;
  return (
    <div
      className={`border border-(--ui-border) rounded-2xl p-4 flex items-center justify-between gap-3 ${cfg.bg || 'bg-(--ui-surface)'}`}
    >
      <div>
        <p className="font-semibold text-(--ui-fg) text-sm">{theme.name}</p>
        <p className="text-[10px] text-(--ui-fg-muted) mt-0.5">Тема оформлення</p>
      </div>
      {theme.owned ? (
        <div className="flex items-center gap-1.5 text-(--ui-success) shrink-0">
          <Check size={14} />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Активна</span>
        </div>
      ) : (
        <button
          onClick={() => onBuy(theme.id)}
          disabled={buying !== null}
          className="shrink-0 h-8 px-3 rounded-full bg-(--ui-surface) hover:bg-(--ui-surface-hover) text-(--ui-fg) text-xs font-bold tracking-wider disabled:opacity-50 flex items-center gap-1.5 transition-all duration-150 ease-out active:scale-95"
        >
          {buying === theme.id ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Lock size={12} />
          )}
          {theme.isFree ? 'Отримати' : formatPrice(theme.price)}
        </button>
      )}
    </div>
  );
}

// ─── Sound Pack Card ────────────────────────────────────────────────────
function SoundCard({
  sp,
  onBuy,
  buying,
}: {
  sp: SoundPackItem;
  onBuy: (id: string) => void;
  buying: string | null;
}) {
  return (
    <div className="bg-(--ui-surface) border border-(--ui-border) rounded-2xl p-4 flex items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <Music size={14} className="text-(--ui-accent)" />
          <span className="font-semibold text-(--ui-fg) text-sm">{sp.name}</span>
        </div>
        <p className="text-[10px] text-(--ui-fg-muted) mt-0.5">Звуковий пресет</p>
      </div>
      {sp.owned ? (
        <div className="flex items-center gap-1.5 text-(--ui-success) shrink-0">
          <Check size={14} />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Куплено</span>
        </div>
      ) : (
        <button
          onClick={() => onBuy(sp.id)}
          disabled={buying !== null}
          className="shrink-0 h-8 px-3 rounded-full bg-(--ui-accent) hover:bg-(--ui-accent-hover) active:bg-(--ui-accent-pressed) text-(--ui-accent-contrast) text-xs font-bold tracking-wider disabled:opacity-50 flex items-center gap-1.5 transition-all duration-150 ease-out active:scale-95"
        >
          {buying === sp.id ? <Loader2 size={12} className="animate-spin" /> : null}
          {sp.isFree ? 'Отримати' : formatPrice(sp.price)}
        </button>
      )}
    </div>
  );
}

// ─── Main StoreModal ────────────────────────────────────────────────────
export function StoreModal({ onClose }: StoreModalProps) {
  const { isAuthenticated } = useAuthContext();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('packs');
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [pendingBuyId, setPendingBuyId] = useState<{
    itemType: 'wordPack' | 'theme' | 'soundPack';
    id: string;
  } | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setSheetOpen(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const requestClose = useCallback(() => {
    setSheetOpen(false);
    setTimeout(onClose, 280);
  }, [onClose]);

  const loadStore = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchStore();
      setStoreData(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStore();
  }, [loadStore]);

  const handleBuy = useCallback(
    async (itemType: 'wordPack' | 'theme' | 'soundPack', itemId: string) => {
      if (!isAuthenticated) {
        setPendingBuyId({ itemType, id: itemId });
        setShowLogin(true);
        return;
      }

      setBuying(itemId);
      try {
        const { checkoutUrl } = await createCheckout(itemType, itemId);
        window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
      } catch (e) {
        console.error('Checkout error:', e);
      } finally {
        setBuying(null);
      }
    },
    [isAuthenticated]
  );

  // After login, re-load store and proceed with pending purchase
  const handleLoginSuccess = useCallback(async () => {
    await loadStore();
    if (pendingBuyId) {
      const { itemType, id } = pendingBuyId;
      setPendingBuyId(null);
      handleBuy(itemType, id);
    }
  }, [pendingBuyId, loadStore, handleBuy]);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'packs', label: 'Словники', icon: <BookOpen size={15} /> },
    { id: 'themes', label: 'Теми', icon: <Palette size={15} /> },
    { id: 'sounds', label: 'Звуки', icon: <Music size={15} /> },
  ];

  // Group word packs by language
  const packsByLang: Record<string, WordPackItem[]> = {};
  storeData?.wordPacks.forEach((p) => {
    if (!packsByLang[p.language]) packsByLang[p.language] = [];
    packsByLang[p.language].push(p);
  });

  return (
    <>
      <div
        className={bottomSheetBackdropClass(sheetOpen, 'z-50')}
        onClick={requestClose}
        role="presentation"
      >
        <div
          className={bottomSheetPanelClass(
            sheetOpen,
            'flex max-h-[92dvh] flex-col min-h-0 max-w-lg!'
          )}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Магазин"
        >
          <div className="flex justify-center pt-2 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-(--ui-border)" aria-hidden />
          </div>
          {/* Header */}
          <div className="shrink-0 px-5 pt-3 pb-4 border-b border-(--ui-border)">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-(--ui-surface) border border-(--ui-border)">
                  <ShoppingBag size={20} className="text-(--ui-accent)" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-(--ui-fg)">Магазин</h1>
                  <p className="text-xs text-(--ui-fg-muted)">Додаткові словники, теми та звуки</p>
                </div>
              </div>
              <button
                onClick={requestClose}
                className="p-2 rounded-xl text-(--ui-fg-muted) hover:text-(--ui-fg) hover:bg-(--ui-surface-hover) transition-all duration-150 ease-out active:scale-95"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4 p-1 bg-(--ui-surface) border border-(--ui-border) rounded-xl">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-semibold tracking-wider transition-all duration-150 ease-out active:scale-95 ${
                    activeTab === tab.id
                      ? 'bg-(--ui-accent) text-(--ui-accent-contrast)'
                      : 'text-(--ui-fg-muted) hover:text-(--ui-fg)'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 size={24} className="animate-spin text-(--ui-accent)" />
              </div>
            ) : !storeData ? (
              <div className="text-center py-12 text-(--ui-fg-muted)">
                <p className="text-sm">Не вдалося завантажити магазин</p>
                <button
                  onClick={loadStore}
                  className="mt-3 text-(--ui-accent) text-xs hover:text-(--ui-accent-hover)"
                >
                  Спробувати знову
                </button>
              </div>
            ) : (
              <>
                {/* Word Packs */}
                {activeTab === 'packs' && (
                  <div className="space-y-6">
                    {Object.entries(packsByLang).map(([lang, packs]) => (
                      <div key={lang}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-base">{LANG_FLAGS[lang] || '🌐'}</span>
                          <span className="text-xs font-bold uppercase tracking-widest text-(--ui-fg-muted)">
                            {lang === 'UA' ? 'Українська' : lang === 'EN' ? 'English' : 'Deutsch'}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {packs.map((p) => (
                            <PackCard
                              key={p.id}
                              pack={p}
                              onBuy={(id) => handleBuy('wordPack', id)}
                              buying={buying}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Themes */}
                {activeTab === 'themes' && (
                  <div className="space-y-2">
                    {storeData.themes.map((t) => (
                      <ThemeCard
                        key={t.id}
                        theme={t}
                        onBuy={(id) => handleBuy('theme', id)}
                        buying={buying}
                      />
                    ))}
                  </div>
                )}

                {/* Sound Packs */}
                {activeTab === 'sounds' && (
                  <div className="space-y-2">
                    {storeData.soundPacks.map((s) => (
                      <SoundCard
                        key={s.id}
                        sp={s}
                        onBuy={(id) => handleBuy('soundPack', id)}
                        buying={buying}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer note */}
          <div className="shrink-0 px-5 py-3 border-t border-(--ui-border)">
            <div className="flex items-center justify-center gap-1.5 text-(--ui-fg-muted) text-[10px]">
              <ExternalLink size={10} />
              <span>Оплата через Stripe — безпечно та швидко</span>
            </div>
          </div>
        </div>
      </div>

      {showLogin && (
        <LoginModal
          onClose={() => {
            setShowLogin(false);
            setPendingBuyId(null);
          }}
          onSuccess={handleLoginSuccess}
        />
      )}
    </>
  );
}
