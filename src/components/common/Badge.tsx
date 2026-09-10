import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple' | 'amber' | 'gray';
  size?: 'sm' | 'md';
  id?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  id,
}) => {
  const variantStyles = {
    primary: 'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    gray: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-semibold',
    md: 'text-xs px-2.5 py-0.5 font-semibold',
  };

  return (
    <span
      id={id}
      className={`inline-flex items-center gap-1 rounded-md border whitespace-nowrap tracking-tight ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {children}
    </span>
  );
};

