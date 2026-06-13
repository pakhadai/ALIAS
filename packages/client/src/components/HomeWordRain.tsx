import { useMemo } from 'react';

import { buildHomeWordRainItems } from '../constants/homeBrand';

/**
 * Ambient multilingual word field for the home screen.
 * Decorative only — hidden from assistive tech and disabled for reduced motion.
 */
export function HomeWordRain() {
  const words = useMemo(() => buildHomeWordRainItems(), []);

  return (
    <div className="home-word-rain" aria-hidden>
      {words.map((word) => (
        <span
          key={word.text}
          className="home-word-rain__word"
          style={{
            left: `${word.leftPercent}%`,
            animationDuration: `${word.durationSec}s`,
            animationDelay: `${word.delaySec}s`,
          }}
        >
          {word.text}
        </span>
      ))}
    </div>
  );
}
