import React, { useState } from 'react';
import { Supplier } from '../../types/purchaseOrder';
import { SearchableSelect } from '../ui/SearchableSelect';
import SupplierModal from '../procurement/SupplierModal';

interface SupplierSelectWithQuickAddProps {
  suppliers: Supplier[];
  selectedSupplierId?: string | number;
  onSelectSupplierId: (supplierId: string) => void;
  oneTimeSupplierName?: string;
  onChangeOneTimeSupplierName?: (name: string) => void;
  onSupplierCreated?: (newSupplier: Supplier) => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  allowOneTime?: boolean;
  className?: string;
  placeholder?: string;
}

export const SupplierSelectWithQuickAdd: React.FC<SupplierSelectWithQuickAddProps> = ({
  suppliers,
  selectedSupplierId = '',
  onSelectSupplierId,
  oneTimeSupplierName = '',
  onChangeOneTimeSupplierName,
  onSupplierCreated,
  disabled = false,
  label = 'المورد المعتمد',
  required = false,
  allowOneTime = true,
  className = '',
  placeholder = '-- اختر المورد من القائمة أو ابحث بالاسم --',
}) => {
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  const activeSuppliers = suppliers.filter((s) => s.is_active !== false);

  const supplierOptions = activeSuppliers.map((s) => ({
    value: s.id,
    label: s.company_name,
    badge: s.code || `SUP-${s.id}`,
    subLabel: s.phone ? `هاتف: ${s.phone}` : undefined,
    searchTerms: [s.company_name, s.code || '', s.phone || '', s.email || ''].filter(Boolean),
  }));

  const handleSupplierSelect = (val: string | number) => {
    onSelectSupplierId(val ? String(val) : '');
    if (val && onChangeOneTimeSupplierName) {
      onChangeOneTimeSupplierName('');
    }
  };

  const handleOneTimeChange = (name: string) => {
    if (onChangeOneTimeSupplierName) {
      onChangeOneTimeSupplierName(name);
      if (name.trim()) {
        onSelectSupplierId('');
      }
    }
  };

  const isOneTimeActive = Boolean(oneTimeSupplierName && oneTimeSupplierName.trim());

  return (
    <div className={`space-y-2 text-right ${className}`} dir="rtl">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-200">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setIsSupplierModalOpen(true)}
          disabled={disabled}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/60 rounded-md px-2 py-0.5 transition-colors disabled:opacity-50"
        >
          <span>➕</span>
          <span>إضافة مورد جديد</span>
        </button>
      </div>

      {/* Existing Supplier Select */}
      <div className={isOneTimeActive ? 'opacity-50 pointer-events-none' : ''}>
        <SearchableSelect
          options={supplierOptions}
          value={selectedSupplierId ? Number(selectedSupplierId) : ''}
          onChange={(val) => handleSupplierSelect(val)}
          placeholder={placeholder}
          searchPlaceholder="ابحث باسم المورد أو الكود أو رقم الهاتف..."
          disabled={disabled || isOneTimeActive}
          emptyMessage="لا يوجد مورد مسجل بهذا الاسم"
        />
      </div>

      {/* One-time Supplier Input */}
      {allowOneTime && (
        <div className="pt-1">
          <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-2.5 space-y-1.5 focus-within:border-amber-500/60 transition-colors">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-300 flex items-center gap-1">
                <span>⚡</span> أو اكتب اسم مورد لعملية واحدة فقط (One-time):
              </span>
              {isOneTimeActive && (
                <button
                  type="button"
                  onClick={() => handleOneTimeChange('')}
                  className="text-[10px] text-amber-400 hover:underline"
                >
                  إلغاء والرجوع للقائمة
                </button>
              )}
            </div>
            <input
              type="text"
              value={oneTimeSupplierName}
              onChange={(e) => handleOneTimeChange(e.target.value)}
              disabled={disabled}
              placeholder="مثال: ورشة الأمل للمقاولات (توريد لمرة واحدة)..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-md px-2.5 py-1.5 text-xs text-amber-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            {isOneTimeActive && (
              <p className="text-[10px] text-amber-400/90 leading-tight">
                ✓ سيتم اعتماد هذا المورد لهذه العملية تلقائياً دون الحاجة لتسجيله مسبقاً.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Quick Supplier Modal */}
      {isSupplierModalOpen && (
        <SupplierModal
          supplier={null}
          isOpen={isSupplierModalOpen}
          onClose={() => setIsSupplierModalOpen(false)}
          onSuccess={(newSup) => {
            if (newSup) {
              if (onSupplierCreated) onSupplierCreated(newSup);
              onSelectSupplierId(String(newSup.id));
              if (onChangeOneTimeSupplierName) onChangeOneTimeSupplierName('');
            }
            setIsSupplierModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default SupplierSelectWithQuickAdd;
