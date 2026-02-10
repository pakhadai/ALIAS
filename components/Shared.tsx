
import React, { useEffect, useState, ErrorInfo } from 'react';
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
  // Fix: Explicitly defining the constructor ensures that the 'props' property from React.Component 
  // is correctly typed and inherited within the class instance.
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-10 text-center">
            <h1 className="text-3xl font-serif mb-4 tracking-wide">Unexpected Error</h1>
            <p className="text-white/40 mb-10 max-w-xs text-sm font-sans font-light leading-relaxed">
              We encountered a slight issue. Please try reloading the app.
            </p>
            <Button onClick={this.handleReload} variant="secondary" size="lg">Reload App</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="animate-fade-in w-full h-full flex flex-col">
    {children}
  </div>
);

export const Confetti: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <div 
          key={i}
          className="absolute w-2 h-2 rounded-full animate-ping opacity-50"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            backgroundColor: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#f3e5ab'][Math.floor(Math.random() * 5)],
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${3 + Math.random() * 2}s`
          }}
        />
      ))}
    </div>
  );
};

export const ToastNotification: React.FC<{ message: string, type?: 'info' | 'error' | 'success', onClose: () => void }> = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    info: 'border-white/20 bg-slate-900 text-white shadow-2xl',
    error: 'border-red-500/30 bg-red-950/20 text-red-100',
    success: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-100'
  };

  return (
    <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-sm animate-slide-up">
      <div className={`${styles[type]} border rounded-[2rem] px-8 py-5 flex items-center gap-4 backdrop-blur-2xl ring-1 ring-white/5`}>
        <div className="flex-1 text-center">
          <p className="text-[10px] font-sans font-bold uppercase tracking-[0.4em] leading-relaxed">{message}</p>
        </div>
        <button onClick={onClose} className="opacity-30 hover:opacity-100 transition-opacity"><X size={16} /></button>
      </div>
    </div>
  );
};

export const ConfirmationModal: React.FC<{ isOpen: boolean, title: string, message: string, onConfirm: () => void, onCancel: () => void, isDanger?: boolean }> = ({ isOpen, title, message, onConfirm, onCancel, isDanger }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-8 bg-black/80 backdrop-blur-lg animate-fade-in">
      <div className="bg-slate-900 border border-white/5 rounded-[3rem] p-12 w-full max-w-sm shadow-2xl text-center animate-pop-in">
        <h3 className="text-4xl font-serif text-white mb-6 tracking-wide leading-tight">{title}</h3>
        <p className="text-white/30 mb-12 text-sm font-sans leading-relaxed tracking-wider font-light">{message}</p>
        <div className="flex flex-col gap-5">
          <Button variant={isDanger ? 'danger' : 'primary'} fullWidth size="xl" onClick={onConfirm}>
            {isDanger ? 'Yes, Exit' : 'Confirm'}
          </Button>
          <Button variant="ghost" fullWidth onClick={onCancel} size="lg">
            <span className="opacity-40 hover:opacity-100 transition-opacity font-sans">Go Back</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export const FloatingParticle: React.FC<{ x: number, y: number, text: string, color: string, onComplete: () => void }> = ({ x, y, text, color, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className="fixed pointer-events-none z-[100] font-serif text-4xl animate-float-up"
      style={{ left: x, top: y, color }}
    >
      {text}
    </div>
  );
};

export const MilestoneNotification: React.FC<{ points: number, teamName: string, onComplete: () => void }> = ({ points, teamName, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[150] w-full px-10 text-center animate-pop-in">
      <div className="bg-slate-900/95 border border-white/10 p-16 rounded-[4rem] shadow-2xl backdrop-blur-3xl ring-1 ring-white/5">
        <Star className="w-16 h-16 text-yellow-500 mx-auto mb-8 animate-pulse" fill="currentColor" />
        <h2 className="text-white text-4xl font-serif mb-4 tracking-widest uppercase">Milestone</h2>
        <p className="text-yellow-500 text-xl tracking-[0.3em] font-sans font-light uppercase">{teamName} reached {points}!</p>
      </div>
    </div>
  );
};

interface LogoProps {
  theme: ThemeConfig;
}

export const Logo: React.FC<LogoProps> = ({ theme }) => {
  const isLight = theme.id === 'PREMIUM_LIGHT';
  return (
    <div className="flex flex-col items-center w-full">
      <h1 className="font-serif font-normal text-7xl tracking-[0.25em] text-white text-center mb-4 animate-pop-in" style={{ color: isLight ? 'rgb(15, 23, 42)' : 'white' }}>
        ALIAS
      </h1>
      <div className={`h-[1px] w-16 ${isLight ? 'bg-slate-900/10' : 'bg-white/10'} mb-6`}></div>
      <p className={`opacity-40 text-[10px] font-sans tracking-[0.6em] uppercase animate-fade-in delay-200 ${isLight ? 'text-slate-900' : 'text-white'}`}>
        Premium Collection
      </p>
    </div>
  );
};
