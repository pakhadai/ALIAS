import type { ProfileBenefitItem } from './ProfileBenefitsList';
import { ProfileBenefitsList } from './ProfileBenefitsList';

export type { ProfileBenefitItem };

export interface ProfileGuestBenefitsProps {
  title: string;
  items: ProfileBenefitItem[];
}

export function ProfileGuestBenefits(props: ProfileGuestBenefitsProps) {
  return <ProfileBenefitsList {...props} />;
}
