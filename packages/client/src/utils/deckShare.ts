/** Share URL that opens the app with `?deck=` so the deck is applied before creating a room. */
export function buildDeckShareUrl(accessCode: string): string {
  const u = new URL(window.location.href);
  u.search = '';
  u.hash = '';
  u.searchParams.set('deck', accessCode);
  return u.toString();
}
