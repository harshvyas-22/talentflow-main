import React from 'react';

const LoadingSpinner = ({ size = 'md', className = '', isLoading }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        Loading...
      </div>
    );
  }

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]} ${className}`} />
  );
};

export default LoadingSpinner;