import React from 'react';
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
}

export const TableColumnFilters: React.FC<TableColumnFiltersProps> = ({ filters, onClear, hasActiveFilters = false }) => (
  <Card className="space-y-3 border-slate-800 bg-slate-950/45">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-xs font-black text-slate-300">فلترة الأعمدة</h3>
      {hasActiveFilters && onClear && <button type="button" onClick={onClear} className="text-xs font-bold text-cyan-300 underline">مسح الفلاتر</button>}
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filters.map((filter) => (
        <label key={filter.key} className="flex min-w-0 flex-col gap-1.5 text-[11px] font-bold text-slate-400">
          <span>{filter.label}</span>
          {filter.type === 'select' ? (
            <Select value={filter.value} onChange={(event) => filter.onChange(event.target.value)}>
              {(filter.options || []).map((option) => <option key={`${filter.key}-${option.value}`} value={option.value}>{option.label}</option>)}
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

export default TableColumnFilters;
