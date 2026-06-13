import React, { useEffect, useMemo, ErrorInfo } from 'react';
import { createPortal } from 'react-dom';
import { X, Star } from 'lucide-react';
import { Button } from './Button';
import { ThemeConfig } from '../types';
import { zIndex } from '../constants/zIndex';
import { typographyClass, brandCaptionClass } from '../constants/typography';
import { DEFAULT_HOME_TAGLINE } from '../constants/homeBrand';
import { ToastItem } from './ToastItem';
import { MovliLogoMark } from './MovliLogoMark';

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare state: ErrorBoundaryState;
  declare props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-ui-bg text-ui-fg px-10 pt-safe-top pb-10 text-center">
          <h1 className={`${typographyClass.heading} mb-4`}>Unexpected Error</h1>
          <p className={`text-ui-fg-muted mb-10 max-w-xs ${typographyClass.body} font-light`}>
            We encountered a slight issue. Please try reloading the app.
          </p>
          <Button onClick={this.handleReload} variant="secondary" size="lg">
            Reload App
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Bottom sheet primitives — visual state via `data-open` on backdrop/panel (see styles.css).
 * NOTE: do not use `animate-pop-in` / `animate-fade-in` on these nodes; they override CSS transitions.
 */
/** Top bar — `data-sheet-drag-handle` on `BottomSheetTopBar` enables swipe-to-dismiss from handle + title row */
export const bottomSheetHandleRowClass = 'bottom-sheet-handle-row';
export const bottomSheetHandleBarClass = 'bottom-sheet-handle';

export function BottomSheetHandleRow({ className = '' }: { className?: string }) {
  return (
    <div className={[bottomSheetHandleRowClass, className].filter(Boolean).join(' ')} aria-hidden>
      <div className={bottomSheetHandleBarClass} />
    </div>
  );
}

export const bottomSheetTopBarClass = 'bottom-sheet-top-bar';
/** Tall sheet scroll column — sticky header must live inside this (iOS glass; see TMA_LAYOUT.md). */
export const modalSheetScrollClass = 'modal-sheet-scroll';
export const bottomSheetHeaderRowClass = 'bottom-sheet-header-row';
export const bottomSheetHeaderTitleClass = 'bottom-sheet-header-row__title';
export const bottomSheetCloseButtonClass =
  'bottom-sheet-top-bar__close min-h-10 min-w-10 -mr-1 flex shrink-0 items-center justify-center rounded-full transition-colors hover:bg-ui-surface active:bg-ui-surface-hover disabled:opacity-20 disabled:pointer-events-none';

type BottomSheetTopBarProps = {
  title?: React.ReactNode;
  headerClassName?: string;
  showClose?: boolean;
  onClose?: () => void;
  closeAriaLabel?: string;
  closeIconSize?: number;
  closeDisabled?: boolean;
  closeButtonClassName?: string;
};

/** Handle (top center) + optional title row (left) with close (right) */
export function BottomSheetTopBar({
  title,
  headerClassName = '',
  showClose = false,
  onClose,
  closeAriaLabel = 'Close',
  closeIconSize = 20,
  closeDisabled = false,
  closeButtonClassName = bottomSheetCloseButtonClass,
}: BottomSheetTopBarProps) {
  const showHeaderRow = title != null || showClose;

  return (
    <div className={bottomSheetTopBarClass} data-sheet-drag-handle="">
      <BottomSheetHandleRow />
      {showHeaderRow ? (
        <div className={[bottomSheetHeaderRowClass, headerClassName].filter(Boolean).join(' ')}>
          <div className={bottomSheetHeaderTitleClass}>{title}</div>
          {showClose && onClose ? (
            <button
              type="button"
              onClick={onClose}
              disabled={closeDisabled}
              className={closeButtonClassName}
              aria-label={closeAriaLabel}
            >
              <X size={closeIconSize} strokeWidth={2} />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export type ZIndexLayerClass = (typeof zIndex)[keyof typeof zIndex];

export const bottomSheetBackdropClass = (
  zClass: ZIndexLayerClass = zIndex.modal,
  position: 'fixed' | 'absolute' = 'fixed',
  extraClassName = ''
) =>
  [
    'bottom-sheet-backdrop',
    position === 'absolute' ? 'bottom-sheet-backdrop--absolute' : '',
    zClass,
    extraClassName,
  ]
    .filter(Boolean)
    .join(' ');

/** Height + padding preset for edge-to-edge sheets. See `docs/TMA_LAYOUT.md`. */
export type ModalSheetSize = 'compact' | 'default' | 'tall';

export function bottomSheetPanelClass(
  extraClassName = '',
  size: ModalSheetSize = 'default'
): string {
  return [
    'bottom-sheet-panel',
    'bottom-sheet-panel--sheet',
    `bottom-sheet-panel--size-${size}`,
    extraClassName,
  ]
    .filter(Boolean)
    .join(' ');
}

/** Canonical ModalSheet title — serif display heading token (TYPO-001) */
export const modalSheetTitleClass = typographyClass.heading;

type ModalSheetTitleProps = {
  id?: string;
  children: React.ReactNode;
  /** Theme text class, e.g. `currentTheme.textMain` */
  themeClass?: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p';
};

export function ModalSheetTitle({
  id,
  children,
  themeClass = '',
  className = '',
  as: Tag = 'h2',
}: ModalSheetTitleProps) {
  return (
    <Tag
      id={id}
      className={[modalSheetTitleClass, themeClass, className].filter(Boolean).join(' ')}
    >
      {children}
    </Tag>
  );
}

/** Left-aligned action row for compact sheets (invite options, team pickers, etc.). */
export function ModalOptionButton({
  icon,
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      fullWidth
      size="md"
      icon={icon}
      className={[
        'justify-start gap-3 font-sans font-semibold normal-case tracking-normal text-ui-fg',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </Button>
  );
}

/** Renders into `document.body` so `position: fixed` overlays use the viewport, not a transformed ancestor (e.g. `PageTransition`). */
export function ModalPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return <>{children}</>;
  return createPortal(children, document.body);
}

export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="animate-page-in w-full h-full min-h-0 flex flex-col">{children}</div>
);

export const Confetti: React.FC = () => {
  const particles = useMemo(
    () =>
      [...Array(20)].map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        color: [
          'var(--ui-accent)',
          'var(--ui-success)',
          'var(--ui-warning)',
          'var(--ui-danger)',
          'color-mix(in_srgb,var(--ui-fg)_70%,transparent)',
        ][Math.floor(Math.random() * 5)],
        delay: `${Math.random() * 2}s`,
        duration: `${3 + Math.random() * 2}s`,
      })),
    []
  );

  return (
    <div className={`fixed inset-0 pointer-events-none ${zIndex.fx} overflow-hidden`}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-2 h-2 rounded-full animate-ping opacity-50"
          style={{
            left: p.left,
            top: p.top,
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
};

export const ToastNotification: React.FC<{
  message: string;
  type?: 'info' | 'error' | 'success';
  onClose: () => void;
}> = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <ModalPortal>
      <div
        className={`fixed left-0 right-0 top-(--tma-toast-top) ${zIndex.toast} flex justify-center px-4 pointer-events-none`}
      >
        <div className="pointer-events-auto animate-slide-up">
          <ToastItem message={message} type={type} onDismiss={onClose} />
        </div>
      </div>
    </ModalPortal>
  );
};

export const FloatingParticle: React.FC<{
  x: number;
  y: number;
  text: string;
  color: string;
  onComplete: () => void;
}> = ({ x, y, text, color, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed pointer-events-none ${zIndex.fx} font-serif text-4xl animate-float-up`}
      style={{ left: x, top: y, color }}
    >
      {text}
    </div>
  );
};

interface MilestoneNotificationProps {
  points: number;
  teamName: string;
  onComplete: () => void;
  milestoneText?: string;
  reachedText?: string;
}

export const MilestoneNotification: React.FC<MilestoneNotificationProps> = ({
  points,
  teamName,
  onComplete,
  milestoneText,
  reachedText,
}) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const displayText = reachedText
    ? reachedText.replace('{0}', teamName).replace('{1}', String(points))
    : `${teamName} reached ${points}!`;

  return (
    <ModalPortal>
      <div
        className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${zIndex.milestone} w-full px-10 text-center animate-pop-in`}
      >
        <div className="bg-ui-card border border-ui-border p-16 rounded-[4rem] shadow-2xl backdrop-blur-3xl ring-1 ring-ui-border">
          <Star
            className="w-16 h-16 text-ui-accent mx-auto mb-8 animate-pulse"
            fill="currentColor"
          />
          <h2 className="text-ui-fg text-4xl font-serif mb-4 tracking-widest uppercase">
            {milestoneText || 'Milestone'}
          </h2>
          <p className="text-ui-accent text-xl tracking-[0.3em] font-sans font-light uppercase">
            {displayText}
          </p>
        </div>
      </div>
    </ModalPortal>
  );
};

interface LogoProps {
  theme: ThemeConfig;
  /** Localized home tagline — defaults to EN when boot context has no UI language. */
  tagline?: string;
}

export const Logo: React.FC<LogoProps> = ({ theme, tagline = DEFAULT_HOME_TAGLINE }) => {
  return (
    <div className="flex flex-col items-center w-full">
      <h1 className={`mb-3 w-full max-w-[min(100%,20rem)] ${theme.textMain}`} aria-label="MOVLI">
        <MovliLogoMark className="block h-auto w-full" />
      </h1>
      <div className="flex w-full max-w-[min(100%,20rem)] items-center justify-center gap-2.5">
        <div className="h-px min-w-0 flex-1 max-w-12 bg-ui-border opacity-60" aria-hidden />
        <p className={`shrink-0 opacity-50 ${brandCaptionClass} ${theme.textSecondary}`}>
          {tagline}
        </p>
        <div className="h-px min-w-0 flex-1 max-w-12 bg-ui-border opacity-60" aria-hidden />
      </div>
    </div>
  );
};
