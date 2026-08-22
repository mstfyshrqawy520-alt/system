import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  fullScreen = false,
  message = 'جاري تحميل البيانات، انتظر لحظات...',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div
        className={`${sizeClasses[size]} border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin`}
                  role="status"
          aria-label={message}

      />
      <p className="text-xs font-semibold text-slate-300">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center min-h-screen">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
