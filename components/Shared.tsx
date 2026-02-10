
import React, { Component, useEffect, useState, ErrorInfo, useMemo } from 'react';
import { AlertTriangle, RefreshCcw, Info, X, Check, Star } from 'lucide-react';
import { Button } from './Button';
import { ThemeConfig } from '../types';

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Fix: Using Component directly from react import and ensuring proper generic typing
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

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
        <div className="flex flex-col items-center justify-center min-h-screen bg-premium-dark-bg text-white p-10 text-center">
            <AlertTriangle size={48} className="text-red-500/50 mb-8" />
            <h1 className="text-3xl font-serif mb-4 tracking-wide">Unexpected Error</h1>
            <p className="text-white/40 mb-10 max-w-xs text-sm font-sans font-light leading-relaxed">
              We encountered a slight issue. Your game state might be preserved if you were connected.
            </p>
            <Button onClick={this.handleReload} variant="secondary" size="lg">Reload App</Button>
        </div>
      );
    }
    // Fix: access children from this.props which is now correctly typed via Component inheritance
    return this.props.children;
  }
}

export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="animate-fade-in w-full h-full flex flex-col">
    {children}
  </div>
);

// Fix: Implement missing Confetti component to resolve import errors in GameFlow screens
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
    info: 'border-champagne-gold/20 bg-premium-dark-bg text-white shadow-[0_10px_40px_rgba(0,0,0,0.5)]',
    error: 'border-red-500/30 bg-red-950/20 text-red-100 shadow-[0_10px_40px_rgba(220,38,38,0.2)]',
    success: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-100 shadow-[0_10px_40px_rgba(16,185,129,0.2)]'
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
  const [isClosing, setIsClosing] = useState(false);
  
  if (!isOpen && !isClosing) return null;

  const handleCancel = () => {
    setIsClosing(true);
    setTimeout(() => {
      onCancel();
      setIsClosing(false);
    }, 300);
  };

  const handleConfirm = () => {
    setIsClosing(true);
    setTimeout(() => {
      onConfirm();
      setIsClosing(false);
    }, 300);
  };

  return (
    <div className={`fixed inset-0 z-[600] flex items-center justify-center p-8 bg-black/80 backdrop-blur-lg ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
      <div className={`bg-premium-dark-bg border border-white/5 rounded-[3rem] p-12 w-full max-w-sm shadow-2xl text-center ${isClosing ? 'animate-pop-out' : 'animate-pop-in'}`}>
        <h3 className="text-4xl font-serif text-white mb-6 tracking-wide leading-tight">{title}</h3>
        <p className="text-white/30 mb-12 text-sm font-sans leading-relaxed tracking-wider font-light">{message}</p>
        <div className="flex flex-col gap-5">
          <Button variant={isDanger ? 'danger' : 'primary'} fullWidth size="xl" onClick={handleConfirm}>
            {isDanger ? 'Yes, Exit' : 'Confirm'}
          </Button>
          <Button variant="ghost" fullWidth onClick={handleCancel} size="lg">
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
      <div className="bg-premium-dark-bg/95 border border-champagne-gold/10 p-16 rounded-[4rem] shadow-2xl backdrop-blur-3xl ring-1 ring-white/5">
        <Star className="w-16 h-16 text-champagne-gold mx-auto mb-8 animate-pulse" fill="currentColor" />
        <h2 className="text-white text-4xl font-serif mb-4 tracking-widest uppercase">Milestone</h2>
        <p className="text-champagne-gold text-xl tracking-[0.3em] font-sans font-light uppercase">{teamName} reached {points}!</p>
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
      <h1 className={`font-serif font-normal text-7xl tracking-[0.25em] ${isLight ? 'text-slate-900' : 'text-white'} text-center mb-4 animate-pop-in`}>
        ALIAS
      </h1>
      <div className={`h-[1px] w-16 ${isLight ? 'bg-slate-900/10' : 'bg-champagne-gold/30'} mb-6`}></div>
      <p className={`opacity-40 text-[10px] font-sans tracking-[0.6em] uppercase animate-fade-in delay-200 ${isLight ? 'text-slate-900' : 'text-white'}`}>
        Premium Collection
      </p>
    </div>
  );
};
