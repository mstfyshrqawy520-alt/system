import React, { FormEvent, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CreateLandParcelPayload,
  CreateLandParcelFundingPayload,
  LandParcel,
  LandParcelAccountDetails,
  addCustomerFundingApi,
  createLandParcelApi,
  getLandParcelAccountApi,
  getLandParcelsApi,
} from '../../api/supplierFinance';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import ErrorMessage from '../../components/ErrorMessage';
import { parseApiError } from '../../utils/apiError';
import { getTodayInputDate } from '../../utils/dateFilters';

const today = getTodayInputDate;
const money = (value: string | number | null | undefined) => `${Number(value || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;
const parcelTransactionLabels: Record<string, string> = { OPENING_BALANCE: 'رصيد افتتاحي من العميل', CUSTOMER_FUNDING: 'تمويل عميل', INVOICE_EXPENSE: 'مصروف فاتورة مورد' };

const LandParcelsPage: React.FC = () => {
  const [parcels, setParcels] = useState<LandParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [parcelDetails, setParcelDetails] = useState<LandParcelAccountDetails | null>(null);
  const [parcelFormOpen, setParcelFormOpen] = useState(false);
  const [parcelFormError, setParcelFormError] = useState<string | null>(null);
  const [fundingParcel, setFundingParcel] = useState<LandParcel | null>(null);
  const [fundingFormError, setFundingFormError] = useState<string | null>(null);
  const [parcelForm, setParcelForm] = useState<CreateLandParcelPayload>({ parcel_reference: '', region: '', opening_balance: 0, transaction_date: today(), reference_number: '', notes: '' });
  const [fundingForm, setFundingForm] = useState<CreateLandParcelFundingPayload>({ amount: 0, transaction_date: today(), reference_number: '', notes: '' });

  const validatePositiveAmount = (value: number, label: string): string | null => {
    if (!Number.isFinite(value) || value <= 0) {
      return `${label} يجب أن يكون رقماً أكبر من صفر.`;
    }
    return null;
  };

  const refreshParcels = async () => {
    const data = await getLandParcelsApi();
    setParcels(data);
    return data;
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      await refreshParcels();
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const openParcelForm = () => {
    setError(null);
    setNotice(null);
    setParcelForm({ parcel_reference: '', region: '', opening_balance: 0, transaction_date: today(), reference_number: '', notes: '' });
    setParcelFormError(null);
    setParcelFormOpen(true);
  };

  const submitParcel = async (event: FormEvent) => {
    event.preventDefault();
    if (!parcelForm.parcel_reference.trim() || !parcelForm.region.trim()) {
      setParcelFormError('رقم قطعة الأرض والمنطقة مطلوبان.');
      return;
    }
    setSaving(true);
    setParcelFormError(null);
    try {
      await createLandParcelApi({
        ...parcelForm,
        parcel_reference: parcelForm.parcel_reference.trim(),
        region: parcelForm.region.trim(),
        opening_balance: Number(parcelForm.opening_balance || 0),
        reference_number: parcelForm.reference_number?.trim() || undefined,
        notes: parcelForm.notes?.trim() || undefined,
      });
      setParcelFormOpen(false);
      setNotice('تم إنشاء حساب قطعة الأرض وتسجيل رصيد العميل الافتتاحي.');
      await refreshParcels();
    } catch (err) {
      setParcelFormError(parseApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const openParcelDetails = async (parcel: LandParcel) => {
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      setParcelDetails(await getLandParcelAccountApi(parcel.id));
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const openFundingForm = (parcel: LandParcel) => {
    setError(null);
    setNotice(null);
    setFundingParcel(parcel);
    setFundingFormError(null);
    setFundingForm({ amount: 0, transaction_date: today(), reference_number: '', notes: '' });
  };

  const submitFunding = async (event: FormEvent) => {
    event.preventDefault();
    if (!fundingParcel) return;
    const amount = Number(fundingForm.amount);
    const amountError = validatePositiveAmount(amount, 'تمويل العميل');
    if (amountError) {
      setFundingFormError(amountError);
      return;
    }
    setSaving(true);
    setFundingFormError(null);
    try {
      await addCustomerFundingApi(fundingParcel.id, {
        ...fundingForm,
        amount,
        reference_number: fundingForm.reference_number?.trim() || undefined,
        notes: fundingForm.notes?.trim() || undefined,
      });
      setFundingParcel(null);
      setNotice('تم تسجيل تمويل العميل وإضافته إلى رصيد قطعة الأرض.');
      await refreshParcels();
    } catch (err) {
      setFundingFormError(parseApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-[360px] p-6 text-sm font-bold text-cyan-300" dir="rtl">جاري تحميل دفتر قطع الأراضي وأرصدة العملاء...</div>;

  const totalParcelBalance = parcels.reduce((sum, p) => sum + Number(p.balance || 0), 0);
  const totalFunded = parcels.reduce((sum, p) => sum + Number(p.funded_total || 0), 0);
  const totalExpenses = parcels.reduce((sum, p) => sum + Number(p.expense_total || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 md:flex-row md:items-center md:justify-between">
        <div><h1 className="text-xl font-black text-slate-100">دفتر قطع الأراضي وأرصدة العملاء</h1><p className="mt-1 text-xs text-slate-400">الرصيد الافتتاحي وتمويل العميل يضافان للقطعة، ومصروفات الفواتير الموزعة يدويًا تخصم منها وقد تجعل الرصيد سالبًا.</p></div>
        <Button size="sm" variant="primary" onClick={openParcelForm}>إضافة قطعة / رصيد افتتاحي</Button>
      </div>

      {error && <ErrorMessage error={error} />}
      {notice && <div className="rounded-xl border border-emerald-700/60 bg-emerald-950/30 p-3 text-xs font-bold text-emerald-200">{notice}</div>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card><div className="text-[11px] text-slate-400">عدد القطع</div><div className="mt-2 text-2xl font-black text-cyan-300">{parcels.length}</div></Card>
        <Card><div className="text-[11px] text-slate-400">إجمالي تمويل العملاء</div><div className="mt-2 text-2xl font-black text-emerald-300">{money(totalFunded)}</div></Card>
        <Card><div className="text-[11px] text-slate-400">إجمالي مصروف الفواتير</div><div className="mt-2 text-2xl font-black text-amber-300">{money(totalExpenses)}</div></Card>
        <Card><div className="text-[11px] text-slate-400">إجمالي أرصدة القطع</div><div className={`mt-2 text-2xl font-black ${totalParcelBalance < 0 ? 'text-rose-400' : 'text-emerald-300'}`}>{money(totalParcelBalance)}</div></Card>
      </div>

      <Card className="space-y-4">
        <div className="rounded-lg border border-cyan-800/50 bg-cyan-950/20 p-3 text-xs leading-6 text-cyan-100">أموال العميل منفصلة عن دفعات المورد. دفعة المورد تقلل مديونيته فقط، بينما تمويل العميل يسجل في دفتر قطعة الأرض.</div>
        <div className="hidden min-w-0 md:block"><Table><TableHeader><TableRow><TableHead className="whitespace-nowrap">رقم قطعة الأرض</TableHead><TableHead className="whitespace-nowrap">المنطقة</TableHead><TableHead className="whitespace-nowrap">الرصيد الافتتاحي</TableHead><TableHead className="whitespace-nowrap">تمويل العميل</TableHead><TableHead className="whitespace-nowrap">مصروف الفواتير</TableHead><TableHead className="whitespace-nowrap">الرصيد الحالي</TableHead><TableHead className="whitespace-nowrap">الإجراء</TableHead></TableRow></TableHeader><TableBody>{parcels.map((parcel) => <TableRow key={parcel.id}><TableCell className="whitespace-nowrap font-mono font-bold text-cyan-300">{parcel.parcel_reference}</TableCell><TableCell>{parcel.region}</TableCell><TableCell className="whitespace-nowrap font-mono">{money(parcel.opening_balance)}</TableCell><TableCell className="whitespace-nowrap font-mono text-emerald-300">{money(parcel.funded_total)}</TableCell><TableCell className="whitespace-nowrap font-mono text-amber-300">{money(parcel.expense_total)}</TableCell><TableCell className={`whitespace-nowrap font-mono font-black ${Number(parcel.balance) < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{money(parcel.balance)}{Number(parcel.balance) < 0 && <div className="text-xs font-bold">الرصيد بالسالب</div>}</TableCell><TableCell><div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" className="whitespace-nowrap" onClick={() => void openParcelDetails(parcel)}>كشف الحركة</Button><Button size="sm" variant="success" className="whitespace-nowrap" onClick={() => openFundingForm(parcel)}>إضافة تمويل عميل</Button></div></TableCell></TableRow>)}</TableBody></Table></div>
        <div className="space-y-3 md:hidden">{parcels.map((parcel) => <article key={`mobile-parcel-${parcel.id}`} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-4"><div className="flex min-w-0 items-start justify-between gap-3"><span className="min-w-0 break-normal font-mono text-sm font-black text-cyan-300">{parcel.parcel_reference}</span><span className="shrink-0 text-[11px] text-slate-400">{parcel.region}</span></div><dl className="mt-4 grid min-w-0 grid-cols-1 gap-3 text-xs min-[420px]:grid-cols-2"><div><dt className="text-slate-500">الرصيد الافتتاحي</dt><dd className="mt-1 whitespace-nowrap font-mono text-slate-200">{money(parcel.opening_balance)}</dd></div><div><dt className="text-slate-500">تمويل العميل</dt><dd className="mt-1 whitespace-nowrap font-mono text-emerald-300">{money(parcel.funded_total)}</dd></div><div><dt className="text-slate-500">مصروف الفواتير</dt><dd className="mt-1 whitespace-nowrap font-mono text-amber-300">{money(parcel.expense_total)}</dd></div><div><dt className="text-slate-500">الرصيد الحالي</dt><dd className={`mt-1 whitespace-nowrap font-mono font-black ${Number(parcel.balance) < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{money(parcel.balance)}{Number(parcel.balance) < 0 && <span className="mr-2 text-[10px]">(سالب)</span>}</dd></div></dl><div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2"><Button size="sm" variant="secondary" className="w-full whitespace-nowrap" onClick={() => void openParcelDetails(parcel)}>كشف الحركة</Button><Button size="sm" variant="success" className="w-full whitespace-nowrap" onClick={() => openFundingForm(parcel)}>إضافة تمويل عميل</Button></div></article>)}</div>
        {!parcels.length && <div className="py-8 text-center text-sm text-slate-500">لم يتم إنشاء حسابات قطع أراضٍ بعد. أضف قطعة أرض وسجل رصيد العميل الافتتاحي.</div>}
      </Card>

      {/* Parcel Details Modal */}
      {parcelDetails && createPortal(<div className="modal-top-viewport fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/85 p-2 sm:p-4" role="dialog" aria-modal="true"><div className="max-h-[calc(100vh-1rem)] w-full max-w-6xl space-y-5 overflow-y-auto rounded-2xl border border-cyan-800/70 bg-slate-900 p-4 shadow-2xl sm:max-h-[calc(100vh-2rem)] sm:p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-black text-slate-100">كشف حركة ومصروفات قطعة الأرض — {parcelDetails.parcel.parcel_reference}</h2><p className="mt-1 text-xs text-slate-400">{parcelDetails.parcel.region} — كل المبالغ بالجنيه المصري</p></div><button type="button" onClick={() => setParcelDetails(null)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-2xl font-black text-slate-300 hover:bg-slate-800 hover:text-white" aria-label="إغلاق النافذة">×</button></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3"><div className="text-xs text-slate-500">الرصيد الافتتاحي</div><strong className="mt-1 block font-mono text-slate-100">{money(parcelDetails.summary.opening_balance)}</strong></div><div className="rounded-lg border border-emerald-800/60 bg-emerald-950/20 p-3"><div className="text-xs text-slate-500">تمويل العميل</div><strong className="mt-1 block font-mono text-emerald-300">{money(parcelDetails.summary.funded_total)}</strong></div><div className="rounded-lg border border-amber-800/60 bg-amber-950/20 p-3"><div className="text-xs text-slate-500">مصروف الفواتير</div><strong className="mt-1 block font-mono text-amber-300">{money(parcelDetails.summary.expense_total)}</strong></div><div className={`rounded-lg border p-3 ${parcelDetails.summary.is_negative ? 'border-rose-800/60 bg-rose-950/20' : 'border-cyan-800/60 bg-cyan-950/20'}`}><div className="text-xs text-slate-500">الرصيد الحالي</div><strong className={`mt-1 block font-mono ${parcelDetails.summary.is_negative ? 'text-rose-300' : 'text-cyan-200'}`}>{money(parcelDetails.summary.balance)}</strong></div></div>{parcelDetails.department_breakdown && parcelDetails.department_breakdown.length > 0 && (<div className="rounded-xl border border-cyan-800/60 bg-cyan-950/20 p-4 space-y-3"><h3 className="text-xs font-black text-cyan-200 flex items-center gap-2"><span>🏗️</span> تفاصيل الصرف حسب الأقسام (تطوير، تشطيبات، مشروعات...):</h3><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">{parcelDetails.department_breakdown.map((dept, idx) => (<div key={idx} className="rounded-lg border border-slate-700 bg-slate-900/90 p-3 flex justify-between items-center"><div><div className="text-xs font-bold text-slate-200">{dept.department_name}</div><div className="text-[10px] text-slate-400 mt-0.5">{dept.invoices_count} فاتورة مرتبطة</div></div><strong className="font-mono text-xs font-bold text-amber-300">{money(dept.total_amount)}</strong></div>))}</div></div>)}<div className="overflow-x-auto"><h3 className="mb-3 text-sm font-black text-slate-100">سجل الحركات</h3><Table><TableHeader><TableRow><TableHead>التاريخ</TableHead><TableHead>نوع الحركة</TableHead><TableHead>المبلغ</TableHead><TableHead>الرصيد بعد الحركة</TableHead><TableHead>المرجع</TableHead><TableHead>الملاحظات</TableHead></TableRow></TableHeader><TableBody>{parcelDetails.transactions.map((transaction) => <TableRow key={transaction.id}><TableCell className="font-mono">{transaction.transaction_date}</TableCell><TableCell className="font-bold">{parcelTransactionLabels[transaction.transaction_type] || transaction.transaction_type}</TableCell><TableCell className={`font-mono font-bold ${Number(transaction.amount) < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{money(transaction.amount)}</TableCell><TableCell className={`font-mono font-bold ${Number(transaction.balance_after) < 0 ? 'text-rose-300' : 'text-cyan-200'}`}>{money(transaction.balance_after)}</TableCell><TableCell className="font-mono">{transaction.reference_number || '—'}</TableCell><TableCell>{transaction.notes || '—'}</TableCell></TableRow>)}</TableBody></Table></div><div className="overflow-x-auto"><h3 className="mb-3 text-sm font-black text-slate-100">توزيعات فواتير المورد ومصروفات الأقسام</h3><Table><TableHeader><TableRow><TableHead>الفاتورة</TableHead><TableHead>المورد</TableHead><TableHead>أمر الشراء</TableHead><TableHead>القسم / نوع الصرف</TableHead><TableHead>قيمة المصروف على القطعة</TableHead><TableHead>ملاحظات</TableHead></TableRow></TableHeader><TableBody>{parcelDetails.invoice_allocations.map((allocation) => <TableRow key={allocation.id}><TableCell className="font-mono font-bold text-cyan-300">{allocation.invoice?.invoice_number || '—'}</TableCell><TableCell>{allocation.invoice?.supplier?.company_name || '—'}</TableCell><TableCell className="font-mono">{allocation.invoice?.purchase_order?.po_number || '—'}</TableCell><TableCell><span className="inline-flex rounded bg-cyan-950/80 px-2 py-0.5 text-xs font-bold text-cyan-300 border border-cyan-800/60">{allocation.department?.name || 'عام'}</span></TableCell><TableCell className="font-mono font-bold text-amber-300">{money(allocation.amount)}</TableCell><TableCell>{allocation.notes || '—'}</TableCell></TableRow>)}</TableBody></Table></div></div></div>, document.body)}

      {/* Create Parcel Modal */}
      {parcelFormOpen && createPortal(<div className="modal-top-viewport fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/85 p-2 sm:p-4" role="dialog" aria-modal="true"><form onSubmit={submitParcel} className="max-h-[calc(100vh-1rem)] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl border border-cyan-800/70 bg-slate-900 p-4 shadow-2xl sm:max-h-[calc(100vh-3rem)] sm:p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-black text-slate-100">إنشاء حساب قطعة أرض</h2><p className="mt-1 text-xs leading-6 text-slate-400">سجل رقم القطعة والمنطقة ورصيد العميل الذي تم دفعه لها. يمكن أن يكون الرصيد الافتتاحي صفرًا.</p></div><button type="button" onClick={() => setParcelFormOpen(false)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-2xl font-black text-slate-300 hover:bg-slate-800 hover:text-white" aria-label="إغلاق النافذة">×</button></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-300">رقم قطعة الأرض *<input required value={parcelForm.parcel_reference} onChange={(event) => setParcelForm({ ...parcelForm, parcel_reference: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100" /></label><label className="text-xs font-bold text-slate-300">المنطقة *<input required value={parcelForm.region} onChange={(event) => setParcelForm({ ...parcelForm, region: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100" /></label><label className="text-xs font-bold text-slate-300">رصيد العميل الافتتاحي (ج.م)<input type="number" min="0" step="0.01" value={parcelForm.opening_balance ?? 0} onChange={(event) => setParcelForm({ ...parcelForm, opening_balance: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-lg border border-emerald-700/60 bg-slate-950 px-3 text-sm text-slate-100" /></label><label className="text-xs font-bold text-slate-300">تاريخ الرصيد<input type="date" value={parcelForm.transaction_date || today()} onChange={(event) => setParcelForm({ ...parcelForm, transaction_date: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100" /></label><label className="text-xs font-bold text-slate-300 sm:col-span-2">رقم مرجع دفع العميل<input value={parcelForm.reference_number || ''} onChange={(event) => setParcelForm({ ...parcelForm, reference_number: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100" /></label></div><label className="block text-xs font-bold text-slate-300">ملاحظات<textarea value={parcelForm.notes || ''} onChange={(event) => setParcelForm({ ...parcelForm, notes: event.target.value })} className="mt-1 min-h-24 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100" /></label>{parcelFormError && <p role="alert" className="text-xs font-bold text-rose-300">{parcelFormError}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setParcelFormOpen(false)}>إلغاء</Button><Button type="submit" variant="primary" isLoading={saving}>حفظ حساب القطعة</Button></div></form></div>, document.body)}

      {/* Customer Funding Modal */}
      {fundingParcel && createPortal(<div className="modal-top-viewport fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/85 p-2 sm:p-4" role="dialog" aria-modal="true"><form onSubmit={submitFunding} className="max-h-[calc(100vh-1rem)] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl border border-emerald-800/70 bg-slate-900 p-4 shadow-2xl sm:max-h-[calc(100vh-3rem)] sm:p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-black text-slate-100">إضافة تمويل عميل</h2><p className="mt-1 text-xs leading-6 text-slate-400">إضافة مبلغ جديد إلى حساب قطعة الأرض. هذا المبلغ لا يخصم من مديونية المورد.</p></div><button type="button" onClick={() => setFundingParcel(null)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-2xl font-black text-slate-300 hover:bg-slate-800 hover:text-white" aria-label="إغلاق النافذة">×</button></div><div className="rounded-lg border border-cyan-800/60 bg-cyan-950/20 p-3 text-xs"><div className="text-slate-400">قطعة الأرض</div><strong className="text-cyan-200">{fundingParcel.parcel_reference} — {fundingParcel.region}</strong><div className="mt-2 text-slate-400">الرصيد الحالي: <strong className={Number(fundingParcel.balance) < 0 ? 'text-rose-300' : 'text-emerald-300'}>{money(fundingParcel.balance)}</strong></div></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-300">مبلغ التمويل (ج.م) *<input type="number" min="0.01" step="0.01" required value={fundingForm.amount} onChange={(event) => setFundingForm({ ...fundingForm, amount: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-lg border border-emerald-700/60 bg-slate-950 px-3 text-sm text-slate-100" /></label><label className="text-xs font-bold text-slate-300">تاريخ التمويل<input type="date" required value={fundingForm.transaction_date || today()} onChange={(event) => setFundingForm({ ...fundingForm, transaction_date: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100" /></label><label className="text-xs font-bold text-slate-300 sm:col-span-2">رقم مرجع دفع العميل<input value={fundingForm.reference_number || ''} onChange={(event) => setFundingForm({ ...fundingForm, reference_number: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100" /></label></div><label className="block text-xs font-bold text-slate-300">ملاحظات<textarea value={fundingForm.notes || ''} onChange={(event) => setFundingForm({ ...fundingForm, notes: event.target.value })} className="mt-1 min-h-24 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100" /></label>{fundingFormError && <p role="alert" className="text-xs font-bold text-rose-300">{fundingFormError}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setFundingParcel(null)}>إلغاء</Button><Button type="submit" variant="success" isLoading={saving}>تسجيل تمويل العميل</Button></div></form></div>, document.body)}
    </div>
  );
};

export default LandParcelsPage;
