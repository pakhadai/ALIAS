export enum GameState {
  MENU = 'MENU',
  PROFILE = 'PROFILE',
  PROFILE_SETTINGS = 'PROFILE_SETTINGS',
  LOBBY_SETTINGS = 'LOBBY_SETTINGS',
  MY_WORD_PACKS = 'MY_WORD_PACKS',
  PLAYER_STATS = 'PLAYER_STATS',
  STORE = 'STORE',
  MY_DECKS = 'MY_DECKS',
  RULES = 'RULES',
  ENTER_NAME = 'ENTER_NAME',
  JOIN_INPUT = 'JOIN_INPUT',
  LOBBY = 'LOBBY',
  SETTINGS = 'SETTINGS',
  TEAMS = 'TEAMS',
  VS_SCREEN = 'VS_SCREEN',
  PRE_ROUND = 'PRE_ROUND',
  COUNTDOWN = 'COUNTDOWN',
  PLAYING = 'PLAYING',
  ROUND_SUMMARY = 'ROUND_SUMMARY',
  SCOREBOARD = 'SCOREBOARD',
  GAME_OVER = 'GAME_OVER',
}

export enum Language {
  UA = 'UA',
  DE = 'DE',
  EN = 'EN',
}

export enum Category {
  GENERAL = 'General',
  FOOD = 'Food',
  TRAVEL = 'Travel',
  SCIENCE = 'Science',
  MOVIES = 'Movies',
  CUSTOM = 'Custom',
}

export enum AppTheme {
  PREMIUM_DARK = 'PREMIUM_DARK',
  PREMIUM_LIGHT = 'PREMIUM_LIGHT',
  CYBERPUNK = 'CYBERPUNK',
  FOREST = 'FOREST',
  SLEEK = 'SLEEK',
  VOID_LUXE = 'VOID_LUXE',
  QUANTUM_ECLIPSE = 'QUANTUM_ECLIPSE',
}

export enum SoundPreset {
  FUN = 'FUN',
  MINIMAL = 'MINIMAL',
  EIGHT_BIT = 'EIGHT_BIT',
}

export enum GameMode {
  CLASSIC = 'CLASSIC',
  TRANSLATION = 'TRANSLATION',
  SYNONYMS = 'SYNONYMS',
  QUIZ = 'QUIZ',
  /** Skip ends the round immediately (stricter than classic). */
  HARDCORE = 'HARDCORE',
  IMPOSTER = 'IMPOSTER',
}
