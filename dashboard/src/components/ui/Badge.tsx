import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
}) => {
  const variantClasses = {
    success:
      'bg-green-50 text-green-700 border-green-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    danger:
      'bg-red-50 text-red-700 border-red-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
    warning:
      'bg-orange-50 text-orange-700 border-orange-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    info:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20',
    neutral:
      'bg-gray-50 text-gray-600 border-gray-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-800/80',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
