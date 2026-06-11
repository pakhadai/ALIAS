import { ChevronRight } from 'lucide-react';
import { typographyClass } from '../../../constants/typography';
import { PROFILE_STAT_CARD_CLASS } from './profileSurfaceClasses';

export interface ProfileStatsCardsProps {
  gamesPlayed: number;
  wordsGuessed: number;
  accuracy: number;
  labels: {
    games: string;
    guessed: string;
    accuracy: string;
    tapForDetails: string;
  };
  themeTextMain: string;
  themeTextSecondary: string;
  /** Omit for read-only summary (e.g. PlayerStatsScreen hero). */
  onPress?: () => void;
}

export function ProfileStatsCards({
  gamesPlayed,
  wordsGuessed,
  accuracy,
  labels,
  themeTextMain,
  themeTextSecondary,
  onPress,
}: ProfileStatsCardsProps) {
  const cards = [
    { label: labels.games, value: gamesPlayed },
    { label: labels.guessed, value: wordsGuessed },
    { label: labels.accuracy, value: `${accuracy}%` },
  ];

  const grid = (
    <div className="grid grid-cols-3 gap-2">
      {cards.map((card) => (
        <div key={card.label} className={PROFILE_STAT_CARD_CLASS}>
          <span className={`text-xl font-bold font-serif leading-none ${themeTextMain}`}>
            {card.value}
          </span>
          <span
            className={`${typographyClass.label} mt-1.5 text-center tracking-[0.14em] text-ui-fg-muted`}
          >
            {card.label}
          </span>
        </div>
      ))}
    </div>
  );

  if (!onPress) {
    return <div className="w-full mb-4">{grid}</div>;
  }

  return (
    <button
      type="button"
      onClick={onPress}
      className="w-full max-w-md mx-auto mb-6 text-left transition-all duration-200 ease-out active:scale-[0.99]"
      aria-label={labels.tapForDetails}
    >
      {grid}
      <div
        className={`mt-2.5 flex items-center justify-center gap-1 ${typographyClass.body} ${themeTextSecondary}`}
      >
        <span>{labels.tapForDetails}</span>
        <ChevronRight size={14} className="opacity-50" aria-hidden />
      </div>
    </button>
  );
}
