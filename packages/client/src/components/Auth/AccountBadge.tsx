import { typographyClass } from '../../constants/typography';

export function AccountBadge({ label }: { label: string }) {
  return (
    <span
      className={`bg-ui-accent text-ui-accent-contrast ${typographyClass.label} tracking-[0.18em] px-3 py-[3px] rounded-full shadow-md`}
    >
      {label}
    </span>
  );
}

export function ProviderBadge({ provider }: { provider: string }) {
  const label =
    provider === 'google' ? 'GOOGLE' : provider === 'apple' ? 'APPLE' : provider.toUpperCase();
  return <AccountBadge label={label} />;
}
