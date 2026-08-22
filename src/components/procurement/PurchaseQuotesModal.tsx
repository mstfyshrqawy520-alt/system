import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { createPurchaseQuotesApi } from '../../api/procurement';
import { PurchaseRequest } from '../../types/purchaseRequest';
import { المورد } from '../../types/purchaseOrder';
import { Button } from '../ui/Button';
import SupplierModal from './SupplierModal';
import { parseApiError } from '../../utils/apiError';
import { getUnitLabel } from '../../utils/units';

type QuoteDraft = { supplier_id: string; unit_price: string; total_amount: string; notes: string };

const MIN_QUOTES = 2;
const DEFAULT_QUOTES = 3;

const createEmptyQuote = (supplierId = ''): QuoteDraft => ({ supplier_id: supplierId, unit_price: '', total_amount: '', notes: '' });

const quoteCountLabel = (count: number): string => {
  if (count === 2) return 'عرضين';
  if (count === 1) return 'عرضًا واحدًا';
  return `${count} عروض`;
};

interface PurchaseQuotesModalProps {
  isOpen: boolean;
  request: PurchaseRequest | null;
  suppliers: المورد[];
  onClose: () => void;
  onSuccess: () => void;
  onSupplierCreated?: (supplier: المورد) => void;
}

const formatAmount = (amount: number): string =>
  Number.isFinite(amount)
    ? new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
    : '—';

const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
};

const getRankLabel = (rank: number | undefined, total: number): string => {
  if (!rank) return 'لم تكتمل القيمة بعد';
  if (rank === 1) return 'الأقل سعرًا';
  if (rank === total) return 'الأعلى سعرًا';
  if (rank === 2) return 'السعر الثاني';
  return `الترتيب ${rank}`;
};

export const PurchaseQuotesModal: React.FC<PurchaseQuotesModalProps> = ({ isOpen, request, suppliers, onClose, onSuccess, onSupplierCreated }) => {
  const [supplierChoices, setSupplierChoices] = useState<المورد[]>(suppliers);
  const [supplierModalIndex, setSupplierModalIndex] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<QuoteDraft[]>(() => Array.from({ length: DEFAULT_QUOTES }, () => createEmptyQuote()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activeSuppliers = useMemo(() => supplierChoices.filter(supplier => supplier.is_active), [supplierChoices]);
  const rankedQuotes = useMemo(() => drafts
    .map((draft, index) => ({ index, amount: Number(draft.total_amount) }))
    .filter(quote => Number.isFinite(quote.amount) && quote.amount > 0)
    .sort((first, second) => first.amount - second.amount), [drafts]);

  const rankByIndex = useMemo(
    () => new Map(rankedQuotes.map((quote, rank) => [quote.index, rank + 1])),
    [rankedQuotes],
  );

  useEffect(() => {
    if (!isOpen) return;
    const active = suppliers.filter(supplier => supplier.is_active);
    setSupplierChoices(suppliers);
    setDrafts(Array.from({ length: DEFAULT_QUOTES }, (_, index) => createEmptyQuote(String(active[index]?.id || ''))));
    setSupplierModalIndex(null);
    setError(null);
    setSuccess(null);
  }, [isOpen]);

  if (!isOpen || !request) return null;

  const totalQuantity = useMemo(
    () => (request?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [request?.items]
  );

  const updateDraft = (index: number, field: keyof QuoteDraft, value: string) => {
    setDrafts(current => current.map((draft, draftIndex) => {
      if (draftIndex !== index) return draft;
      const updated = { ...draft, [field]: value };
      if (field === 'unit_price') {
        const unitVal = parseFloat(value);
        if (!isNaN(unitVal) && unitVal >= 0 && totalQuantity > 0) {
          updated.total_amount = (unitVal * totalQuantity).toFixed(2);
        } else if (value === '') {
          updated.total_amount = '';
        }
      }
      return updated;
    }));
  };

  const addQuote = () => {
    setDrafts(current => [...current, createEmptyQuote()]);
    setError(null);
  };

  const removeQuote = (index: number) => {
    if (drafts.length <= MIN_QUOTES) {
      setError(`يجب الاحتفاظ بحد أدنى ${quoteCountLabel(MIN_QUOTES)} قبل الإرسال.`);
      return;
    }
    setDrafts(current => current.filter((_, draftIndex) => draftIndex !== index));
    setError(null);
  };

  const handleSupplierCreated = (supplier?: المورد) => {
    if (!supplier) return;
    setSupplierChoices(current => current.some(item => item.id === supplier.id) ? current : [...current, supplier]);
    onSupplierCreated?.(supplier);
    if (supplierModalIndex !== null) {
      updateDraft(supplierModalIndex, 'supplier_id', String(supplier.id));
    }
    setSupplierModalIndex(null);
  };

  const submit = async () => {
    if (drafts.length < MIN_QUOTES) {
      setError(`يجب إدخال ${quoteCountLabel(MIN_QUOTES)} على الأقل. يمكنك البدء بثلاثة عروض ثم حذف عرض عند الحاجة.`);
      return;
    }
    const supplierIds = drafts.map(draft => Number(draft.supplier_id));
    if (supplierIds.some(id => !id) || new Set(supplierIds).size !== drafts.length) {
      setError(`اختر موردًا مختلفًا لكل عرض من العروض (${quoteCountLabel(drafts.length)}).`);
      return;
    }
    if (drafts.some(draft => !draft.unit_price || !Number.isFinite(Number(draft.unit_price)) || Number(draft.unit_price) <= 0)) {
      setError(`أدخل سعر وحدة موجبًا وصحيحًا لكل عرض من ${quoteCountLabel(drafts.length)}.`);
      return;
    }
    if (drafts.some(draft => !draft.total_amount || !Number.isFinite(Number(draft.total_amount)) || Number(draft.total_amount) <= 0)) {
      setError(`أدخل إجمالي قيمة موجبًا وصحيحًا لكل عرض من ${quoteCountLabel(drafts.length)}.`);
      return;
    }
    if (new Set(drafts.map(draft => Number(draft.total_amount).toFixed(2))).size !== drafts.length) {
      setError('يجب أن تكون إجماليات العروض مختلفة عن بعضها.');
      return;
    }
    if ((request.items || []).some(item => !item.item_reference?.trim() || !item.region?.trim())) {
      setError('لا يمكن إرسال العروض قبل اكتمال رقم قطعة الأرض والمنطقة في كل بند من الطلب.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await createPurchaseQuotesApi(request.id, drafts.map(draft => ({
        supplier_id: Number(draft.supplier_id),
        unit_price: Number(draft.unit_price),
        total_amount: Number(draft.total_amount),
        notes: draft.notes || undefined,
      })));
      setSuccess(`تم إرسال ${quoteCountLabel(drafts.length)} أسعار بنجاح إلى الحسابات ورئيس القسم للترشيح.`);
      window.setTimeout(() => onSuccess(), 1000);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  return createPortal((
    <div className="modal-top-viewport fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label="تجهيز عروض الأسعار">
      <div className="min-h-0 max-h-[calc(100dvh-2rem)] w-full max-w-[1180px] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-4 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:p-5" dir="rtl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="mb-1 text-xs font-bold text-amber-300">مرحلة تجهيز عروض الأسعار</div>
            <h2 className="text-lg font-black text-slate-100">تجهيز عروض الأسعار — {request.request_number}</h2>
            <p className="mt-1 text-xs leading-6 text-slate-400">أدخل عرضين على الأقل من موردين مختلفين بالجنيه المصري، ويبدأ النموذج افتراضيًا بثلاثة عروض، ثم أرسلها إلى الحسابات ورئيس القسم للترشيح.</p>
          </div>
          <button type="button" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-600 bg-slate-900/60 text-2xl font-black leading-none text-slate-300 hover:border-cyan-400 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/70" onClick={onClose} aria-label="إغلاق النافذة" title="إغلاق النافذة">×</button>
        </div>

        <section className="mt-4 rounded-xl border border-amber-800/50 bg-amber-950/20 p-4" aria-label="ملخص الطلب">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-black text-amber-200">ملخص الطلب قبل إدخال العروض</h3>
            <span className="rounded-full border border-amber-700/50 px-3 py-1 text-[11px] font-bold text-amber-100">الحالة: تجهيز العروض</span>
          </div>
          <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <div><span className="text-slate-500">رقم الطلب</span><div className="mt-1 font-black text-cyan-300">{request.request_number}</div></div>
            <div><span className="text-slate-500">مقدم الطلب</span><div className="mt-1 font-bold text-slate-100">{request.requester?.name || '—'}</div></div>
            <div><span className="text-slate-500">القسم</span><div className="mt-1 font-bold text-slate-100">{request.department?.name || '—'}</div></div>
            <div><span className="text-slate-500">تاريخ الاحتياج</span><div className="mt-1 font-bold text-slate-100">{formatDate(request.date_needed)}</div></div>
            <div><span className="text-slate-500">رئيس القسم</span><div className="mt-1 font-bold text-slate-100">{request.assigned_reviewer?.name || '—'}</div></div>
            <div><span className="text-slate-500">مهندس الموقع</span><div className="mt-1 font-bold text-slate-100">{request.site_engineer?.name || '—'}</div></div>
            <div><span className="text-slate-500">الأولوية</span><div className="mt-1 font-bold text-slate-100">{request.priority || '—'}</div></div>
          </div>
          <div className="mt-4 overflow-x-auto rounded-lg border border-amber-800/40">
            <table className="min-w-[760px] w-full text-right text-xs">
              <thead className="bg-slate-950/70 text-amber-100"><tr><th className="px-3 py-2">الصنف</th><th className="px-3 py-2">رقم قطعة الأرض</th><th className="px-3 py-2">المنطقة</th><th className="px-3 py-2">الكمية</th><th className="px-3 py-2">الوحدة</th></tr></thead>
              <tbody>{(request.items || []).map(item => <tr key={item.id} className="border-t border-amber-900/30 text-slate-200">
                <td className="px-3 py-2 font-bold">{item.item_description || item.item?.name || '—'}</td>
                <td className="px-3 py-2 font-mono text-cyan-300">{item.item_reference || 'غير مكتمل'}</td>
                <td className="px-3 py-2">{item.region || 'غير مكتملة'}</td>
                <td className="px-3 py-2">{item.quantity || '—'}</td>
                <td className="px-3 py-2">{getUnitLabel(item.uom)}</td>
              </tr>)}</tbody>
            </table>
          </div>
          {request.justification && <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs leading-6 text-slate-300"><span className="font-bold text-slate-500">الغرض من الطلب: </span>{request.justification}</div>}
        </section>

        <section className="mt-4 rounded-xl border border-cyan-800/50 bg-cyan-950/15 p-4" aria-label="مسار الطلب">
          <h3 className="mb-3 text-sm font-black text-cyan-200">ما الذي سيحدث بعد الإرسال؟</h3>
          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-lg border border-emerald-700/50 bg-emerald-950/30 p-3"><div className="font-black text-emerald-200">1. مدير المشتريات</div><div className="mt-1 text-slate-400">تجهيز {quoteCountLabel(drafts.length)} من موردين مختلفين</div></div>
            <div className="rounded-lg border border-cyan-700/50 bg-cyan-950/30 p-3"><div className="font-black text-cyan-200">2. الحسابات ورئيس القسم</div><div className="mt-1 text-slate-400">كل طرف يرشح العرض المناسب له</div></div>
            <div className="rounded-lg border border-amber-700/50 bg-amber-950/30 p-3"><div className="font-black text-amber-200">3. المدير التنفيذي</div><div className="mt-1 text-slate-400">القرار النهائي باختيار العرض أو الرفض</div></div>
          </div>
        </section>

        <section className="mt-4 space-y-3" aria-label="العروض">
          {drafts.map((draft, index) => {
            const amount = Number(draft.total_amount);
            const rank = rankByIndex.get(index);
            return (
              <div key={index} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="text-sm font-black text-cyan-300">العرض {index + 1} من {drafts.length}</div>
                  <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${rank === 1 ? 'border border-emerald-700/60 bg-emerald-950/40 text-emerald-200' : 'border border-slate-700 bg-slate-950 text-slate-300'}`}>
                    {getRankLabel(rank, rankedQuotes.length)}
                  </div>
                  {drafts.length > MIN_QUOTES && <button type="button" onClick={() => removeQuote(index)} className="rounded-lg border border-rose-800/70 px-3 py-1 text-[11px] font-bold text-rose-200 hover:bg-rose-950/50">حذف العرض</button>}
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr_1.6fr]">
                  <label className="text-xs font-bold text-slate-300">اسم المورد
                    <div className="mt-1 flex gap-2">
                      <select value={draft.supplier_id} onChange={event => updateDraft(index, 'supplier_id', event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">
                        <option value="">اختر المورد</option>
                        {activeSuppliers.map(supplier => <option key={supplier.id} value={supplier.id} disabled={drafts.some((other, otherIndex) => otherIndex !== index && other.supplier_id === String(supplier.id))}>{supplier.company_name}</option>)}
                      </select>
                      <button type="button" className="shrink-0 rounded-lg border border-cyan-700/70 bg-cyan-950/40 px-3 text-xs font-bold text-cyan-200 hover:bg-cyan-900/60" onClick={() => setSupplierModalIndex(index)}>إضافة مورد جديد</button>
                    </div>
                  </label>
                  <label className="text-xs font-bold text-slate-300">
                    سعر الوحدة بالجنيه المصري
                    {totalQuantity > 0 && <span className="mr-1 text-[10px] font-normal text-cyan-300">({totalQuantity} قطعة)</span>}
                    <input type="number" min="0" step="0.01" value={draft.unit_price} onChange={event => updateDraft(index, 'unit_price', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-mono text-slate-100" placeholder="مثال: 2500.00" />
                  </label>
                  <label className="text-xs font-bold text-slate-300">
                    الإجمالي بالجنيه المصري
                    {totalQuantity > 0 && <span className="mr-1 text-[10px] font-normal text-emerald-400">(محسوب تلقائيًا)</span>}
                    <input type="number" min="0" step="0.01" value={draft.total_amount} onChange={event => updateDraft(index, 'total_amount', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-mono text-slate-100" placeholder="مثال: 12500.00" />
                  </label>
                  <label className="text-xs font-bold text-slate-300">شروط العرض وملاحظات المورد
                    <input value={draft.notes} onChange={event => updateDraft(index, 'notes', event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100" placeholder="مثال: مدة التوريد وشروط التسليم" />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-400">
                  <span>ترتيب السعر: <strong className="font-black text-slate-100">{getRankLabel(rank, rankedQuotes.length)}</strong></span>
                </div>
              </div>
            );
          })}
        </section>

        {rankedQuotes.length > 0 && (
          <section className="mt-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4" aria-label="مقارنة العروض">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-black text-slate-100">مقارنة الأسعار تلقائيًا</h3>
              <span className="text-[11px] text-slate-500">المقارنة محايدة ولا تعتبر ترشيحًا نهائيًا</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[680px] w-full text-right text-sm font-bold text-slate-100">
                <thead className="bg-slate-950 text-slate-100"><tr><th className="px-3 py-3 font-black">الترتيب</th><th className="px-3 py-3 font-black">المورد</th><th className="px-3 py-3 font-black">قيمة العرض</th></tr></thead>
                <tbody>{rankedQuotes.map((quote, rank) => {
                  const draft = drafts[quote.index];
                  return <tr key={quote.index} className="border-t border-slate-800">
                    <td className="px-3 py-3 font-black text-cyan-200">{getRankLabel(rank + 1, rankedQuotes.length)}</td>
                    <td className="px-3 py-3 font-black text-slate-100">{supplierChoices.find(supplier => String(supplier.id) === draft.supplier_id)?.company_name || 'لم يختر موردًا'}</td>
                    <td className="px-3 py-3 font-mono text-base font-black text-emerald-300">{formatAmount(quote.amount)} ج.م</td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          </section>
        )}

        {error && <div role="alert" className="mt-4 rounded-lg border border-rose-800/50 bg-rose-950/40 px-3 py-3 text-sm font-bold leading-6 text-rose-200">{error}</div>}
        {success && <div role="status" aria-live="polite" className="mt-4 rounded-lg border border-emerald-700/60 bg-emerald-950/40 px-3 py-3 text-sm font-bold leading-6 text-emerald-200">✓ {success}</div>}

        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-800 pt-4 sm:flex-row sm:justify-start">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>إلغاء دون حفظ</Button>
          <Button type="button" variant="secondary" onClick={addQuote} disabled={loading || Boolean(success)}>+ إضافة عرض</Button>
          <Button type="button" variant="primary" isLoading={loading} disabled={Boolean(success)} onClick={() => void submit()}>إرسال {quoteCountLabel(drafts.length)} للترشيح</Button>
        </div>
      </div>
      <SupplierModal
        supplier={null}
        isOpen={supplierModalIndex !== null}
        onClose={() => setSupplierModalIndex(null)}
        onSuccess={handleSupplierCreated}
      />
    </div>
  ), document.body);
};

export default PurchaseQuotesModal;
