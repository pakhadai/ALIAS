export type ScreenLayoutContentRail = 'canonical' | 'full' | 'narrow';

/** SSOT horizontal layout — body `contentClassName` + browser `AppHeader` content rail (via {@link ScreenShell} `layout`). */
export type ScreenLayoutPreset =
  | 'canonical'
  | 'narrow'
  | 'fullPx4'
  | 'fullPx6'
  | 'fullPx8'
  | 'wideMd';

export type ScreenLayoutConfig = {
  contentRail: ScreenLayoutContentRail;
  contentInsetX: string;
  contentInsetXMd: string;
  /** Tailwind width + horizontal padding applied to {@link ScreenShell} body column. */
  bodyClassName: string;
};

export const SCREEN_LAYOUT: Record<ScreenLayoutPreset, ScreenLayoutConfig> = {
  /** `max-w-2xl` + `px-6 md:px-8` — profile, store, in-lobby settings, etc. */
  canonical: {
    contentRail: 'canonical',
    contentInsetX: '1.5rem',
    contentInsetXMd: '2rem',
    bodyClassName: 'max-w-2xl w-full mx-auto px-6 md:px-8',
  },
  /** `max-w-md` + `px-6 md:px-8` — player stats. */
  narrow: {
    contentRail: 'narrow',
    contentInsetX: '1.5rem',
    contentInsetXMd: '2rem',
    bodyClassName: 'max-w-md w-full mx-auto px-6 md:px-8',
  },
  /** Full bleed + `px-4` — online lobby. */
  fullPx4: {
    contentRail: 'full',
    contentInsetX: '1rem',
    contentInsetXMd: '1rem',
    bodyClassName: 'w-full px-4',
  },
  /** Full bleed + `px-6` — my decks, scoreboard body. */
  fullPx6: {
    contentRail: 'full',
    contentInsetX: '1.5rem',
    contentInsetXMd: '1.5rem',
    bodyClassName: 'w-full px-6',
  },
  /** Full bleed + `px-8` — team setup. */
  fullPx8: {
    contentRail: 'full',
    contentInsetX: '2rem',
    contentInsetXMd: '2rem',
    bodyClassName: 'w-full px-8',
  },
  /** Full bleed + `px-6 md:px-10` — join code, rules. */
  wideMd: {
    contentRail: 'full',
    contentInsetX: '1.5rem',
    contentInsetXMd: '2.5rem',
    bodyClassName: 'w-full px-6 md:px-10',
  },
};
