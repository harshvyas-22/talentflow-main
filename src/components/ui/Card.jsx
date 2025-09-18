import React from 'react';

export function Card({ children, className = '', ...props }) {
  return (
    <div 
      className={`bg-white shadow rounded-lg ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div 
      className={`px-6 py-4 border-b border-gray-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div 
      className={`px-6 py-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }) {
  return (
    <h3 
      className={`text-lg font-medium text-gray-900 ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}