import React from 'react';
import { ADMIN_INPUT_CLASS } from './adminStyles';

type AdminInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
};

export function AdminInput({ className = '', ...props }: AdminInputProps) {
  return <input className={`${ADMIN_INPUT_CLASS} ${className}`.trim()} {...props} />;
}

type AdminTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  className?: string;
};

export function AdminTextarea({ className = '', ...props }: AdminTextareaProps) {
  return <textarea className={`${ADMIN_INPUT_CLASS} ${className}`.trim()} {...props} />;
}

type AdminSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  className?: string;
};

export function AdminSelect({ className = '', ...props }: AdminSelectProps) {
  return <select className={`${ADMIN_INPUT_CLASS} ${className}`.trim()} {...props} />;
}
