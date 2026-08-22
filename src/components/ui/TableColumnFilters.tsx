import React, { useState } from 'react';
import { Input, Select } from './FormField';
import { Card } from './Card';

export type TableColumnFilterType = 'text' | 'number' | 'date' | 'select';

export interface TableColumnFilter {
  key: string;
  label: string;
  type?: TableColumnFilterType;
  value: string;
  onChange: (value: string) => void;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

interface TableColumnFiltersProps {
  filters: TableColumnFilter[];
  onClear?: () => void;
  hasActiveFilters?: boolean;
  defaultExpanded?: boolean;
}

export const TableColumnFilters: React.FC<TableColumnFiltersProps> = ({
  filters,
  onClear,
  hasActiveFilters = false,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded || hasActiveFilters);
  const activeCount = filters.filter((f) => Boolean(f.value)).length;

  return (
    <Card className="space-y-3 border-slate-800 bg-slate-950/70 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex items-center gap-2 text-xs font-black text-slate-200 hover:text-cyan-300 transition-colors"
          aria-expanded={isExpanded}
        >
          <span className="text-cyan-400">🎛️</span>
          <span>فلترة تفصيلية حسب الأعمدة</span>
          {activeCount > 0 && (
            <span className="rounded-full bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 text-[10px] font-black text-cyan-300">
              {activeCount} فلاتر نشطة
            </span>
          )}
          <span className="text-[10px] text-slate-500 font-mono">
            {isExpanded ? '▲ (إخفاء)' : '▼ (عرض)'}
          </span>
        </button>

        {hasActiveFilters && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-bold text-cyan-400 hover:text-cyan-200 underline"
          >
            مسح الفلاتر
          </button>
        )}
      </div>

      <div className={isExpanded ? 'grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 border-t border-slate-800/80 animate-fade-in block' : 'hidden'}>
        {filters.map((filter) => (
          <label key={filter.key} className="flex min-w-0 flex-col gap-1.5 text-[11px] font-bold text-slate-400">
              <span>{filter.label}</span>
              {filter.type === 'select' ? (
                <Select value={filter.value} onChange={(event) => filter.onChange(event.target.value)}>
                  {(filter.options || []).map((option) => (
                    <option key={`${filter.key}-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  type={filter.type === 'number' ? 'number' : filter.type === 'date' ? 'date' : 'search'}
                  value={filter.value}
                  onChange={(event) => filter.onChange(event.target.value)}
                  placeholder={filter.placeholder || `فلترة ${filter.label}`}
                  aria-label={`فلترة ${filter.label}`}
                />
              )}
            </label>
          ))}
        </div>
      </Card>
    );
  };

  export default TableColumnFilters;
