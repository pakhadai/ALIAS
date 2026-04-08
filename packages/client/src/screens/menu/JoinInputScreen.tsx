import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../../components/Button';
import { Logo } from '../../components/Shared';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import { ROOM_CODE_LENGTH } from '../../constants';
import { useT } from '../../hooks/useT';

export const JoinInputScreen = () => {
  const { setGameState, currentTheme, setRoomCode, checkRoomExists, showNotification } = useGame();
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const t = useT();

  const handleJoinRoom = async () => {
    if (code.length !== ROOM_CODE_LENGTH) return;
    if (checking) return;
    setChecking(true);
    try {
      const exists = await checkRoomExists(code);
      if (!exists) {
        showNotification(t.roomNotFound.replace('{0}', code), 'error');
        return;
      }
      setRoomCode(code);
      setGameState(GameState.ENTER_NAME);
    } finally {
      setChecking(false);
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
            disabled={code.length !== ROOM_CODE_LENGTH || checking}
          >
            {checking ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                <span>{t.connecting}</span>
              </span>
            ) : (
              t.enter
            )}
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
