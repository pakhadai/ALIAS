import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  AlertCircle,
  User,
  ArrowLeft,
  Check,
  Loader2,
  ShoppingBag,
  Globe,
  Plus,
  Trash2,
  BookOpen,
  Copy,
  Settings,
  SlidersHorizontal,
  Lock,
  Upload,
  ChevronRight,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Logo } from '../components/Shared';
import { ProfileModal } from '../components/Auth/ProfileModal';
import { LoginModal } from '../components/Auth/LoginModal';
import { AppSettingsModal } from '../components/Settings/AppSettingsModal';
import { GameState, Language, AppTheme, Category } from '../types';
import { useGame, AVATARS } from '../context/GameContext';
import { useAuthContext } from '../context/AuthContext';
import {
  updateProfile,
  fetchLobbySettings,
  saveLobbySettings,
  fetchStore,
  claimFreeItem,
  fetchMyDecks,
  createCustomDeck,
  deleteCustomDeck,
  type UserProfile,
  type WordPackItem,
  type ThemeItem,
  type CustomDeckSummary,
} from '../services/api';
import { QuickBuyModal } from '../components/Store/QuickBuyModal';
import { TRANSLATIONS, ROOM_CODE_LENGTH, THEME_CONFIG } from '../constants';
import versionData from '../version.json';

// ─── Preset avatar system ──────────────────────────────────────────────
import { PRESET_AVATARS, AvatarDisplay } from '../components/AvatarDisplay';
export { PRESET_AVATARS, AvatarDisplay };
import { usePushNotifications } from '../hooks/usePushNotifications';
import { usePlayerStats } from '../hooks/usePlayerStats';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { toggleFullscreen, isStandaloneDisplay, isAppleMobile } from '../utils/fullscreen';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Internal Rules Modal Component
const TABS = ['rules', 'logic', 'modes', 'settings'] as const;
type TabId = (typeof TABS)[number];

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
      {[t.infoRule1, t.infoRule2, t.infoRule3, t.infoRule4, t.infoRule5, t.infoRule6].map(
        (rule: string, i: number) => (
          <div key={i} className="flex gap-4 items-start">
            <span
              className={`font-serif text-lg opacity-20 shrink-0 w-5 text-right ${currentTheme.textMain}`}
            >
              {i + 1}
            </span>
            <p
              className={`text-sm leading-relaxed tracking-wide font-light ${currentTheme.textSecondary}`}
            >
              {rule}
            </p>
          </div>
        )
      )}
    </div>
  );

  const renderLogic = () => (
    <div className="space-y-6">
      <div>
        <p
          className={`text-sm leading-relaxed tracking-wide font-light ${currentTheme.textSecondary}`}
        >
          {t.infoTurns}
        </p>
      </div>
      <div>
        <h4 className={`text-sm font-bold mb-2 ${currentTheme.textMain}`}>{t.infoExplainer}</h4>
        <p
          className={`text-sm leading-relaxed tracking-wide font-light ${currentTheme.textSecondary}`}
        >
          {t.infoExplainerDesc}
        </p>
      </div>
      <div>
        <h4 className={`text-sm font-bold mb-2 ${currentTheme.textMain}`}>{t.info1v1}</h4>
        <p
          className={`text-sm leading-relaxed tracking-wide font-light ${currentTheme.textSecondary}`}
        >
          {t.info1v1Desc}
        </p>
      </div>
    </div>
  );

  const renderModes = () => (
    <div className="space-y-6">
      <div>
        <h4 className={`text-sm font-bold mb-2 ${currentTheme.textMain}`}>{t.infoOnline}</h4>
        <p
          className={`text-sm leading-relaxed tracking-wide font-light ${currentTheme.textSecondary}`}
        >
          {t.infoOnlineDesc}
        </p>
      </div>
      <div>
        <h4 className={`text-sm font-bold mb-2 ${currentTheme.textMain}`}>{t.infoOffline}</h4>
        <p
          className={`text-sm leading-relaxed tracking-wide font-light ${currentTheme.textSecondary}`}
        >
          {t.infoOfflineDesc}
        </p>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-4">
      {[
        t.infoSettingTime,
        t.infoSettingScore,
        t.infoSettingCategories,
        t.infoSettingPenalty,
        t.infoSettingTeams,
        t.infoSettingSound,
      ].map((desc: string, i: number) => {
        const [label, ...rest] = desc.split(' — ');
        return (
          <div key={i} className="flex gap-3 items-start">
            <span className={`text-xs opacity-30 mt-0.5 ${currentTheme.textMain}`}>•</span>
            <p
              className={`text-sm leading-relaxed tracking-wide font-light ${currentTheme.textSecondary}`}
            >
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
    <div
      className={`fixed inset-0 z-100 flex items-center justify-center bg-[color-mix(in_srgb,var(--ui-bg)_80%,transparent)] backdrop-blur-xl ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
    >
      <div
        className={`relative w-full h-full max-w-md flex flex-col ${currentTheme.card} ${isClosing ? 'animate-pop-out' : 'animate-pop-in'}`}
        style={{ maxHeight: '100dvh' }}
      >
        {/* Header */}
        <div className="shrink-0 px-8 pt-10 pb-4 flex items-center justify-between">
          <h2 className={`text-2xl font-serif ${currentTheme.textMain}`}>{t.rulesTitle}</h2>
          <button
            onClick={handleClose}
            className="opacity-40 hover:opacity-100 transition-opacity p-2"
          >
            <X size={22} className={currentTheme.iconColor} />
          </button>
        </div>

        {/* Tabs */}
        <div className="shrink-0 px-6 pb-4 flex gap-2 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => (
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
        <div className="flex-1 overflow-y-auto px-8 py-6">{tabContent[activeTab]()}</div>

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
  const t = TRANSLATIONS[settings.general.language];
  return (
    <div
      className={`flex flex-col min-h-screen ${currentTheme.bg} p-6 md:p-10 justify-center items-center`}
    >
      <div
        className={`w-full max-w-2xl space-y-10 p-8 md:p-12 rounded-[2.5rem] ${currentTheme.card} overflow-y-auto`}
        style={{ maxHeight: '85vh' }}
      >
        <h2 className={`text-3xl font-serif mb-6 text-center ${currentTheme.textMain}`}>
          {t.infoRules}
        </h2>
        <div className="space-y-5 mb-8">
          {[t.infoRule1, t.infoRule2, t.infoRule3, t.infoRule4, t.infoRule5, t.infoRule6].map(
            (rule: string, i: number) => (
              <div key={i} className="flex gap-4 items-start">
                <span
                  className={`font-serif text-xl opacity-20 shrink-0 w-5 text-right ${currentTheme.textMain}`}
                >
                  {i + 1}
                </span>
                <p
                  className={`text-sm leading-relaxed tracking-wide font-light ${currentTheme.textSecondary}`}
                >
                  {rule}
                </p>
              </div>
            )
          )}
        </div>
        <Button
          themeClass={currentTheme.button}
          fullWidth
          onClick={() => setGameState(GameState.MENU)}
          size="xl"
        >
          {t.close}
        </Button>
      </div>
    </div>
  );
};

export const MenuScreen = () => {
  const {
    setGameState,
    settings,
    setSettings,
    currentTheme,
    createNewRoom,
    startOfflineGame,
    connectionError,
  } = useGame();
  const { isAuthenticated } = useAuthContext();
  const [showRules, setShowRules] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAppSettings, setShowAppSettings] = useState(false);
  const [showFullscreenHint, setShowFullscreenHint] = useState(false);
  const t = TRANSLATIONS[settings.general.language];

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

  const toggleLanguage = () => {
    setSettings((prev) => {
      const cur = prev.general.language;
      const nextLang =
        cur === Language.UA ? Language.DE : cur === Language.DE ? Language.EN : Language.UA;
      return { ...prev, general: { ...prev.general, language: nextLang } };
    });
  };

  const handleFullscreenClick = async () => {
    if (isStandaloneDisplay()) return;
    const result = await toggleFullscreen();
    if (result === 'unsupported') {
      setShowFullscreenHint(true);
      return;
    }
    if (result === 'error' && isAppleMobile()) {
      setShowFullscreenHint(true);
    }
  };

  return (
    <div
      className={`flex flex-col h-screen w-full ${currentTheme.bg} transition-colors duration-500 overflow-hidden`}
    >
      <header className="relative z-10 w-full px-6 md:px-8 pt-12 pb-4 flex justify-end items-center gap-6 shrink-0">
        <button onClick={handleProfileClick} className="transition-all active:scale-90 p-2">
          <User size={22} className={`${currentTheme.iconColor} opacity-50 hover:opacity-100`} />
        </button>
        <button
          onClick={() => setShowAppSettings(true)}
          className="transition-all active:scale-90 p-2"
          aria-label="Settings"
        >
          <Settings
            size={22}
            className={`${currentTheme.iconColor} opacity-50 hover:opacity-100 transition-opacity`}
          />
        </button>
        <button onClick={() => setShowRules(true)} className="transition-all active:scale-90 p-2">
          <span
            className={`material-symbols-outlined text-[24px]! ${currentTheme.iconColor} opacity-50 hover:opacity-100`}
          >
            menu_book
          </span>
        </button>
        {!isStandaloneDisplay() && (
          <button
            type="button"
            onClick={() => void handleFullscreenClick()}
            className="transition-all active:scale-90 p-2"
            aria-label="Fullscreen"
          >
            <span
              className={`material-symbols-outlined text-[24px]! ${currentTheme.iconColor} opacity-50 hover:opacity-100`}
            >
              fullscreen
            </span>
          </button>
        )}
        <button
          onClick={toggleLanguage}
          className="w-10 h-10 flex items-center justify-center font-sans font-bold text-[9px] tracking-[0.2em] border border-(--ui-border) text-(--ui-fg-muted) rounded-full transition-all active:scale-90 ml-2 hover:text-(--ui-fg)"
        >
          {settings.general.language}
        </button>
      </header>

      <div className="max-w-2xl w-full flex-1 flex flex-col items-center mx-auto">
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-xs px-6 md:px-8 pb-20">
          <Logo theme={currentTheme} />

          {connectionError && (
            <div className="mt-8 p-4 bg-[color-mix(in_srgb,var(--ui-danger)_12%,transparent)] border border-[color-mix(in_srgb,var(--ui-danger)_25%,transparent)] rounded-2xl flex items-center gap-4 animate-shake">
              <AlertCircle className="text-(--ui-danger)" size={20} />
              <p className="text-[10px] uppercase tracking-widest text-(--ui-danger) font-bold">
                Server Error: {connectionError}
              </p>
            </div>
          )}

          <div className="w-full space-y-6 flex flex-col items-center mt-12 animate-slide-up">
            <button
              onClick={createNewRoom}
              className={`w-full h-14 ${currentTheme.button} rounded-full flex items-center justify-center transition-all active:scale-[0.98] shadow-2xl`}
            >
              <span className="font-sans font-bold text-[10px] uppercase tracking-[0.4em]">
                {t.createGame}
              </span>
            </button>

            <button
              onClick={() => setGameState(GameState.JOIN_INPUT)}
              className="w-full h-14 rounded-full flex items-center justify-center transition-all active:scale-[0.98] bg-(--ui-surface) text-(--ui-fg) border border-(--ui-border) hover:bg-(--ui-surface-hover)"
            >
              <span className="font-sans font-bold text-[10px] uppercase tracking-[0.4em]">
                {t.joinGame}
              </span>
            </button>
          </div>

          {/* Offline mode + Version — fixed at bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-2 pb-6 pt-4"
            style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
          >
            <div className="h-px w-12 bg-(--ui-border)" />
            <button onClick={startOfflineGame} className="inline-flex items-center gap-2 group h-6">
              <WifiOff
                size={14}
                className={`shrink-0 ${currentTheme.iconColor} opacity-40 group-hover:opacity-100 transition-opacity`}
                strokeWidth={2}
              />
              <span
                className={`font-sans font-medium text-[9px] uppercase tracking-[0.5em] border-b border-transparent group-hover:border-current pb-2 transition-all opacity-30 group-hover:opacity-100 leading-none ${currentTheme.textMain}`}
              >
                {t.playOffline}
              </span>
            </button>
            <span
              className={`font-sans text-[8px] uppercase tracking-widest opacity-20 ${currentTheme.textMain}`}
            >
              v{versionData.version}
            </span>
          </div>
        </main>
      </div>
      <RulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
        t={t}
        currentTheme={currentTheme}
      />
      {showFullscreenHint && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center bg-[color-mix(in_srgb,var(--ui-bg)_78%,transparent)] backdrop-blur-xl"
          onClick={() => setShowFullscreenHint(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="fullscreen-hint-title"
        >
          <div
            className="w-full max-w-sm md:max-w-md mx-auto bg-(--ui-card) border border-(--ui-border) rounded-t-4xl md:rounded-4xl px-5 pt-5 pb-8"
            style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <p
                id="fullscreen-hint-title"
                className="text-(--ui-fg) text-sm font-sans font-semibold tracking-wide pr-4"
              >
                {t.fullscreenUnavailableTitle}
              </p>
              <button
                type="button"
                onClick={() => setShowFullscreenHint(false)}
                className="text-(--ui-fg-muted) hover:text-(--ui-fg) p-1 shrink-0"
                aria-label={t.close}
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-(--ui-fg-muted) text-sm leading-relaxed font-sans mb-6">
              {t.fullscreenUnavailableBody}
            </p>
            <button
              type="button"
              onClick={() => setShowFullscreenHint(false)}
              className={`w-full py-3 rounded-2xl font-sans text-xs font-bold uppercase tracking-widest ${currentTheme.button}`}
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      <AppSettingsModal isOpen={showAppSettings} onClose={() => setShowAppSettings(false)} />
    </div>
  );
};

export const EnterNameScreen = () => {
  const { setGameState, settings, currentTheme, handleJoin, isHost } = useGame();
  const { authState, profile } = useAuthContext();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const t = TRANSLATIONS[settings.general.language];

  // Use consistent UUID for all players (host and guests)
  const stableId = useRef(`player-${generateUUID()}`);

  // Auto-join if authenticated with a complete profile (name + avatar)
  useEffect(() => {
    if (authState.status === 'authenticated' && profile?.displayName) {
      const avatarEmoji =
        profile.avatarId != null
          ? (PRESET_AVATARS[parseInt(profile.avatarId)]?.emoji ?? AVATARS[0])
          : AVATARS[0];
      handleJoin(stableId.current, profile.displayName, avatarEmoji, profile.avatarId);
      setGameState(GameState.LOBBY);
      return;
    }
    // Prefill display name from profile (anonymous or authenticated)
    if (profile?.displayName) setName(profile.displayName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState.status, profile?.displayName, profile?.avatarId]);

  const handleSubmit = () => {
    const sanitized = name.replace(/<[^>]*>/g, '').slice(0, 20);
    if (sanitized.trim()) {
      handleJoin(stableId.current, sanitized.trim(), avatar);
      setGameState(GameState.LOBBY);
    }
  };

  return (
    <div
      className={`flex flex-col min-h-screen ${currentTheme.bg} p-6 md:p-10 justify-center items-center`}
    >
      <Logo theme={currentTheme} />
      <div
        className={`w-full max-w-2xl mt-12 space-y-10 p-8 md:p-12 rounded-[2.5rem] ${currentTheme.card}`}
      >
        <h2 className={`text-2xl font-serif text-center tracking-wide ${currentTheme.textMain}`}>
          {t.whoAreYou}
        </h2>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value.replace(/<[^>]*>/g, '').slice(0, 20))}
          placeholder={t.namePlaceholder}
          className="w-full bg-(--ui-surface) border border-(--ui-border) text-(--ui-fg) rounded-2xl px-6 py-4 focus:outline-none focus:border-(--ui-accent) transition-all font-sans font-bold text-center text-sm"
        />
        <div className="grid grid-cols-4 gap-4">
          {AVATARS.slice(0, 12).map((a) => (
            <button
              key={a}
              onClick={() => setAvatar(a)}
              className={`text-3xl p-3 rounded-2xl transition-all ${
                avatar === a
                  ? 'bg-[color-mix(in_srgb,var(--ui-accent)_18%,transparent)] scale-110 shadow-lg'
                  : 'hover:bg-(--ui-surface) opacity-50 hover:opacity-100'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="pt-4 space-y-6">
          <Button
            themeClass={currentTheme.button}
            fullWidth
            size="xl"
            onClick={handleSubmit}
            disabled={!name.trim()}
          >
            {t.next}
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

export const JoinInputScreen = () => {
  const { setGameState, settings, currentTheme, setRoomCode } = useGame();
  const [code, setCode] = useState('');
  const t = TRANSLATIONS[settings.general.language];

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
    <div
      className={`flex flex-col min-h-screen ${currentTheme.bg} p-6 md:p-10 justify-center items-center`}
    >
      <Logo theme={currentTheme} />
      <div
        className={`w-full max-w-2xl mt-12 space-y-12 p-8 md:p-12 rounded-[2.5rem] ${currentTheme.card}`}
      >
        <div className="text-center space-y-4">
          <h2 className={`text-3xl font-serif tracking-wide ${currentTheme.textMain}`}>
            {t.joinTitle}
          </h2>
          <p
            className={`text-[9px] opacity-30 tracking-[0.4em] font-bold uppercase ${currentTheme.textMain}`}
          >
            {t.enterCode}
          </p>
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
            className="w-full bg-transparent border-b border-(--ui-border) text-(--ui-fg) text-center text-6xl font-serif tracking-[0.3em] focus:outline-none focus:border-(--ui-accent) transition-all pb-8"
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
  const label =
    provider === 'google' ? 'GOOGLE' : provider === 'apple' ? 'APPLE' : provider.toUpperCase();
  return (
    <span className="bg-(--ui-accent) text-(--ui-accent-contrast) text-[7px] font-bold tracking-[0.18em] uppercase px-3 py-[3px] rounded-full shadow-md">
      {label}
    </span>
  );
}

export const ProfileScreen = () => {
  const { setGameState, currentTheme, settings } = useGame();
  const { authState, profile, logout } = useAuthContext();
  const [loggingOut, setLoggingOut] = useState(false);
  const isDark = currentTheme.isDark;

  const email = authState.status === 'authenticated' ? authState.email : '';
  const provider = authState.status === 'authenticated' ? authState.provider : '';

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    setGameState(GameState.MENU);
  };

  // derived: prefer saved displayName, fall back to email prefix
  const displayName = profile?.displayName || (email ? email.split('@')[0] : 'Profile');
  const hasCustomPacks =
    profile?.purchases?.some((p) => p.wordPack?.slug === 'feature-custom-packs') ?? false;

  const navBtn = `w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform ${
    isDark
      ? 'bg-(--ui-surface) border border-(--ui-border) hover:bg-(--ui-surface-hover)'
      : 'bg-(--ui-card) border border-(--ui-border) hover:bg-(--ui-surface-hover) shadow-sm'
  }`;
  const navLabel = `font-sans font-bold text-[11px] uppercase tracking-[0.25em] ${currentTheme.textMain}`;

  return (
    <div
      className={`flex flex-col min-h-screen items-center ${currentTheme.bg} transition-colors duration-500`}
    >
      <div className="max-w-2xl w-full flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center px-6 pt-12 pb-4 md:px-8">
          <button
            onClick={() => setGameState(GameState.MENU)}
            className={`p-2 transition-all active:scale-90 ${currentTheme.iconColor} opacity-50 hover:opacity-100`}
          >
            <ArrowLeft size={22} />
          </button>
        </header>

        {/* Avatar + identity */}
        <div className="flex flex-col items-center pt-4 pb-8 px-6 md:px-8">
          <AvatarDisplay avatarId={profile?.avatarId} size={88} />
          <h1 className={`mt-4 font-serif text-[26px] tracking-wide ${currentTheme.textMain}`}>
            {displayName}
          </h1>
          {email && (
            <p className={`text-[13px] mt-1 mb-3 ${currentTheme.textSecondary}`}>{email}</p>
          )}
          {provider && <ProviderBadge provider={provider} />}
        </div>

        {/* Navigation menu */}
        <div className="flex-1 px-6 md:px-8 space-y-3">
          {/* Магазин */}
          <button
            onClick={() => setGameState(GameState.STORE)}
            className={`${navBtn} ${currentTheme.button}`}
          >
            <div className="flex items-center gap-3">
              <ShoppingBag size={16} />
              <span className="font-sans font-bold text-[11px] uppercase tracking-[0.25em]">
                Магазин
              </span>
            </div>
            <ChevronRight size={16} className="opacity-60" />
          </button>

          {/* Налаштування профілю */}
          <button onClick={() => setGameState(GameState.PROFILE_SETTINGS)} className={navBtn}>
            <div className="flex items-center gap-3">
              <Settings size={16} className={currentTheme.iconColor} />
              <span className={navLabel}>Налаштування профілю</span>
            </div>
            <ChevronRight size={16} className={`${currentTheme.iconColor} opacity-30`} />
          </button>

          {/* Налаштування лоббі */}
          <button onClick={() => setGameState(GameState.LOBBY_SETTINGS)} className={navBtn}>
            <div className="flex items-center gap-3">
              <SlidersHorizontal size={16} className={currentTheme.iconColor} />
              <span className={navLabel}>Налаштування лоббі</span>
            </div>
            <ChevronRight size={16} className={`${currentTheme.iconColor} opacity-30`} />
          </button>

          {/* Моя статистика */}
          <button onClick={() => setGameState(GameState.PLAYER_STATS)} className={navBtn}>
            <div className="flex items-center gap-3">
              <ShieldCheck size={16} className={currentTheme.iconColor} />
              <span className={navLabel}>Моя статистика</span>
            </div>
            <ChevronRight size={16} className={`${currentTheme.iconColor} opacity-30`} />
          </button>

          {/* Мої паки слів — lock якщо не куплено */}
          <button onClick={() => setGameState(GameState.MY_WORD_PACKS)} className={navBtn}>
            <div className="flex items-center gap-3">
              <BookOpen
                size={16}
                className={
                  hasCustomPacks ? currentTheme.iconColor : `${currentTheme.iconColor} opacity-40`
                }
              />
              <div className="text-left">
                <span className={`${navLabel} ${hasCustomPacks ? '' : 'opacity-40'}`}>
                  Мої паки слів
                </span>
                {!hasCustomPacks && (
                  <p className="text-[9px] mt-0.5 uppercase tracking-widest text-(--ui-fg-muted)">
                    Потрібна покупка
                  </p>
                )}
              </div>
            </div>
            {hasCustomPacks ? (
              <ChevronRight size={16} className={`${currentTheme.iconColor} opacity-30`} />
            ) : (
              <Lock size={14} className={`${currentTheme.iconColor} opacity-25`} />
            )}
          </button>
        </div>

        {/* Logout */}
        <div
          className="px-6 md:px-8 py-6"
          style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full text-center text-(--ui-danger) font-sans font-bold text-[10px] tracking-[0.3em] uppercase py-3 hover:opacity-70 active:scale-[0.98] transition-all disabled:opacity-30"
          >
            {loggingOut ? <Loader2 size={14} className="animate-spin inline" /> : 'ВИЙТИ З АКАУНТУ'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────
   ProfileSettingsScreen
────────────────────────────────────────────────── */
export const ProfileSettingsScreen = () => {
  const { setGameState, currentTheme, settings } = useGame();
  const { authState, profile, refreshProfile } = useAuthContext();
  const isDark = currentTheme.isDark;
  const {
    permission: pushPermission,
    supported: pushSupported,
    loading: pushLoading,
    subscribe: pushSubscribe,
    unsubscribe: pushUnsubscribe,
  } = usePushNotifications();
  const { canInstall, install } = useInstallPrompt();

  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<number>(-1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const email = authState.status === 'authenticated' ? authState.email : '';
  const provider = authState.status === 'authenticated' ? authState.provider : '';

  useEffect(() => {
    if (profile) {
      setName(profile.displayName || (profile.email ? profile.email.split('@')[0] : ''));
      const idx = profile.avatarId != null ? parseInt(profile.avatarId) : -1;
      setSelectedAvatar(idx >= 0 ? idx : -1);
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        displayName: name.trim() || undefined,
        avatarId: selectedAvatar >= 0 ? String(selectedAvatar) : undefined,
      });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const inputCls =
    'w-full rounded-2xl px-5 py-4 text-sm font-sans outline-none transition-all bg-(--ui-surface) border border-(--ui-border) text-(--ui-fg) placeholder:text-(--ui-fg-muted) focus:border-(--ui-accent)';

  return (
    <div className="flex flex-col min-h-screen items-center bg-(--ui-bg)">
      <div className="max-w-2xl w-full flex-1 flex flex-col">
        <header className="flex items-center px-6 md:px-8 pt-12 pb-4 gap-3">
          <button
            onClick={() => setGameState(GameState.PROFILE)}
            className={`p-2 transition-all active:scale-90 ${currentTheme.iconColor} opacity-50 hover:opacity-100`}
          >
            <ArrowLeft size={22} />
          </button>
          <h2 className={`font-serif text-2xl tracking-wide ${currentTheme.textMain}`}>
            Налаштування профілю
          </h2>
        </header>

        <div
          className="flex-1 overflow-y-auto px-6 md:px-8 py-4 space-y-8"
          style={{ scrollbarWidth: 'none' }}
        >
          {/* Current avatar preview */}
          <div className="flex justify-center pt-2">
            <AvatarDisplay
              avatarId={selectedAvatar >= 0 ? String(selectedAvatar) : null}
              size={64}
            />
          </div>

          {/* Avatar picker */}
          <div className="space-y-2">
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-(--ui-fg-muted) opacity-80">
              Виберіть аватарку
            </p>
            <div className="grid grid-cols-6 gap-2 max-w-xs mx-auto">
              {PRESET_AVATARS.slice(0, 15).map((av, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedAvatar(idx)}
                  className={`relative flex items-center justify-center rounded-xl aspect-square transition-all active:scale-95 ${
                    selectedAvatar === idx
                      ? 'ring-2 ring-(--ui-accent) scale-105'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    background: `color-mix(in_srgb, var(--ui-accent) ${av.mix}%, var(--ui-bg))`,
                  }}
                >
                  <span className="text-xl">{av.emoji}</span>
                  {selectedAvatar === idx && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-(--ui-accent) rounded-full flex items-center justify-center">
                      <Check size={7} className="text-(--ui-accent-contrast)" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Display name */}
          <div className="space-y-2">
            <label className="text-[9px] font-bold tracking-[0.25em] uppercase text-(--ui-fg-muted) opacity-80">
              Ім'я в грі
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.replace(/<[^>]*>/g, '').slice(0, 20))}
              placeholder="Твоє ім'я..."
              className={inputCls}
            />
            <p className="text-[10px] text-(--ui-fg-muted) opacity-70">{name.length}/20</p>
          </div>

          {/* Account info */}
          <div className="rounded-2xl bg-(--ui-card) border border-(--ui-border) p-5 space-y-3">
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-(--ui-fg-muted) opacity-80">
              Акаунт
            </p>
            {email && (
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-(--ui-fg-muted)">Email</span>
                <span className={`text-[12px] font-medium ${currentTheme.textMain}`}>{email}</span>
              </div>
            )}
            {provider && (
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-(--ui-fg-muted)">Провайдер</span>
                <ProviderBadge provider={provider} />
              </div>
            )}
          </div>

          {/* Push notifications + Install app */}
          {(pushSupported || canInstall) && (
            <div className="rounded-2xl bg-(--ui-card) border border-(--ui-border) p-5 space-y-4">
              <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-(--ui-fg-muted) opacity-80">
                Сповіщення і застосунок
              </p>

              {pushSupported && (
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-(--ui-fg)">Push-сповіщення</span>
                  {pushPermission === 'granted' ? (
                    <button
                      onClick={pushUnsubscribe}
                      disabled={pushLoading}
                      className="text-[11px] font-medium px-3 py-1.5 rounded-full transition-all bg-[color-mix(in_srgb,var(--ui-success)_16%,transparent)] text-(--ui-success) hover:bg-[color-mix(in_srgb,var(--ui-success)_24%,transparent)] disabled:opacity-50"
                    >
                      {pushLoading ? '...' : '✓ Увімкнено'}
                    </button>
                  ) : pushPermission === 'denied' ? (
                    <span className="text-[11px] text-(--ui-fg-muted)">Заблоковано</span>
                  ) : (
                    <button
                      onClick={pushSubscribe}
                      disabled={pushLoading}
                      className={`text-[11px] font-medium px-3 py-1.5 rounded-full transition-all ${currentTheme.button} disabled:opacity-50`}
                    >
                      {pushLoading ? '...' : 'Увімкнути'}
                    </button>
                  )}
                </div>
              )}

              {canInstall && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]! text-(--ui-fg-muted) opacity-80">
                      install_mobile
                    </span>
                    <span className="text-[12px] text-(--ui-fg)">На головний екран</span>
                  </div>
                  <button
                    onClick={install}
                    className={`text-[11px] font-medium px-3 py-1.5 rounded-full transition-all active:scale-95 ${currentTheme.button}`}
                  >
                    Встановити
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className="px-6 md:px-8 py-4"
          style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full h-14 ${currentTheme.button} rounded-full flex items-center justify-center gap-2 font-sans font-bold text-[10px] uppercase tracking-[0.3em] transition-all active:scale-[0.98] disabled:opacity-50`}
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : saved ? (
              <>
                <Check size={14} /> Збережено
              </>
            ) : (
              'Зберегти'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────
   LobbySettingsScreen — save default lobby settings
────────────────────────────────────────────────── */
export const LobbySettingsScreen = () => {
  const { setGameState, currentTheme, settings: gameSettings, sendAction } = useGame();
  const isDark = currentTheme.isDark;

  // Local copy of settings for editing (don't affect live game)
  const [local, setLocal] = useState({ ...gameSettings });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLobbySettings()
      .then((s) => {
        if (s) setLocal((prev) => ({ ...prev, ...(s as any) }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setGeneral = <K extends keyof typeof gameSettings.general>(
    key: K,
    value: (typeof gameSettings.general)[K]
  ) => setLocal((prev) => ({ ...prev, general: { ...prev.general, [key]: value } }));

  const setMode = (patch: Partial<typeof gameSettings.mode>) =>
    setLocal((prev) => ({ ...prev, mode: { ...(prev as any).mode, ...(patch as any) } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { theme, soundEnabled, soundPreset, ...syncedGeneral } = (local as any).general ?? {};
      const syncedOnly = { ...(local as any), general: syncedGeneral };
      await saveLobbySettings(syncedOnly as any);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const handleReset = async () => {
    await saveLobbySettings({} as any).catch(() => {});
    setLocal({ ...gameSettings });
  };

  const cats = [
    Category.GENERAL,
    Category.FOOD,
    Category.TRAVEL,
    Category.SCIENCE,
    Category.MOVIES,
  ];

  const sectionLabel = `text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`;
  const chip = (active: boolean) =>
    `flex-1 py-3 rounded-xl border font-sans font-bold text-[11px] transition-all ${
      active
        ? 'bg-(--ui-accent) text-(--ui-accent-contrast) border-(--ui-accent)'
        : 'bg-(--ui-surface) border-(--ui-border) text-(--ui-fg-muted) hover:text-(--ui-fg) hover:bg-(--ui-surface-hover)'
    }`;

  return (
    <div className="flex flex-col min-h-screen items-center bg-(--ui-bg)">
      <div className="max-w-2xl w-full flex-1 flex flex-col">
        <header className="flex items-center justify-between px-6 md:px-8 pt-12 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setGameState(GameState.PROFILE)}
              className={`p-2 transition-all active:scale-90 ${currentTheme.iconColor} opacity-50 hover:opacity-100`}
            >
              <ArrowLeft size={22} />
            </button>
            <h2 className={`font-serif text-2xl tracking-wide ${currentTheme.textMain}`}>
              Налаштування лоббі
            </h2>
          </div>
          <button
            onClick={handleReset}
            className="text-[9px] uppercase tracking-widest font-bold transition-opacity text-(--ui-fg-muted) hover:text-(--ui-fg)"
          >
            Скинути
          </button>
        </header>

        {loading ? (
          <div className="flex-1 flex justify-center pt-16">
            <Loader2 size={24} className={`animate-spin ${currentTheme.iconColor} opacity-40`} />
          </div>
        ) : (
          <div
            className="flex-1 overflow-y-auto px-6 md:px-8 py-4 space-y-8 pb-28"
            style={{ scrollbarWidth: 'none' }}
          >
            {/* Language */}
            <div className="space-y-3">
              <p className={sectionLabel}>Мова слів</p>
              <div className="flex gap-2">
                {[Language.UA, Language.DE, Language.EN].map((l) => (
                  <button
                    key={l}
                    onClick={() => setGeneral('language', l)}
                    className={chip(local.general.language === l)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Round time */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className={sectionLabel}>Час раунду</p>
                <span className="text-(--ui-accent) font-bold text-sm">
                  {'classicRoundTime' in local.mode ? local.mode.classicRoundTime : 0}с
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="180"
                step="10"
                value={'classicRoundTime' in local.mode ? local.mode.classicRoundTime : 0}
                onChange={(e) => setMode({ classicRoundTime: parseInt(e.target.value) } as any)}
                className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-(--ui-accent) bg-(--ui-border)"
                style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
              />
              <div
                className={`flex justify-between text-[9px] opacity-30 ${currentTheme.textMain}`}
              >
                <span>30с</span>
                <span>180с</span>
              </div>
            </div>

            {/* Score to win */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className={sectionLabel}>Рахунок для перемоги</p>
                <span className="text-(--ui-accent) font-bold text-sm">
                  {local.general.scoreToWin}
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={local.general.scoreToWin}
                onChange={(e) => setGeneral('scoreToWin', parseInt(e.target.value) as any)}
                className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-(--ui-accent) bg-(--ui-border)"
                style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
              />
            </div>

            {/* Skip penalty */}
            <div className="flex items-center justify-between">
              <div>
                <p className={sectionLabel}>Штраф за пропуск</p>
                <p className="text-[11px] mt-0.5 text-(--ui-fg-muted) opacity-70">
                  −1 очко за пропущене слово
                </p>
              </div>
              <button
                onClick={() => setGeneral('skipPenalty', !local.general.skipPenalty as any)}
                className={`w-12 h-7 rounded-full transition-all relative ${local.general.skipPenalty ? 'bg-(--ui-accent)' : 'bg-(--ui-border)'}`}
              >
                <span
                  className={`absolute top-0.5 w-6 h-6 bg-(--ui-fg) rounded-full shadow transition-all ${local.general.skipPenalty ? 'right-0.5' : 'left-0.5'}`}
                />
              </button>
            </div>

            {/* Categories */}
            <div className="space-y-3">
              <p className={sectionLabel}>Категорії слів</p>
              <div className="grid grid-cols-2 gap-2">
                {cats.map((cat) => {
                  const active = ((local.general.categories as string[]) || []).includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        const curr = (local.general.categories as string[]) || [];
                        const next = active ? curr.filter((c) => c !== cat) : [...curr, cat];
                        if (next.length > 0) setGeneral('categories', next as any);
                      }}
                      className={`py-3 rounded-xl border font-sans font-bold text-[10px] uppercase tracking-widest transition-all ${
                        active
                          ? 'border-(--ui-accent) bg-[color-mix(in_srgb,var(--ui-accent)_14%,transparent)] text-(--ui-accent)'
                          : 'border-(--ui-border) bg-(--ui-surface) text-(--ui-fg-muted)'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div
          className="px-6 md:px-8 py-4"
          style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full h-14 ${currentTheme.button} rounded-full flex items-center justify-center gap-2 font-sans font-bold text-[10px] uppercase tracking-[0.3em] transition-all active:scale-[0.98] disabled:opacity-50`}
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : saved ? (
              <>
                <Check size={14} /> Збережено
              </>
            ) : (
              'Зберегти як стандартні'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────
   MyWordPacksScreen — custom word packs (locked behind purchase)
────────────────────────────────────────────────── */
const MAX_USER_PACKS = 5;

export const MyWordPacksScreen = () => {
  const { setGameState, currentTheme, settings } = useGame();
  const { authState, profile } = useAuthContext();
  const isDark = currentTheme.isDark;

  const isUnlocked =
    profile?.purchases?.some((pu) => pu.wordPack?.slug === 'feature-custom-packs') ?? false;
  const checkingAccess = authState.status === 'loading';
  const [view, setView] = useState<'list' | 'create'>('list');
  const [decks, setDecks] = useState<CustomDeckSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Create form
  const [deckName, setDeckName] = useState('');
  const [wordsText, setWordsText] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cardBg = 'bg-(--ui-card) border border-(--ui-border)';
  const inputCls = `w-full rounded-2xl px-5 py-4 text-sm font-sans outline-none transition-all ${
    isDark
      ? 'bg-(--ui-surface) border border-(--ui-border) text-(--ui-fg) placeholder:text-(--ui-fg-muted) focus:border-(--ui-accent)'
      : 'bg-(--ui-surface) border border-(--ui-border) text-(--ui-fg) placeholder:text-(--ui-fg-muted) focus:border-(--ui-accent)'
  }`;

  useEffect(() => {
    if (authState.status === 'loading') return;
    if (isUnlocked) {
      fetchMyDecks()
        .then(setDecks)
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [authState.status, isUnlocked]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteCustomDeck(id);
      setDecks((prev) => prev.filter((d) => d.id !== id));
    } catch {}
    setDeleting(null);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setWordsText(text);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleCreate = async () => {
    const name = deckName.trim();
    const words = wordsText
      .split(/[\n,;]+/)
      .map((w) => w.trim())
      .filter(Boolean);
    if (!name) {
      setCreateError('Введіть назву паку');
      return;
    }
    if (words.length < 5) {
      setCreateError('Додайте щонайменше 5 слів');
      return;
    }
    if (decks.length >= MAX_USER_PACKS) {
      setCreateError(`Максимум ${MAX_USER_PACKS} паків`);
      return;
    }

    setCreating(true);
    setCreateError('');
    try {
      const deck = await createCustomDeck({ name, words });
      setDecks((prev) => [deck, ...prev]);
      setDeckName('');
      setWordsText('');
      setView('list');
    } catch (err: any) {
      setCreateError(err.message || 'Помилка створення');
    }
    setCreating(false);
  };

  const STATUS_COLORS: Record<string, string> = {
    approved: 'text-(--ui-success)',
    pending: 'text-(--ui-accent)',
    rejected: 'text-(--ui-danger)',
  };

  if (checkingAccess)
    return (
      <div className="flex flex-col h-screen bg-(--ui-bg) items-center justify-center">
        <Loader2 size={24} className={`animate-spin ${currentTheme.iconColor} opacity-40`} />
      </div>
    );

  // Locked state
  if (!isUnlocked)
    return (
      <div className="flex flex-col h-screen items-center bg-(--ui-bg)">
        <div className="max-w-2xl w-full flex-1 flex flex-col">
          <header className="flex items-center px-6 md:px-8 pt-12 pb-4 gap-3">
            <button
              onClick={() => setGameState(GameState.PROFILE)}
              className={`p-2 transition-all active:scale-90 ${currentTheme.iconColor} opacity-50 hover:opacity-100`}
            >
              <ArrowLeft size={22} />
            </button>
            <h2 className={`font-serif text-2xl tracking-wide ${currentTheme.textMain}`}>
              Мої паки слів
            </h2>
          </header>

          <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6 text-center">
            <div className="w-20 h-20 rounded-full bg-(--ui-surface) flex items-center justify-center border border-(--ui-border)">
              <Lock size={32} className={`${currentTheme.iconColor} opacity-30`} />
            </div>
            <div>
              <h3 className={`font-serif text-2xl mb-2 ${currentTheme.textMain}`}>
                Функція заблокована
              </h3>
              <p className="text-sm leading-relaxed text-(--ui-fg-muted) opacity-80">
                Створюйте власні паки слів для корпоративів, вечірок або класів.{'\n'}
                Розблокуйте цю функцію в Магазині.
              </p>
            </div>
            <button
              onClick={() => setGameState(GameState.STORE)}
              className={`w-full h-14 ${currentTheme.button} rounded-full flex items-center justify-center gap-2 font-sans font-bold text-[10px] uppercase tracking-[0.3em] transition-all active:scale-[0.98]`}
            >
              <ShoppingBag size={16} />
              Відкрити магазин
            </button>
          </div>
        </div>
      </div>
    );

  // Create view
  if (view === 'create')
    return (
      <div className="flex flex-col h-screen items-center bg-(--ui-bg)">
        <div className="max-w-2xl w-full flex-1 flex flex-col">
          <header className="flex items-center px-6 md:px-8 pt-12 pb-4 gap-3">
            <button
              onClick={() => {
                setView('list');
                setCreateError('');
              }}
              className={`p-2 transition-all active:scale-90 ${currentTheme.iconColor} opacity-50 hover:opacity-100`}
            >
              <ArrowLeft size={22} />
            </button>
            <h2 className={`font-serif text-2xl tracking-wide ${currentTheme.textMain}`}>
              Новий пак
            </h2>
          </header>

          <div
            className="flex-1 overflow-y-auto px-6 md:px-8 py-4 space-y-5"
            style={{ scrollbarWidth: 'none' }}
          >
            <div className="space-y-2">
              <label className="text-[9px] font-bold tracking-[0.25em] uppercase text-(--ui-fg-muted) opacity-80">
                Назва паку
              </label>
              <input
                value={deckName}
                onChange={(e) => setDeckName(e.target.value.slice(0, 60))}
                placeholder="наприклад: Офісна вечірка"
                className={inputCls}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-bold tracking-[0.25em] uppercase text-(--ui-fg-muted) opacity-80">
                  Слова
                  <span
                    className={`ml-2 font-normal normal-case tracking-normal text-[10px] opacity-60`}
                  >
                    (кожне з нового рядка або через кому)
                  </span>
                </label>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-(--ui-fg-muted) hover:text-(--ui-fg) transition-colors"
                >
                  <Upload size={12} />
                  Завантажити .txt/.csv
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
              <textarea
                value={wordsText}
                onChange={(e) => setWordsText(e.target.value)}
                placeholder={'яблуко\nбанан\nогірок\n...'}
                rows={10}
                className={`${inputCls} resize-none`}
              />
              <p className="text-[11px] text-(--ui-fg-muted) opacity-70">
                {wordsText.split(/[\n,;]+/).filter((w) => w.trim()).length} слів
              </p>
            </div>

            {createError && (
              <p className="text-(--ui-danger) text-[12px] font-sans">{createError}</p>
            )}
          </div>

          <div
            className="px-6 md:px-8 py-4"
            style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
          >
            <button
              onClick={handleCreate}
              disabled={creating}
              className={`w-full h-14 ${currentTheme.button} rounded-full flex items-center justify-center gap-2 font-sans font-bold text-[10px] uppercase tracking-[0.3em] transition-all active:scale-[0.98] disabled:opacity-50`}
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : 'Створити пак'}
            </button>
          </div>
        </div>
      </div>
    );

  // List view
  return (
    <div className="flex flex-col h-screen bg-(--ui-bg)">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col overflow-hidden">
        <div className="flex justify-center pt-4 pb-2">
          <div className="w-12 h-1 bg-(--ui-border) rounded-full" />
        </div>
        <div className="px-6 md:px-8 pb-5 pt-2 flex justify-between items-center">
          <div>
            <h2 className={`font-serif text-3xl tracking-wide ${currentTheme.textMain}`}>
              Мої паки слів
            </h2>
            <p className="text-[10px] mt-1 text-(--ui-fg-muted) opacity-70">
              {decks.length} / {MAX_USER_PACKS}
            </p>
          </div>
          <button
            onClick={() => setGameState(GameState.PROFILE)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-(--ui-surface) hover:bg-(--ui-surface-hover) border border-(--ui-border)"
          >
            <X size={16} className={`${currentTheme.iconColor} opacity-70`} />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto px-6 space-y-4 pb-28"
          style={{ scrollbarWidth: 'none' }}
        >
          {loading ? (
            <div className="flex justify-center pt-16">
              <Loader2 size={24} className={`animate-spin ${currentTheme.iconColor} opacity-40`} />
            </div>
          ) : decks.length === 0 ? (
            <div
              className={`${cardBg} rounded-2xl px-6 py-12 flex flex-col items-center gap-3 mt-4`}
            >
              <BookOpen size={28} className={`${currentTheme.iconColor} opacity-20`} />
              <p
                className={`text-[12px] font-sans text-center ${currentTheme.textSecondary} opacity-50`}
              >
                Немає паків
              </p>
              <p
                className={`text-[11px] font-sans text-center ${currentTheme.textSecondary} opacity-30`}
              >
                Створіть пак зі своїми словами для корпоративів, вечірок або класу
              </p>
            </div>
          ) : (
            decks.map((deck) => (
              <div key={deck.id} className={`${cardBg} rounded-2xl p-5 space-y-3`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-serif text-[18px] leading-tight ${currentTheme.textMain} truncate`}
                    >
                      {deck.name}
                    </h3>
                    <p className={`text-[11px] font-sans mt-1 ${currentTheme.textSecondary}`}>
                      {deck.wordCount} слів
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(deck.id)}
                    disabled={deleting === deck.id}
                    className="ml-4 p-2 rounded-xl transition-all active:scale-90 disabled:opacity-30 text-(--ui-danger) opacity-70 hover:opacity-100 hover:bg-[color-mix(in_srgb,var(--ui-danger)_12%,transparent)]"
                  >
                    {deleting === deck.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[deck.status] ?? currentTheme.textSecondary}`}
                  >
                    {deck.status === 'approved'
                      ? 'Активний'
                      : deck.status === 'pending'
                        ? 'На розгляді'
                        : 'Відхилено'}
                  </span>
                  {deck.accessCode && (
                    <button
                      onClick={() => handleCopyCode(deck.accessCode!)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold transition-all bg-(--ui-surface) hover:bg-(--ui-surface-hover) text-(--ui-fg-muted) border border-(--ui-border)"
                    >
                      <Copy size={11} />
                      {copied === deck.accessCode ? 'Скопійовано!' : deck.accessCode}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {decks.length < MAX_USER_PACKS && (
          <div
            className="absolute bottom-0 left-0 right-0 px-6 md:px-8 py-4 pointer-events-none flex justify-center"
            style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
          >
            <div className="w-full max-w-2xl pointer-events-auto">
              <button
                onClick={() => setView('create')}
                className={`pointer-events-auto w-full h-14 ${currentTheme.button} rounded-full flex items-center justify-center gap-2 font-sans font-bold text-[10px] uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-[0.98]`}
              >
                <Plus size={16} />
                Створити пак
              </button>
            </div>
          </div>
        )}
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
  const isDark = currentTheme.isDark;

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

  const cardBg = 'bg-(--ui-card) border border-(--ui-border)';
  const inputCls =
    'bg-(--ui-surface) border border-(--ui-border) text-(--ui-fg) placeholder:text-(--ui-fg-muted) focus:border-(--ui-accent)';

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
      setDecks((prev) => prev.filter((d) => d.id !== id));
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
      .map((w) => w.trim())
      .filter(Boolean);

    if (!name) {
      setCreateError('Enter a deck name');
      return;
    }
    if (words.length < 5) {
      setCreateError('Add at least 5 words');
      return;
    }

    setCreating(true);
    setCreateError('');
    try {
      const deck = await createCustomDeck({ name, words });
      setDecks((prev) => [deck, ...prev]);
      setDeckName('');
      setWordsText('');
      setView('list');
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create deck');
    }
    setCreating(false);
  };

  const STATUS_COLORS: Record<string, string> = {
    approved: 'text-(--ui-success)',
    pending: 'text-(--ui-accent)',
    rejected: 'text-(--ui-danger)',
  };

  if (view === 'create') {
    return (
      <div className="flex flex-col h-screen bg-(--ui-bg)">
        {/* Header */}
        <header className="flex items-center px-6 pt-12 pb-4 gap-3">
          <button
            onClick={() => {
              setView('list');
              setCreateError('');
            }}
            className={`p-2 transition-all active:scale-90 ${currentTheme.iconColor} opacity-50 hover:opacity-100`}
          >
            <ArrowLeft size={22} />
          </button>
          <h2 className={`font-serif text-2xl tracking-wide ${currentTheme.textMain}`}>New Deck</h2>
        </header>

        <div
          className="flex-1 overflow-y-auto px-6 py-4 space-y-5"
          style={{ scrollbarWidth: 'none' }}
        >
          {/* Deck name */}
          <div className="space-y-2">
            <label
              className={`text-[9px] font-bold tracking-[0.25em] uppercase ${currentTheme.textSecondary}`}
            >
              Deck Name
            </label>
            <input
              value={deckName}
              onChange={(e) => setDeckName(e.target.value.slice(0, 60))}
              placeholder="e.g. Office Party Pack"
              className={`w-full rounded-2xl px-5 py-4 text-sm font-sans outline-none transition-all ${inputCls}`}
            />
          </div>

          {/* Words input */}
          <div className="space-y-2">
            <label
              className={`text-[9px] font-bold tracking-[0.25em] uppercase ${currentTheme.textSecondary}`}
            >
              Words
              <span
                className={`ml-2 font-normal normal-case tracking-normal text-[11px] ${currentTheme.textSecondary} opacity-50`}
              >
                (one per line or comma-separated)
              </span>
            </label>
            <textarea
              value={wordsText}
              onChange={(e) => setWordsText(e.target.value)}
              placeholder={'apple\nbanana\ncucumber\n...'}
              rows={10}
              className={`w-full rounded-2xl px-5 py-4 text-sm font-sans outline-none transition-all resize-none ${inputCls}`}
            />
            <p className={`text-[11px] ${currentTheme.textSecondary} opacity-40`}>
              {wordsText.split(/[\n,]+/).filter((w) => w.trim()).length} words
            </p>
          </div>

          {createError && <p className="text-(--ui-danger) text-[12px] font-sans">{createError}</p>}
        </div>

        <div
          className="px-6 py-4"
          style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
        >
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
    <div className="flex flex-col h-screen bg-(--ui-bg)">
      {/* Drag handle */}
      <div className="flex justify-center pt-4 pb-2">
        <div className="w-12 h-1 bg-(--ui-border) rounded-full" />
      </div>

      {/* Header */}
      <div className="px-6 pb-5 pt-2 flex justify-between items-center">
        <h2 className={`font-serif text-3xl tracking-wide ${currentTheme.textMain}`}>My Decks</h2>
        <button
          onClick={() => setGameState(GameState.PROFILE)}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-(--ui-surface) hover:bg-(--ui-surface-hover) border border-(--ui-border)"
        >
          <X size={16} className={`${currentTheme.iconColor} opacity-70`} />
        </button>
      </div>

      {/* List */}
      <div
        className="flex-1 overflow-y-auto px-6 space-y-4 pb-28"
        style={{ scrollbarWidth: 'none' }}
      >
        {loading ? (
          <div className="flex justify-center pt-16">
            <Loader2 size={24} className={`animate-spin ${currentTheme.iconColor} opacity-40`} />
          </div>
        ) : decks.length === 0 ? (
          <div className={`${cardBg} rounded-2xl px-6 py-12 flex flex-col items-center gap-3 mt-4`}>
            <BookOpen size={28} className={`${currentTheme.iconColor} opacity-20`} />
            <p
              className={`text-[12px] font-sans text-center ${currentTheme.textSecondary} opacity-50`}
            >
              No custom decks yet
            </p>
            <p
              className={`text-[11px] font-sans text-center ${currentTheme.textSecondary} opacity-30`}
            >
              Create a deck with your own words for corporate events, parties, or classrooms
            </p>
          </div>
        ) : (
          decks.map((deck) => (
            <div key={deck.id} className={`${cardBg} rounded-2xl p-5 space-y-3`}>
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3
                    className={`font-serif text-[18px] leading-tight ${currentTheme.textMain} truncate`}
                  >
                    {deck.name}
                  </h3>
                  <p className={`text-[11px] font-sans mt-1 ${currentTheme.textSecondary}`}>
                    {deck.wordCount} words
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(deck.id)}
                  disabled={deleting === deck.id}
                  className="ml-4 p-2 rounded-xl transition-all active:scale-90 disabled:opacity-30 text-(--ui-danger) opacity-70 hover:opacity-100 hover:bg-[color-mix(in_srgb,var(--ui-danger)_12%,transparent)]"
                >
                  {deleting === deck.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>

              {/* Status + access code */}
              <div className="flex items-center justify-between pt-1">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[deck.status] ?? currentTheme.textSecondary}`}
                >
                  {deck.status}
                </span>
                {deck.accessCode && (
                  <button
                    onClick={() => handleCopyCode(deck.accessCode!)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold transition-all bg-(--ui-surface) hover:bg-(--ui-surface-hover) text-(--ui-fg-muted) border border-(--ui-border)"
                  >
                    <Copy size={11} />
                    {copied === deck.accessCode ? 'Copied!' : deck.accessCode}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB — Create new deck */}
      <div
        className="absolute bottom-0 left-0 right-0 px-6 py-4 pointer-events-none"
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
      >
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
  const { setGameState, currentTheme, settings } = useGame();
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

  // Detect Stripe redirect result
  const purchaseResult = (() => {
    const p = new URLSearchParams(window.location.search).get('purchase');
    return p === 'success' ? 'success' : p === 'cancelled' ? 'cancelled' : null;
  })();
  const [banner, setBanner] = useState<'success' | 'cancelled' | null>(purchaseResult);

  const loadStore = () =>
    fetchStore()
      .then((data) => {
        setWordPacks(data.wordPacks);
        setThemes(data.themes);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    loadStore();
    if (purchaseResult) {
      window.history.replaceState({}, '', window.location.pathname);
      // Auto-hide banner after 4s
      const t = setTimeout(() => setBanner(null), 4000);
      return () => clearTimeout(t);
    }
  }, []);

  const handleAddFree = async (itemType: 'wordPack' | 'theme', itemId: string) => {
    if (!isAuthenticated) {
      setGameState(GameState.PROFILE);
      return;
    }
    setActing(itemId);
    try {
      await claimFreeItem(itemType, itemId);
      // optimistic: mark owned
      if (itemType === 'wordPack') {
        setWordPacks((prev) => prev.map((p) => (p.id === itemId ? { ...p, owned: true } : p)));
      } else {
        setThemes((prev) => prev.map((t) => (t.id === itemId ? { ...t, owned: true } : t)));
      }
    } catch {}
    setActing(null);
  };

  const handleBuy = (itemType: 'wordPack' | 'theme' | 'soundPack', itemId: string) => {
    if (!isAuthenticated) {
      setGameState(GameState.PROFILE);
      return;
    }
    setQuickBuy({ itemType, itemId });
  };

  // Feature packs (special purchasable features, not actual word sets)
  const featurePacks = wordPacks.filter((p) => p.category === 'Feature');

  // Filter + sort: free first, then by language name (exclude feature packs)
  const visiblePacks = wordPacks
    .filter((p) => p.category !== 'Feature' && (langFilter === 'ALL' || p.language === langFilter))
    .sort((a, b) => {
      if (a.isFree && !b.isFree) return -1;
      if (!a.isFree && b.isFree) return 1;
      return a.name.localeCompare(b.name);
    });

  const TAB_LABELS: Record<StoreTab, string> = { packs: 'Набори слів', themes: 'Теми' };

  const cardBg = 'bg-(--ui-card) border border-(--ui-border)';
  const divider = 'border-(--ui-border)';
  const chipBase = 'border border-(--ui-border) text-(--ui-fg-muted) bg-(--ui-surface)';
  const chipActive =
    'border-(--ui-accent) text-(--ui-accent) bg-[color-mix(in_srgb,var(--ui-accent)_12%,transparent)]';

  return (
    <div className="flex flex-col h-screen items-center bg-(--ui-bg) transition-colors duration-500">
      <div className="max-w-2xl w-full flex-1 flex flex-col overflow-hidden">
        {/* Purchase result banner */}
        {banner && (
          <div
            className={`mx-6 md:mx-8 mt-3 mb-0 px-4 py-3 rounded-2xl flex items-center gap-3 transition-all shrink-0 border ${
              banner === 'success'
                ? 'bg-[color-mix(in_srgb,var(--ui-success)_16%,transparent)] border-[color-mix(in_srgb,var(--ui-success)_30%,transparent)]'
                : 'bg-[color-mix(in_srgb,var(--ui-danger)_12%,transparent)] border-[color-mix(in_srgb,var(--ui-danger)_25%,transparent)]'
            }`}
          >
            <span className="text-xl">{banner === 'success' ? '🎉' : '↩️'}</span>
            <div className="flex-1">
              <p
                className={`text-[12px] font-bold ${
                  banner === 'success' ? 'text-(--ui-success)' : 'text-(--ui-danger)'
                }`}
              >
                {banner === 'success' ? 'Оплату прийнято!' : 'Оплату скасовано'}
              </p>
              <p className="text-[10px] text-(--ui-fg-muted) opacity-80">
                {banner === 'success' ? 'Ваша покупка активована' : 'Спробуй ще раз'}
              </p>
            </div>
            <button onClick={() => setBanner(null)} className="opacity-40 hover:opacity-100">
              <X size={14} className={currentTheme.iconColor} />
            </button>
          </div>
        )}

        {/* Drag handle + Header */}
        <div className="flex justify-center pt-4 pb-2 shrink-0">
          <div className="w-12 h-1 bg-(--ui-border) rounded-full" />
        </div>
        <div className="px-6 md:px-8 pb-4 pt-2 flex justify-between items-center shrink-0">
          <h2 className={`font-serif text-3xl tracking-wide ${currentTheme.textMain}`}>Магазин</h2>
          <button
            onClick={() => setGameState(GameState.PROFILE)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-(--ui-surface) hover:bg-(--ui-surface-hover) border border-(--ui-border)"
          >
            <X size={16} className={`${currentTheme.iconColor} opacity-70`} />
          </button>
        </div>

        {/* Tabs — underline style */}
        <div className={`px-6 md:px-8 border-b ${divider} shrink-0`}>
          <div className="flex space-x-8">
            {STORE_TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-3 border-b-2 font-sans font-bold text-[11px] tracking-wider uppercase transition-colors ${
                  tab === t
                    ? 'border-(--ui-accent) text-(--ui-accent)'
                    : 'border-transparent text-(--ui-fg-muted)'
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Language filter chips — only on packs tab */}
        {tab === 'packs' && (
          <div
            className="px-6 md:px-8 pt-4 pb-2 flex gap-2 overflow-x-auto shrink-0"
            style={{ scrollbarWidth: 'none' }}
          >
            {LANG_FILTERS.map((lang) => (
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
              {/* Feature pack card */}
              {featurePacks.map((pack) => (
                <div
                  key={pack.id}
                  className={`rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden border-2 transition-all duration-150 ease-out active:scale-95 ${
                    pack.owned
                      ? 'bg-[color-mix(in_srgb,var(--ui-success)_12%,transparent)] border-[color-mix(in_srgb,var(--ui-success)_30%,transparent)]'
                      : 'border-[color-mix(in_srgb,var(--ui-accent)_40%,transparent)] bg-linear-to-br from-[color-mix(in_srgb,var(--ui-accent)_10%,transparent)] to-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start z-10">
                    <div className="max-w-[60%]">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] font-bold border rounded px-1.5 py-0.5 border-[color-mix(in_srgb,var(--ui-accent)_40%,transparent)] text-(--ui-accent)">
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
                        <Check size={11} className="text-(--ui-success)" />
                        <span className="text-[10px] font-bold uppercase tracking-wide text-(--ui-success)">
                          Куплено
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleBuy('wordPack', pack.id)}
                        disabled={acting === pack.id}
                        className="shrink-0 bg-(--ui-accent) hover:brightness-110 active:scale-95 text-(--ui-accent-contrast) px-5 py-2 rounded-full font-bold text-[12px] shadow-lg min-w-[90px] disabled:opacity-50"
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
                    {pack.isFree && (
                      <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-[color-mix(in_srgb,var(--ui-accent)_8%,transparent)] rounded-full blur-2xl pointer-events-none" />
                    )}
                    <div className="flex justify-between items-start z-10">
                      <div className="max-w-[60%]">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[9px] font-bold border rounded px-1.5 py-0.5 border-(--ui-border) text-(--ui-fg-muted)">
                            {LANG_LABEL[pack.language] ?? pack.language}
                          </span>
                          <span className="text-[9px] font-bold border rounded px-1.5 py-0.5 border-(--ui-border) text-(--ui-fg-muted)">
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

                      {/* Status badge / action button */}
                      {pack.owned ? (
                        <div
                          className={`flex items-center gap-1 px-3 py-1 rounded-full shrink-0 border ${
                            pack.isFree
                              ? 'bg-[color-mix(in_srgb,var(--ui-accent)_12%,transparent)] border-[color-mix(in_srgb,var(--ui-accent)_22%,transparent)]'
                              : 'bg-[color-mix(in_srgb,var(--ui-success)_14%,transparent)] border-[color-mix(in_srgb,var(--ui-success)_25%,transparent)]'
                          }`}
                        >
                          <Check
                            size={11}
                            className={pack.isFree ? 'text-(--ui-accent)' : 'text-(--ui-success)'}
                          />
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wide ${
                              pack.isFree ? 'text-(--ui-accent)' : 'text-(--ui-success)'
                            }`}
                          >
                            {pack.isFree ? 'Додано' : 'Куплено'}
                          </span>
                        </div>
                      ) : pack.isFree ? (
                        <button
                          onClick={() => handleAddFree('wordPack', pack.id)}
                          disabled={acting === pack.id}
                          className="shrink-0 px-5 py-2 rounded-full font-bold text-[12px] transition-all active:scale-95 disabled:opacity-50 bg-(--ui-surface) hover:bg-(--ui-surface-hover) text-(--ui-fg) border border-(--ui-border)"
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
                          className="shrink-0 bg-(--ui-accent) hover:brightness-110 active:scale-95 transition-all text-(--ui-accent-contrast) px-5 py-2 rounded-full font-bold text-[12px] shadow-lg min-w-[90px] disabled:opacity-50"
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
          ) : // Themes tab — all themes with visual preview
          themes.length === 0 ? (
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
                      {/* Color swatch */}
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
                      {/* Info */}
                      <div className="flex-1 p-4 flex flex-col justify-center gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`font-serif text-[16px] leading-tight ${currentTheme.textMain}`}
                          >
                            {theme.name}
                          </p>
                          {theme.isFree && !isBuiltIn && (
                            <span className="text-[8px] font-bold tracking-[0.15em] uppercase px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--ui-accent)_12%,transparent)] text-(--ui-accent) border border-[color-mix(in_srgb,var(--ui-accent)_25%,transparent)]">
                              FREE
                            </span>
                          )}
                          {isBuiltIn && (
                            <span className="text-[8px] font-bold tracking-[0.15em] uppercase px-1.5 py-0.5 rounded bg-(--ui-surface) text-(--ui-fg-muted) border border-(--ui-border)">
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
                      {/* Action */}
                      <div className="px-3 flex items-center shrink-0">
                        {alreadyOwned ? (
                          <div
                            className={`flex items-center gap-1 px-3 py-1 rounded-full border ${
                              isBuiltIn
                                ? 'bg-(--ui-surface) border-(--ui-border)'
                                : 'bg-[color-mix(in_srgb,var(--ui-success)_14%,transparent)] border-[color-mix(in_srgb,var(--ui-success)_25%,transparent)]'
                            }`}
                          >
                            <Check
                              size={10}
                              className={isBuiltIn ? 'text-(--ui-fg-muted)' : 'text-(--ui-success)'}
                            />
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wide ${
                                isBuiltIn ? 'text-(--ui-fg-muted)' : 'text-(--ui-success)'
                              }`}
                            >
                              {isBuiltIn ? 'Стандарт' : 'Отримано'}
                            </span>
                          </div>
                        ) : theme.isFree ? (
                          <button
                            onClick={() => handleAddFree('theme', theme.id)}
                            disabled={acting === theme.id}
                            className="px-4 py-2 rounded-full font-bold text-[11px] transition-all active:scale-95 disabled:opacity-50 bg-(--ui-surface) hover:bg-(--ui-surface-hover) text-(--ui-accent) border border-(--ui-border)"
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
                            className="bg-(--ui-accent) hover:brightness-110 active:scale-95 text-(--ui-accent-contrast) px-4 py-2 rounded-full font-bold text-[11px] shadow-lg disabled:opacity-50"
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

        {/* Bottom bar */}
        <div
          className="px-6 md:px-8 py-4 border-t border-(--ui-border) bg-[color-mix(in_srgb,var(--ui-bg)_92%,transparent)] backdrop-blur shrink-0"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center justify-center gap-1.5">
            <ShieldCheck size={12} className="text-(--ui-fg-muted) opacity-70" />
            <p className="text-[10px] uppercase tracking-widest text-(--ui-fg-muted) opacity-70">
              Оплата через Stripe · Безпечно
            </p>
          </div>
        </div>

        {/* Quick buy modal */}
        {quickBuy && (
          <QuickBuyModal
            itemType={quickBuy.itemType}
            itemId={quickBuy.itemId}
            isDark={isDark}
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

/* ──────────────────────────────────────────────────
   PlayerStatsScreen
────────────────────────────────────────────────── */
export const PlayerStatsScreen = () => {
  const { setGameState, currentTheme, settings } = useGame();
  const { isAuthenticated } = useAuthContext();
  const [showLogin, setShowLogin] = useState(false);
  const { get: getStats } = usePlayerStats();
  const stats = getStats();
  const isDark = currentTheme.isDark;
  const t = TRANSLATIONS[settings.general.language];

  const dateLocale =
    settings.general.language === Language.UA
      ? 'uk-UA'
      : settings.general.language === Language.DE
        ? 'de-DE'
        : 'en-US';

  const accuracy =
    stats.wordsGuessed + stats.wordsSkipped > 0
      ? Math.round((stats.wordsGuessed / (stats.wordsGuessed + stats.wordsSkipped)) * 100)
      : 0;

  const rows = [
    { label: t.statsRowGamesPlayed, value: stats.gamesPlayed, icon: '🎮' },
    { label: t.statsRowWordsGuessed, value: stats.wordsGuessed, icon: '✅' },
    { label: t.statsRowWordsSkipped, value: stats.wordsSkipped, icon: '❌' },
    { label: t.statsRowAccuracy, value: `${accuracy}%`, icon: '🎯' },
  ];

  const goBack = () => {
    setGameState(isAuthenticated ? GameState.PROFILE : GameState.MENU);
  };

  return (
    <div className="flex flex-col min-h-screen items-center bg-(--ui-bg)">
      <div className="max-w-2xl w-full flex-1 flex flex-col">
        <header className="flex items-center px-6 md:px-8 pt-12 pb-4 gap-3">
          <button
            type="button"
            onClick={goBack}
            className={`p-2 transition-all active:scale-90 ${currentTheme.iconColor} opacity-50 hover:opacity-100`}
          >
            <ArrowLeft size={22} />
          </button>
          <h2 className={`font-serif text-2xl tracking-wide ${currentTheme.textMain}`}>
            {t.statsScreenTitle}
          </h2>
        </header>

        <div className="flex-1 px-6 md:px-8 py-4 space-y-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between px-5 py-4 rounded-2xl bg-(--ui-card) border border-(--ui-border)"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{row.icon}</span>
                <span className="text-[13px] font-medium text-(--ui-fg)">{row.label}</span>
              </div>
              <span className={`text-xl font-bold font-serif ${currentTheme.textMain}`}>
                {row.value}
              </span>
            </div>
          ))}

          {stats.lastPlayed && (
            <p className="text-center text-[11px] pt-4 text-(--ui-fg-muted) opacity-70">
              {t.statsLastPlayedPrefix} {new Date(stats.lastPlayed).toLocaleDateString(dateLocale)}
            </p>
          )}

          {!isAuthenticated && (
            <div className="mt-6 rounded-2xl border px-5 py-4 bg-[color-mix(in_srgb,var(--ui-accent)_12%,transparent)] border-[color-mix(in_srgb,var(--ui-accent)_25%,transparent)]">
              <p className="text-[13px] leading-relaxed font-sans text-(--ui-fg)">
                {t.statsGuestBannerBody}
              </p>
              <button
                type="button"
                onClick={() => setShowLogin(true)}
                className={`mt-4 w-full py-3 rounded-xl font-sans text-[11px] font-bold uppercase tracking-[0.2em] ${currentTheme.button}`}
              >
                {t.statsGuestBannerCta}
              </button>
            </div>
          )}
        </div>
      </div>

      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} onSuccess={() => setShowLogin(false)} />
      )}
    </div>
  );
};
