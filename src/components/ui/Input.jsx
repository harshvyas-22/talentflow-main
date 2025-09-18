import React from 'react';
import { clsx } from 'clsx';

export function Input({
  label,
  error,
  required,
  className = '',
  type = 'text',
  ...props
}) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        className={clsx(
          `
          block w-full rounded-md border-gray-300 shadow-sm
          focus:border-blue-500 focus:ring-blue-500
          disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500
        `,
          error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
          'transition-colors'
        )}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}