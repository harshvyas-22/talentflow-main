import React from 'react';

const variants = {
  default: 'bg-gray-100 text-gray-800',
  primary: 'bg-blue-100 text-blue-800',
  secondary: 'bg-indigo-100 text-indigo-800', // Add this line for secondary variant
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800'
};

export function Badge({ 
  children, 
  variant = 'primary',
  className = '', 
  ...props 
}) {
  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant] || variants.default} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;