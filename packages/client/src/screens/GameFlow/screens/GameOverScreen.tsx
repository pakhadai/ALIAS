import React, { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Share2, Trophy } from 'lucide-react';
import { Button } from '../../../components/Button';
import { Confetti } from '../../../components/Shared';
import { FixedBottomBar, ScreenShell } from '../../../components/layout';
import { useGame } from '../../../context/GameContext';
import { useT } from '../../../hooks/useT';
import { PlayerAvatar } from '../../../components/AvatarDisplay';
import { usePlayerStats } from '../../../hooks/usePlayerStats';
import type { Player, Team } from '../../../types';

const FOOTER_ACTIONS_DELAY_MS = 600;

type PlayerWithTeamName = Player & { teamName: string };
type CanvasRenderingContext2DWithRoundRect = CanvasRenderingContext2D & {
  roundRect?: (
    x: number,
    y: number,
    w: number,
    h: number,
    radii?: number | DOMPointInit | (number | DOMPointInit)[]
  ) => void;
};

/** Ellipsis by measured width so wide glyphs do not overlap the score column. */
function truncateCanvasTeamName(
  ctx: CanvasRenderingContext2D,
  name: string,
  maxWidthPx: number
): string {
  if (maxWidthPx <= 0) return '';
  if (ctx.measureText(name).width <= maxWidthPx) return name;
  const ellipsis = '…';
  let end = name.length;
  while (end > 0) {
    const candidate = name.slice(0, end) + ellipsis;
    if (ctx.measureText(candidate).width <= maxWidthPx) return candidate;
    end -= 1;
  }
  return ellipsis;
}

export const GameOverScreen = () => {
  const { teams, currentTheme, resetGame, rematch, leaveRoom, isHost } = useGame();
  const t = useT();
  const sorted = [...teams].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const statsTrackedRef = useRef(false);
  const gameStats = usePlayerStats();

  useEffect(() => {
    if (!statsTrackedRef.current) {
      statsTrackedRef.current = true;
      gameStats.increment('gamesPlayed');
      void gameStats.flush();
    }
  }, [gameStats]);

  useEffect(() => {
    const timer = setTimeout(() => setShowActions(true), FOOTER_ACTIONS_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Collect top guessers across all teams
  const allPlayers = teams.flatMap((team: Team) =>
    team.players.map((p: Player) => ({ ...p, teamName: team.name }))
  );
  const topGuessers = [...allPlayers]
    .filter((p: PlayerWithTeamName) => (p.stats?.guessed ?? 0) > 0)
    .sort(
      (a: PlayerWithTeamName, b: PlayerWithTeamName) =>
        (b.stats?.guessed ?? 0) - (a.stats?.guessed ?? 0)
    )
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

      const tokens = currentTheme.tokens;
      const bg = (
        tokens?.bg || getComputedStyle(document.documentElement).getPropertyValue('--ui-bg')
      )
        .trim()
        .replace(/^$/, '#000');
      const surface = (
        tokens?.surface ||
        getComputedStyle(document.documentElement).getPropertyValue('--ui-surface')
      )
        .trim()
        .replace(/^$/, '#111');
      const accent = (
        tokens?.accent || getComputedStyle(document.documentElement).getPropertyValue('--ui-accent')
      )
        .trim()
        .replace(/^$/, '#777');
      const fg = (
        tokens?.fg || getComputedStyle(document.documentElement).getPropertyValue('--ui-fg')
      )
        .trim()
        .replace(/^$/, '#fff');

      // Background
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, surface);
      grad.addColorStop(1, bg);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Subtle grid lines (canvas ignores CSS color-mix / var() strings)
      ctx.save();
      ctx.strokeStyle = fg;
      ctx.globalAlpha = 0.06;
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
      ctx.restore();

      // Gold accent bar
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, W, 4);

      // Title
      ctx.fillStyle = accent;
      ctx.font = 'bold 42px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('ALIAS', W / 2, 60);

      // Subtitle
      ctx.save();
      ctx.fillStyle = fg;
      ctx.globalAlpha = 0.45;
      ctx.font = '13px Arial, sans-serif';
      ctx.fillText(t.finalResults?.toUpperCase() ?? 'FINAL RESULTS', W / 2, 88);
      ctx.restore();

      // Teams
      const medals = ['🥇', '🥈', '🥉'];
      const nameLeftX = 96;
      const scoreRightX = W - 56;
      const nameMaxWidth = scoreRightX - nameLeftX - 16;
      sorted.slice(0, 6).forEach((team, i) => {
        const y = 130 + i * 54;
        const alpha = i === 0 ? 1 : 0.75 - i * 0.08;

        // Row background
        ctx.save();
        ctx.fillStyle = i === 0 ? accent : fg;
        ctx.globalAlpha = i === 0 ? 0.14 : 0.06;
        ctx.beginPath();
        (ctx as CanvasRenderingContext2DWithRoundRect).roundRect?.(40, y - 30, W - 80, 44, 10);
        ctx.fill();
        ctx.restore();

        // Medal / number
        ctx.font = '22px Arial';
        ctx.textAlign = 'left';
        ctx.globalAlpha = alpha;
        ctx.fillText(medals[i] ?? `${i + 1}.`, 56, y);

        // Team name
        ctx.font = i === 0 ? 'bold 20px Arial, sans-serif' : '18px Arial, sans-serif';
        ctx.fillStyle = i === 0 ? accent : fg;
        const displayName = truncateCanvasTeamName(ctx, team.name, nameMaxWidth);
        ctx.fillText(displayName, nameLeftX, y);

        // Score
        ctx.font = 'bold 20px Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.save();
        if (i === 0) {
          ctx.fillStyle = accent;
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = fg;
          ctx.globalAlpha = 0.7;
        }
        ctx.fillText(`${team.score} ${t.pts ?? 'pts'}`, scoreRightX, y);
        ctx.restore();
        ctx.globalAlpha = 1;
      });

      // Footer
      ctx.save();
      ctx.fillStyle = fg;
      ctx.globalAlpha = 0.25;
      ctx.font = '11px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('aliasmaster.app', W / 2, H - 18);
      ctx.restore();

      return await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), 'image/png'));
    } catch (_err) {
      void _err;
      return null;
    }
  };

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const blob = await buildShareImage();
      if (blob) {
        const file = new File([blob], 'alias-result.png', { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: `ALIAS — ${t.finalResults}` });
            return;
          } catch (_err) {
            void _err;
          }
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
        } catch (_err) {
          void _err;
        }
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } finally {
      setIsSharing(false);
    }
  };

  const medals = ['🥇', '🥈', '🥉'];
  const cardBg = 'bg-ui-card border-ui-border';
  const winnerCardBg = 'bg-ui-accent/5 border-ui-accent/30 ring-1 ring-ui-accent/20';

  const shareAriaLabel = copied ? t.shareCopied : t.shareResults;

  return (
    <ScreenShell
      layout="fullPx6"
      className={currentTheme.bg}
      contentClassName="items-center"
      footer={
        <FixedBottomBar contentClassName="max-w-sm space-y-2">
          <div
            className={`space-y-2 transition-all duration-500 ${
              showActions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {isHost ? (
              <>
                <Button
                  themeClass={currentTheme.button}
                  fullWidth
                  size="xl"
                  onClick={rematch}
                  data-testid="game-over-rematch"
                >
                  {t.rematch}
                </Button>
                <Button
                  themeClass={currentTheme.button}
                  variant="ghost"
                  fullWidth
                  size="lg"
                  onClick={resetGame}
                >
                  {t.gameOverChangeSettings}
                </Button>
                <button
                  type="button"
                  onClick={() => leaveRoom()}
                  className={`w-full py-3 text-[10px] uppercase tracking-[0.4em] font-bold ${currentTheme.textSecondary} active:text-ui-fg transition-colors`}
                >
                  {t.gameOverLeaveRoom}
                </button>
              </>
            ) : (
              <>
                <p
                  className={`text-center text-[10px] uppercase tracking-widest animate-pulse ${currentTheme.textSecondary}`}
                >
                  {t.waitAdmin}
                </p>
                <Button
                  themeClass={currentTheme.button}
                  variant="ghost"
                  fullWidth
                  size="lg"
                  onClick={() => leaveRoom()}
                >
                  {t.gameOverLeaveRoom}
                </Button>
              </>
            )}
          </div>
        </FixedBottomBar>
      }
    >
      <Confetti />

      {/* Winner banner */}
      <div className="w-full max-w-sm pb-6 text-center animate-slide-up">
        <Trophy size={56} className="text-ui-accent mx-auto mb-4 animate-bounce" />
        <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-ui-accent mb-2">
          {t.winners}
        </p>
        <h2 className={`text-4xl font-serif ${currentTheme.textMain}`}>{winner?.name}</h2>
      </div>

      {/* Team leaderboard */}
      <div className="w-full max-w-sm space-y-2 animate-fade-in">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p
            className={`text-[10px] uppercase tracking-widest font-bold ${currentTheme.textSecondary}`}
          >
            {t.finalResults}
          </p>
          <button
            type="button"
            onClick={() => void handleShare()}
            disabled={isSharing}
            aria-label={shareAriaLabel}
            aria-busy={isSharing}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-ui-border bg-ui-surface text-ui-fg-muted active:bg-ui-surface-hover active:text-ui-fg transition-colors disabled:pointer-events-none disabled:opacity-70"
          >
            {isSharing ? (
              <Loader2 size={18} className="animate-spin shrink-0" aria-hidden />
            ) : copied ? (
              <Check size={18} className="shrink-0 text-ui-accent" aria-hidden />
            ) : (
              <Share2 size={18} className="shrink-0" aria-hidden />
            )}
          </button>
        </div>
        {sorted.map((team, i) => {
          const isWinner = i === 0;
          return (
            <div
              key={team.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${
                isWinner ? winnerCardBg : cardBg
              }`}
            >
              <span className="text-xl w-7 text-center">{medals[i] ?? `${i + 1}`}</span>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm truncate ${currentTheme.textMain}`}>{team.name}</p>
                {isWinner && (
                  <p className="text-[9px] uppercase tracking-widest font-bold text-ui-accent">
                    {t.winnerBadge}
                  </p>
                )}
                {team.players.length > 0 && (
                  <p className={`text-[10px] truncate ${currentTheme.textSecondary}`}>
                    {team.players.map((p: Player) => p.name).join(', ')}
                  </p>
                )}
              </div>
              <span
                className={`font-bold text-base tabular-nums ${isWinner ? 'text-ui-accent' : currentTheme.textMain}`}
              >
                {team.score}{' '}
                <span className={`text-[10px] ${currentTheme.textSecondary}`}>{t.pts}</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Top guessers podium */}
      {topGuessers.length > 0 && (
        <div className="w-full max-w-sm mt-8 space-y-2 animate-fade-in pb-4">
          <p
            className={`text-[10px] uppercase tracking-widest font-bold mb-3 ${currentTheme.textSecondary}`}
          >
            {t.topGuessers ?? 'Top Guessers'}
          </p>
          {topGuessers.map((p: PlayerWithTeamName, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${cardBg}`}
            >
              <span className="text-xl w-7 text-center">{medals[i] ?? `${i + 1}`}</span>
              <PlayerAvatar player={p} size={32} emojiClassName="text-2xl" />
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm truncate ${currentTheme.textMain}`}>{p.name}</p>
                <p className={`text-[10px] truncate ${currentTheme.textSecondary}`}>{p.teamName}</p>
              </div>
              <div className="text-right">
                <span
                  className={`font-bold text-base tabular-nums ${i === 0 ? 'text-ui-accent' : currentTheme.textMain}`}
                >
                  {p.stats?.guessed ?? 0}
                </span>
                <p className={`text-[9px] ${currentTheme.textSecondary}`}>
                  {t.guessedStat ?? 'guessed'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </ScreenShell>
  );
};
