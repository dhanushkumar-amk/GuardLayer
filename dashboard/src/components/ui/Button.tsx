import React from 'react';
import Spinner from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  type = 'button',
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-[#000000] disabled:opacity-50 disabled:cursor-not-allowed';

  // Scotch POS styling features pill-shaped (rounded-full) action buttons
  const variantClasses = {
    primary:
      'bg-[#ff5a1f] text-white hover:bg-[#e24e16] focus:ring-[#ff5a1f] rounded-full shadow-md shadow-orange-500/10',
    secondary:
      'bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 dark:bg-[#0d0d11] dark:border-[#17171e] dark:text-gray-200 dark:hover:bg-[#15151c] focus:ring-[#17171e] rounded-full',
    danger:
      'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600 rounded-full',
    ghost:
      'text-gray-500 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-[#0d0d11]/50 focus:ring-[#0d0d11] rounded-full',
  };

  const sizeClasses = {
    sm: 'px-4 py-1.5 text-xs',
    md: 'px-5 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base',
  };

  const spinnerSize = size === 'lg' ? 'md' : 'sm';
  
  let spinnerColor: 'gray' | 'white' = 'white';
  if (variant === 'secondary') {
    const isDark = document.documentElement.classList.contains('dark');
    spinnerColor = isDark ? 'white' : 'gray';
  } else if (variant === 'ghost') {
    const isDark = document.documentElement.classList.contains('dark');
    spinnerColor = isDark ? 'white' : 'gray';
  }

  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <Spinner size={spinnerSize} color={spinnerColor} className="mr-2" />
      )}
      {children}
    </button>
  );
};

export default Button;
