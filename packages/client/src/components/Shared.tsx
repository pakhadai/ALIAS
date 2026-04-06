import React, { useEffect, useState, useMemo, ErrorInfo } from 'react';
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
 * Bottom sheet overlay (same motion as guest ProfileModal): blur dim + panel slides from bottom.
 * @param visible When false, backdrop clears and panel moves off-screen (close animation).
 * @param zIndexClass e.g. z-50, z-600 for stacking above game UI.
 * @param position fixed (default) or absolute for in-screen overlays (e.g. pause).
 */
export function bottomSheetBackdropClass(
  visible: boolean,
  zIndexClass = 'z-50',
  position: 'fixed' | 'absolute' = 'fixed'
): string {
  return [
    position === 'fixed' ? 'fixed' : 'absolute',
    'inset-0 flex flex-col justify-end transition-all duration-300',
    zIndexClass,
    visible
      ? 'bg-[color-mix(in_srgb,var(--ui-bg)_78%,transparent)] backdrop-blur-xl animate-fade-in'
      : 'bg-transparent',
  ].join(' ');
}

/** Panel shell: rounded top, translate + pop-in when `open` is true. */
export function bottomSheetPanelClass(open: boolean, extraClassName = ''): string {
  return [
    'relative z-10 w-full max-w-sm md:max-w-md mx-auto rounded-t-4xl overflow-hidden',
    'bg-(--ui-card) border border-(--ui-border) shadow-2xl',
    'transition-transform duration-300 ease-out',
    open ? 'translate-y-0 animate-pop-in' : 'translate-y-full',
    extraClassName,
  ]
    .filter(Boolean)
    .join(' ');
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
    <div className="fixed top-0 left-0 right-0 z-1000 flex justify-center pt-4 px-4 pointer-events-none">
      <div className="pointer-events-auto w-[min(92vw,28rem)] animate-slide-up">
        <div
          className={`${shell[type]} flex items-start gap-3 rounded-3xl border-2 px-5 py-4 ring-1 ring-[color-mix(in_srgb,var(--ui-fg)_06%,transparent)]`}
        >
          <div className="min-w-0 flex-1 text-center">
            <p
              className={`text-sm font-sans font-semibold leading-snug tracking-wide ${messageClass}`}
            >
              {message}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-(--ui-fg-muted) opacity-80 hover:bg-[color-mix(in_srgb,var(--ui-fg)_08%,transparent)] hover:opacity-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </div>
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

  return (
    <div
      className={bottomSheetBackdropClass(sheetOpen, 'z-600')}
      onClick={onCancel}
      role="presentation"
    >
      <div
        className={bottomSheetPanelClass(sheetOpen, 'p-8 text-center')}
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
      >
        <div className="flex justify-center pt-1 pb-3">
          <div className="h-1 w-10 rounded-full bg-(--ui-border)" aria-hidden />
        </div>
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
          <Button variant={isDanger ? 'danger' : 'primary'} fullWidth size="xl" onClick={onConfirm}>
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
