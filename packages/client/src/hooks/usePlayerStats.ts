const STATS_KEY = 'alias_player_stats_v1';

export interface PlayerStats {
  gamesPlayed: number;
  wordsGuessed: number;
  wordsSkipped: number;
  lastPlayed: string;
}

const defaultStats = (): PlayerStats => ({
  gamesPlayed: 0,
  wordsGuessed: 0,
  wordsSkipped: 0,
  lastPlayed: '',
});

export function usePlayerStats() {
  const get = (): PlayerStats => {
    try {
      return { ...defaultStats(), ...JSON.parse(localStorage.getItem(STATS_KEY) || '{}') };
    } catch {
      return defaultStats();
    }
  };

  const increment = (key: keyof Omit<PlayerStats, 'lastPlayed'>, by = 1) => {
    const s = get();
    s[key] = (s[key] as number) + by;
    s.lastPlayed = new Date().toISOString();
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(s));
    } catch {}
  };

  const reset = () => {
    try {
      localStorage.removeItem(STATS_KEY);
    } catch {}
  };

  return { get, increment, reset };
}
