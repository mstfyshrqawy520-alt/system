import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PurchaseRequest, PR_PRIORITY_LABELS } from '../../types/purchaseRequest';
import { المورد } from '../../types/purchaseOrder';
import { DirectAccountingFinancialData } from '../../api/procurement';
import { getUnitLabel } from '../../utils/units';

interface DirectAccountingReviewModalProps {
  request: PurchaseRequest | null;
  suppliers: المورد[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (financialData: DirectAccountingFinancialData) => void;
  isSubmitting?: boolean;
  reviewMode?: 'procurement' | 'accounting';
}

type EditableFinancialItem = {
  pr_item_id: number;
  item_reference?: string | null;
  region?: string | null;
  item_description: string;
  uom?: string | null;
  quantity: number | string;
  unit_price: number | string;
};

const formatAmount = (value: number | string | null | undefined) =>
  Number(value || 0).toLocaleString('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const lineTotal = (quantity: number | string, unitPrice: number | string) => {
  const safeQuantity = Number.isFinite(Number(quantity)) ? Number(quantity) : 0;
  const safeUnitPrice = Number.isFinite(Number(unitPrice)) ? Number(unitPrice) : 0;
  return Math.round(safeQuantity * safeUnitPrice * 100) / 100;
};

export const DirectAccountingReviewModal: React.FC<DirectAccountingReviewModalProps> = ({
  request,
  suppliers,
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  reviewMode = 'procurement',
}) => {
  const isAccountingReview = reviewMode === 'accounting';
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [items, setItems] = useState<EditableFinancialItem[]>([]);
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !request) return;

    setSupplierId(request.direct_supplier_id || request.direct_supplier?.id || '');
    setItems((request.items || []).map((item) => ({
      pr_item_id: item.id,
      item_reference: item.item_reference,
      region: item.region,
      item_description: item.item_description || item.item?.name || '',
      uom: item.uom,
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.estimated_unit_price) > 0 ? Number(item.estimated_unit_price) : '',
    })));
    setNotes(request.notes || '');
    setValidationError(null);
  }, [isOpen, request?.id]);

  const grandTotal = useMemo(
    () => items.reduce((sum, item) => sum + lineTotal(item.quantity, item.unit_price), 0),
    [items],
  );

  if (!isOpen || !request) return null;

  const updateItem = (index: number, field: 'quantity' | 'unit_price', value: string) => {
    const parsedValue = value === '' ? '' : Number(value);
    setItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: parsedValue } : item
    )));
    setValidationError(null);
  };

  const handleConfirm = () => {
    if (!supplierId) {
      setValidationError('يجب اختيار المورد قبل إرسال الطلب إلى المشتريات.');
      return;
    }
    if (items.length === 0) {
      setValidationError('لا توجد بنود مالية مرتبطة بهذا الطلب.');
      return;
    }
    if (items.some((item) => !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0)) {
      setValidationError('يجب أن تكون الكمية أكبر من صفر في جميع البنود.');
      return;
    }
    if (items.some((item) => !Number.isFinite(Number(item.unit_price)) || Number(item.unit_price) < 0)) {
      setValidationError('يجب إدخال سعر وحدة صحيح لا يقل عن صفر في جميع البنود.');
      return;
    }

    onConfirm({
      supplier_id: Number(supplierId),
      items: items.map((item) => ({
        pr_item_id: item.pr_item_id,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
      })),
      notes: notes.trim() || null,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdrop={!isSubmitting}
      closeOnEscape={!isSubmitting}
      title={isAccountingReview ? `مراجعة وتعديل البيانات المالية — ${request.request_number}` : `إدخال البيانات المالية — ${request.request_number}`}
      subtitle={isAccountingReview
        ? 'راجع الحسابات الطلب كاملًا، وعدّل البيانات المالية والملاحظات عند الحاجة، ثم أعده إلى مدير المشتريات.'
        : 'اختر المورد وأدخل الكميات والأسعار قبل إرسال الطلب المباشر إلى الحسابات للموافقة المالية.'}
      size="xl"
      footer={(
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            إلغاء والعودة
          </Button>
          <Button
            variant="success"
            size="sm"
            onClick={handleConfirm}
            isLoading={isSubmitting}
            loadingText={isAccountingReview ? 'جاري إعادة الطلب للمشتريات...' : 'جاري الإرسال للحسابات...'}
          >
            {isAccountingReview ? 'اعتماد وإرسال للمشتريات' : 'تأكيد وإرسال للحسابات'}
          </Button>
        </>
      )}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-cyan-500/30 bg-slate-950/70 p-3">
            <p className="text-[11px] text-slate-400">رقم طلب الشراء</p>
            <p className="mt-1 break-all font-mono text-sm font-black text-cyan-200">{request.request_number}</p>
          </div>
          <div className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-3">
            <p className="text-[11px] text-amber-300 font-semibold">تاريخ الاحتياج ⏳</p>
            <p className="mt-1 font-mono text-sm font-black text-amber-200">{request.date_needed || 'غير محدد'}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-3">
            <p className="text-[11px] text-slate-400">القسم المستهدف</p>
            <p className="mt-1 text-sm font-bold text-slate-100">{request.target_department?.name || request.department?.name || 'غير محدد'}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-3">
            <p className="text-[11px] text-slate-400">مقدم الطلب</p>
            <p className="mt-1 text-sm font-bold text-slate-100">{request.requester?.name || 'غير محدد'}</p>
          </div>
          <div className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-3">
            <p className="text-[11px] text-amber-300/80">مسار الإجراء</p>
            <p className="mt-1 text-sm font-black text-amber-200">طلب مباشر — {isAccountingReview ? 'إعادة للمشتريات بعد المراجعة' : 'موافقة الحسابات أولًا'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="rounded-lg border border-emerald-500/40 bg-emerald-950/20 p-3 text-xs font-bold text-slate-200">
            المورد <span className="text-rose-400">*</span>
            <select
              value={supplierId}
              onChange={(event) => {
                setSupplierId(event.target.value ? Number(event.target.value) : '');
                setValidationError(null);
              }}
              disabled={isSubmitting}
              className="mt-2 h-10 w-full rounded-md border border-emerald-500/60 bg-[#0b1424] px-3 text-xs text-slate-100 outline-none focus:border-emerald-300 disabled:opacity-60"
            >
              <option value="">اختر المورد...</option>
              {suppliers.filter((supplier) => supplier.is_active).map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.company_name}{supplier.code ? ` — ${supplier.code}` : ''}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2.5">
            <span className="text-[11px] text-slate-400">تاريخ الحاجة</span>
            <p className="mt-1 font-mono text-sm text-slate-100">{request.date_needed || 'غير محدد'}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2.5">
            <span className="text-[11px] text-slate-400">الأولوية</span>
            <p className="mt-1 text-sm font-bold text-slate-100">{PR_PRIORITY_LABELS[request.priority] || request.priority}</p>
          </div>
        </div>

        <div className="rounded-lg border border-cyan-500/40 bg-cyan-950/15 p-3 text-xs leading-6 text-slate-300">
          <p className="font-bold text-cyan-200">{isAccountingReview ? 'مراجعة الحسابات قبل إعادة الطلب للمشتريات' : 'إدخال البيانات المالية قبل الإرسال'}</p>
          <p className="mt-1">{isAccountingReview
            ? 'يمكن تعديل المورد والكمية وسعر الوحدة والملاحظات. رقم قطعة الأرض والمنطقة ووصف الصنف ثابتة ولا يمكن تغييرها بعد إرسال الطلب. بعد الاعتماد يعود الطلب إلى مدير المشتريات لإنشاء أمر الشراء.'
            : 'اختر المورد وأدخل سعر الوحدة والكمية لكل بند. يتم حساب إجمالي كل بند والإجمالي الكلي تلقائيًا، ثم تُحفظ هذه البيانات مع الطلب لتراجعها الحسابات.'}</p>
        </div>

        {validationError && (
          <div role="alert" className="rounded-lg border border-rose-500/50 bg-rose-950/30 px-3 py-2.5 text-xs font-bold leading-6 text-rose-200">
            {validationError}
          </div>
        )}

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-black text-slate-100">تفاصيل البنود والأسعار</h3>
            <span className="text-xs text-slate-400">العملة: جنيه مصري (EGP)</span>
          </div>
          <div className="hidden overflow-x-auto rounded-lg border border-slate-700 sm:block">
            <table className="w-full border-collapse text-right text-xs">
              <thead className="bg-slate-950 text-cyan-200">
                <tr>
                  <th className="border-b border-slate-700 px-3 py-3 text-center">#</th>
                  <th className="border-b border-slate-700 px-3 py-3">رقم قطعة الأرض</th>
                  <th className="border-b border-slate-700 px-3 py-3">المنطقة</th>
                  <th className="border-b border-slate-700 px-3 py-3">الصنف / الوصف</th>
                  <th className="border-b border-slate-700 px-3 py-3 text-center">الكمية</th>
                  <th className="border-b border-slate-700 px-3 py-3 text-center">سعر الوحدة</th>
                  <th className="border-b border-slate-700 px-3 py-3 text-center">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-rose-300">لا توجد بنود مرتبطة بهذا الطلب لإدخال بياناتها المالية.</td>
                  </tr>
                ) : items.map((item, index) => (
                  <tr key={item.pr_item_id || index} className="bg-slate-900 even:bg-slate-950/70">
                    <td className="border-t border-slate-800 px-3 py-3 text-center font-mono text-slate-400">{index + 1}</td>
                    <td className="border-t border-slate-800 px-3 py-3 font-mono font-bold text-slate-200">{item.item_reference || '—'}</td>
                    <td className="border-t border-slate-800 px-3 py-3 text-slate-300">{item.region || '—'}</td>
                    <td className="border-t border-slate-800 px-3 py-3 font-bold text-slate-100">{item.item_description || '—'}</td>
                    <td className="border-t border-slate-800 px-3 py-2 text-center">
                      <input
                        aria-label={`كمية البند ${index + 1}`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity ?? ''}
                        onFocus={(event) => event.target.select()}
                        onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                        disabled={isSubmitting}
                        className="h-9 w-24 rounded-md border border-cyan-500/60 bg-[#0b1424] px-2 text-center font-mono text-xs text-slate-100 outline-none focus:border-cyan-300 disabled:opacity-60"
                      />
                      <span className="mr-1 text-[10px] text-slate-400">{getUnitLabel(item.uom)}</span>
                    </td>
                    <td className="border-t border-slate-800 px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          aria-label={`سعر وحدة البند ${index + 1}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price ?? ''}
                          onFocus={(event) => event.target.select()}
                          onChange={(event) => updateItem(index, 'unit_price', event.target.value)}
                          disabled={isSubmitting}
                          className="h-9 w-28 rounded-md border border-emerald-500/60 bg-[#0b1424] px-2 text-center font-mono text-xs text-slate-100 outline-none focus:border-emerald-300 disabled:opacity-60"
                        />
                        <span className="text-[10px] text-slate-400">ج.م</span>
                      </div>
                    </td>
                    <td className="border-t border-slate-800 px-3 py-3 text-center font-mono font-black text-emerald-200">{formatAmount(lineTotal(item.quantity, item.unit_price))} ج.م</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-950">
                  <td colSpan={6} className="border-t border-cyan-500/50 px-3 py-4 text-left text-sm font-black text-slate-100">الإجمالي المالي للطلب:</td>
                  <td className="border-t border-cyan-500/50 px-3 py-4 text-center font-mono text-base font-black text-emerald-300">{formatAmount(grandTotal)} ج.م</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="space-y-3 sm:hidden">
            {items.length === 0 ? (
              <div className="rounded-xl border border-rose-800/60 bg-rose-950/20 px-3 py-6 text-center text-xs text-rose-200">
                لا توجد بنود مرتبطة بهذا الطلب لإدخال بياناتها المالية.
              </div>
            ) : items.map((item, index) => (
              <article key={`mobile-${item.pr_item_id || index}`} className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-cyan-300">بند #{index + 1}</p>
                    <p className="mt-1 break-words text-sm font-black text-slate-100">{item.item_description || 'بدون وصف'}</p>
                  </div>
                  <p className="shrink-0 font-mono text-xs font-bold text-slate-300">{item.item_reference || '—'}</p>
                </div>
                <dl className="mt-3 grid grid-cols-1 gap-2 text-xs min-[420px]:grid-cols-2">
                  <div><dt className="text-slate-500">المنطقة</dt><dd className="mt-1 text-slate-200">{item.region || '—'}</dd></div>
                  <div><dt className="text-slate-500">الوحدة</dt><dd className="mt-1 text-slate-200">{getUnitLabel(item.uom)}</dd></div>
                </dl>
                <div className="mt-3 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                  <label className="text-xs font-bold text-slate-300">
                    الكمية
                    <input
                      aria-label={`كمية البند ${index + 1}`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity ?? ''}
                      onFocus={(event) => event.target.select()}
                      onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                      disabled={isSubmitting}
                      className="mt-1 min-h-11 w-full rounded-xl border border-cyan-500/60 bg-[#0b1424] px-3 py-2 text-center font-mono text-sm text-slate-100 outline-none focus:border-cyan-300 disabled:opacity-60"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-300">
                    سعر الوحدة (ج.م)
                    <input
                      aria-label={`سعر وحدة البند ${index + 1}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price ?? ''}
                      onFocus={(event) => event.target.select()}
                      onChange={(event) => updateItem(index, 'unit_price', event.target.value)}
                      disabled={isSubmitting}
                      className="mt-1 min-h-11 w-full rounded-xl border border-emerald-500/60 bg-[#0b1424] px-3 py-2 text-center font-mono text-sm text-slate-100 outline-none focus:border-emerald-300 disabled:opacity-60"
                    />
                  </label>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-700/50 bg-emerald-950/20 px-3 py-2 text-xs">
                  <span className="text-slate-400">إجمالي البند</span>
                  <strong className="font-mono text-sm text-emerald-200">{formatAmount(lineTotal(item.quantity, item.unit_price))} ج.م</strong>
                </div>
              </article>
            ))}
            <div className="flex items-center justify-between rounded-xl border border-cyan-500/50 bg-slate-950 px-3 py-3 text-sm font-black">
              <span className="text-slate-100">الإجمالي المالي للطلب</span>
              <span className="font-mono text-emerald-300">{formatAmount(grandTotal)} ج.م</span>
            </div>
          </div>
        </div>

        <label className="block border-t border-slate-800 pt-4 text-xs font-bold text-slate-300">
          ملاحظات مالية وملاحظات المراجعة
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={isSubmitting}
            rows={3}
            placeholder="اكتب أي ملاحظات تحتاجها الحسابات أو توضيحًا على التعديلات..."
            className="mt-2 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-normal leading-6 text-slate-100 outline-none focus:border-cyan-400 disabled:opacity-60"
          />
        </label>
      </div>
    </Modal>
  );
};

export default DirectAccountingReviewModal;

