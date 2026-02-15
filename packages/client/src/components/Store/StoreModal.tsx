import React, { useState, useEffect, useCallback } from 'react';
import { X, ShoppingBag, BookOpen, Palette, Music, Check, Loader2, Lock, ExternalLink } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { LoginModal } from '../Auth/LoginModal';
import { fetchStore, createCheckout, type StoreData, type WordPackItem, type ThemeItem, type SoundPackItem } from '../../services/api';

interface StoreModalProps {
  onClose: () => void;
}

type TabId = 'packs' | 'themes' | 'sounds';

const LANG_FLAGS: Record<string, string> = { UA: '🇺🇦', EN: '🇬🇧', DE: '🇩🇪' };
const DIFF_LABELS: Record<string, string> = {
  easy: 'Легко', medium: 'Середньо', hard: 'Важко', '18+': '18+', mixed: 'Змішано',
};

function formatPrice(cents: number): string {
  if (cents === 0) return 'Безкоштовно';
  return `$${(cents / 100).toFixed(2)}`;
}

// ─── Word Pack Card ────────────────────────────────────────────────────
function PackCard({ pack, onBuy, buying }: {
  pack: WordPackItem;
  onBuy: (id: string) => void;
  buying: string | null;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{LANG_FLAGS[pack.language] || '🌐'}</span>
            <span className="font-semibold text-white text-sm">{pack.name.replace(/🇺🇦|🇬🇧|🇩🇪/g, '').trim()}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">{pack.category}</span>
            <span className="text-slate-600">·</span>
            <span className="text-[10px] text-slate-400">{pack.wordCount} слів</span>
            {pack.difficulty !== 'mixed' && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-[10px] text-slate-400">{DIFF_LABELS[pack.difficulty] || pack.difficulty}</span>
              </>
            )}
          </div>
        </div>

        {pack.owned ? (
          <div className="flex items-center gap-1.5 text-emerald-400 shrink-0">
            <Check size={14} />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Куплено</span>
          </div>
        ) : (
          <button
            onClick={() => onBuy(pack.id)}
            disabled={buying !== null}
            className="shrink-0 h-8 px-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold tracking-wider disabled:opacity-50 flex items-center gap-1.5 transition-colors"
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
function ThemeCard({ theme, onBuy, buying }: {
  theme: ThemeItem;
  onBuy: (id: string) => void;
  buying: string | null;
}) {
  const cfg = theme.config as Record<string, string>;
  return (
    <div className={`border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3 ${cfg.bg || 'bg-white/5'}`}>
      <div>
        <p className="font-semibold text-white text-sm">{theme.name}</p>
        <p className="text-[10px] text-white/50 mt-0.5">Тема оформлення</p>
      </div>
      {theme.owned ? (
        <div className="flex items-center gap-1.5 text-emerald-400 shrink-0">
          <Check size={14} />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Активна</span>
        </div>
      ) : (
        <button
          onClick={() => onBuy(theme.id)}
          disabled={buying !== null}
          className="shrink-0 h-8 px-3 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold tracking-wider disabled:opacity-50 flex items-center gap-1.5 transition-colors"
        >
          {buying === theme.id ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />}
          {theme.isFree ? 'Отримати' : formatPrice(theme.price)}
        </button>
      )}
    </div>
  );
}

// ─── Sound Pack Card ────────────────────────────────────────────────────
function SoundCard({ sp, onBuy, buying }: {
  sp: SoundPackItem;
  onBuy: (id: string) => void;
  buying: string | null;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <Music size={14} className="text-indigo-400" />
          <span className="font-semibold text-white text-sm">{sp.name}</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5">Звуковий пресет</p>
      </div>
      {sp.owned ? (
        <div className="flex items-center gap-1.5 text-emerald-400 shrink-0">
          <Check size={14} />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Куплено</span>
        </div>
      ) : (
        <button
          onClick={() => onBuy(sp.id)}
          disabled={buying !== null}
          className="shrink-0 h-8 px-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold tracking-wider disabled:opacity-50 flex items-center gap-1.5 transition-colors"
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
  const [activeTab, setActiveTab] = useState<TabId>('packs');
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [pendingBuyId, setPendingBuyId] = useState<{ itemType: 'wordPack' | 'theme' | 'soundPack'; id: string } | null>(null);

  const loadStore = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchStore();
      setStoreData(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStore(); }, [loadStore]);

  // After login, re-load store and proceed with pending purchase
  const handleLoginSuccess = useCallback(async () => {
    await loadStore();
    if (pendingBuyId) {
      const { itemType, id } = pendingBuyId;
      setPendingBuyId(null);
      handleBuy(itemType, id);
    }
  }, [pendingBuyId, loadStore]);

  const handleBuy = useCallback(async (itemType: 'wordPack' | 'theme' | 'soundPack', itemId: string) => {
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
  }, [isAuthenticated]);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'packs', label: 'Словники', icon: <BookOpen size={15} /> },
    { id: 'themes', label: 'Теми', icon: <Palette size={15} /> },
    { id: 'sounds', label: 'Звуки', icon: <Music size={15} /> },
  ];

  // Group word packs by language
  const packsByLang: Record<string, WordPackItem[]> = {};
  storeData?.wordPacks.forEach(p => {
    if (!packsByLang[p.language]) packsByLang[p.language] = [];
    packsByLang[p.language].push(p);
  });

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-12 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/20">
                <ShoppingBag size={20} className="text-indigo-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Магазин</h1>
                <p className="text-xs text-slate-400">Додаткові словники, теми та звуки</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 p-1 bg-white/5 rounded-xl">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-semibold tracking-wider transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
            </div>
          ) : !storeData ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm">Не вдалося завантажити магазин</p>
              <button onClick={loadStore} className="mt-3 text-indigo-400 text-xs hover:text-indigo-300">Спробувати знову</button>
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
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                          {lang === 'UA' ? 'Українська' : lang === 'EN' ? 'English' : 'Deutsch'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {packs.map(p => (
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
                  {storeData.themes.map(t => (
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
                  {storeData.soundPacks.map(s => (
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
        <div className="flex-shrink-0 px-5 py-3 border-t border-white/5">
          <div className="flex items-center justify-center gap-1.5 text-slate-500 text-[10px]">
            <ExternalLink size={10} />
            <span>Оплата через Stripe — безпечно та швидко</span>
          </div>
        </div>
      </div>

      {showLogin && (
        <LoginModal
          onClose={() => { setShowLogin(false); setPendingBuyId(null); }}
          onSuccess={handleLoginSuccess}
        />
      )}
    </>
  );
}
