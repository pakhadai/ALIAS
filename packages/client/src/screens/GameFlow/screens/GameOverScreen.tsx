import React, { useEffect, useRef, useState } from 'react';
import { Trophy } from 'lucide-react';
import { Button } from '../../../components/Button';
import { Confetti } from '../../../components/Shared';
import { AppTheme } from '../../../types';
import { useGame } from '../../../context/GameContext';
import { TRANSLATIONS } from '../../../constants';
import { AvatarDisplay } from '../../../components/AvatarDisplay';
import { usePlayerStats } from '../../../hooks/usePlayerStats';

export const GameOverScreen = () => {
  const { teams, currentTheme, settings, resetGame, rematch, leaveRoom, isHost } = useGame();
  const t = TRANSLATIONS[settings.general.language];
  const isDark = settings.general.theme === AppTheme.PREMIUM_DARK;
  const sorted = [...teams].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const [copied, setCopied] = useState(false);
  const statsTrackedRef = useRef(false);
  const gameStats = usePlayerStats();

  useEffect(() => {
    if (!statsTrackedRef.current) {
      statsTrackedRef.current = true;
      gameStats.increment('gamesPlayed');
      void gameStats.flush();
    }
  }, [gameStats]);

  // Collect top guessers across all teams
  const allPlayers = teams.flatMap((team) =>
    team.players.map((p: any) => ({ ...p, teamName: team.name }))
  );
  const topGuessers = [...allPlayers]
    .filter((p: any) => (p.stats?.guessed ?? 0) > 0)
    .sort((a: any, b: any) => (b.stats?.guessed ?? 0) - (a.stats?.guessed ?? 0))
    .slice(0, 5);

  const buildShareImage = async (): Promise<Blob | null> => {
    try {
      const W = 640,
        H = 480;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Background
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#1a1a2e');
      grad.addColorStop(1, '#16213e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Subtle grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Gold accent bar
      ctx.fillStyle = '#D4AF6A';
      ctx.fillRect(0, 0, W, 4);

      // Title
      ctx.fillStyle = '#D4AF6A';
      ctx.font = 'bold 42px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('ALIAS', W / 2, 60);

      // Subtitle
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '13px Arial, sans-serif';
      ctx.fillText(t.finalResults?.toUpperCase() ?? 'FINAL RESULTS', W / 2, 88);

      // Teams
      const medals = ['🥇', '🥈', '🥉'];
      sorted.slice(0, 6).forEach((team, i) => {
        const y = 130 + i * 54;
        const alpha = i === 0 ? 1 : 0.75 - i * 0.08;

        // Row background
        ctx.fillStyle = i === 0 ? 'rgba(212,175,106,0.12)' : 'rgba(255,255,255,0.04)';
        ctx.beginPath();
        (ctx as any).roundRect?.(40, y - 30, W - 80, 44, 10);
        ctx.fill();

        // Medal / number
        ctx.font = '22px Arial';
        ctx.textAlign = 'left';
        ctx.globalAlpha = alpha;
        ctx.fillText(medals[i] ?? `${i + 1}.`, 56, y);

        // Team name
        ctx.font = i === 0 ? 'bold 20px Arial, sans-serif' : '18px Arial, sans-serif';
        ctx.fillStyle = i === 0 ? '#D4AF6A' : '#ffffff';
        ctx.fillText(team.name.slice(0, 22), 96, y);

        // Score
        ctx.font = 'bold 20px Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillStyle = i === 0 ? '#D4AF6A' : 'rgba(255,255,255,0.6)';
        ctx.fillText(`${team.score} ${t.pts ?? 'pts'}`, W - 56, y);
        ctx.globalAlpha = 1;
      });

      // Footer
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '11px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('aliasmaster.app', W / 2, H - 18);

      return await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), 'image/png'));
    } catch {
      return null;
    }
  };

  const handleShare = async () => {
    const blob = await buildShareImage();
    if (blob) {
      const file = new File([blob], 'alias-result.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `ALIAS — ${t.finalResults}` });
          return;
        } catch {}
      }
      // Fallback: download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'alias-result.png';
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    // Final fallback: text share
    const lines = sorted.map(
      (team, i) => `${['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`} ${team.name}: ${team.score} ${t.pts}`
    );
    const text = `🎮 ALIAS — ${t.finalResults}\n${lines.join('\n')}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const medals = ['🥇', '🥈', '🥉'];
  const cardBg = isDark
    ? 'bg-(--ui-surface) border-(--ui-border)'
    : 'bg-(--ui-card) border-(--ui-border) shadow-sm';

  return (
    <div
      className={`flex flex-col min-h-screen ${currentTheme.bg} px-6 pt-12 items-center overflow-y-auto no-scrollbar`}
      style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
    >
      <Confetti />

      {/* Winner banner */}
      <div className="w-full max-w-sm pb-6 text-center animate-slide-up">
        <Trophy size={56} className="text-(--ui-accent) mx-auto mb-4 animate-bounce" />
        <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-(--ui-accent) mb-2">
          {t.winners}
        </p>
        <h2 className={`text-4xl font-serif ${currentTheme.textMain}`}>{winner?.name}</h2>
      </div>

      {/* Team leaderboard */}
      <div className="w-full max-w-sm space-y-2 animate-fade-in">
        <p
          className={`text-[10px] uppercase tracking-widest font-bold opacity-40 mb-3 ${currentTheme.textMain}`}
        >
          {t.finalResults}
        </p>
        {sorted.map((team, i) => (
          <div
            key={team.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${cardBg}`}
          >
            <span className="text-xl w-7 text-center">{medals[i] ?? `${i + 1}`}</span>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-sm truncate ${currentTheme.textMain}`}>{team.name}</p>
              {team.players.length > 0 && (
                <p className={`text-[10px] truncate opacity-40 ${currentTheme.textMain}`}>
                  {team.players.map((p: any) => p.name).join(', ')}
                </p>
              )}
            </div>
            <span
              className={`font-bold text-base tabular-nums ${i === 0 ? 'text-(--ui-accent)' : currentTheme.textMain}`}
            >
              {team.score} <span className="text-[10px] opacity-40">{t.pts}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Top guessers podium */}
      {topGuessers.length > 0 && (
        <div className="w-full max-w-sm mt-8 space-y-2 animate-fade-in">
          <p
            className={`text-[10px] uppercase tracking-widest font-bold opacity-40 mb-3 ${currentTheme.textMain}`}
          >
            {t.topGuessers ?? 'Top Guessers'}
          </p>
          {topGuessers.map((p: any, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${cardBg}`}
            >
              <span className="text-xl w-7 text-center">{medals[i] ?? `${i + 1}`}</span>
              {p.avatarId != null ? (
                <AvatarDisplay avatarId={p.avatarId} size={32} />
              ) : (
                <span className="text-2xl">{p.avatar}</span>
              )}
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm truncate ${currentTheme.textMain}`}>{p.name}</p>
                <p className={`text-[10px] truncate opacity-40 ${currentTheme.textMain}`}>
                  {p.teamName}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`font-bold text-base tabular-nums ${i === 0 ? 'text-[#D4AF6A]' : currentTheme.textMain}`}
                >
                  {p.stats?.guessed ?? 0}
                </span>
                <p className={`text-[9px] opacity-40 ${currentTheme.textMain}`}>
                  {t.guessedStat ?? 'guessed'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="w-full max-w-sm space-y-3 pt-6 pb-2">
        <button
          onClick={handleShare}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-(--ui-border) bg-(--ui-surface) text-(--ui-fg-muted) hover:text-(--ui-fg) hover:bg-(--ui-surface-hover) transition-all text-[12px] font-bold uppercase tracking-widest"
        >
          {copied ? t.shareCopied : t.shareResults}
        </button>

        {isHost ? (
          <>
            <Button themeClass={currentTheme.button} fullWidth size="xl" onClick={rematch}>
              {t.rematch}
            </Button>
            <Button
              themeClass={currentTheme.button}
              variant="ghost"
              fullWidth
              size="lg"
              onClick={resetGame}
            >
              {t.toLobby}
            </Button>
            <button
              onClick={leaveRoom}
              className={`w-full py-3 text-[10px] uppercase tracking-[0.4em] font-bold opacity-40 hover:opacity-100 transition-opacity ${currentTheme.textMain}`}
            >
              {t.toMainMenu}
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-center text-[10px] uppercase tracking-widest opacity-40 animate-pulse">
              {t.waitAdmin}
            </p>
            <Button
              themeClass={currentTheme.button}
              variant="ghost"
              fullWidth
              size="lg"
              onClick={leaveRoom}
            >
              {t.toMainMenu}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
