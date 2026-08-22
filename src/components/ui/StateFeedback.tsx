import React from 'react';
import { Button } from './Button';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'جاري التحميل...',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center space-y-3 ${className}`}>
      <div className="w-8 h-8 border-3 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      <p className="text-xs font-semibold text-slate-400">{message}</p>
    </div>
  );
};

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  message?: string;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, columns = 5, message = 'جاري تحميل بيانات الجدول، انتظر لحظات...', className = '' }) => (
  <div className={`overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 ${className}`} aria-label={message} role="status">
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <div key={columnIndex} className="h-9 animate-pulse rounded-md bg-slate-800/80" />
          ))}
        </div>
      ))}
    </div>
    <div className="border-t border-slate-800 px-4 py-3 text-center text-xs font-semibold text-slate-400">{message}</div>
  </div>
);

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'لا توجد بيانات',
  description = 'لم يتم العثور على أي عناصر هنا بعد.',
  icon,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-10 text-center space-y-3 bg-slate-900/40 border border-slate-800/80 rounded-xl ${className}`}>
      <div className="p-3 bg-slate-800/80 text-slate-400 rounded-full border border-slate-700/60">
        {icon || (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )}
      </div>
      <h4 className="text-sm font-bold text-slate-200">{title}</h4>
      <p className="text-xs text-slate-400 max-w-sm">{description}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'حدث خطأ غير متوقع',
  message = 'تعذر تحميل البيانات المطلوبة، يرجى المحاولة مرة أخرى.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center space-y-3 bg-rose-950/20 border border-rose-900/40 rounded-xl text-rose-300 ${className}`}>
      <div className="p-2.5 bg-rose-950/60 text-rose-400 rounded-full border border-rose-800/60">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h4 className="text-sm font-bold text-rose-200">{title}</h4>
      <p className="text-xs text-rose-300/80 max-w-md">{message}</p>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry} className="mt-2">
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
};
