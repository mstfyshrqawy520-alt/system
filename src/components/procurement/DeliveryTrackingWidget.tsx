import React, { useState } from 'react';
import { PurchaseOrder } from '../../types/purchaseOrder';
import { updateDeliveryStatusApi } from '../../api/procurement';
import { Button } from '../ui/Button';

interface Props {
  po: PurchaseOrder;
  onUpdated: () => void;
  readOnly?: boolean;
}

const DELIVERY_STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  NOT_STARTED: { label: 'لم يبدأ', bg: 'bg-slate-800/80 border-slate-700', text: 'text-slate-300' },
  PARTIAL: { label: 'توريد جزئي', bg: 'bg-amber-950/80 border-amber-800', text: 'text-amber-300' },
  COMPLETE: { label: 'مكتمل التوريد', bg: 'bg-emerald-950/80 border-emerald-800', text: 'text-emerald-300' },
  LATE: { label: 'متأخر', bg: 'bg-rose-950/80 border-rose-800', text: 'text-rose-300' },
};

export const DeliveryTrackingWidget: React.FC<Props> = ({ po, onUpdated, readOnly = false }) => {
  const currentStatus = po.delivery_status || 'NOT_STARTED';
  const [status, setStatus] = useState<string>(currentStatus);
  const [actualDate, setActualDate] = useState<string>(po.actual_delivery_date || '');
  const [notes, setNotes] = useState<string>(po.delivery_notes || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await updateDeliveryStatusApi(po.id, {
        delivery_status: status,
        actual_delivery_date: actualDate || undefined,
        delivery_notes: notes || undefined,
      });
      setMessage('تم تحديث حالة التوريد بنجاح.');
      setIsEditing(false);
      onUpdated();
    } catch (e: any) {
      setMessage(e?.response?.data?.message || 'فشل التحديث');
    } finally {
      setIsSaving(false);
    }
  };

  const activeBadge = DELIVERY_STATUS_LABELS[currentStatus] || DELIVERY_STATUS_LABELS.NOT_STARTED;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-4" dir="rtl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚚</span>
          <h3 className="text-xs font-bold text-slate-100">تتبع التوريد التشغيلي</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${activeBadge.bg} ${activeBadge.text}`}>
            {activeBadge.label}
          </span>
          {!readOnly && !isEditing && (
            <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
              تحديث التوريد
            </Button>
          )}
        </div>
      </div>

      {message && (
        <div className="text-xs p-2 rounded-lg bg-cyan-950/40 border border-cyan-800/50 text-cyan-300">
          {message}
        </div>
      )}

      {isEditing ? (
        <div className="space-y-3 text-xs bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">حالة التوريد</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
              >
                <option value="NOT_STARTED">لم يبدأ</option>
                <option value="PARTIAL">توريد جزئي</option>
                <option value="COMPLETE">مكتمل التوريد</option>
                <option value="LATE">متأخر</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">تاريخ الاستلام الفعلي</label>
              <input
                type="date"
                value={actualDate}
                onChange={e => setActualDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1">ملاحظات التوريد</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="ملاحظات الاستلام، رقم الفاتورة/الإذن..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder:text-slate-500 resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>
              إلغاء
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} isLoading={isSaving}>
              حفظ التحديث
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 block font-semibold">تاريخ التوريد المتوقع</span>
            <span className="font-mono text-slate-200 font-bold">{po.delivery_date || 'غير محدد'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block font-semibold">تاريخ الاستلام الفعلي</span>
            <span className="font-mono text-slate-200 font-bold">{po.actual_delivery_date || '—'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block font-semibold">ملاحظات التوريد</span>
            <span className="text-slate-300">{po.delivery_notes || 'لا توجد ملاحظات'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryTrackingWidget;
