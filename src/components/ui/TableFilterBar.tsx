import React from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { Input, Select } from './FormField';

export interface TableFilterOption {
  value: string;
  label: string;
}

export interface TableFilterSelect {
  label: string;
  value: string;
  options: TableFilterOption[];
  onChange: (value: string) => void;
}

interface TableFilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  selects?: TableFilterSelect[];
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (value: string) => void;
  onDateToChange?: (value: string) => void;
  onClear?: () => void;
  hasActiveFilters?: boolean;
  resultCount: number;
  totalCount?: number;
  resultLabel?: string;
  className?: string;
}

export const TableFilterBar: React.FC<TableFilterBarProps> = ({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'بحث في البيانات...',
  selects = [],
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onClear,
  hasActiveFilters = false,
  resultCount,
  totalCount,
  resultLabel = 'سجل',
  className = '',
}) => {
  const hasDateFilter = onDateFromChange || onDateToChange;
  const invalidDateRange = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  return (
    <Card className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {onSearchChange && (
          <Input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full"
          />
        )}

        {selects.map((filter) => (
          <label key={filter.label} className="flex min-w-0 flex-col gap-1.5 text-[11px] font-bold text-slate-400">
            <span>{filter.label}</span>
            <Select value={filter.value} onChange={(event) => filter.onChange(event.target.value)}>
              {filter.options.map((option) => (
                <option key={`${filter.label}-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
        ))}

        {hasDateFilter && (
          <label className="flex min-w-0 flex-col gap-1.5 text-[11px] font-bold text-slate-400">
            <span>من تاريخ</span>
            <Input
              type="date"
              value={dateFrom || ''}
              max={dateTo || undefined}
              onChange={(event) => onDateFromChange?.(event.target.value)}
              aria-label="من تاريخ"
              aria-invalid={invalidDateRange}
            />
          </label>
        )}

        {hasDateFilter && (
          <label className="flex min-w-0 flex-col gap-1.5 text-[11px] font-bold text-slate-400">
            <span>إلى تاريخ</span>
            <Input
              type="date"
              value={dateTo || ''}
              min={dateFrom || undefined}
              onChange={(event) => onDateToChange?.(event.target.value)}
              aria-label="إلى تاريخ"
              aria-invalid={invalidDateRange}
            />
          </label>
        )}
      </div>

      {invalidDateRange && <p className="text-[11px] font-semibold text-rose-400" role="alert">تاريخ البداية يجب أن يكون قبل تاريخ النهاية أو مساويًا له.</p>}

      <div className="flex flex-col gap-2 border-t border-slate-800 pt-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <div>
          المعروض: <strong className="font-mono text-cyan-300">{resultCount}</strong> {resultLabel}
          {typeof totalCount === 'number' && totalCount !== resultCount && (
            <span className="mr-2 text-slate-500">من أصل {totalCount}</span>
          )}
        </div>
        {hasActiveFilters && onClear && (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            مسح كل الفلاتر
          </Button>
        )}
      </div>
    </Card>
  );
};

export default TableFilterBar;
