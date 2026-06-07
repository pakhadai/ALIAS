import React from 'react';
import { typographyClass } from '../../constants/typography';

type ScreenTitleProps = {
  children: React.ReactNode;
  /** Theme text class, e.g. `currentTheme.textMain` */
  themeClass?: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p';
};

/** Canonical screen / section heading — same visual as `ModalSheetTitle`. */
export function ScreenTitle({
  children,
  themeClass = 'text-ui-fg',
  className = '',
  as: Tag = 'h2',
}: ScreenTitleProps) {
  return (
    <Tag className={[typographyClass.heading, themeClass, className].filter(Boolean).join(' ')}>
      {children}
    </Tag>
  );
}
