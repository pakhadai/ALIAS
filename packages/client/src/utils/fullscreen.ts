/** Document / element fullscreen with vendor fallbacks (Safari desktop uses webkit*). */

type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  exitFullscreen?: () => Promise<void>;
  webkitExitFullscreen?: () => void;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
};

type FsElement = HTMLElement & {
  requestFullscreen?: () => Promise<void>;
  webkitRequestFullscreen?: () => void;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => void;
};

function fsDoc(): FsDocument {
  return document;
}

export function getFullscreenElement(): Element | null {
  const d = fsDoc();
  return (
    d.fullscreenElement ??
    d.webkitFullscreenElement ??
    d.mozFullScreenElement ??
    d.msFullscreenElement ??
    null
  );
}

/** True when the app runs as installed PWA / home-screen shortcut (no browser chrome). */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    nav.standalone === true
  );
}

export type FullscreenToggleResult = 'entered' | 'exited' | 'unsupported' | 'error';

export async function toggleFullscreen(): Promise<FullscreenToggleResult> {
  const d = fsDoc();
  const el = document.documentElement as FsElement;

  if (getFullscreenElement()) {
    try {
      if (d.exitFullscreen) await d.exitFullscreen();
      else if (d.webkitExitFullscreen) d.webkitExitFullscreen();
      else if (d.mozCancelFullScreen) await d.mozCancelFullScreen();
      else if (d.msExitFullscreen) await d.msExitFullscreen();
      else return 'unsupported';
      return 'exited';
    } catch {
      return 'error';
    }
  }

  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
      return 'entered';
    }
    if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
      return 'entered';
    }
    if (el.mozRequestFullScreen) {
      await el.mozRequestFullScreen();
      return 'entered';
    }
    if (el.msRequestFullscreen) {
      el.msRequestFullscreen();
      return 'entered';
    }
  } catch {
    return 'error';
  }

  return 'unsupported';
}

export function isAppleMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ often reports as Macintosh with touch
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}
