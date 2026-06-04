import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full space-y-1.5 font-sans">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-3 py-2 text-sm bg-white dark:bg-[#080710] border rounded-md shadow-sm outline-none transition-all
            ${
              error
                ? 'border-red-500 dark:border-rose-500 focus:border-red-500 dark:focus:border-rose-500 focus:ring-1 focus:ring-red-500 dark:focus:ring-rose-500'
                : 'border-gray-200 dark:border-[#1d1c26] focus:border-gray-400 dark:focus:border-slate-700 focus:ring-1 focus:ring-gray-400 dark:focus:ring-slate-700'
            }
            text-gray-900 dark:text-[#f7f8f8] placeholder:text-gray-400 dark:placeholder:text-slate-700 disabled:bg-gray-50 dark:disabled:bg-slate-900/50 disabled:text-gray-500 dark:disabled:text-slate-500 disabled:cursor-not-allowed ${className}`}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-600 dark:text-rose-400" id={`${inputId}-error`}>
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="text-xs text-gray-500 dark:text-gray-400" id={`${inputId}-helper`}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
