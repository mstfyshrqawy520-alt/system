import React, { useState, useRef, useEffect, useMemo, useId } from 'react';

export interface SearchableOption<T = string | number> {
  value: T;
  label: string;
  subLabel?: string;
  badge?: string;
  disabled?: boolean;
  searchTerms?: string[];
}

export interface SearchableSelectProps<T = string | number> {
  options: SearchableOption<T>[];
  value?: T | null | '';
  onChange: (value: T) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  loading?: boolean;
  required?: boolean;
  clearable?: boolean;
  onClear?: () => void;
  error?: boolean;
  className?: string;
  allowCustomValue?: boolean;
  onCustomValueSelect?: (customValue: string) => void;
  renderOption?: (option: SearchableOption<T>) => React.ReactNode;
  id?: string;
  ariaLabel?: string;
}

/**
 * Normalizes Arabic text for flexible matching (hamzas, taa marbuta, alifs, diacritics).
 */
export const normalizeArabic = (text: string): string => {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ًٌٍَُِّْـ]/g, '');
};

export const SearchableSelect = <T extends string | number = string | number>({
  options,
  value,
  onChange,
  placeholder = 'اختر من القائمة...',
  searchPlaceholder = 'ابحث بالاسم أو الكود...',
  emptyMessage = 'لا توجد نتائج مطابقة',
  disabled = false,
  loading = false,
  required = false,
  clearable = false,
  onClear,
  error = false,
  className = '',
  allowCustomValue = false,
  onCustomValueSelect,
  renderOption,
  id,
  ariaLabel,
}: SearchableSelectProps<T>) => {
  const generatedId = useId();
  const selectId = id || generatedId;
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Selected Option
  const selectedOption = useMemo(() => {
    if (value === undefined || value === null || value === '') return null;
    return options.find((opt) => String(opt.value) === String(value)) || null;
  }, [options, value]);

  // Filtered Options with Arabic normalization
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;

    const normalizedQuery = normalizeArabic(searchQuery);
    const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);

    return options.filter((opt) => {
      const labelNorm = normalizeArabic(opt.label);
      const subLabelNorm = opt.subLabel ? normalizeArabic(opt.subLabel) : '';
      const badgeNorm = opt.badge ? normalizeArabic(opt.badge) : '';
      const customTermsNorm = (opt.searchTerms || []).map(normalizeArabic).join(' ');
      const combined = `${labelNorm} ${subLabelNorm} ${badgeNorm} ${customTermsNorm} ${String(opt.value)}`;

      return queryTerms.every((term) => combined.includes(term));
    });
  }, [options, searchQuery]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setHighlightedIndex(0);
      const timer = window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll<HTMLLIElement>('li[role="option"]');
      const target = items[highlightedIndex];
      if (target) {
        target.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (option: SearchableOption<T>) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev + 1;
          return next >= filteredOptions.length ? 0 : next;
        });
        break;

      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev - 1;
          return next < 0 ? filteredOptions.length - 1 : next;
        });
        break;

      case 'Enter':
        e.preventDefault();
        if (filteredOptions.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex]);
        } else if (allowCustomValue && searchQuery.trim()) {
          onCustomValueSelect?.(searchQuery.trim());
          setIsOpen(false);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;

      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClear) {
      onClear();
    } else {
      onChange('' as unknown as T);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full min-w-0 ${className}`}
      dir="rtl"
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        type="button"
        id={selectId}
        aria-label={ariaLabel || placeholder}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled || loading}
        onClick={() => !disabled && !loading && setIsOpen((prev) => !prev)}
        className={`group flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border bg-slate-950/80 px-3.5 py-2 text-right text-sm shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.35)] transition-all duration-200 focus:outline-none sm:min-h-0 sm:rounded-lg sm:py-2 sm:text-xs ${
          error
            ? 'border-rose-500/80 bg-rose-950/20 text-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/25'
            : isOpen
              ? 'border-cyan-400 bg-slate-900 ring-2 ring-cyan-500/25 text-slate-100'
              : 'border-slate-700/70 hover:border-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/25 text-slate-100'
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {selectedOption ? (
            <div className="flex min-w-0 flex-1 items-center gap-2 truncate">
              <span className="truncate font-semibold text-slate-100">
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span className="shrink-0 rounded bg-cyan-950 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-800/60">
                  {selectedOption.badge}
                </span>
              )}
              {selectedOption.subLabel && (
                <span className="hidden truncate text-[11px] text-slate-400 sm:inline">
                  ({selectedOption.subLabel})
                </span>
              )}
            </div>
          ) : (
            <span className="truncate text-slate-500">{placeholder}</span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 text-slate-400">
          {loading ? (
            <svg
              className="h-4 w-4 animate-spin text-cyan-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <>
              {clearable && selectedOption && !disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleClear}
                  className="rounded p-0.5 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                  title="مسح الاختيار"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
              )}
              <svg
                className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-cyan-400' : 'group-hover:text-slate-200'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 top-full z-[100] mt-1.5 w-full min-w-[240px] rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl backdrop-blur-xl animate-fade-in"
          style={{ maxHeight: '340px' }}
        >
          {/* Search Box */}
          <div className="relative mb-2">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-8 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
            <span className="absolute right-2.5 top-2.5 text-slate-500 pointer-events-none">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="absolute left-2.5 top-2.5 text-slate-500 hover:text-slate-200"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Results Summary if searching */}
          {searchQuery && (
            <div className="mb-1.5 px-2 flex justify-between items-center text-[10px] text-slate-400">
              <span>نتائج البحث عن «{searchQuery}»:</span>
              <span className="font-mono text-cyan-400 font-bold">{filteredOptions.length} عنصر</span>
            </div>
          )}

          {/* Options List */}
          <ul
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            className="max-h-[220px] overflow-y-auto space-y-1 overscroll-contain pr-0.5"
          >
            {filteredOptions.length === 0 ? (
              <li className="py-4 text-center text-xs text-slate-400 space-y-2">
                <p>{emptyMessage}</p>
                {allowCustomValue && searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      onCustomValueSelect?.(searchQuery.trim());
                      setIsOpen(false);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-700/60 bg-cyan-950/60 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-900/60"
                  >
                    <span>➕</span>
                    <span>استخدام «{searchQuery.trim()}» كقيمة جديدة</span>
                  </button>
                )}
              </li>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={String(opt.value)}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs transition-colors cursor-pointer ${
                      opt.disabled
                        ? 'opacity-40 cursor-not-allowed'
                        : isSelected
                          ? 'bg-cyan-950/80 text-cyan-200 border border-cyan-800/60 font-bold'
                          : isHighlighted
                            ? 'bg-slate-800 text-slate-100 font-medium'
                            : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    {renderOption ? (
                      renderOption(opt)
                    ) : (
                      <div className="flex min-w-0 flex-1 items-center gap-2 truncate">
                        <span className="truncate">{opt.label}</span>
                        {opt.badge && (
                          <span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-300 border border-slate-700">
                            {opt.badge}
                          </span>
                        )}
                        {opt.subLabel && (
                          <span className="truncate text-[10px] text-slate-400">
                            {opt.subLabel}
                          </span>
                        )}
                      </div>
                    )}

                    {isSelected && (
                      <span className="shrink-0 text-cyan-400 font-black text-sm">✓</span>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
