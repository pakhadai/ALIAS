import type { ReactNode, RefObject } from 'react';
import { AvatarDisplay } from '../../../components/AvatarDisplay';
import { ScreenTitle } from '../../../components/typography/ScreenTitle';
import { typographyClass } from '../../../constants/typography';

export interface ProfileHeroProps {
  displayName: string;
  subtitle?: string;
  badge?: ReactNode;
  avatarId?: string | null;
  avatarUrl?: string | null;
  titleRef?: RefObject<HTMLDivElement | null>;
  themeTextMain: string;
  themeTextSecondary: string;
}

export function ProfileHero({
  displayName,
  subtitle,
  badge,
  avatarId,
  avatarUrl,
  titleRef,
  themeTextMain,
  themeTextSecondary,
}: ProfileHeroProps) {
  return (
    <section className="relative flex flex-col items-center pt-3 pb-7 w-full max-w-md mx-auto">
      <div
        className="relative rounded-full p-[3px] shadow-[0_8px_32px_color-mix(in_srgb,var(--ui-accent)_18%,transparent)]"
        style={{
          background:
            'linear-gradient(145deg, color-mix(in srgb, var(--ui-accent) 55%, transparent), color-mix(in srgb, var(--ui-accent-warm, var(--ui-accent)) 30%, transparent))',
        }}
      >
        <div className="rounded-full bg-ui-bg p-0.5">
          <AvatarDisplay
            avatarId={avatarId}
            imageUrl={avatarId ? null : avatarUrl}
            name={displayName}
            size={96}
          />
        </div>
      </div>
      <div ref={titleRef} className="relative mt-5 w-full flex justify-center px-2">
        <ScreenTitle as="h1" themeClass={themeTextMain}>
          {displayName}
        </ScreenTitle>
      </div>
      {subtitle ? (
        <p className={`relative ${typographyClass.body} mt-1.5 ${themeTextSecondary}`}>
          {subtitle}
        </p>
      ) : null}
      {badge ? <div className="relative mt-2.5">{badge}</div> : null}
    </section>
  );
}
