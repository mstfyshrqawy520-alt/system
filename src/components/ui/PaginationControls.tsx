import React from 'react';
import { Button } from './Button';

interface PaginationControlsProps {
  currentPage: number;
  lastPage: number;
  from: number | null;
  to: number | null;
  total: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  lastPage,
  from,
  to,
  total,
  onPageChange,
  disabled = false,
}) => {
  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
      <span>
        عرض {from ?? 0}–{to ?? 0} من {total.toLocaleString('ar-EG')} نتيجة
      </span>
      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            السابق
          </Button>
          <span className="min-w-[105px] text-center font-bold text-slate-200">
            صفحة {currentPage} من {lastPage}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || currentPage >= lastPage}
            onClick={() => onPageChange(currentPage + 1)}
          >
            التالي
          </Button>
        </div>
      )}
    </div>
  );
};

export default PaginationControls;
