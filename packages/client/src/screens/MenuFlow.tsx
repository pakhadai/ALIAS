
import React, { useState, useRef, useEffect } from 'react';
import { X, AlertCircle, User, ArrowLeft, Check, Loader2, ShoppingBag, Globe, Plus, Trash2, BookOpen, Copy } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Logo } from '../components/Shared';
import { ProfileModal } from '../components/Auth/ProfileModal';
import { GameState, Language, AppTheme } from '../types';
import { useGame, AVATARS } from '../context/GameContext';
import { useAuthContext } from '../context/AuthContext';
import { fetchProfile, fetchStore, createCheckout, claimFreeItem, fetchMyDecks, createCustomDeck, deleteCustomDeck, type UserProfile, type WordPackItem, type ThemeItem, type CustomDeckSummary } from '../services/api';
import { TRANSLATIONS, ROOM_CODE_LENGTH } from '../constants';
import versionData from '../version.json';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Internal Rules Modal Component
const TABS = ['rules', 'logic', 'modes', 'settings'] as const;
type TabId = typeof TABS[number];

const RulesModal = ({ isOpen, onClose, t, currentTheme }: any) => {
  const [isClosing, setIsClosing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('rules');
  if (!isOpen && !isClosing) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setActiveTab('rules');
    }, 300);
  };

  const tabLabels: Record<TabId, string> = {
    rules: t.infoRules,
    logic: t.infoLogic,
    modes: t.infoModes,
    settings: t.infoSettings,
  };

  const renderRules = () => (
    <div className="space-y-5">
      {[t.infoRule1, t.infoRule2, t.infoRule3, t.infoRule4, t.infoRule5, t.infoRule6].map((rule: string, i: number) => (
        <div key={i} className="flex gap-4 items-start">
          <span className={`font-serif text-lg opacity-20 shrink-0 w-5 text-right ${currentTheme.textMain}`}>{i + 1}</span>
          <p className={`text-sm leading-relaxed tracking-wide font-light ${currentTheme.textSecondary}`}>{rule}</p>
        </div>
      ))}
    </div>
  );

  const renderLogic = () => (
    <div className="space-y-6">
      <div>
        <p className={`text-sm leading-relaxed tracking-wide font-light ${currentTheme.textSecondary}`}>{t.infoTurns}</p>
      </div>
      <div>
        <h4 className={`text-sm font-bold mb-2 ${currentTheme.textMain}`}>{t.infoExplainer}</h4>
        <p className={`text-sm leading-relaxed tracking-wide font-light ${currentTheme.textSecondary}`}>{t.infoExplainerDesc}</p>
      </div>
      <div>
        <h4 className={`text-sm font-bold mb-2 ${currentTheme.textMain}`}>{t.info1v1}</h4>
        <p className={`text-sm leading-relaxed tracking-wide font-light ${currentTheme.textSecondary}`}>{t.info1v1Desc}</p>
      </div>
    </div>
  );

  const renderModes = () => (
    <div className="space-y-6">
      <div>
        <h4 className={`text-sm font-bold mb-2 ${currentTheme.textMain}`}>{t.infoOnline}</h4>
        <p className={`text-sm leading-relaxed tracking-wide font-light ${currentTheme.textSecondary}`}>{t.infoOnlineDesc}</p>
      </div>
      <div>
        <h4 className={`text-sm font-bold mb-2 ${currentTheme.textMain}`}>{t.infoOffline}</h4>
        <p className={`text-sm leading-relaxed tracking-wide font-light ${currentTheme.textSecondary}`}>{t.infoOfflineDesc}</p>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-4">
      {[t.infoSettingTime, t.infoSettingScore, t.infoSettingCategories, t.infoSettingPenalty, t.infoSettingTeams, t.infoSettingSound].map((desc: string, i: number) => {
        const [label, ...rest] = desc.split(' — ');
        return (
          <div key={i} className="flex gap-3 items-start">
            <span className={`text-xs opacity-30 mt-0.5 ${currentTheme.textMain}`}>•</span>
            <p className={`text-sm leading-relaxed tracking-wide font-light ${currentTheme.textSecondary}`}>
              <span className={`font-bold ${currentTheme.textMain}`}>{label}</span>
              {rest.length > 0 && <span> — {rest.join(' — ')}</span>}
            </p>
          </div>
        );
      })}
    </div>
  );

  const tabContent: Record<TabId, () => React.ReactNode> = {
    rules: renderRules,
    logic: renderLogic,
    modes: renderModes,
    settings: renderSettings,
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
      <div className={`relative w-full h-full max-w-md flex flex-col ${currentTheme.card} ${isClosing ? 'animate-pop-out' : 'animate-pop-in'}`}
        style={{ maxHeight: '100dvh' }}>
        {/* Header */}
        <div className="shrink-0 px-8 pt-10 pb-4 flex items-center justify-between">
          <h2 className={`text-2xl font-serif ${currentTheme.textMain}`}>{t.rulesTitle}</h2>
          <button onClick={handleClose} className="opacity-40 hover:opacity-100 transition-opacity p-2">
            <X size={22} className={currentTheme.iconColor} />
          </button>
        </div>

        {/* Tabs */}
        <div className="shrink-0 px-6 pb-4 flex gap-2 overflow-x-auto scrollbar-hide">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] whitespace-nowrap transition-all ${
                activeTab === tab
                  ? `${currentTheme.button} shadow-lg`
                  : `opacity-40 hover:opacity-70 ${currentTheme.textMain}`
              }`}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {tabContent[activeTab]()}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-8 pb-8 pt-4">
          <Button themeClass={currentTheme.button} fullWidth onClick={handleClose} size="lg">
            {t.close}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const RulesScreen = () => {
  const { setGameState, settings, currentTheme } = useGame();
  const t = TRANSLATIONS[settings.language];
  return (
    <div className={`flex flex-col min-h-screen ${currentTheme.bg} p-10 justify-center items-center`}>
      <div className={`w-full max-w-sm space-y-10 p-12 rounded-[2.5rem] ${currentTheme.card} overflow-y-auto`} style={{ maxHeight: '85vh' }}>
        <h2 className={`text-3xl font-serif mb-6 text-center ${currentTheme.textMain}`}>{t.infoRules}</h2>
        <div className="space-y-5 mb-8">
          {[t.infoRule1, t.infoRule2, t.infoRule3, t.infoRule4, t.infoRule5, t.infoRule6].map((rule: string, i: number) => (
            <div key={i} className="flex gap-4 items-start">
              <span className={`font-serif text-xl opacity-20 shrink-0 w-5 text-right ${currentTheme.textMain}`}>{i + 1}</span>
              <p className={`text-sm leading-relaxed tracking-wide font-light ${currentTheme.textSecondary}`}>{rule}</p>
            </div>
          ))}
        </div>
        <Button themeClass={currentTheme.button} fullWidth onClick={() => setGameState(GameState.MENU)} size="xl">
          {t.close}
        </Button>
      </div>
    </div>
  );
};

export const MenuScreen = () => {
  const { setGameState, settings, setSettings, currentTheme, createNewRoom, startOfflineGame, connectionError } = useGame();
  const { isAuthenticated } = useAuthContext();
  const [showRules, setShowRules] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const t = TRANSLATIONS[settings.language];

  // After sign-in inside the modal → close it and go to ProfileScreen
  useEffect(() => {
    if (isAuthenticated && showProfile) {
      setShowProfile(false);
      setGameState(GameState.PROFILE);
    }
  }, [isAuthenticated]);

  const handleProfileClick = () => {
    if (isAuthenticated) {
      setGameState(GameState.PROFILE);
    } else {
      setShowProfile(true);
    }
  };

  const toggleTheme = () => {
    setSettings((prev: any) => ({
      ...prev,
      theme: prev.theme === AppTheme.PREMIUM_DARK ? AppTheme.PREMIUM_LIGHT : AppTheme.PREMIUM_DARK
    }));
  };

  const toggleLanguage = () => {
    setSettings((prev: any) => {
        let nextLang;
        if (prev.language === Language.UA) nextLang = Language.DE;
        else if (prev.language === Language.DE) nextLang = Language.EN;
        else nextLang = Language.UA;
        return { ...prev, language: nextLang };
    });
  };

  const toggleFullScreen = () => {
    const doc = document.documentElement as any;
    const docEl = document as any;
    if (!docEl.fullscreenElement) {
      if (doc.requestFullscreen) doc.requestFullscreen();
    } else {
      if (docEl.exitFullscreen) docEl.exitFullscreen();
    }
  };

  return (
    <div className={`flex flex-col h-screen w-full ${currentTheme.bg} transition-colors duration-500 overflow-hidden`}>
      <header className="relative z-10 w-full px-8 pt-12 pb-4 flex justify-end items-center gap-6">
        <button onClick={handleProfileClick} className="transition-all active:scale-90 p-2">
          <User size={22} className={`${currentTheme.iconColor} opacity-50 hover:opacity-100`} />
        </button>
        <button onClick={toggleTheme} className="transition-all active:scale-90 p-2">
          <span className={`material-symbols-outlined !text-[24px] ${currentTheme.iconColor} opacity-50 hover:opacity-100`}>
            {settings.theme === AppTheme.PREMIUM_DARK ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
        <button onClick={() => setShowRules(true)} className="transition-all active:scale-90 p-2">
          <span className={`material-symbols-outlined !text-[24px] ${currentTheme.iconColor} opacity-50 hover:opacity-100`}>menu_book</span>
        </button>
        <button onClick={toggleFullScreen} className="transition-all active:scale-90 p-2">
          <span className={`material-symbols-outlined !text-[24px] ${currentTheme.iconColor} opacity-50 hover:opacity-100`}>fullscreen</span>
        </button>
        <button onClick={toggleLanguage} className={`w-10 h-10 flex items-center justify-center font-sans font-bold text-[9px] tracking-[0.2em] border border-current rounded-full transition-all active:scale-90 ml-2 ${settings.theme === AppTheme.PREMIUM_DARK ? 'text-white/40 border-white/10' : 'text-slate-900/40 border-slate-900/10'}`}>
          {settings.language}
        </button>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-xs mx-auto px-6 pb-20">
        <Logo theme={currentTheme} />

        {connectionError && (
          <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 animate-shake">
            <AlertCircle className="text-red-500" size={20} />
            <p className="text-[10px] uppercase tracking-widest text-red-500 font-bold">Server Error: {connectionError}</p>
          </div>
        )}

        <div className="w-full space-y-6 flex flex-col items-center mt-12 animate-slide-up">
          <button 
            onClick={createNewRoom}
            className={`w-full h-14 ${currentTheme.button} rounded-full flex items-center justify-center transition-all active:scale-[0.98] shadow-2xl`}
          >
            <span className="font-sans font-bold text-[10px] uppercase tracking-[0.4em]">{t.createGame}</span>
          </button>

          <button 
            onClick={() => setGameState(GameState.JOIN_INPUT)}
            className={`w-full h-14 ${settings.theme === AppTheme.PREMIUM_DARK ? 'bg-dark-btn-grey text-white/80' : 'bg-slate-200 text-slate-700'} rounded-full flex items-center justify-center transition-all active:scale-[0.98]`}
          >
            <span className="font-sans font-bold text-[10px] uppercase tracking-[0.4em]">{t.joinGame}</span>
          </button>

          <div className="w-full pt-10 flex flex-col items-center gap-8">
            <div className={`h-[1px] w-12 ${settings.theme === AppTheme.PREMIUM_DARK ? 'bg-white/5' : 'bg-slate-900/5'}`}></div>
            <button 
              onClick={startOfflineGame}
              className="group"
            >
              <span className={`font-sans font-medium text-[9px] uppercase tracking-[0.5em] border-b border-transparent hover:border-current pb-2 transition-all opacity-30 hover:opacity-100 ${currentTheme.textMain}`}>
                {t.playOffline}
              </span>
            </button>
          </div>
        </div>

        {/* App Version */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
          <span className={`font-sans text-[8px] uppercase tracking-widest opacity-20 ${currentTheme.textMain}`}>
            v{versionData.version}
          </span>
        </div>
      </main>

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} t={t} currentTheme={currentTheme} />
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  );
};

export const EnterNameScreen = () => {
    const { setGameState, settings, currentTheme, handleJoin, isHost } = useGame();
    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState(AVATARS[0]);
    const t = TRANSLATIONS[settings.language];

    // Use consistent UUID for all players (host and guests)
    const stableId = useRef(`player-${generateUUID()}`);

    const handleSubmit = () => {
        const sanitized = name.replace(/<[^>]*>/g, '').slice(0, 20);
        if (sanitized.trim()) {
            handleJoin(stableId.current, sanitized.trim(), avatar);
            setGameState(GameState.LOBBY);
        }
    };

    return (
        <div className={`flex flex-col min-h-screen ${currentTheme.bg} p-10 justify-center items-center`}>
            <Logo theme={currentTheme} />
            <div className={`w-full max-w-sm mt-12 space-y-10 p-12 rounded-[2.5rem] ${currentTheme.card}`}>
                <h2 className={`text-2xl font-serif text-center tracking-wide ${currentTheme.textMain}`}>{t.whoAreYou}</h2>
                <input 
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value.replace(/<[^>]*>/g, '').slice(0, 20))}
                    placeholder={t.namePlaceholder}
                    className={`w-full ${settings.theme === AppTheme.PREMIUM_DARK ? 'bg-white/5 border-white/5 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-2xl px-6 py-4 focus:outline-none focus:border-champagne-gold transition-all font-sans font-bold text-center text-sm`}
                />
                <div className="grid grid-cols-4 gap-4">
                    {AVATARS.slice(0, 12).map(a => (
                        <button 
                            key={a} 
                            onClick={() => setAvatar(a)}
                            className={`text-3xl p-3 rounded-2xl transition-all ${avatar === a ? 'bg-champagne-gold/20 scale-110 shadow-lg' : 'hover:bg-white/5 opacity-50 hover:opacity-100'}`}
                        >
                            {a}
                        </button>
                    ))}
                </div>
                <div className="pt-4 space-y-6">
                    <Button themeClass={currentTheme.button} fullWidth size="xl" onClick={handleSubmit} disabled={!name.trim()}>
                        {t.next}
                    </Button>
                    <button onClick={() => setGameState(GameState.MENU)} className={`w-full text-center text-[9px] uppercase tracking-[0.4em] font-bold opacity-30 hover:opacity-100 transition-opacity ${currentTheme.textMain}`}>{t.cancel}</button>
                </div>
            </div>
        </div>
    );
};

export const JoinInputScreen = () => {
    const { setGameState, settings, currentTheme, setRoomCode } = useGame();
    const [code, setCode] = useState('');
    const t = TRANSLATIONS[settings.language];

    const handleJoinRoom = () => {
        if (code.length === ROOM_CODE_LENGTH) {
            setRoomCode(code);
            setGameState(GameState.ENTER_NAME);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/[^0-9]/g, '');
        if (val.length <= ROOM_CODE_LENGTH) setCode(val);
    };

    return (
        <div className={`flex flex-col min-h-screen ${currentTheme.bg} p-10 justify-center items-center`}>
            <Logo theme={currentTheme} />
            <div className={`w-full max-w-sm mt-12 space-y-12 p-12 rounded-[2.5rem] ${currentTheme.card}`}>
                <div className="text-center space-y-4">
                    <h2 className={`text-3xl font-serif tracking-wide ${currentTheme.textMain}`}>{t.joinTitle}</h2>
                    <p className={`text-[9px] opacity-30 tracking-[0.4em] font-bold uppercase ${currentTheme.textMain}`}>{t.enterCode}</p>
                </div>
                
                <div className="relative">
                    <input 
                        autoFocus
                        type="text"
                        inputMode="numeric"
                        maxLength={ROOM_CODE_LENGTH}
                        value={code}
                        onChange={handleInputChange}
                        placeholder="00000"
                        className={`w-full bg-transparent border-b ${settings.theme === AppTheme.PREMIUM_DARK ? 'border-white/10 text-white' : 'border-slate-300 text-slate-900'} text-center text-6xl font-serif tracking-[0.3em] focus:outline-none focus:border-champagne-gold transition-all pb-8`}
                    />
                </div>

                <div className="space-y-8 pt-4">
                    <Button 
                        themeClass={currentTheme.button} 
                        fullWidth 
                        size="xl" 
                        onClick={handleJoinRoom} 
                        disabled={code.length !== ROOM_CODE_LENGTH}
                    >
                        {t.enter}
                    </Button>
                    <button
                        onClick={() => setGameState(GameState.MENU)}
                        className={`w-full text-center text-[9px] uppercase tracking-[0.4em] font-bold opacity-30 hover:opacity-100 transition-opacity ${currentTheme.textMain}`}
                    >
                        {t.cancel}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ──────────────────────────────────────────────────
   ProfileScreen — full page for authenticated users
────────────────────────────────────────────────── */
function ProviderBadge({ provider }: { provider: string }) {
  const label = provider === 'google' ? 'GOOGLE' : provider === 'apple' ? 'APPLE' : provider.toUpperCase();
  return (
    <span className="bg-[#D4AF6A] text-[#1C1C1E] text-[7px] font-bold tracking-[0.18em] uppercase px-3 py-[3px] rounded-full shadow-md">
      {label}
    </span>
  );
}

function AvatarCircle() {
  return (
    <div className="w-[88px] h-[88px] rounded-full bg-white/10 flex items-center justify-center">
      <svg width="48" height="48" viewBox="0 0 44 44" fill="none">
        <circle cx="22" cy="16" r="8" fill="rgba(255,255,255,0.25)" />
        <path d="M4 40c0-9.94 8.06-18 18-18s18 8.06 18 18" stroke="rgba(255,255,255,0.25)" strokeWidth="2" fill="none" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

export const ProfileScreen = () => {
  const { setGameState, currentTheme, settings } = useGame();
  const { authState, logout } = useAuthContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const isDark = settings.theme === AppTheme.PREMIUM_DARK;

  const email = authState.status === 'authenticated' ? authState.email : '';
  const provider = authState.status === 'authenticated' ? authState.provider : '';
  const displayName = email ? email.split('@')[0] : 'Profile';

  useEffect(() => {
    fetchProfile().then(setProfile).catch(() => {});
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    setGameState(GameState.MENU);
  };

  const purchases = profile?.purchases ?? [];

  return (
    <div className={`flex flex-col min-h-screen ${currentTheme.bg} transition-colors duration-500`}>
      {/* Header */}
      <header className="flex items-center px-6 pt-12 pb-4">
        <button
          onClick={() => setGameState(GameState.MENU)}
          className={`p-2 transition-all active:scale-90 ${currentTheme.iconColor} opacity-50 hover:opacity-100`}
        >
          <ArrowLeft size={22} />
        </button>
      </header>

      {/* Avatar + identity */}
      <div className="flex flex-col items-center pt-6 pb-10 px-6">
        <AvatarCircle />
        <h1 className={`mt-5 font-serif text-[26px] tracking-wide ${currentTheme.textMain}`}>
          {displayName}
        </h1>
        <p className={`text-[13px] mt-1 mb-3 ${currentTheme.textSecondary}`}>{email}</p>
        {provider && <ProviderBadge provider={provider} />}
      </div>

      {/* Purchases */}
      <div className="flex-1 px-6">
        <p className={`text-[9px] font-bold tracking-[0.28em] uppercase mb-4 ${currentTheme.textSecondary}`}>
          My Purchases
        </p>

        {purchases.length === 0 ? (
          <div className={`rounded-2xl ${isDark ? 'bg-white/5' : 'bg-slate-100'} px-6 py-8 flex flex-col items-center gap-3`}>
            <ShoppingBag size={28} className={`${currentTheme.iconColor} opacity-20`} />
            <p className={`text-[12px] font-sans text-center ${currentTheme.textSecondary} opacity-50`}>
              No purchases yet
            </p>
          </div>
        ) : (
          <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
            {purchases.map((p, idx) => (
              <div
                key={p.id}
                className={`flex items-center justify-between px-5 py-4
                  ${idx < purchases.length - 1 ? (isDark ? 'border-b border-white/5' : 'border-b border-slate-200') : ''}`}
              >
                <div>
                  <p className={`text-[14px] font-sans ${currentTheme.textMain}`}>
                    {p.wordPackId ? 'Word Pack' : p.themeId ? 'Theme' : 'Sound Pack'}
                  </p>
                  <p className={`text-[11px] font-sans mt-0.5 ${currentTheme.textSecondary}`}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Check size={14} className="text-[#D4AF6A]" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 pb-4 space-y-3">
        <button
          onClick={() => setGameState(GameState.MY_DECKS)}
          className={`w-full h-12 rounded-full flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${isDark ? 'bg-white/8 border border-white/10 text-white/80 hover:bg-white/12' : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'}`}
        >
          <BookOpen size={15} />
          <span className="font-sans font-bold text-[10px] uppercase tracking-[0.3em]">My Decks</span>
        </button>
        <button
          onClick={() => setGameState(GameState.STORE)}
          className={`w-full h-12 ${currentTheme.button} rounded-full flex items-center justify-center gap-2 transition-all active:scale-[0.98]`}
        >
          <ShoppingBag size={15} />
          <span className="font-sans font-bold text-[10px] uppercase tracking-[0.3em]">Browse Store</span>
        </button>
      </div>

      {/* Logout */}
      <div className="px-6 py-4" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full text-center text-red-500 font-sans font-bold text-[10px] tracking-[0.3em] uppercase py-3 hover:opacity-70 active:scale-[0.98] transition-all disabled:opacity-30"
        >
          {loggingOut ? <Loader2 size={14} className="animate-spin inline" /> : 'SIGN OUT'}
        </button>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────
   MyDecksScreen — custom word decks
────────────────────────────────────────────────── */
type CreateDeckView = 'list' | 'create';

export const MyDecksScreen = () => {
  const { setGameState, currentTheme, settings } = useGame();
  const isDark = settings.theme === AppTheme.PREMIUM_DARK;

  const [view, setView] = useState<CreateDeckView>('list');
  const [decks, setDecks] = useState<CustomDeckSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Create form state
  const [deckName, setDeckName] = useState('');
  const [wordsText, setWordsText] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const cardBg = isDark ? 'bg-[#1E1E1E] border border-white/5' : 'bg-white border border-slate-200';
  const inputCls = isDark
    ? 'bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:border-[#D4AF6A]'
    : 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#D4AF6A]';

  useEffect(() => {
    fetchMyDecks()
      .then(setDecks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteCustomDeck(id);
      setDecks(prev => prev.filter(d => d.id !== id));
    } catch {}
    setDeleting(null);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCreate = async () => {
    const name = deckName.trim();
    const words = wordsText
      .split(/[\n,]+/)
      .map(w => w.trim())
      .filter(Boolean);

    if (!name) { setCreateError('Enter a deck name'); return; }
    if (words.length < 5) { setCreateError('Add at least 5 words'); return; }

    setCreating(true);
    setCreateError('');
    try {
      const deck = await createCustomDeck({ name, words });
      setDecks(prev => [deck, ...prev]);
      setDeckName('');
      setWordsText('');
      setView('list');
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create deck');
    }
    setCreating(false);
  };

  const STATUS_COLORS: Record<string, string> = {
    approved: 'text-[#85C9AE]',
    pending: 'text-[#D4AF6A]',
    rejected: 'text-red-400',
  };

  if (view === 'create') {
    return (
      <div className={`flex flex-col h-screen ${isDark ? 'bg-[#121212]' : 'bg-slate-50'}`}>
        {/* Header */}
        <header className="flex items-center px-6 pt-12 pb-4 gap-3">
          <button
            onClick={() => { setView('list'); setCreateError(''); }}
            className={`p-2 transition-all active:scale-90 ${currentTheme.iconColor} opacity-50 hover:opacity-100`}
          >
            <ArrowLeft size={22} />
          </button>
          <h2 className={`font-serif text-2xl tracking-wide ${currentTheme.textMain}`}>New Deck</h2>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5" style={{ scrollbarWidth: 'none' }}>
          {/* Deck name */}
          <div className="space-y-2">
            <label className={`text-[9px] font-bold tracking-[0.25em] uppercase ${currentTheme.textSecondary}`}>
              Deck Name
            </label>
            <input
              value={deckName}
              onChange={e => setDeckName(e.target.value.slice(0, 60))}
              placeholder="e.g. Office Party Pack"
              className={`w-full rounded-2xl px-5 py-4 text-sm font-sans outline-none transition-all ${inputCls}`}
            />
          </div>

          {/* Words input */}
          <div className="space-y-2">
            <label className={`text-[9px] font-bold tracking-[0.25em] uppercase ${currentTheme.textSecondary}`}>
              Words
              <span className={`ml-2 font-normal normal-case tracking-normal text-[11px] ${currentTheme.textSecondary} opacity-50`}>
                (one per line or comma-separated)
              </span>
            </label>
            <textarea
              value={wordsText}
              onChange={e => setWordsText(e.target.value)}
              placeholder={"apple\nbanana\ncucumber\n..."}
              rows={10}
              className={`w-full rounded-2xl px-5 py-4 text-sm font-sans outline-none transition-all resize-none ${inputCls}`}
            />
            <p className={`text-[11px] ${currentTheme.textSecondary} opacity-40`}>
              {wordsText.split(/[\n,]+/).filter(w => w.trim()).length} words
            </p>
          </div>

          {createError && (
            <p className="text-red-400 text-[12px] font-sans">{createError}</p>
          )}
        </div>

        <div className="px-6 py-4" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
          <button
            onClick={handleCreate}
            disabled={creating}
            className={`w-full h-14 ${currentTheme.button} rounded-full flex items-center justify-center gap-2 font-sans font-bold text-[10px] uppercase tracking-[0.3em] transition-all active:scale-[0.98] disabled:opacity-50`}
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : 'Create Deck'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen ${isDark ? 'bg-[#121212]' : 'bg-slate-50'}`}>
      {/* Drag handle */}
      <div className="flex justify-center pt-4 pb-2">
        <div className="w-12 h-1 bg-white/20 rounded-full" />
      </div>

      {/* Header */}
      <div className="px-6 pb-5 pt-2 flex justify-between items-center">
        <h2 className={`font-serif text-3xl tracking-wide ${currentTheme.textMain}`}>My Decks</h2>
        <button
          onClick={() => setGameState(GameState.PROFILE)}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}
        >
          <X size={16} className={`${currentTheme.iconColor} opacity-70`} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-28" style={{ scrollbarWidth: 'none' }}>
        {loading ? (
          <div className="flex justify-center pt-16">
            <Loader2 size={24} className={`animate-spin ${currentTheme.iconColor} opacity-40`} />
          </div>
        ) : decks.length === 0 ? (
          <div className={`${cardBg} rounded-2xl px-6 py-12 flex flex-col items-center gap-3 mt-4`}>
            <BookOpen size={28} className={`${currentTheme.iconColor} opacity-20`} />
            <p className={`text-[12px] font-sans text-center ${currentTheme.textSecondary} opacity-50`}>
              No custom decks yet
            </p>
            <p className={`text-[11px] font-sans text-center ${currentTheme.textSecondary} opacity-30`}>
              Create a deck with your own words for corporate events, parties, or classrooms
            </p>
          </div>
        ) : decks.map(deck => (
          <div key={deck.id} className={`${cardBg} rounded-2xl p-5 space-y-3`}>
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <h3 className={`font-serif text-[18px] leading-tight ${currentTheme.textMain} truncate`}>
                  {deck.name}
                </h3>
                <p className={`text-[11px] font-sans mt-1 ${currentTheme.textSecondary}`}>
                  {deck.wordCount} words
                </p>
              </div>
              <button
                onClick={() => handleDelete(deck.id)}
                disabled={deleting === deck.id}
                className={`ml-4 p-2 rounded-xl transition-all active:scale-90 disabled:opacity-30 ${isDark ? 'text-red-400/50 hover:text-red-400 hover:bg-red-400/10' : 'text-red-400/50 hover:text-red-500 hover:bg-red-50'}`}
              >
                {deleting === deck.id
                  ? <Loader2 size={16} className="animate-spin" />
                  : <Trash2 size={16} />}
              </button>
            </div>

            {/* Status + access code */}
            <div className="flex items-center justify-between pt-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[deck.status] ?? currentTheme.textSecondary}`}>
                {deck.status}
              </span>
              {deck.accessCode && (
                <button
                  onClick={() => handleCopyCode(deck.accessCode!)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold transition-all ${
                    isDark ? 'bg-white/5 hover:bg-white/10 text-white/60' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <Copy size={11} />
                  {copied === deck.accessCode ? 'Copied!' : deck.accessCode}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* FAB — Create new deck */}
      <div className="absolute bottom-0 left-0 right-0 px-6 py-4 pointer-events-none"
           style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
        <button
          onClick={() => setView('create')}
          className={`pointer-events-auto w-full h-14 ${currentTheme.button} rounded-full flex items-center justify-center gap-2 font-sans font-bold text-[10px] uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-[0.98]`}
        >
          <Plus size={16} />
          Create New Deck
        </button>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────
   StoreScreen — word packs & themes
────────────────────────────────────────────────── */
const LANG_LABEL: Record<string, string> = { UA: '🇺🇦 UA', DE: '🇩🇪 DE', EN: '🇬🇧 EN' };
const LANG_FULL: Record<string, string> = { ALL: 'Усі', UA: 'Українська', EN: 'Англійська', DE: 'Німецька' };
const LANG_FILTERS = ['ALL', 'UA', 'EN', 'DE'] as const;
type LangFilter = typeof LANG_FILTERS[number];

const STORE_TABS = ['packs', 'themes'] as const;
type StoreTab = typeof STORE_TABS[number];

export const StoreScreen = () => {
  const { setGameState, currentTheme, settings } = useGame();
  const { isAuthenticated } = useAuthContext();
  const isDark = settings.theme === AppTheme.PREMIUM_DARK;

  const [tab, setTab] = useState<StoreTab>('packs');
  const [langFilter, setLangFilter] = useState<LangFilter>('ALL');
  const [wordPacks, setWordPacks] = useState<WordPackItem[]>([]);
  const [themes, setThemes] = useState<ThemeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    fetchStore()
      .then(data => {
        setWordPacks(data.wordPacks);
        setThemes(data.themes);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAddFree = async (itemType: 'wordPack' | 'theme', itemId: string) => {
    if (!isAuthenticated) { setGameState(GameState.PROFILE); return; }
    setActing(itemId);
    try {
      await claimFreeItem(itemType, itemId);
      // optimistic: mark owned
      if (itemType === 'wordPack') {
        setWordPacks(prev => prev.map(p => p.id === itemId ? { ...p, owned: true } : p));
      } else {
        setThemes(prev => prev.map(t => t.id === itemId ? { ...t, owned: true } : t));
      }
    } catch {}
    setActing(null);
  };

  const handleBuy = async (itemType: 'wordPack' | 'theme', itemId: string) => {
    if (!isAuthenticated) { setGameState(GameState.PROFILE); return; }
    setActing(itemId);
    try {
      const { checkoutUrl } = await createCheckout(itemType, itemId);
      window.location.href = checkoutUrl;
    } catch { setActing(null); }
  };

  // Filter + sort: free first, then by language name
  const visiblePacks = wordPacks
    .filter(p => langFilter === 'ALL' || p.language === langFilter)
    .sort((a, b) => {
      if (a.isFree && !b.isFree) return -1;
      if (!a.isFree && b.isFree) return 1;
      return a.name.localeCompare(b.name);
    });

  const TAB_LABELS: Record<StoreTab, string> = { packs: 'Набори слів', themes: 'Теми' };

  const cardBg = isDark ? 'bg-[#1E1E1E] border border-white/5' : 'bg-white border border-slate-200';
  const divider = isDark ? 'border-[#333]' : 'border-slate-200';
  const chipBase = isDark ? 'border border-white/10 text-white/50' : 'border border-slate-200 text-slate-500';
  const chipActive = 'border-[#D4AF6A] text-[#D4AF6A] bg-[#D4AF6A]/8';

  return (
    <div className={`flex flex-col h-screen ${isDark ? 'bg-[#121212]' : 'bg-slate-50'} transition-colors duration-500`}>

      {/* Drag handle + Header */}
      <div className="flex justify-center pt-4 pb-2">
        <div className="w-12 h-1 bg-white/20 rounded-full" />
      </div>
      <div className="px-6 pb-4 pt-2 flex justify-between items-center">
        <h2 className={`font-serif text-3xl tracking-wide ${currentTheme.textMain}`}>Магазин</h2>
        <button
          onClick={() => setGameState(GameState.PROFILE)}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'}`}
        >
          <X size={16} className={`${currentTheme.iconColor} opacity-70`} />
        </button>
      </div>

      {/* Tabs — underline style */}
      <div className={`px-6 border-b ${divider}`}>
        <div className="flex space-x-8">
          {STORE_TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 border-b-2 font-sans font-bold text-[11px] tracking-wider uppercase transition-colors ${
                tab === t
                  ? 'border-[#D4AF6A] text-[#D4AF6A]'
                  : `border-transparent ${isDark ? 'text-white/40' : 'text-slate-400'}`
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Language filter chips — only on packs tab */}
      {tab === 'packs' && (
        <div className="px-6 pt-4 pb-2 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {LANG_FILTERS.map(lang => (
            <button
              key={lang}
              onClick={() => setLangFilter(lang)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wide transition-all ${
                langFilter === lang ? chipActive : chipBase
              }`}
            >
              {LANG_FULL[lang]}
            </button>
          ))}
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 pb-20"
           style={{ scrollbarWidth: 'none' }}>
        {loading ? (
          <div className="flex justify-center pt-16">
            <Loader2 size={24} className={`animate-spin ${currentTheme.iconColor} opacity-40`} />
          </div>
        ) : tab === 'packs' ? (
          visiblePacks.length === 0 ? (
            <p className={`text-center text-sm pt-12 ${currentTheme.textSecondary} opacity-40`}>Немає доступних наборів</p>
          ) : visiblePacks.map(pack => (
            <div key={pack.id} className={`${cardBg} rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden`}>
              {pack.isFree && (
                <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-[#D4AF6A]/5 rounded-full blur-2xl pointer-events-none" />
              )}
              <div className="flex justify-between items-start z-10">
                <div className="max-w-[60%]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[9px] font-bold border rounded px-1.5 py-0.5 ${isDark ? 'border-white/20 text-white/60' : 'border-slate-300 text-slate-500'}`}>
                      {LANG_LABEL[pack.language] ?? pack.language}
                    </span>
                    <span className={`text-[9px] font-bold border rounded px-1.5 py-0.5 ${isDark ? 'border-white/20 text-white/60' : 'border-slate-300 text-slate-500'}`}>
                      {pack.difficulty.toUpperCase()}
                    </span>
                  </div>
                  <h3 className={`font-serif text-[18px] leading-tight mb-1 ${currentTheme.textMain}`}>{pack.name}</h3>
                  <p className={`text-[11px] font-sans ${currentTheme.textSecondary}`}>
                    {pack.wordCount} слів{pack.description ? ` • ${pack.description}` : ''}
                  </p>
                </div>

                {/* Status badge / action button */}
                {pack.owned ? (
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full shrink-0 ${
                    pack.isFree
                      ? 'bg-[#D4AF6A]/10 border border-[#D4AF6A]/20'
                      : 'bg-[#A1E3C8]/10 border border-[#A1E3C8]/20'
                  }`}>
                    <Check size={11} className={pack.isFree ? 'text-[#D4AF6A]' : 'text-[#85C9AE]'} />
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${pack.isFree ? 'text-[#D4AF6A]' : 'text-[#85C9AE]'}`}>
                      {pack.isFree ? 'Додано' : 'Куплено'}
                    </span>
                  </div>
                ) : pack.isFree ? (
                  <button
                    onClick={() => handleAddFree('wordPack', pack.id)}
                    disabled={acting === pack.id}
                    className={`shrink-0 px-5 py-2 rounded-full font-bold text-[12px] transition-all active:scale-95 disabled:opacity-50 ${
                      isDark
                        ? 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                  >
                    {acting === pack.id ? <Loader2 size={12} className="animate-spin inline" /> : '+ Додати'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleBuy('wordPack', pack.id)}
                    disabled={acting === pack.id}
                    className="shrink-0 bg-white hover:bg-gray-100 active:scale-95 transition-all text-black px-5 py-2 rounded-full font-bold text-[12px] shadow-lg min-w-[90px] disabled:opacity-50"
                  >
                    {acting === pack.id
                      ? <Loader2 size={12} className="animate-spin inline" />
                      : `$${(pack.price / 100).toFixed(2)}`}
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          // Themes tab
          themes.filter(t => !t.isFree).length === 0 ? (
            <div className={`${cardBg} rounded-2xl px-6 py-12 flex flex-col items-center gap-3 mt-2`}>
              <p className={`text-[12px] font-sans text-center ${currentTheme.textSecondary} opacity-40`}>
                Нові теми незабаром
              </p>
            </div>
          ) : themes.filter(t => !t.isFree).map(theme => (
            <div key={theme.id} className={`${cardBg} rounded-2xl p-5 flex justify-between items-center`}>
              <p className={`font-serif text-[18px] ${currentTheme.textMain}`}>{theme.name}</p>
              {theme.owned ? (
                <div className="bg-[#A1E3C8]/10 px-3 py-1 rounded-full border border-[#A1E3C8]/20 flex items-center gap-1">
                  <Check size={11} className="text-[#85C9AE]" />
                  <span className="text-[#85C9AE] text-[10px] font-bold uppercase tracking-wide">Куплено</span>
                </div>
              ) : (
                <button
                  onClick={() => handleBuy('theme', theme.id)}
                  disabled={acting === theme.id}
                  className="bg-white hover:bg-gray-100 active:scale-95 text-black px-5 py-2 rounded-full font-bold text-[12px] shadow-lg disabled:opacity-50"
                >
                  {acting === theme.id ? <Loader2 size={12} className="animate-spin inline" /> : `$${(theme.price / 100).toFixed(2)}`}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Bottom bar */}
      <div className={`px-6 py-4 border-t ${divider} ${isDark ? 'bg-[#121212]/95' : 'bg-slate-50/95'} backdrop-blur`}
           style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <p className={`text-center text-[10px] uppercase tracking-widest ${isDark ? 'text-white/20' : 'text-slate-400'}`}>
          Усі додаткові набори — безкоштовно
        </p>
      </div>
    </div>
  );
};
