import type { ReactNode } from 'react';
import { Clapperboard, FileText, FlaskConical, Plane, Sparkles, Utensils } from 'lucide-react';
import { Category } from '../../types';
import type { TranslationStrings } from '../../hooks/useT';

const ICON_CLASS = 'shrink-0 opacity-85';

export function categoryIcon(cat: Category): ReactNode {
  switch (cat) {
    case Category.GENERAL:
      return <Sparkles size={18} strokeWidth={2} className={ICON_CLASS} aria-hidden />;
    case Category.FOOD:
      return <Utensils size={18} strokeWidth={2} className={ICON_CLASS} aria-hidden />;
    case Category.TRAVEL:
      return <Plane size={18} strokeWidth={2} className={ICON_CLASS} aria-hidden />;
    case Category.SCIENCE:
      return <FlaskConical size={18} strokeWidth={2} className={ICON_CLASS} aria-hidden />;
    case Category.MOVIES:
      return <Clapperboard size={18} strokeWidth={2} className={ICON_CLASS} aria-hidden />;
    case Category.CUSTOM:
      return <FileText size={18} strokeWidth={2} className={ICON_CLASS} aria-hidden />;
    default:
      return null;
  }
}

export function getCategoryLabel(t: TranslationStrings, cat: Category): string {
  const catKey = `cat_${cat.toLowerCase()}` as keyof TranslationStrings;
  return t[catKey] ?? cat;
}

export const DEFAULT_LOBBY_CATEGORIES = [
  Category.GENERAL,
  Category.FOOD,
  Category.TRAVEL,
  Category.SCIENCE,
  Category.MOVIES,
  Category.CUSTOM,
] as const;
