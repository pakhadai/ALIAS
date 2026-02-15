
import React, { useState, useRef } from 'react';
import { X, AlertCircle, ShoppingBag, FileText, User } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Logo } from '../components/Shared';
import { StoreModal } from '../components/Store/StoreModal';
import { CustomDeckModal } from '../components/CustomDeck/CustomDeckModal';
import { ProfileModal } from '../components/Auth/ProfileModal';
import { GameState, Language, AppTheme } from '../types';
import { useGame, AVATARS } from '../context/GameContext';
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
  const [showRules, setShowRules] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [showDecks, setShowDecks] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const t = TRANSLATIONS[settings.language];
  
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
        <button onClick={() => setShowProfile(true)} className="transition-all active:scale-90 p-2">
          <User size={22} className={`${currentTheme.iconColor} opacity-50 hover:opacity-100`} />
        </button>
        <button onClick={() => setShowDecks(true)} className="transition-all active:scale-90 p-2">
          <FileText size={22} className={`${currentTheme.iconColor} opacity-50 hover:opacity-100`} />
        </button>
        <button onClick={() => setShowStore(true)} className="transition-all active:scale-90 p-2">
          <ShoppingBag size={22} className={`${currentTheme.iconColor} opacity-50 hover:opacity-100`} />
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
      {showStore && <StoreModal onClose={() => setShowStore(false)} />}
      {showDecks && <CustomDeckModal onClose={() => setShowDecks(false)} />}
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
