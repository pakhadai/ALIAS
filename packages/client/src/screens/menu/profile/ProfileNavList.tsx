import {
  User,
  SlidersHorizontal,
  ShoppingBag,
  ChevronRight,
  BookOpen,
  Lock,
  Shield,
  BarChart3,
} from 'lucide-react';
import { labelSectionClass } from '../../../constants/typography';
import { typographyClass } from '../../../constants/typography';

export interface ProfileNavListProps {
  isDark: boolean;
  themeTextMain: string;
  themeIconColor: string;
  themeButtonClass: string;
  hasCustomPacks: boolean;
  showAdminEntry: boolean;
  labels: {
    sectionGame: string;
    sectionSettings: string;
    sectionExtra: string;
    myStats: string;
    myPacks: string;
    unlockPacks: string;
    unlockPacksSub: string;
    profileSettings: string;
    lobbySettings: string;
    lobbySettingsSub?: string;
    store: string;
    adminPanel: string;
  };
  onMyStats: () => void;
  onMyPacks: () => void;
  onProfileSettings: () => void;
  onLobbySettings: () => void;
  onStore: () => void;
  onAdminPanel: () => void;
}

function NavSection({ title }: { title: string }) {
  return (
    <p className={`${labelSectionClass} px-1 pt-3 pb-1 first:pt-0 text-ui-fg-muted`}>{title}</p>
  );
}

export function ProfileNavList({
  isDark,
  themeTextMain,
  themeIconColor,
  themeButtonClass,
  hasCustomPacks,
  showAdminEntry,
  labels,
  onMyStats,
  onMyPacks,
  onProfileSettings,
  onLobbySettings,
  onStore,
  onAdminPanel,
}: ProfileNavListProps) {
  const navBtn = `w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-200 ease-out active:scale-[0.98] ${
    isDark
      ? 'bg-ui-surface border border-ui-border active:bg-ui-surface-hover'
      : 'bg-ui-card border border-ui-border active:bg-ui-surface-hover shadow-sm'
  }`;
  const navLabel = `${typographyClass.label} font-sans tracking-[0.25em] ${themeTextMain}`;
  const accentLock = 'text-[color-mix(in_srgb,var(--ui-accent)_78%,var(--ui-accent-contrast)_22%)]';

  return (
    <div className="w-full max-w-md mx-auto space-y-3">
      <NavSection title={labels.sectionGame} />

      <button type="button" onClick={onMyStats} className={navBtn}>
        <div className="flex items-center gap-3">
          <BarChart3 size={16} className={themeIconColor} />
          <span className={navLabel}>{labels.myStats}</span>
        </div>
        <ChevronRight size={16} className={`${themeIconColor} opacity-30`} />
      </button>

      <button type="button" onClick={onMyPacks} className={navBtn}>
        <div className="flex items-center gap-3 min-w-0">
          <BookOpen size={16} className={hasCustomPacks ? themeIconColor : accentLock} />
          <div className="text-left min-w-0">
            <span className={navLabel}>{hasCustomPacks ? labels.myPacks : labels.unlockPacks}</span>
            {!hasCustomPacks && (
              <p className={`${typographyClass.label} mt-0.5 tracking-widest text-ui-fg-muted`}>
                {labels.unlockPacksSub}
              </p>
            )}
          </div>
        </div>
        {hasCustomPacks ? (
          <ChevronRight size={16} className={`${themeIconColor} opacity-30 shrink-0`} />
        ) : (
          <Lock size={14} className={`shrink-0 ${accentLock}`} />
        )}
      </button>

      <NavSection title={labels.sectionSettings} />

      <button type="button" onClick={onProfileSettings} className={navBtn}>
        <div className="flex items-center gap-3">
          <User size={16} className={themeIconColor} />
          <span className={navLabel}>{labels.profileSettings}</span>
        </div>
        <ChevronRight size={16} className={`${themeIconColor} opacity-30`} />
      </button>

      <button type="button" onClick={onLobbySettings} className={navBtn}>
        <div className="flex items-center gap-3 min-w-0">
          <SlidersHorizontal size={16} className={themeIconColor} />
          <div className="text-left min-w-0">
            <span className={navLabel}>{labels.lobbySettings}</span>
            {labels.lobbySettingsSub ? (
              <p className={`${typographyClass.label} mt-0.5 tracking-widest text-ui-fg-muted`}>
                {labels.lobbySettingsSub}
              </p>
            ) : null}
          </div>
        </div>
        <ChevronRight size={16} className={`${themeIconColor} opacity-30 shrink-0`} />
      </button>

      <NavSection title={labels.sectionExtra} />

      <button type="button" onClick={onStore} className={`${navBtn} ${themeButtonClass}`}>
        <div className="flex items-center gap-3">
          <ShoppingBag size={16} />
          <span className={`${typographyClass.label} font-sans tracking-[0.25em]`}>
            {labels.store}
          </span>
        </div>
        <ChevronRight size={16} className="opacity-60" />
      </button>

      {showAdminEntry ? (
        <button type="button" onClick={onAdminPanel} className={navBtn}>
          <div className="flex items-center gap-3">
            <Shield size={16} className="text-ui-accent" strokeWidth={2.25} aria-hidden />
            <span className={navLabel}>{labels.adminPanel}</span>
          </div>
          <ChevronRight size={16} className={`${themeIconColor} opacity-30`} />
        </button>
      ) : null}
    </div>
  );
}
