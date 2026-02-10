
import React, { useState, useEffect } from 'react';
import { X, Settings as SettingsIcon, Shuffle, Trash2, Check, Globe, Palette, Clock, Trophy, Users, AlertCircle, ArrowRight, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ConfirmationModal } from '../components/Shared';
import { GameState, Category, AppTheme, Language } from '../types';
import { useGame, AVATARS } from '../context/GameContext';
import { TRANSLATIONS, THEME_CONFIG } from '../constants';
import QRCode from 'qrcode';

export const LobbyScreen = () => {
  const { setGameState, currentTheme, roomCode, players, setPlayers, settings, generateTeams, isHost, handleKickPlayer, gameMode, handleJoin, myPlayerId } = useGame();
  const t = TRANSLATIONS[settings.language];
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const joinUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${roomCode}`;

  useEffect(() => {
      if (gameMode === 'ONLINE' && roomCode) {
        QRCode.toDataURL(joinUrl, { margin: 1, color: { dark: '#000000', light: '#ffffff' } })
          .then(url => setQrCodeData(url))
          .catch(err => console.error(err));
      }
  }, [joinUrl, gameMode, roomCode]);

  const addBotPlayer = () => {
    const used = new Set(players.map(p => p.avatar));
    const avatar = AVATARS.find(a => !used.has(a)) || AVATARS[0];
    setPlayers(prev => [...prev, { id: `bot-${Date.now()}`, name: `${t.bot} ${prev.length + 1}`, avatar, isHost: false, stats: { explained: 0 } }]);
  };

  const handleAddManualPlayer = () => {
      if (newPlayerName.trim()) {
          const used = new Set(players.map(p => p.avatar));
          handleJoin(`manual-${Date.now()}`, newPlayerName.trim(), AVATARS.find(a => !used.has(a)) || AVATARS[0]);
          setNewPlayerName('');
          setIsAddingPlayer(false);
      }
  };

  return (
    <div className={`flex flex-col min-h-screen ${currentTheme.bg} p-8 transition-colors`}>
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
        {gameMode === 'ONLINE' && (
          <div className="w-full max-w-xs text-center space-y-8 animate-fade-in">
            <div className="flex justify-center">
              <div className="bg-white p-5 rounded-[2.5rem] shadow-2xl ring-1 ring-black/5">
                {qrCodeData && <img src={qrCodeData} alt="QR" className="w-36 h-36 opacity-90" />}
              </div>
            </div>
            <div className="space-y-2">
              <p className={`text-[8px] uppercase tracking-[0.5em] font-bold ${currentTheme.textSecondary} opacity-60`}>{t.roomCode}</p>
              <span className={`text-5xl font-serif tracking-[0.2em] ${currentTheme.textMain}`}>{roomCode}</span>
            </div>
          </div>
        )}

        <div className="w-full max-w-sm space-y-8">
          <div className="flex justify-between items-end px-2">
            <h3 className={`font-serif text-2xl ${currentTheme.textMain}`}>{t.players} <span className="text-[10px] font-sans opacity-20 ml-2 tracking-widest uppercase">/ {players.length}</span></h3>
            {isHost && (
              <button onClick={gameMode === 'OFFLINE' ? () => setIsAddingPlayer(!isAddingPlayer) : addBotPlayer} className={`text-[9px] font-bold uppercase tracking-[0.3em] ${currentTheme.textAccent} hover:scale-105 transition-transform`}>
                + {t.addPlayer}
              </button>
            )}
          </div>

          {isAddingPlayer && (
            <div className="flex gap-4 animate-slide-up">
              <input 
                autoFocus
                value={newPlayerName} 
                onChange={e => setNewPlayerName(e.target.value)} 
                placeholder={t.nameInput}
                className={`flex-1 ${settings.theme === AppTheme.PREMIUM_DARK ? 'bg-white/5 text-white border-white/5' : 'bg-slate-100 text-slate-900 border-slate-200'} border rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-champagne-gold transition-all`} 
              />
              <Button onClick={handleAddManualPlayer} size="md" themeClass={currentTheme.button}>{t.add}</Button>
            </div>
          )}

          <div className="space-y-4 max-h-[30vh] overflow-y-auto no-scrollbar pr-1">
            {players.map(p => (
              <div key={p.id} className={`flex items-center p-6 ${settings.theme === AppTheme.PREMIUM_DARK ? 'bg-white/5 border-white/5 shadow-inner' : 'bg-white border-slate-100 shadow-sm'} rounded-[2rem] border transition-all animate-fade-in`}>
                <span className="text-3xl grayscale-[0.3]">{p.avatar}</span>
                <span className={`ml-5 font-bold text-sm tracking-wide ${currentTheme.textMain}`}>{p.name}</span>
                {isHost && p.id !== myPlayerId && (
                  <button onClick={() => handleKickPlayer(p.id)} className="ml-auto text-red-500/20 hover:text-red-500 transition-colors p-2">
                    <Trash2 size={16}/>
                  </button>
                )}
                {p.id === myPlayerId && <div className="ml-auto w-2 h-2 rounded-full bg-champagne-gold shadow-[0_0_10px_rgba(243,229,171,0.5)]" />}
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="w-full max-w-sm mx-auto py-10">
        {isHost ? (
          <Button 
            themeClass={currentTheme.button} 
            fullWidth 
            size="xl" 
            onClick={() => { generateTeams(); setGameState(GameState.TEAMS); }} 
            disabled={players.length < settings.teamCount}
          >
            {t.createTeams}
          </Button>
        ) : (
          <div className={`text-center py-8 rounded-[2rem] border border-dashed ${settings.theme === AppTheme.PREMIUM_DARK ? 'border-white/10' : 'border-slate-900/10'}`}>
            <p className={`text-[8px] uppercase tracking-[0.5em] font-bold animate-pulse ${currentTheme.textSecondary} opacity-40`}>{t.waitHost}</p>
          </div>
        )}
      </footer>
    </div>
  );
};

// Fix: Implement missing TeamSetupScreen to show generated teams before playing
export const TeamSetupScreen = () => {
  const { teams, setGameState, currentTheme, settings, isHost, initializeWordDeck, playSound } = useGame();
  const t = TRANSLATIONS[settings.language];

  const handleStart = () => {
    if (isHost) {
      initializeWordDeck();
      playSound('start');
      setGameState(GameState.PRE_ROUND);
    }
  };

  return (
    <div className={`flex flex-col min-h-screen ${currentTheme.bg} p-10 transition-colors`}>
      <header className="flex justify-between items-center py-6 mb-8">
        <button onClick={() => setGameState(GameState.LOBBY)} className="p-2 opacity-30 hover:opacity-100 transition-opacity">
          <ArrowRight className={`rotate-180 ${currentTheme.iconColor}`} size={24} />
        </button>
        <h2 className={`text-[10px] font-bold uppercase tracking-[0.5em] ${currentTheme.textSecondary}`}>{t.teams}</h2>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full overflow-y-auto no-scrollbar pb-20">
        {teams.map((team) => (
          <Card key={team.id} themeClass={currentTheme.card} className="relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-1 h-full ${team.color}`} />
            <div className="flex justify-between items-start mb-6">
              <h3 className={`text-2xl font-serif ${currentTheme.textMain}`}>{team.name}</h3>
              <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${team.color} text-white`}>
                {team.players.length} {t.playersCount}
              </div>
            </div>
            <div className="space-y-3">
              {team.players.map(player => (
                <div key={player.id} className="flex items-center gap-3">
                  <span className="text-xl">{player.avatar}</span>
                  <span className={`text-sm font-medium ${currentTheme.textSecondary}`}>{player.name}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <footer className="w-full max-w-md mx-auto py-10">
        {isHost ? (
          <Button themeClass={currentTheme.button} fullWidth size="xl" onClick={handleStart}>
            {t.startGame}
          </Button>
        ) : (
          <div className="text-center py-8">
            <p className={`text-[8px] uppercase tracking-[0.5em] font-bold animate-pulse ${currentTheme.textSecondary} opacity-40`}>
              {t.waitTeams}
            </p>
          </div>
        )}
      </footer>
    </div>
  );
};

export const SettingsScreen = () => {
  const { setGameState, currentTheme, settings, setSettings, isHost } = useGame();
  const t = TRANSLATIONS[settings.language];

  if (!isHost) {
    return (
      <div className={`min-h-screen ${currentTheme.bg} flex items-center justify-center p-12`}>
        <div className={`text-center p-12 max-w-sm rounded-[3rem] ${currentTheme.card}`}>
          <AlertCircle size={48} className={`mx-auto mb-8 opacity-10 ${currentTheme.iconColor}`} />
          <h2 className={`text-3xl font-serif mb-6 leading-tight ${currentTheme.textMain}`}>{t.onlyHostSettings}</h2>
          <Button onClick={() => setGameState(GameState.LOBBY)} fullWidth themeClass={currentTheme.button} size="xl">{t.backToLobby}</Button>
        </div>
      </div>
    );
  }

  const toggleCategory = (cat: Category) => {
    setSettings(s => ({
      ...s,
      categories: s.categories.includes(cat) 
        ? s.categories.filter(c => c !== cat) 
        : [...s.categories, cat]
    }));
  };

  const selectClasses = `bg-transparent text-sm font-bold w-full focus:outline-none appearance-none cursor-pointer ${currentTheme.textMain}`;

  return (
    <div className={`flex flex-col min-h-screen ${currentTheme.bg} p-10 transition-colors`}>
      <header className="flex justify-between items-center py-6 mb-8">
        <button onClick={() => setGameState(GameState.LOBBY)} className="p-2 opacity-30 hover:opacity-100 transition-opacity">
          <ArrowRight className={`rotate-180 ${currentTheme.iconColor}`} size={24} />
        </button>
        <h2 className={`text-[10px] font-bold uppercase tracking-[0.5em] ${currentTheme.textSecondary}`}>{t.settings}</h2>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 overflow-y-auto space-y-10 max-w-md mx-auto w-full no-scrollbar pb-16">
        {/* Language & Theme & Sound */}
        <div className="grid grid-cols-2 gap-6">
          <div className={`p-8 rounded-[2.5rem] border ${settings.theme === AppTheme.PREMIUM_DARK ? 'bg-white/5 border-white/5 shadow-inner' : 'bg-white border-slate-100 shadow-sm'} space-y-5`}>
             <div className={`flex items-center gap-2 text-[8px] uppercase tracking-[0.4em] font-bold ${currentTheme.textSecondary} opacity-60`}>
               <Globe size={12} /> {t.language}
             </div>
             <select 
              value={settings.language} 
              onChange={e => setSettings(s => ({...s, language: e.target.value as Language}))}
              className={selectClasses}
             >
               <option value={Language.UA} className={settings.theme === AppTheme.PREMIUM_DARK ? 'bg-premium-dark-bg text-white' : 'bg-white text-slate-900'}>Українська</option>
               <option value={Language.EN} className={settings.theme === AppTheme.PREMIUM_DARK ? 'bg-premium-dark-bg text-white' : 'bg-white text-slate-900'}>English</option>
               <option value={Language.DE} className={settings.theme === AppTheme.PREMIUM_DARK ? 'bg-premium-dark-bg text-white' : 'bg-white text-slate-900'}>Deutsch</option>
             </select>
          </div>
          <div className={`p-8 rounded-[2.5rem] border ${settings.theme === AppTheme.PREMIUM_DARK ? 'bg-white/5 border-white/5 shadow-inner' : 'bg-white border-slate-100 shadow-sm'} space-y-5`}>
             <div className={`flex items-center gap-2 text-[8px] uppercase tracking-[0.4em] font-bold ${currentTheme.textSecondary} opacity-60`}>
               <Palette size={12} /> {t.theme}
             </div>
             <select 
              value={settings.theme} 
              onChange={e => setSettings(s => ({...s, theme: e.target.value as AppTheme}))}
              className={selectClasses}
             >
               {Object.values(AppTheme).slice(0, 3).map(id => (
                 <option key={id} value={id} className={settings.theme === AppTheme.PREMIUM_DARK ? 'bg-premium-dark-bg text-white' : 'bg-white text-slate-900'}>{THEME_CONFIG[id].name}</option>
               ))}
             </select>
          </div>
        </div>

        {/* Sound Settings */}
        <div className={`p-8 rounded-[2.5rem] border ${settings.theme === AppTheme.PREMIUM_DARK ? 'bg-white/5 border-white/5 shadow-inner' : 'bg-white border-slate-100 shadow-sm'} flex justify-between items-center`}>
            <div className={`flex items-center gap-4 text-[9px] uppercase tracking-[0.4em] font-bold ${currentTheme.textMain}`}>
              {settings.soundEnabled ? <Volume2 size={20} className="text-emerald-500" /> : <VolumeX size={20} className="opacity-30" />}
              {t.sound}
            </div>
            <button 
              onClick={() => setSettings(s => ({...s, soundEnabled: !s.soundEnabled}))}
              className={`w-14 h-7 rounded-full relative transition-all duration-500 ${settings.soundEnabled ? 'bg-emerald-500/20 shadow-lg' : 'bg-black/10'}`}
             >
               <div className={`absolute top-1.5 w-4 h-4 rounded-full transition-all duration-500 ${settings.soundEnabled ? 'left-8 bg-emerald-500' : 'left-2 bg-slate-400'}`} />
             </button>
        </div>

        {/* Categories Grid */}
        <div className={`p-10 rounded-[3rem] border ${settings.theme === AppTheme.PREMIUM_DARK ? 'bg-white/5 border-white/5 shadow-inner' : 'bg-white border-slate-100 shadow-sm'} space-y-8`}>
          <h3 className={`text-[8px] uppercase tracking-[0.5em] font-bold ${currentTheme.textSecondary} opacity-60`}>{t.categories}</h3>
          <div className="flex flex-wrap gap-3">
            {Object.values(Category).slice(0, 5).map(cat => (
              <button 
                key={cat} 
                onClick={() => toggleCategory(cat)}
                className={`px-5 py-3 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 ${
                  settings.categories.includes(cat) 
                    ? (settings.theme === AppTheme.PREMIUM_DARK ? 'bg-champagne-gold text-black shadow-xl shadow-champagne-gold/20' : 'bg-slate-900 text-white shadow-lg') 
                    : `${settings.theme === AppTheme.PREMIUM_DARK ? 'bg-white/5 text-white/30' : 'bg-slate-100 text-slate-400'}`
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders and Toggles */}
        <div className={`p-12 rounded-[3rem] border ${settings.theme === AppTheme.PREMIUM_DARK ? 'bg-white/5 border-white/5 shadow-inner' : 'bg-white border-slate-100 shadow-sm'} space-y-12`}>
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <div className={`flex items-center gap-3 text-[9px] uppercase tracking-[0.5em] font-bold ${currentTheme.textSecondary} opacity-60`}>
                <Clock size={12} /> {t.roundTime}
              </div>
              <span className={`text-2xl font-serif ${currentTheme.textMain}`}>{settings.roundTime}s</span>
            </div>
            <input 
              type="range" min="10" max="120" step="5" 
              value={settings.roundTime} 
              onChange={e => setSettings(s => ({ ...s, roundTime: +e.target.value }))} 
              className="w-full accent-champagne-gold h-1.5 bg-black/10 rounded-full appearance-none cursor-pointer" 
            />
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <div className={`flex items-center gap-3 text-[9px] uppercase tracking-[0.5em] font-bold ${currentTheme.textSecondary} opacity-60`}>
                <Trophy size={12} /> {t.scoreToWin}
              </div>
              <span className={`text-2xl font-serif ${currentTheme.textMain}`}>{settings.scoreToWin}</span>
            </div>
            <input 
              type="range" min="10" max="100" step="5" 
              value={settings.scoreToWin} 
              onChange={e => setSettings(s => ({ ...s, scoreToWin: +e.target.value }))} 
              className="w-full accent-champagne-gold h-1.5 bg-black/10 rounded-full appearance-none cursor-pointer" 
            />
          </div>

          <div className="flex justify-between items-center pt-6">
            <div className={`flex items-center gap-3 text-[9px] uppercase tracking-[0.5em] font-bold ${currentTheme.textSecondary} opacity-60`}>
              <Users size={12} /> {t.teamCount}
            </div>
            <div className="flex gap-4">
              {[2, 3, 4].map(num => (
                <button 
                  key={num}
                  onClick={() => setSettings(s => ({...s, teamCount: num}))}
                  className={`w-11 h-11 rounded-full text-[11px] font-bold transition-all duration-300 shadow-lg ${settings.teamCount === num ? 'bg-champagne-gold text-black scale-110' : `${settings.theme === AppTheme.PREMIUM_DARK ? 'bg-white/5 text-white/40' : 'bg-slate-100 text-slate-400'}`}`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-6">
             <div className={`text-[9px] uppercase tracking-[0.5em] font-bold ${currentTheme.textSecondary} opacity-60`}>{t.skipPenalty}</div>
             <button 
              onClick={() => setSettings(s => ({...s, skipPenalty: !s.skipPenalty}))}
              className={`w-14 h-7 rounded-full relative transition-all duration-500 ${settings.skipPenalty ? 'bg-emerald-500/20 shadow-lg shadow-emerald-500/20' : 'bg-black/10'}`}
             >
               <div className={`absolute top-1.5 w-4 h-4 rounded-full transition-all duration-500 ${settings.skipPenalty ? 'left-8 bg-emerald-500' : 'left-2 bg-slate-400'}`} />
             </button>
          </div>
        </div>
      </div>

      <footer className="w-full max-w-md mx-auto py-10">
        <Button themeClass={currentTheme.button} fullWidth size="xl" onClick={() => setGameState(GameState.LOBBY)}>
          {t.save}
        </Button>
      </footer>
    </div>
  );
};
