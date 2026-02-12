
import React, { useState, useEffect } from 'react';
import { X, Settings as SettingsIcon, Check, Plus, Minus } from 'lucide-react';
import { Button } from '../components/Button';
import { ConfirmationModal } from '../components/Shared';
import { GameState, AppTheme, Language, Category, GameSettings, SoundPreset } from '../types';
import { useGame } from '../context/GameContext';
import { TRANSLATIONS, THEME_CONFIG } from '../constants';
import QRCode from 'qrcode';
import { AVATARS } from '../context/GameContext';

export const LobbyScreen = () => {
  const { setGameState, currentTheme, roomCode, players, settings, sendAction, isHost, gameMode, myPlayerId, peerError, isConnected, addOfflinePlayer, removeOfflinePlayer } = useGame();
  const t = TRANSLATIONS[settings.language];
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerAvatar, setNewPlayerAvatar] = useState(AVATARS[0]);

  const joinUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${roomCode}`;

  useEffect(() => {
    if (gameMode === 'ONLINE' && roomCode) {
      QRCode.toDataURL(joinUrl, { margin: 1 }).then(setQrCodeData).catch(console.error);
    }
  }, [joinUrl, gameMode, roomCode]);

  const canCreateTeams = gameMode === 'OFFLINE' ? players.length >= 2 : players.length >= 2;

  return (
    <div className={`flex flex-col min-h-screen ${currentTheme.bg} p-8`}>
      <ConfirmationModal
        isOpen={showExitConfirm}
        title={t.leaveLobbyConfirm}
        message={t.leaveLobbyMsg}
        isDanger
        theme={currentTheme}
        onCancel={() => setShowExitConfirm(false)}
        onConfirm={() => setGameState(GameState.MENU)}
        confirmText={t.confirmExit}
        cancelText={t.goBack}
      />

      <header className="flex justify-between items-center py-6 mb-4">
        <button onClick={() => setShowExitConfirm(true)} className="p-2 opacity-30 hover:opacity-100 transition-opacity">
          <X size={20} className={currentTheme.iconColor} />
        </button>
        <h2 className={`text-[10px] font-sans uppercase tracking-[0.4em] font-bold ${currentTheme.textSecondary}`}>{t.lobby}</h2>
        {isHost ? (
          <button onClick={() => setGameState(GameState.SETTINGS)} className="p-2 opacity-30 hover:opacity-100 transition-opacity">
            <SettingsIcon size={20} className={currentTheme.iconColor} />
          </button>
        ) : (
          <div className="w-10"></div>
        )}
      </header>

      {/* Connection Error Display */}
      {!isHost && peerError && !isConnected && (
        <div className="w-full max-w-sm mx-auto mb-6">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center animate-shake">
            <p className="text-red-400 font-sans text-sm mb-2 font-bold uppercase tracking-wider">{t.connectionFailed}</p>
            <p className="text-red-300/60 text-xs">{t.roomNotFound.replace('{0}', roomCode)}</p>
            <button
              onClick={() => setGameState(GameState.JOIN_INPUT)}
              className="mt-4 px-6 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-xl text-red-300 text-xs uppercase tracking-wider transition-colors"
            >
              {t.tryAgain}
            </button>
          </div>
        </div>
      )}

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
                <div className="ml-auto flex items-center gap-3">
                  {p.id === myPlayerId && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg" />}
                  {isHost && !p.isHost && p.id !== myPlayerId && gameMode === 'ONLINE' && (
                    <button
                      onClick={() => sendAction({ action: 'KICK_PLAYER', data: p.id })}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 border border-red-500/30 transition-colors group"
                      title="Kick player"
                    >
                      <X size={14} className="text-red-400 group-hover:text-red-300" />
                    </button>
                  )}
                  {isHost && gameMode === 'OFFLINE' && !p.isHost && (
                    <button
                      onClick={() => removeOfflinePlayer(p.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 border border-red-500/30 transition-colors group"
                    >
                      <Minus size={14} className="text-red-400 group-hover:text-red-300" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Player button for offline mode */}
          {isHost && gameMode === 'OFFLINE' && (
            <button
              onClick={() => {
                setNewPlayerName('');
                setNewPlayerAvatar(AVATARS[(players.length + 1) % AVATARS.length]);
                setShowAddPlayer(true);
              }}
              className={`w-full flex items-center justify-center gap-3 p-4 rounded-2xl border border-dashed transition-all ${settings.theme === AppTheme.PREMIUM_DARK ? 'border-white/10 hover:border-white/30 text-white/30 hover:text-white/60' : 'border-slate-300 hover:border-slate-400 text-slate-400 hover:text-slate-600'}`}
            >
              <Plus size={18} />
              <span className="text-[10px] uppercase tracking-widest font-bold">{t.addPlayer}</span>
            </button>
          )}

          {/* Add Player Modal */}
          {showAddPlayer && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-fade-in">
              <div className={`relative w-full max-w-sm p-10 rounded-[2.5rem] shadow-2xl ${currentTheme.card} animate-pop-in`}>
                <button onClick={() => setShowAddPlayer(false)} className="absolute top-8 right-8 opacity-40 hover:opacity-100 transition-opacity">
                  <X size={24} className={currentTheme.iconColor} />
                </button>
                <h2 className={`text-2xl font-serif mb-8 text-center ${currentTheme.textMain}`}>{t.addPlayerTitle}</h2>
                <div className="space-y-6">
                  <input
                    autoFocus
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value.replace(/<[^>]*>/g, '').slice(0, 20))}
                    placeholder={t.namePlaceholder}
                    className={`w-full ${settings.theme === AppTheme.PREMIUM_DARK ? 'bg-white/5 border-white/5 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-2xl px-6 py-4 focus:outline-none focus:border-champagne-gold transition-all font-sans font-bold text-center text-sm`}
                  />
                  <div className="grid grid-cols-6 gap-2">
                    {AVATARS.slice(0, 12).map(a => (
                      <button
                        key={a}
                        onClick={() => setNewPlayerAvatar(a)}
                        className={`text-2xl p-2 rounded-xl transition-all ${newPlayerAvatar === a ? 'bg-champagne-gold/20 scale-110 shadow-lg' : 'hover:bg-white/5 opacity-50 hover:opacity-100'}`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  <Button
                    themeClass={currentTheme.button}
                    fullWidth
                    size="lg"
                    onClick={() => {
                      const name = newPlayerName.trim();
                      if (name) {
                        addOfflinePlayer(name, newPlayerAvatar);
                        setShowAddPlayer(false);
                      }
                    }}
                    disabled={!newPlayerName.trim()}
                  >
                    {t.add}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="w-full max-w-sm mx-auto py-8">
        {isHost ? (
          <Button themeClass={currentTheme.button} fullWidth size="xl" onClick={() => sendAction({ action: 'GENERATE_TEAMS' })} disabled={!canCreateTeams}>
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

  // Check that all teams have at least one player
  const allTeamsHavePlayers = teams.every(team => team.players.length > 0);

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
                        <span className={`ml-auto text-[10px] ${currentTheme.textSecondary}`}>({team.players.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {team.players.map((p: any) => (
                            <div key={p.id} className="bg-white/5 border border-white/5 px-3 py-1.5 rounded-full flex items-center gap-2">
                                <span>{p.avatar}</span>
                                <span className={`text-[10px] uppercase tracking-widest font-bold ${currentTheme.textSecondary}`}>{p.name}</span>
                            </div>
                        ))}
                        {team.players.length === 0 && (
                          <span className={`text-[10px] italic ${currentTheme.textSecondary} opacity-50`}>{t.noPlayersInTeam}</span>
                        )}
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
                <Button themeClass={currentTheme.button} fullWidth size="xl" onClick={() => sendAction({ action: 'START_GAME' })} disabled={!allTeamsHavePlayers}>
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
  const { settings, currentTheme, setGameState, isHost, sendAction, gameState } = useGame();
  const t = TRANSLATIONS[settings.language];

  const updateSetting = (key: keyof GameSettings, value: any) => {
    if (!isHost) return;
    if (gameState !== GameState.LOBBY && gameState !== GameState.MENU && gameState !== GameState.SETTINGS) return;
    const newSettings = { ...settings, [key]: value };
    sendAction({ action: 'UPDATE_SETTINGS', data: newSettings });
  };

  const categoriesList = [Category.GENERAL, Category.FOOD, Category.TRAVEL, Category.SCIENCE, Category.MOVIES, Category.CUSTOM];

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
                    {categoriesList.map(cat => {
                        const catKey = `cat_${cat.toLowerCase()}` as keyof typeof t;
                        return (
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
                              {t[catKey] || cat}
                          </button>
                        );
                    })}
                </div>
            </div>

            {settings.categories.includes(Category.CUSTOM) && (
                <div className="space-y-4">
                    <p className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}>{t.customWords}</p>
                    <textarea
                        value={settings.customWords || ''}
                        onChange={(e) => updateSetting('customWords', e.target.value)}
                        placeholder={t.customWordsPlaceholder || "Enter words separated by commas..."}
                        className={`w-full h-24 p-4 rounded-xl border resize-none ${currentTheme.bg} ${currentTheme.textMain} border-white/10 focus:border-yellow-500 outline-none`}
                    />
                </div>
            )}

            <div className="space-y-4">
                <div className="flex justify-between">
                    <p className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}>{t.scoreToWin}</p>
                    <span className={`text-xs font-bold ${currentTheme.textAccent}`}>{settings.scoreToWin}</span>
                </div>
                <input
                    type="range" min="10" max="100" step="5"
                    value={settings.scoreToWin}
                    onChange={(e) => updateSetting('scoreToWin', parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
            </div>

            <div className="space-y-4">
                <div className="flex justify-between">
                    <p className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}>{t.teamCount}</p>
                    <span className={`text-xs font-bold ${currentTheme.textAccent}`}>{settings.teamCount}</span>
                </div>
                <input
                    type="range" min="2" max="10" step="1"
                    value={settings.teamCount}
                    onChange={(e) => updateSetting('teamCount', parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
            </div>

            <div className="space-y-4">
                <p className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}>{t.skipPenalty}</p>
                <button
                    onClick={() => updateSetting('skipPenalty', !settings.skipPenalty)}
                    className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${settings.skipPenalty ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/5 bg-white/5 opacity-40'}`}
                >
                    <span className={currentTheme.textMain}>{settings.skipPenalty ? t.enabled : t.disabled}</span>
                    <div className={`w-12 h-6 rounded-full transition-all relative ${settings.skipPenalty ? 'bg-yellow-500' : 'bg-white/20'}`}>
                        <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${settings.skipPenalty ? 'right-0.5' : 'left-0.5'}`} />
                    </div>
                </button>
            </div>

            <div className="space-y-4">
                <p className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}>{t.sound}</p>
                <button
                    onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}
                    className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${settings.soundEnabled ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/5 bg-white/5 opacity-40'}`}
                >
                    <span className={currentTheme.textMain}>{settings.soundEnabled ? t.enabled : t.disabled}</span>
                    <div className={`w-12 h-6 rounded-full transition-all relative ${settings.soundEnabled ? 'bg-yellow-500' : 'bg-white/20'}`}>
                        <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${settings.soundEnabled ? 'right-0.5' : 'left-0.5'}`} />
                    </div>
                </button>
            </div>

            {settings.soundEnabled && (
                <div className="space-y-4">
                    <p className={`text-[9px] uppercase tracking-widest opacity-40 font-bold ${currentTheme.textMain}`}>{t.soundPreset}</p>
                    <div className="grid grid-cols-3 gap-2">
                        {[SoundPreset.FUN, SoundPreset.MINIMAL, SoundPreset.EIGHT_BIT].map(preset => (
                            <button
                                key={preset}
                                onClick={() => updateSetting('soundPreset', preset)}
                                className={`p-3 rounded-xl border text-[9px] uppercase tracking-widest font-bold transition-all ${settings.soundPreset === preset ? 'border-yellow-500 bg-yellow-500 text-black' : 'border-white/5 bg-white/5 text-white/40'}`}
                            >
                                {preset.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
            <Button themeClass={currentTheme.button} fullWidth size="xl" onClick={() => setGameState(GameState.LOBBY)}>
                {t.save}
            </Button>
        </div>
    </div>
  );
};
