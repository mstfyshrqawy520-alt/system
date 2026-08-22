import React, { useMemo } from 'react';
import { Button } from '../ui/Button';
import { LandParcel } from '../../api/supplierFinance';

export interface LandAllocationDraft {
  land_parcel_id: number | '';
  amount: string;
  notes: string;
}

interface LandAllocationEditorProps {
  parcels: LandParcel[];
  allocations: LandAllocationDraft[];
  invoiceAmount: number;
  disabled?: boolean;
  error?: string | null;
  onChange: (allocations: LandAllocationDraft[]) => void;
}

const money = (value: number) => `${value.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;

export const LandAllocationEditor: React.FC<LandAllocationEditorProps> = ({
  parcels,
  allocations,
  invoiceAmount,
  disabled = false,
  error,
  onChange,
}) => {
  const allocatedTotal = useMemo(
    () => allocations.reduce((sum, allocation) => sum + Number(allocation.amount || 0), 0),
    [allocations],
  );
  const difference = Math.round((invoiceAmount - allocatedTotal) * 100) / 100;

  const updateAllocation = (index: number, field: keyof LandAllocationDraft, value: string) => {
    onChange(allocations.map((allocation, allocationIndex) => (
      allocationIndex === index
        ? { ...allocation, [field]: field === 'land_parcel_id' ? (value ? Number(value) : '') : value }
        : allocation
    )));
  };

  const addRow = () => onChange([...allocations, { land_parcel_id: '', amount: '', notes: '' }]);
  const removeRow = (index: number) => onChange(allocations.filter((_, allocationIndex) => allocationIndex !== index));

  return (
    <div className="rounded-xl border border-amber-700/60 bg-amber-950/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-amber-200">توزيع مصروف الفاتورة على قطع الأراضي <span className="text-rose-400">*</span></h3>
          <p className="mt-1 text-xs leading-6 text-amber-100/75">التوزيع يدوي بواسطة الحسابات. اختر قطعة الأرض واكتب المبلغ الذي يخصها. يجب أن يساوي مجموع التوزيعات قيمة الفاتورة بالكامل.</p>
        </div>
        <div className="text-left text-xs">
          <div className="text-slate-400">قيمة الفاتورة: <strong className="font-mono text-slate-100">{money(invoiceAmount)}</strong></div>
          <div className={Math.abs(difference) <= 0.01 ? 'text-emerald-300' : 'text-rose-300'}>إجمالي التوزيع: <strong className="font-mono">{money(allocatedTotal)}</strong></div>
          <div className="text-slate-400">الفرق المتبقي: <strong className="font-mono">{money(difference)}</strong></div>
        </div>
      </div>

      {parcels.length === 0 ? (
        <div className="mt-3 rounded-lg border border-rose-500/50 bg-rose-950/30 px-3 py-2 text-xs font-bold leading-6 text-rose-200">لا توجد حسابات قطع أراضٍ نشطة. يجب إنشاء حساب قطعة أرض أو إضافة رصيد لها قبل تسجيل الفاتورة.</div>
      ) : (
        <div className="mt-4 space-y-3">
          {allocations.map((allocation, index) => (
            <div key={`${index}-${allocation.land_parcel_id}`} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-700 bg-slate-950/60 p-3 md:grid-cols-[1.3fr_0.8fr_1.5fr_auto] md:items-end">
              <label className="text-[11px] font-bold text-slate-300">
                قطعة الأرض
                <select
                  aria-label={`قطعة الأرض للتوزيع ${index + 1}`}
                  value={allocation.land_parcel_id}
                  onChange={(event) => updateAllocation(index, 'land_parcel_id', event.target.value)}
                  disabled={disabled}
                  className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 outline-none focus:border-amber-400 disabled:opacity-60"
                >
                  <option value="">اختر القطعة...</option>
                  {parcels.map((parcel) => (
                    <option key={parcel.id} value={parcel.id}>
                      {parcel.parcel_reference} — {parcel.region} (الرصيد: {money(Number(parcel.balance))})
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[11px] font-bold text-slate-300">
                مبلغ المصروف (ج.م)
                <input
                  aria-label={`مبلغ توزيع القطعة ${index + 1}`}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={allocation.amount}
                  onChange={(event) => updateAllocation(index, 'amount', event.target.value)}
                  disabled={disabled}
                  className="mt-1 h-10 w-full rounded-md border border-amber-500/60 bg-slate-900 px-2 text-center font-mono text-xs text-slate-100 outline-none focus:border-amber-300 disabled:opacity-60"
                />
              </label>
              <label className="text-[11px] font-bold text-slate-300">
                ملاحظة التوزيع
                <input
                  aria-label={`ملاحظة توزيع القطعة ${index + 1}`}
                  value={allocation.notes}
                  onChange={(event) => updateAllocation(index, 'notes', event.target.value)}
                  disabled={disabled}
                  placeholder="اختياري"
                  className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 outline-none focus:border-amber-400 disabled:opacity-60"
                />
              </label>
              <Button type="button" size="sm" variant="danger" onClick={() => removeRow(index)} disabled={disabled || allocations.length <= 1}>
                حذف
              </Button>
            </div>
          ))}
          <Button type="button" size="sm" variant="secondary" onClick={addRow} disabled={disabled}>
            + إضافة قطعة للتوزيع
          </Button>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-xs font-bold text-rose-300">{error}</p>}
    </div>
  );
};

export default LandAllocationEditor;

