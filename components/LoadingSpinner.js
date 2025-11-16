import React from 'react';

const LoadingSpinner = ({ large = false }) => {
  const sizeClass = large ? 'w-8 h-8' : 'w-5 h-5';
  const borderClass = large ? 'border-4' : 'border-2';

  return (
    <div
      className={`${sizeClass} ${borderClass} border-t-transparent border-current rounded-full animate-spin`}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default LoadingSpinner;
