
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  themeClass?: string;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  className = '',
  icon,
  themeClass,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-[var(--theme-radius)] font-medium transition-all duration-300 active:scale-95 disabled:opacity-30 disabled:pointer-events-none uppercase tracking-[0.2em] text-[10px]";
  
  // Strict theme integration
  const getVariantStyle = () => {
    if (themeClass && variant === 'primary') return themeClass;
    
    switch (variant) {
      case 'outline': return "bg-transparent border border-white/20 text-white hover:bg-white/5";
      case 'danger': return "bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white";
      case 'success': return "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white";
      case 'secondary': return "bg-white/5 text-white/60 hover:text-white border border-white/10";
      case 'ghost': return "bg-transparent text-white/40 hover:text-white";
      default: return "bg-white text-black";
    }
  };

  const sizes = {
    sm: "px-4 py-2",
    md: "px-6 py-3",
    lg: "px-8 py-4",
    xl: "px-10 py-5 text-[11px] tracking-[0.3em]"
  };

  return (
    <button 
      className={`
        ${baseStyles} 
        ${getVariantStyle()} 
        ${sizes[size]} 
        ${fullWidth ? 'w-full' : ''} 
        ${className}
      `}
      {...props}
    >
      {icon && <span className="mr-3">{icon}</span>}
      {children}
    </button>
  );
};
