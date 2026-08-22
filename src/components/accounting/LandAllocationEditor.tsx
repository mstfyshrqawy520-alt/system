import React, { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { LandParcel, createLandParcelApi } from '../../api/supplierFinance';
import { parseApiError } from '../../utils/apiError';t interface LandAllocationDraft {
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
  onParcelCreated?: (newParcel: LandParcel) => void;
}

const money = (value: number) => `${value.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;

export const LandAllocationEditor: React.FC<LandAllocationEditorProps> = ({
  parcels,
  allocations,
  invoiceAmount,
  disabled = false,
  error,
  onChange,
  onParcelCreated,
}) => {
  const [isAddingParcel, setIsAddingParcel] = useState(false);
  const [newParcelRef, setNewParcelRef] = useState('');
  const [newParcelRegion, setNewParcelRegion] = useState('');
  const [newParcelOpeningBalance, setNewParcelOpeningBalance] = useState('');
  const [newParcelNotes, setNewParcelNotes] = useState('');
  const [isSavingParcel, setIsSavingParcel] = useState(false);
  const [parcelCreateError, setParcelCreateError] = useState<string | null>(null);

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

  const handleCreateParcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParcelRef.trim() || !newParcelRegion.trim()) {
      setParcelCreateError('رقم قطعة الأرض والمنطقة مطلوبان.');
      return;
    }

    setIsSavingParcel(true);
    setParcelCreateError(null);

    try {
      const created = await createLandParcelApi({
        parcel_reference: newParcelRef.trim(),
        region: newParcelRegion.trim(),
        opening_balance: Number(newParcelOpeningBalance || 0),
        notes: newParcelNotes.trim() || undefined,
      });

      onParcelCreated?.(created);

      // Auto-assign the newly created parcel to the first empty row or a new row
      const emptyRowIndex = allocations.findIndex((a) => a.land_parcel_id === '');
      if (emptyRowIndex >= 0) {
        updateAllocation(emptyRowIndex, 'land_parcel_id', String(created.id));
      } else {
        onChange([...allocations, { land_parcel_id: created.id, amount: '', notes: '' }]);
      }

      // Reset form
      setNewParcelRef('');
      setNewParcelRegion('');
      setNewParcelOpeningBalance('');
      setNewParcelNotes('');
      setIsAddingParcel(false);
    } catch (err) {
      setParcelCreateError(parseApiError(err).message);
    } finally {
      setIsSavingParcel(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-700/60 bg-amber-950/20 p-4 space-y-3">
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

      {/* Quick Add Parcel Form */}
      {isAddingParcel && (
        <form onSubmit={handleCreateParcel} className="rounded-xl border border-cyan-700/70 bg-slate-900/95 p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-xs font-bold text-cyan-300">🏢 إنشاء حساب قطعة أرض جديدة سريعاً</h4>
            <button
              type="button"
              onClick={() => setIsAddingParcel(false)}
              className="text-xs font-bold text-slate-400 hover:text-white"
            >
              ✕ إلغاء
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">رقم قطعة الأرض *</label>
              <input
                required
                value={newParcelRef}
                onChange={(e) => setNewParcelRef(e.target.value)}
                placeholder="مثال: 256"
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">المنطقة *</label>
              <input
                required
                value={newParcelRegion}
                onChange={(e) => setNewParcelRegion(e.target.value)}
                placeholder="مثال: السابعة"
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">رصيد العميل الافتتاحي (ج.م)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newParcelOpeningBalance}
                onChange={(e) => setNewParcelOpeningBalance(e.target.value)}
                placeholder="0.00"
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">ملاحظات (اختياري)</label>
              <input
                value={newParcelNotes}
                onChange={(e) => setNewParcelNotes(e.target.value)}
                placeholder="ملاحظات على القطعة..."
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-100"
              />
            </div>
          </div>
          {parcelCreateError && <p className="text-xs font-bold text-rose-300">{parcelCreateError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" size="sm" variant="secondary" onClick={() => setIsAddingParcel(false)}>
              إلغاء
            </Button>
            <Button type="submit" size="sm" variant="primary" isLoading={isSavingParcel} className="font-bold">
              حفظ القطعة واختيارها فوراً
            </Button>
          </div>
        </form>
      )}

      {parcels.length === 0 && !isAddingParcel ? (
        <div className="mt-3 rounded-lg border border-rose-500/50 bg-rose-950/30 p-3 text-xs leading-6 text-rose-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span>لا توجد حسابات قطع أراضٍ نشطة حالياً.</span>
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={() => setIsAddingParcel(true)}
            className="font-bold whitespace-nowrap min-h-10"
          >
            + إضافة أول قطعة أرض الآن
          </Button>
        </div>
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
              <Button type="button" size="sm" variant="danger" onClick={() => removeRow(index)} disabled={disabled || allocations.length <= 1} className="min-h-10">
                حذف
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button type="button" size="sm" variant="secondary" onClick={addRow} disabled={disabled} className="min-h-10 text-xs">
              + إضافة سطر توزيع
            </Button>
            {!isAddingParcel && (
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={() => setIsAddingParcel(true)}
                disabled={disabled}
                className="min-h-10 text-xs font-bold bg-cyan-800 hover:bg-cyan-700 text-white"
              >
                + إضافة قطعة أرض جديدة للنظام
              </Button>
            )}
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-xs font-bold text-rose-300">{error}</p>}
    </div>
  );
};

export default LandAllocationEditor;


