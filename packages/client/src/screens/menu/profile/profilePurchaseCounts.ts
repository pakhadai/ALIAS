import type { UserProfile } from '../../../services/api';

export interface ProfilePurchaseCounts {
  wordPacks: number;
  themes: number;
  hasCustomPacks: boolean;
}

export function countProfilePurchases(
  purchases: UserProfile['purchases'] | undefined
): ProfilePurchaseCounts {
  if (!purchases?.length) {
    return { wordPacks: 0, themes: 0, hasCustomPacks: false };
  }

  let wordPacks = 0;
  let themes = 0;
  let hasCustomPacks = false;

  for (const purchase of purchases) {
    if (purchase.themeId) {
      themes += 1;
      continue;
    }
    if (purchase.wordPack?.slug === 'feature-custom-packs') {
      hasCustomPacks = true;
      continue;
    }
    if (purchase.wordPackId) {
      wordPacks += 1;
    }
  }

  return { wordPacks, themes, hasCustomPacks };
}
