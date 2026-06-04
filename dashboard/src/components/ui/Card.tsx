import React from 'react';

interface CardProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  description,
  actions,
  children,
  className = '',
}) => {
  const hasHeader = title || description || actions;

  return (
    <div
      className={`bg-white dark:bg-[#12111a] border border-gray-200 dark:border-[#1d1c26] rounded-lg shadow-sm overflow-hidden transition-colors ${className}`}
    >
      {hasHeader && (
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#1d1c26]/60 flex items-start justify-between gap-4">
          <div className="space-y-1">
            {title && (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-[#f7f8f8] leading-none">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
      )}
      <div className="px-6 py-4 text-gray-600 dark:text-gray-300">{children}</div>
    </div>
  );
};

export default Card;
