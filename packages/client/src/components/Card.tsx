
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  themeClass?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, className = '', noPadding = false, themeClass, style }) => {
  // Removed hardcoded backdrop-blur-xl as it's often duplicated in theme configs
  const bgStyle = themeClass || 'bg-gray-800/60 border border-white/10 backdrop-blur-md';
  
  return (
    <div 
      className={`rounded-2xl shadow-2xl ${bgStyle} ${noPadding ? '' : 'p-6'} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};
