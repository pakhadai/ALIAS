import React, { useEffect, useState, useMemo, ErrorInfo } from 'react';
import { createPortal } from 'react-dom';
import { X, Star } from 'lucide-react';
import { Button } from './Button';
import { ThemeConfig } from '../types';

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
        <div className="flex flex-col items-center justify-center min-h-screen bg-(--ui-bg) text-(--ui-fg) p-10 text-center">
          <h1 className="text-3xl font-serif mb-4 tracking-wide">Unexpected Error</h1>
          <p className="text-(--ui-fg-muted) mb-10 max-w-xs text-sm font-sans font-light leading-relaxed">
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
 * Bottom sheet backdrop: dims + blurs the background while the sheet is open.
 *
 * Animation: opacity CSS transition (duration-300).
 * NOTE: `animate-fade-in` and `animate-pop-in` are intentionally NOT used here —
 * those keyframe animations override the transform/opacity CSS transitions on the
 * same property, breaking the slide animation. Pure CSS transitions are used instead.
 */
export const bottomSheetBackdropClass = (
  visible: boolean,
  zIndex = 'z-50',
  position: 'fixed' | 'absolute' = 'fixed',
  extraClassName = ''
) =>
  `${position} inset-0 ${zIndex} flex flex-col justify-end transition-[opacity,background-color] duration-300 ${extraClassName} ${
    visible
      ? 'bg-[color-mix(in_srgb,var(--ui-bg)_78%,transparent)] backdrop-blur-xl opacity-100'
      : 'bg-transparent opacity-0 pointer-events-none'
  }`;

export const centerModalBackdropClass = (
  visible: boolean,
  zIndex = 'z-50',
  position: 'fixed' | 'absolute' = 'fixed'
) =>
  `${position} inset-0 ${zIndex} flex items-center justify-center p-6 transition-[opacity,background-color] duration-300 ${
    visible
      ? 'bg-[color-mix(in_srgb,var(--ui-bg)_78%,transparent)] backdrop-blur-xl opacity-100'
      : 'bg-transparent opacity-0 pointer-events-none'
  }`;

/**
 * Bottom sheet panel: slides up from bottom when open, slides down when closed.
 *
 * Animation: translateY CSS transition (duration-300 ease-out).
 * NOTE: `animate-pop-in` is intentionally NOT used — it runs a scale(0.8→1) keyframe
 * that overrides the translateY transition, causing the panel to pop instead of slide.
 */
export function bottomSheetPanelClass(open: boolean, extraClassName = ''): string {
  return [
    // Use a scrollable panel to avoid sheets being cut off below the viewport
    // (common on mobile with browser chrome / safe areas).
    'relative w-full max-w-md mx-auto rounded-t-4xl max-h-[85svh] overflow-y-auto overscroll-contain',
    'bg-(--ui-card) border border-(--ui-border)',
    'transition-transform duration-300 ease-out will-change-transform',
    open ? 'translate-y-0' : 'translate-y-full',
    extraClassName,
  ]
    .filter(Boolean)
    .join(' ');
}

export function centerModalPanelClass(open: boolean, extraClassName = ''): string {
  return [
    'relative w-full max-w-md mx-auto rounded-4xl max-h-[85svh] overflow-y-auto overscroll-contain',
    'bg-(--ui-card) border border-(--ui-border)',
    'transition-[transform,opacity] duration-250 ease-out will-change-transform',
    open ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
    extraClassName,
  ]
    .filter(Boolean)
    .join(' ');
}

/** Renders into `document.body` so `position: fixed` overlays use the viewport, not a transformed ancestor (e.g. `PageTransition`). */
export function ModalPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return <>{children}</>;
  return createPortal(children, document.body);
}

export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="animate-page-in w-full h-full flex flex-col">{children}</div>
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
    <div className="fixed inset-0 pointer-events-none z-100 overflow-hidden">
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

  /** Opaque, theme-aware shells (no mix with transparent — works on light & OLED dark). */
  const shell: Record<'info' | 'error' | 'success', string> = {
    info: [
      'border-[color:color-mix(in_srgb,var(--ui-border)_85%,var(--ui-fg)_15%)]',
      'bg-[color:var(--ui-elevated)]',
      'shadow-[0_12px_40px_color-mix(in_srgb,var(--ui-fg)_12%,transparent)]',
    ].join(' '),
    error: [
      'border-[color:color-mix(in_srgb,var(--ui-danger)_55%,var(--ui-border)_45%)]',
      'bg-[color:color-mix(in_srgb,var(--ui-danger)_20%,var(--ui-elevated)_80%)]',
      'shadow-[0_12px_36px_color-mix(in_srgb,var(--ui-danger)_22%,transparent)]',
    ].join(' '),
    success: [
      'border-[color:color-mix(in_srgb,var(--ui-success)_55%,var(--ui-border)_45%)]',
      'bg-[color:color-mix(in_srgb,var(--ui-success)_20%,var(--ui-elevated)_80%)]',
      'shadow-[0_12px_36px_color-mix(in_srgb,var(--ui-success)_22%,transparent)]',
    ].join(' '),
  };

  const messageClass =
    type === 'error'
      ? 'text-[color:color-mix(in_srgb,var(--ui-danger)_25%,var(--ui-fg)_75%)]'
      : type === 'success'
        ? 'text-[color:color-mix(in_srgb,var(--ui-success)_18%,var(--ui-fg)_82%)]'
        : 'text-(--ui-fg)';

  return (
    <ModalPortal>
      <div className="fixed top-0 left-0 right-0 z-1000 flex justify-center px-4 pt-safe-top-sm pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md animate-slide-up">
          <div
            className={`${shell[type]} relative rounded-2xl border px-4 py-3.5 pr-11 ring-1 ring-[color-mix(in_srgb,var(--ui-fg)_06%,transparent)]`}
          >
            <p
              className={`min-w-0 text-left text-sm font-sans font-medium leading-relaxed ${messageClass}`}
            >
              {message}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-(--ui-fg-muted) opacity-80 hover:bg-[color-mix(in_srgb,var(--ui-fg)_08%,transparent)] hover:opacity-100 transition-colors"
              aria-label="Close"
            >
              <X size={18} strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
  theme?: ThemeConfig;
  confirmText?: string;
  cancelText?: string;
  variant?: 'bottomSheet' | 'center';
  backdropExtraClassName?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isDanger,
  theme,
  confirmText,
  cancelText,
  variant = 'bottomSheet',
  backdropExtraClassName,
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      return;
    }
    if (!shouldRender) return;
    setIsClosing(true);
    const t = setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
    }, 280);
    return () => clearTimeout(t);
  }, [isOpen, shouldRender]);

  if (!shouldRender) return null;

  const textMain = theme?.textMain || 'text-(--ui-fg)';
  const textSecondary = theme?.textSecondary || 'text-(--ui-fg-muted)';
  const sheetOpen = !isClosing;
  const isCenter = variant === 'center';

  return (
    <ModalPortal>
      <div
        className={
          isCenter
            ? centerModalBackdropClass(sheetOpen, 'z-600')
            : bottomSheetBackdropClass(sheetOpen, 'z-600', 'fixed', backdropExtraClassName)
        }
        onClick={onCancel}
        role="presentation"
      >
        <div
          className={
            isCenter
              ? centerModalPanelClass(sheetOpen, 'px-8 py-8 text-center')
              : bottomSheetPanelClass(sheetOpen, 'px-8 pt-8 pb-safe-bottom text-center')
          }
          onClick={(e) => e.stopPropagation()}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          aria-describedby="confirm-modal-desc"
        >
          {!isCenter && (
            <div className="flex justify-center pt-1 pb-3">
              <div className="h-1 w-10 rounded-full bg-(--ui-border)" aria-hidden />
            </div>
          )}
          <h3
            id="confirm-modal-title"
            className={`text-2xl md:text-3xl font-serif ${textMain} mb-4 tracking-wide leading-tight`}
          >
            {title}
          </h3>
          <p
            id="confirm-modal-desc"
            className={`${textSecondary} mb-8 text-sm font-sans leading-relaxed tracking-wide font-light px-1`}
          >
            {message}
          </p>
          <div className="flex flex-col gap-4">
            <Button
              variant={isDanger ? 'danger' : 'primary'}
              fullWidth
              size="xl"
              onClick={onConfirm}
            >
              {confirmText || (isDanger ? 'Yes, Exit' : 'Confirm')}
            </Button>
            <Button variant="ghost" fullWidth onClick={onCancel} size="lg">
              <span className="opacity-40 hover:opacity-100 transition-opacity font-sans">
                {cancelText || 'Go Back'}
              </span>
            </Button>
          </div>
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
      className="fixed pointer-events-none z-100 font-serif text-4xl animate-float-up"
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
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-150 w-full px-10 text-center animate-pop-in">
        <div className="bg-(--ui-card) border border-(--ui-border) p-16 rounded-[4rem] shadow-2xl backdrop-blur-3xl ring-1 ring-(--ui-border)">
          <Star
            className="w-16 h-16 text-(--ui-accent) mx-auto mb-8 animate-pulse"
            fill="currentColor"
          />
          <h2 className="text-(--ui-fg) text-4xl font-serif mb-4 tracking-widest uppercase">
            {milestoneText || 'Milestone'}
          </h2>
          <p className="text-(--ui-accent) text-xl tracking-[0.3em] font-sans font-light uppercase">
            {displayText}
          </p>
        </div>
      </div>
    </ModalPortal>
  );
};

interface LogoProps {
  theme: ThemeConfig;
}

export const Logo: React.FC<LogoProps> = ({ theme }) => {
  return (
    <div className="flex flex-col items-center w-full">
      <h1
        className={`font-serif font-normal text-7xl tracking-[0.25em] text-center mb-4 animate-pop-in ${theme.textMain}`}
      >
        ALIAS
      </h1>
      <div className="h-px w-16 bg-(--ui-border) mb-6"></div>
      <p
        className={`opacity-40 text-[10px] font-sans tracking-[0.6em] uppercase animate-fade-in delay-200 ${theme.textSecondary}`}
      >
        Premium Collection
      </p>
    </div>
  );
};
