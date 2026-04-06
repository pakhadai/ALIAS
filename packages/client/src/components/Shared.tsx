import React, { useEffect, useState, useMemo, ErrorInfo } from 'react';
import { X, Star } from 'lucide-react';
import { Button } from './Button';
import { ThemeConfig, AppTheme } from '../types';

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
        color: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#f3e5ab'][
          Math.floor(Math.random() * 5)
        ],
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

  const styles = {
    info: 'border-[color:var(--ui-border)] bg-[color:var(--ui-card)] text-[color:var(--ui-fg)] shadow-2xl',
    error:
      'border-[color:color-mix(in_srgb,var(--ui-danger)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--ui-danger)_12%,transparent)] text-[color:var(--ui-fg)]',
    success:
      'border-[color:color-mix(in_srgb,var(--ui-success)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--ui-success)_12%,transparent)] text-[color:var(--ui-fg)]',
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-1000 flex justify-center pt-4 px-4 pointer-events-none">
      <div className="pointer-events-auto w-[90%] max-w-sm animate-slide-up">
        <div
          className={`${styles[type]} border rounded-4xl px-8 py-5 flex items-center gap-4 backdrop-blur-2xl ring-1 ring-white/5`}
        >
          <div className="flex-1 text-center">
            <p className="text-[10px] font-sans font-bold uppercase tracking-[0.4em] leading-relaxed">
              {message}
            </p>
          </div>
          <button onClick={onClose} className="opacity-30 hover:opacity-100 transition-opacity">
            <X size={16} />
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

  const cardClass = theme?.card || 'bg-(--ui-card)';
  const textMain = theme?.textMain || 'text-(--ui-fg)';
  const textSecondary = theme?.textSecondary || 'text-(--ui-fg-muted)';

  return (
    <div
      className={`fixed inset-0 z-600 flex items-center justify-center p-8 bg-black/80 backdrop-blur-lg ${
        isClosing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
    >
      <div
        className={`${cardClass} border border-(--ui-border) rounded-[3rem] p-12 w-full max-w-sm shadow-2xl text-center ${
          isClosing ? 'animate-pop-out' : 'animate-pop-in'
        }`}
      >
        <h3 className={`text-4xl font-serif ${textMain} mb-6 tracking-wide leading-tight`}>
          {title}
        </h3>
        <p
          className={`${textSecondary} mb-12 text-sm font-sans leading-relaxed tracking-wider font-light`}
        >
          {message}
        </p>
        <div className="flex flex-col gap-5">
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
  const isLight = theme.id === AppTheme.PREMIUM_LIGHT;
  return (
    <div className="flex flex-col items-center w-full">
      <h1
        className="font-serif font-normal text-7xl tracking-[0.25em] text-white text-center mb-4 animate-pop-in"
        style={{ color: isLight ? 'rgb(15, 23, 42)' : 'white' }}
      >
        ALIAS
      </h1>
      <div className={`h-px w-16 ${isLight ? 'bg-slate-900/10' : 'bg-white/10'} mb-6`}></div>
      <p
        className={`opacity-40 text-[10px] font-sans tracking-[0.6em] uppercase animate-fade-in delay-200 ${isLight ? 'text-slate-900' : 'text-white'}`}
      >
        Premium Collection
      </p>
    </div>
  );
};
