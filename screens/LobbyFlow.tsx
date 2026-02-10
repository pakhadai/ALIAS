
import React, { useState, useEffect } from 'react';
import { X, Settings as SettingsIcon, Check } from 'lucide-react';
import { Button } from '../components/Button';
import { ConfirmationModal } from '../components/Shared';
import { GameState, AppTheme, Language, Category, GameSettings } from '../types';
import { useGame } from '../context/GameContext';
import { TRANSLATIONS, THEME_CONFIG } from '../constants';
import QRCode from 'qrcode';

export const LobbyScreen = () => {
  const { setGameState, currentTheme, roomCode, players, settings, sendAction, isHost, gameMode, myPlayerId } = useGame();
  const t = TRANSLATIONS[settings.language];
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  const joinUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${roomCode}`;

  useEffect(() => {
    if (gameMode === 'ONLINE' && roomCode) {
      QRCode.toDataURL(joinUrl, { margin: 1 }).then(setQrCodeData).catch(console.error);
    }
  }, [joinUrl, gameMode, roomCode]);

  return (
    <div className={`flex flex-col min-h-screen ${currentTheme.bg} p-8`}>
      <ConfirmationModal isOpen={showExitConfirm} title={t.leaveLobbyConfirm} message={t.leaveLobbyMsg} isDanger onCancel={() => setShowExitConfirm(false)} onConfirm={() => setGameState(GameState.MENU)} />
      
      <header className="flex justify-between items-center py-6 mb-4">
        <button onClick={() => setShowExitConfirm(true)} className="p-2 opacity-30 hover:opacity-100 transition-opacity">
          <X size={20} className={currentTheme.iconColor} />
        </button>
        <h2 className={`text-[10px] font-sans uppercase tracking-[0.4em] font-bold ${currentTheme.textSecondary}`}>{t.lobby}</h2>
        <button onClick={() => setGameState(GameState.SETTINGS)} className="p-2 opacity-30 hover:opacity-100 transition-opacity">
          <SettingsIcon size={20} className={currentTheme.iconColor} />
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center space-y-10">
        {gameMode === 'ONLINE' && qrCodeData && (
          <div className="w-full max-w-xs text-center space-y-4">
            <div className="bg-white p-4 rounded-3xl inline-block shadow-2xl">
              <img src={qrCodeData} alt="QR" className="w-32 h-32" />
            </div>
            <p className={`text-[8px] uppercase tracking-[0.5em] font-bold ${currentTheme.textSecondary}`}>{t.roomCode}</p>
            <span className={`text-4xl font-serif tracking-[0.2em] ${currentTheme.textMain}`}>{roomCode}</span>
          </div>
        )}

        <div className="w-full max-w-sm space-y-6">
          <h3 className={`font-serif text-xl ${currentTheme.textMain}`}>{t.players} ({players.length})</h3>
          <div className="space-y-3">
            {players.map((p: any) => (
              <div key={p.id} className={`flex items-center p-4 rounded-2xl border ${settings.theme === AppTheme.PREMIUM_DARK ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100'}`}>
                <span className="text-2xl">{p.avatar}</span>
                <span className={`ml-4 font-bold ${currentTheme.textMain}`}>{p.name}</span>
                {p.id === myPlayerId && <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500 shadow-lg" />}
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="w-full max-w-sm mx-auto py-8">
        {isHost ? (
          <Button themeClass={currentTheme.button} fullWidth size="xl" onClick={() => { sendAction({ action: 'GENERATE_TEAMS' }); setGameState(GameState.TEAMS); }} disabled={players.length < 2}>
            {t.createTeams}
          </Button>
        ) : (
          <p className="text-center text-[10px] uppercase tracking-widest opacity-40 animate-pulse">{t.waitHost}</p>
        )}
      </footer>
    </div>
  );
};

export const TeamSetupScreen = () => {
  const { teams, settings, currentTheme, sendAction, setGameState, isHost } = useGame();
  const t = TRANSLATIONS[settings.language];

  return (
    <div className={`flex flex-col min-h-screen ${currentTheme.bg} p-8`}>
        <header className="flex justify-between items-center py-6 mb-8">
            <button onClick={() => setGameState(GameState.LOBBY)} className="p-2 opacity-30 hover:opacity-100 transition-opacity">
                <X size={20} className={currentTheme.iconColor} />
            </button>
            <h2 className={`text-[10px] font-sans uppercase tracking-[0.4em] font-bold ${currentTheme.textSecondary}`}>{t.teams}</h2>
            <div className="w-10"></div>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar">
            {teams.map((team: any) => (
                <div key={team.id} className={`p-6 rounded-3xl border ${settings.theme === AppTheme.PREMIUM_DARK ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-3 h-3 rounded-full ${team.color}`} />
                        <h3 className={`font-serif text-xl ${currentTheme.textMain}`}>{team.name}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {team.players.map((p: any) => (
                            <div key={p.id} className="bg-white/5 border border-white/5 px-3 py-1.5 rounded-full flex items-center gap-2">
                                <span>{p.avatar}</span>
                                <span className={`text-[10px] uppercase tracking-widest font-bold ${currentTheme.textSecondary}`}>{p.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>

        <footer className="py-8 space-y-4">
            {isHost && (
                <button 
                    onClick={() => sendAction({ action: 'GENERATE_TEAMS' })}
                    className={`w-full text-center text-[9px] uppercase tracking-[0.4em] font-bold opacity-30 hover:opacity-100 transition-opacity mb-4 ${currentTheme.textMain}`}
                >
                    {t.shuffle}
                </button>
            )}
            {isHost ? (
                <Button themeClass={currentTheme.button} fullWidth size="xl" onClick={() => sendAction({ action: 'START_ROUND' })}>
                    {t.startGame}
                </Button>
            ) : (
                <p className="text-center text-[10px] uppercase tracking-widest opacity-40 animate-pulse">{t.waitTeams}</p>
            )}
        </footer>
    </div>
  );
};

export const SettingsScreen = () => {
  const { settings, currentTheme, setGameState, isHost, sendAction } = useGame();
  const t = TRANSLATIONS[settings.language];

  const updateSetting = (key: keyof GameSettings, value: any) => {
    if (!isHost) return;
    const newSettings = { ...settings, [key]: value };
    sendAction({ action: 'UPDATE_SETTINGS', data: newSettings });
  };

  const categoriesList = [Category.GENERAL, Category.FOOD, Category.TRAVEL, Category.SCIENCE, Category.MOVIES];

  return (
    <div className={`flex flex-col min-h-screen ${currentTheme.bg} p-8 overflow-y-auto no-scrollbar`}>
        <header className="flex justify-between items-center py-6 mb-8">
            <button onClick={() => setGameState(GameState.LOBBY)} className="p-2 opacity-30 hover:opacity-100 transition-opacity">
                <X size={20} className={currentTheme.iconColor} />
            </button>
            <h2 className={`text-[10px] font-sans uppercase tracking-[0.4em] font-bold ${currentTheme.textSecondary}`}>{t.settings}</h2>
            <div className="w-10"></div>
        </header>

        <div className="w-full max-w-sm mx-auto space-y-10 pb-32">
            <div className="space-y-4">
                <p className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}>{t.language}</p>
                <div className="flex gap-2">
                    {[Language.UA, Language.DE, Language.EN].map(l => (
                        <button 
                            key={l}
                            onClick={() => updateSetting('language', l)}
                            className={`flex-1 py-3 rounded-xl border transition-all ${settings.language === l ? 'bg-champagne-gold text-black border-champagne-gold' : 'bg-white/5 border-white/5 text-white/40'}`}
                        >
                            {l}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <p className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}>{t.theme}</p>
                <div className="grid grid-cols-1 gap-3">
                    {[AppTheme.PREMIUM_DARK, AppTheme.PREMIUM_LIGHT, AppTheme.CYBERPUNK].map(themeId => (
                        <button 
                            key={themeId}
                            onClick={() => updateSetting('theme', themeId)}
                            className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between ${settings.theme === themeId ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/5 bg-white/5 opacity-40'}`}
                        >
                            <span className={currentTheme.textMain}>{THEME_CONFIG[themeId].name}</span>
                            {settings.theme === themeId && <Check size={16} className="text-yellow-500" />}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between">
                    <p className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}>{t.roundTime}</p>
                    <span className={`text-xs font-bold ${currentTheme.textAccent}`}>{settings.roundTime}s</span>
                </div>
                <input 
                    type="range" min="30" max="180" step="10"
                    value={settings.roundTime}
                    onChange={(e) => updateSetting('roundTime', parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
            </div>

            <div className="space-y-4">
                <p className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}>{t.categories}</p>
                <div className="grid grid-cols-2 gap-3">
                    {categoriesList.map(cat => (
                        <button 
                            key={cat}
                            onClick={() => {
                                const newCats = settings.categories.includes(cat) 
                                    ? settings.categories.filter(c => c !== cat) 
                                    : [...settings.categories, cat];
                                if (newCats.length > 0) updateSetting('categories', newCats);
                            }}
                            className={`p-3 rounded-xl border text-[10px] uppercase tracking-widest font-bold transition-all ${settings.categories.includes(cat) ? 'border-yellow-500 bg-yellow-500 text-black' : 'border-white/5 bg-white/5 text-white/40'}`}
                        >
                            {t[`cat_${cat.toLowerCase() as 'general' | 'food' | 'travel' | 'science' | 'movies'}`]}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
            <Button themeClass={currentTheme.button} fullWidth size="xl" onClick={() => setGameState(GameState.LOBBY)}>
                {t.save}
            </Button>
        </div>
    </div>
  );
};