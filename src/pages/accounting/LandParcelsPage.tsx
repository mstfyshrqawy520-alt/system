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
import { getUnitLabel } from '../../utils/units';

const today = getTodayInputDate;
const money = (value: string | number | null | undefined) => `${Number(value || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;

const cleanDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const raw = String(value).trim();
  if (!raw) return '—';
  const datePart = raw.includes('T') ? raw.split('T')[0] : raw.split(' ')[0];
  return datePart || '—';
};

const parcelTransactionLabels: Record<string, string> = {
  OPENING_BALANCE: 'رصيد افتتاحي من العميل',
  CUSTOMER_FUNDING: 'تمويل عميل',
  INVOICE_EXPENSE: 'مصروف فاتورة مورد',
};

const LandParcelsPage: React.FC = () => {
  const [parcels, setParcels] = useState<LandParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [parcelDetails, setParcelDetails] = useState<LandParcelAccountDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'materials' | 'transactions' | 'invoices' | 'departments'>('materials');
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
    setActiveTab('materials');
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
  const totalAvailableAcrossParcels = parcels.reduce((sum, p) => sum + Number(p.opening_balance || 0) + Number(p.funded_total || 0), 0);
  const overallBurnRate = totalAvailableAcrossParcels > 0 ? Math.min(100, (totalExpenses / totalAvailableAcrossParcels) * 100) : 0;

  // Modal specific calculations
  const totalAvailableInModal = parcelDetails ? (Number(parcelDetails.summary.opening_balance || 0) + Number(parcelDetails.summary.funded_total || 0)) : 0;
  const spentInModal = parcelDetails ? Number(parcelDetails.summary.expense_total || 0) : 0;
  const burnRateInModal = totalAvailableInModal > 0 ? (spentInModal / totalAvailableInModal) * 100 : 0;
  const isNegativeInModal = parcelDetails ? parcelDetails.summary.is_negative : false;

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <span>🏗️</span> دفتر قطع الأراضي ومتابعة تنفيذ المشروعات
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            متابعة أرصدة وتمويل العملاء، ونسب استهلاك الميزانيات، وتوريدات المواد والأصناف المنفذة لكل قطعة أرض.
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={openParcelForm} className="font-bold">
          <span>➕</span> إضافة قطعة / رصيد افتتاحي
        </Button>
      </div>

      {error && <ErrorMessage error={error} />}
      {notice && <div className="rounded-xl border border-emerald-700/60 bg-emerald-950/30 p-3 text-xs font-bold text-emerald-200">{notice}</div>}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="border-slate-800 bg-slate-900/80">
          <div className="text-[11px] font-bold text-slate-400">عدد القطع المسجلة</div>
          <div className="mt-2 text-2xl font-black text-cyan-300">{parcels.length}</div>
          <div className="mt-1 text-[10px] text-slate-500 font-bold">قطع نشطة في النظام</div>
        </Card>
        <Card className="border-emerald-800/50 bg-emerald-950/10">
          <div className="text-[11px] font-bold text-slate-400">إجمالي تمويل العملاء</div>
          <div className="mt-2 text-2xl font-black text-emerald-300">{money(totalFunded)}</div>
          <div className="mt-1 text-[10px] text-emerald-400/80 font-bold">تمويلات إضافية مسجلة</div>
        </Card>
        <Card className="border-amber-800/50 bg-amber-950/10">
          <div className="text-[11px] font-bold text-slate-400">إجمالي مصروف الفواتير</div>
          <div className="mt-2 text-2xl font-black text-amber-300">{money(totalExpenses)}</div>
          <div className="mt-1 text-[10px] text-amber-400/80 font-bold">مصروفات فواتير موزعة</div>
        </Card>
        <Card className={`border-cyan-800/50 ${totalParcelBalance < 0 ? 'border-rose-700/60 bg-rose-950/20' : 'bg-cyan-950/10'}`}>
          <div className="text-[11px] font-bold text-slate-400">صافي أرصدة القطع</div>
          <div className={`mt-2 text-2xl font-black ${totalParcelBalance < 0 ? 'text-rose-400' : 'text-cyan-300'}`}>{money(totalParcelBalance)}</div>
          <div className="mt-1 text-[10px] text-slate-400 font-bold">
            معدل الصرف الإجمالي: {overallBurnRate.toFixed(1)}%
          </div>
        </Card>
      </div>

      {/* Main Parcels Table */}
      <Card className="space-y-4">
        <div className="rounded-xl border border-cyan-800/50 bg-cyan-950/20 p-3 text-xs leading-6 text-cyan-100 flex items-center justify-between flex-wrap gap-2">
          <span>💡 <strong>ملاحظة مالية:</strong> أموال العميل تسجل في دفتر قطعة الأرض، ومصروفات الفواتير الموزعة تخصم منها لتحديد المتبقي ونسبة الإنجاز المالي.</span>
          <span className="text-[11px] font-mono text-cyan-300 bg-cyan-900/60 px-2 py-0.5 rounded border border-cyan-700/60">إجمالي القطع: {parcels.length}</span>
        </div>

        <div className="hidden min-w-0 md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">رقم قطعة الأرض</TableHead>
                <TableHead className="whitespace-nowrap">المنطقة</TableHead>
                <TableHead className="whitespace-nowrap">الرصيد الافتتاحي</TableHead>
                <TableHead className="whitespace-nowrap">تمويل العميل</TableHead>
                <TableHead className="whitespace-nowrap">مصروف الفواتير</TableHead>
                <TableHead className="whitespace-nowrap">مؤشر استهلاك الميزانية</TableHead>
                <TableHead className="whitespace-nowrap">الرصيد الحالي</TableHead>
                <TableHead className="whitespace-nowrap">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcels.map((parcel) => {
                const avail = Number(parcel.opening_balance || 0) + Number(parcel.funded_total || 0);
                const spent = Number(parcel.expense_total || 0);
                const pct = avail > 0 ? (spent / avail) * 100 : 0;
                const isNeg = Number(parcel.balance) < 0;

                return (
                  <TableRow key={parcel.id} className={isNeg ? 'bg-rose-950/10' : undefined}>
                    <TableCell className="whitespace-nowrap font-mono font-bold text-cyan-300">{parcel.parcel_reference}</TableCell>
                    <TableCell className="font-bold text-slate-200">{parcel.region}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-slate-300">{money(parcel.opening_balance)}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-emerald-300 font-bold">{money(parcel.funded_total)}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-amber-300 font-bold">{money(parcel.expense_total)}</TableCell>
                    <TableCell className="min-w-[160px]">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className={pct > 90 || isNeg ? 'text-rose-400' : pct > 70 ? 'text-amber-400' : 'text-emerald-400'}>
                            {isNeg ? 'تجاوز التمويل' : `مستهلك ${pct.toFixed(1)}%`}
                          </span>
                          <span className="text-slate-400 font-mono">{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800 border border-slate-700">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isNeg || pct > 95
                                ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                                : pct > 70
                                ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
                                : 'bg-gradient-to-r from-cyan-500 to-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(pct, 4))}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={`whitespace-nowrap font-mono font-black ${isNeg ? 'text-rose-400' : 'text-emerald-300'}`}>
                      {money(parcel.balance)}
                      {isNeg && <div className="text-[10px] font-bold text-rose-400">⚠️ رصيد مكشوف بالسالب</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" className="whitespace-nowrap font-bold" onClick={() => void openParcelDetails(parcel)}>
                          🔍 كشف الحركة والمواد
                        </Button>
                        <Button size="sm" variant="success" className="whitespace-nowrap font-bold" onClick={() => openFundingForm(parcel)}>
                          ➕ إضافة تمويل
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <div className="space-y-3 md:hidden">
          {parcels.map((parcel) => {
            const avail = Number(parcel.opening_balance || 0) + Number(parcel.funded_total || 0);
            const spent = Number(parcel.expense_total || 0);
            const pct = avail > 0 ? (spent / avail) * 100 : 0;
            const isNeg = Number(parcel.balance) < 0;

            return (
              <article key={`mobile-parcel-${parcel.id}`} className={`min-w-0 rounded-2xl border p-4 ${isNeg ? 'border-rose-700/60 bg-rose-950/20' : 'border-slate-800 bg-slate-900/80'}`}>
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <span className="min-w-0 break-normal font-mono text-base font-black text-cyan-300">{parcel.parcel_reference}</span>
                  <span className="shrink-0 text-xs font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">{parcel.region}</span>
                </div>

                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-400">نسبة استهلاك الميزانية:</span>
                    <span className={pct > 90 || isNeg ? 'text-rose-400 font-bold' : pct > 70 ? 'text-amber-400' : 'text-emerald-400 font-bold'}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800 border border-slate-700">
                    <div
                      className={`h-full rounded-full ${
                        isNeg || pct > 95
                          ? 'bg-rose-500'
                          : pct > 70
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(pct, 5))}%` }}
                    />
                  </div>
                </div>

                <dl className="mt-4 grid min-w-0 grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-slate-500">الرصيد الافتتاحي</dt>
                    <dd className="mt-1 whitespace-nowrap font-mono text-slate-200 font-bold">{money(parcel.opening_balance)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">تمويل العميل</dt>
                    <dd className="mt-1 whitespace-nowrap font-mono text-emerald-300 font-bold">{money(parcel.funded_total)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">مصروف الفواتير</dt>
                    <dd className="mt-1 whitespace-nowrap font-mono text-amber-300 font-bold">{money(parcel.expense_total)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">الرصيد الحالي</dt>
                    <dd className={`mt-1 whitespace-nowrap font-mono font-black ${isNeg ? 'text-rose-400' : 'text-emerald-300'}`}>
                      {money(parcel.balance)}
                      {isNeg && <span className="mr-1 text-[10px] font-bold text-rose-400">(سالب)</span>}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button size="sm" variant="secondary" className="w-full whitespace-nowrap font-bold" onClick={() => void openParcelDetails(parcel)}>
                    🔍 كشف الحركة
                  </Button>
                  <Button size="sm" variant="success" className="w-full whitespace-nowrap font-bold" onClick={() => openFundingForm(parcel)}>
                    ➕ تمويل عميل
                  </Button>
                </div>
              </article>
            );
          })}
        </div>

        {!parcels.length && <div className="py-8 text-center text-sm text-slate-500">لم يتم إنشاء حسابات قطع أراضٍ بعد. أضف قطعة أرض وسجل رصيد العميل الافتتاحي.</div>}
      </Card>

      {/* ── PARCEL DETAILS & EXECUTION MODAL (With Print Support) ── */}
      {parcelDetails && createPortal(
        <div className="modal-top-viewport fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/85 p-2 sm:p-4" role="dialog" aria-modal="true">
          <div className="print-target-document max-h-[calc(100vh-1rem)] w-full max-w-6xl space-y-5 overflow-y-auto rounded-2xl border border-cyan-800/70 bg-slate-900 p-4 shadow-2xl sm:max-h-[calc(100vh-2rem)] sm:p-6">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4 print:border-b-2 print:border-black">
              <div>
                <div className="hidden print:block mb-2">
                  <h1 className="text-xl font-black text-slate-900">شركة الإشبيليّة للتطوير العقاري والمقاولات</h1>
                  <p className="text-xs text-slate-600">نظام إدارة ومتابعة المشروعات والمشتريات</p>
                </div>
                <h2 className="text-lg font-black text-slate-100 print:text-black flex items-center gap-2">
                  <span>🏗️</span> كشف حركة ومصروفات وتوريدات قطعة الأرض — <span className="font-mono text-cyan-300 print:text-black">{parcelDetails.parcel.parcel_reference}</span>
                </h2>
                <p className="mt-1 text-xs text-slate-400 print:text-slate-700">
                  المنطقة: <strong>{parcelDetails.parcel.region}</strong> — تاريخ التقرير: <strong>{today()}</strong> — جميع المبالغ بالجنيه المصري
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 print:hidden">
                <Button
                  size="sm"
                  variant="secondary"
                  className="font-bold flex items-center gap-1.5 border-cyan-700 text-cyan-200 hover:bg-cyan-950"
                  onClick={() => window.print()}
                >
                  <span>🖨️</span>
                  <span>طباعة الكشف</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setParcelDetails(null)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-2xl font-black text-slate-300 hover:bg-slate-800 hover:text-white"
                  aria-label="إغلاق النافذة"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3.5 print:border print:border-slate-400 print:bg-white">
                <div className="text-xs text-slate-400 print:text-slate-700 font-bold">الرصيد الافتتاحي</div>
                <strong className="mt-1 block font-mono text-base text-slate-100 print:text-black">{money(parcelDetails.summary.opening_balance)}</strong>
              </div>
              <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-3.5 print:border print:border-slate-400 print:bg-white">
                <div className="text-xs text-slate-400 print:text-slate-700 font-bold">تمويل العميل الإضافي</div>
                <strong className="mt-1 block font-mono text-base text-emerald-300 print:text-black">{money(parcelDetails.summary.funded_total)}</strong>
              </div>
              <div className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-3.5 print:border print:border-slate-400 print:bg-white">
                <div className="text-xs text-slate-400 print:text-slate-700 font-bold">إجمالي مصروف الفواتير</div>
                <strong className="mt-1 block font-mono text-base text-amber-300 print:text-black">{money(parcelDetails.summary.expense_total)}</strong>
              </div>
              <div className={`rounded-xl border p-3.5 print:border print:border-slate-400 print:bg-white ${isNegativeInModal ? 'border-rose-800/60 bg-rose-950/20' : 'border-cyan-800/60 bg-cyan-950/20'}`}>
                <div className="text-xs text-slate-400 print:text-slate-700 font-bold">الرصيد المتبقي الحالي</div>
                <strong className={`mt-1 block font-mono text-base font-black ${isNegativeInModal ? 'text-rose-300 print:text-black' : 'text-cyan-200 print:text-black'}`}>
                  {money(parcelDetails.summary.balance)}
                </strong>
              </div>
            </div>

            {/* Financial Progress & Burn Rate Indicator */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3 print:border print:border-slate-400 print:bg-white">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 print:text-black font-bold">مؤشر استهلاك الميزانية والتمويل:</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${
                    isNegativeInModal
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-600/50'
                      : burnRateInModal > 85
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-600/50'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-600/50'
                  }`}>
                    {isNegativeInModal ? '⚠️ تجاوز الميزانية (رصيد سالب)' : burnRateInModal > 85 ? '⚡ استهلاك مرتفع' : '✅ سيولة آمنة'}
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-300 print:text-slate-800">
                  تم صرف <strong>{money(spentInModal)}</strong> من إجمالي <strong>{money(totalAvailableInModal)}</strong> ({burnRateInModal.toFixed(1)}%)
                </div>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800 border border-slate-700 print:border-slate-400">
                <div
                  className={`h-full rounded-full transition-all ${
                    isNegativeInModal || burnRateInModal > 95
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                      : burnRateInModal > 75
                      ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
                      : 'bg-gradient-to-r from-cyan-500 to-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(burnRateInModal, 3))}%` }}
                />
              </div>
            </div>

            {/* Department Breakdown Cards */}
            {parcelDetails.department_breakdown && parcelDetails.department_breakdown.length > 0 && (
              <div className="rounded-xl border border-cyan-800/60 bg-cyan-950/20 p-4 space-y-3 print:border print:border-slate-400 print:bg-white">
                <h3 className="text-xs font-black text-cyan-200 print:text-black flex items-center gap-2">
                  <span>🏢</span> تفاصيل الصرف حسب الأقسام (تطوير، تشطيبات، مشروعات...):
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {parcelDetails.department_breakdown.map((dept, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-700 bg-slate-900/90 p-3 flex justify-between items-center print:border print:border-slate-300 print:bg-white">
                      <div>
                        <div className="text-xs font-bold text-slate-200 print:text-black">{dept.department_name}</div>
                        <div className="text-[10px] text-slate-400 print:text-slate-600 mt-0.5">{dept.invoices_count} فاتورة مرتبطة</div>
                      </div>
                      <strong className="font-mono text-xs font-bold text-amber-300 print:text-black">{money(dept.total_amount)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation Tabs (Interactive in UI, All Shown in Print) */}
            <div className="flex border-b border-slate-800 gap-2 text-xs font-bold print:hidden">
              <button
                type="button"
                className={`pb-2.5 px-3 border-b-2 transition-colors ${
                  activeTab === 'materials'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => setActiveTab('materials')}
              >
                🧱 المواد والأصناف الموردة ({parcelDetails.materials?.length || 0})
              </button>
              <button
                type="button"
                className={`pb-2.5 px-3 border-b-2 transition-colors ${
                  activeTab === 'transactions'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => setActiveTab('transactions')}
              >
                📜 سجل الحركات المالية ({parcelDetails.transactions.length})
              </button>
              <button
                type="button"
                className={`pb-2.5 px-3 border-b-2 transition-colors ${
                  activeTab === 'invoices'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => setActiveTab('invoices')}
              >
                🧾 توزيعات الفواتير ({parcelDetails.invoice_allocations.length})
              </button>
            </div>

            {/* ── TAB 1: Delivered Materials & Items Log ── */}
            <div className={`${activeTab === 'materials' ? 'block' : 'hidden'} print:block space-y-3`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-100 print:text-black flex items-center gap-1.5">
                  <span>🧱</span> سجل المواد والأصناف المنفذة والموردة للموقع
                </h3>
                <span className="text-xs text-slate-400 print:text-slate-600">
                  إجمالي البنود: <strong>{parcelDetails.materials?.length || 0}</strong>
                </span>
              </div>

              <div className="overflow-x-auto">
                <Table className="print:text-black">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">اسم الصنف / المادة</TableHead>
                      <TableHead className="whitespace-nowrap">رقم القطعة والمنطقة</TableHead>
                      <TableHead className="whitespace-nowrap">أمر الشراء</TableHead>
                      <TableHead className="whitespace-nowrap">المورد</TableHead>
                      <TableHead className="whitespace-nowrap">الكمية المطلوبة</TableHead>
                      <TableHead className="whitespace-nowrap">الكمية المستلمة</TableHead>
                      <TableHead className="whitespace-nowrap">الوحدة</TableHead>
                      <TableHead className="whitespace-nowrap">سعر الوحدة</TableHead>
                      <TableHead className="whitespace-nowrap">إجمالي البند</TableHead>
                      <TableHead className="whitespace-nowrap">تاريخ التوريد</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parcelDetails.materials && parcelDetails.materials.length > 0 ? (
                      parcelDetails.materials.map((mat) => (
                        <TableRow key={mat.id}>
                          <TableCell className="font-bold text-slate-100 print:text-black">
                            <div>{mat.item_name}</div>
                            {mat.specifications && <div className="text-[10px] text-slate-400 print:text-slate-600 font-normal">{mat.specifications}</div>}
                          </TableCell>
                          <TableCell className="font-mono text-cyan-300 print:text-black text-xs">
                            {mat.item_reference || parcelDetails.parcel.parcel_reference} {mat.region ? `(${mat.region})` : ''}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{mat.po_number || '—'}</TableCell>
                          <TableCell className="text-xs">{mat.supplier_name || '—'}</TableCell>
                          <TableCell className="font-mono text-slate-300 print:text-black">{mat.ordered_quantity}</TableCell>
                          <TableCell className="font-mono font-bold text-emerald-300 print:text-black">{mat.received_quantity}</TableCell>
                          <TableCell className="text-xs">{getUnitLabel(mat.uom)}</TableCell>
                          <TableCell className="font-mono text-xs">{money(mat.unit_price)}</TableCell>
                          <TableCell className="font-mono font-bold text-amber-300 print:text-black">{money(mat.total_price)}</TableCell>
                          <TableCell className="font-mono text-xs">{cleanDate(mat.date)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} className="py-6 text-center text-xs text-slate-400">
                          لا توجد بنود مواد أو أصناف مسجلة بأوامر الشراء لهذه القطعة بعد.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* ── TAB 2: Financial Transactions Log ── */}
            <div className={`${activeTab === 'transactions' ? 'block' : 'hidden'} print:block space-y-3`}>
              <h3 className="text-sm font-black text-slate-100 print:text-black flex items-center gap-1.5">
                <span>📜</span> سجل الحركات المالية وأرصدة العميل
              </h3>
              <div className="overflow-x-auto">
                <Table className="print:text-black">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">التاريخ</TableHead>
                      <TableHead className="whitespace-nowrap">نوع الحركة</TableHead>
                      <TableHead className="whitespace-nowrap">المبلغ</TableHead>
                      <TableHead className="whitespace-nowrap">الرصيد بعد الحركة</TableHead>
                      <TableHead className="whitespace-nowrap">المرجع</TableHead>
                      <TableHead className="whitespace-nowrap">الملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parcelDetails.transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono whitespace-nowrap text-xs">{cleanDate(transaction.transaction_date)}</TableCell>
                        <TableCell className="font-bold text-xs">{parcelTransactionLabels[transaction.transaction_type] || transaction.transaction_type}</TableCell>
                        <TableCell className={`font-mono font-bold text-xs ${Number(transaction.amount) < 0 ? 'text-rose-300 print:text-black' : 'text-emerald-300 print:text-black'}`}>
                          {money(transaction.amount)}
                        </TableCell>
                        <TableCell className={`font-mono font-bold text-xs ${Number(transaction.balance_after) < 0 ? 'text-rose-300 print:text-black' : 'text-cyan-200 print:text-black'}`}>
                          {money(transaction.balance_after)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{transaction.reference_number || '—'}</TableCell>
                        <TableCell className="text-xs">{transaction.notes || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* ── TAB 3: Invoices Allocations Log ── */}
            <div className={`${activeTab === 'invoices' ? 'block' : 'hidden'} print:block space-y-3`}>
              <h3 className="text-sm font-black text-slate-100 print:text-black flex items-center gap-1.5">
                <span>🧾</span> توزيعات فواتير المورد ومصروفات الأقسام
              </h3>
              <div className="overflow-x-auto">
                <Table className="print:text-black">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">الفاتورة</TableHead>
                      <TableHead className="whitespace-nowrap">المورد</TableHead>
                      <TableHead className="whitespace-nowrap">أمر الشراء</TableHead>
                      <TableHead className="whitespace-nowrap">القسم / نوع الصرف</TableHead>
                      <TableHead className="whitespace-nowrap">قيمة المصروف على القطعة</TableHead>
                      <TableHead className="whitespace-nowrap">ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parcelDetails.invoice_allocations.map((allocation) => (
                      <TableRow key={allocation.id}>
                        <TableCell className="font-mono font-bold text-cyan-300 print:text-black text-xs">{allocation.invoice?.invoice_number || '—'}</TableCell>
                        <TableCell className="text-xs font-bold">{allocation.invoice?.supplier?.company_name || '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{allocation.invoice?.purchase_order?.po_number || '—'}</TableCell>
                        <TableCell>
                          <span className="inline-flex rounded bg-cyan-950/80 px-2 py-0.5 text-xs font-bold text-cyan-300 border border-cyan-800/60 print:bg-white print:border-black print:text-black">
                            {allocation.department?.name || 'عام'}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-amber-300 print:text-black text-xs">{money(allocation.amount)}</TableCell>
                        <TableCell className="text-xs">{allocation.notes || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Print Signatures Block */}
            <div className="hidden print:grid grid-cols-3 gap-8 pt-8 border-t border-slate-400 text-center text-xs">
              <div>
                <p className="font-bold">المحاسب المسؤول</p>
                <div className="mt-8 border-b border-dotted border-black w-32 mx-auto"></div>
              </div>
              <div>
                <p className="font-bold">المدير المالي</p>
                <div className="mt-8 border-b border-dotted border-black w-32 mx-auto"></div>
              </div>
              <div>
                <p className="font-bold">اعتماد الإدارة العامة</p>
                <div className="mt-8 border-b border-dotted border-black w-32 mx-auto"></div>
              </div>
            </div>

            {/* Footer Close Button */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800 print:hidden">
              <Button type="button" variant="secondary" onClick={() => setParcelDetails(null)}>
                إغلاق
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── CREATE PARCEL MODAL ── */}
      {parcelFormOpen && createPortal(
        <div className="modal-top-viewport fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/85 p-2 sm:p-4" role="dialog" aria-modal="true">
          <form onSubmit={submitParcel} className="max-h-[calc(100vh-1rem)] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl border border-cyan-800/70 bg-slate-900 p-4 shadow-2xl sm:max-h-[calc(100vh-3rem)] sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-100">إنشاء حساب قطعة أرض</h2>
                <p className="mt-1 text-xs leading-6 text-slate-400">سجل رقم القطعة والمنطقة ورصيد العميل الذي تم دفعه لها. يمكن أن يكون الرصيد الافتتاحي صفرًا.</p>
              </div>
              <button type="button" onClick={() => setParcelFormOpen(false)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-2xl font-black text-slate-300 hover:bg-slate-800 hover:text-white" aria-label="إغلاق النافذة">×</button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-300">
                رقم قطعة الأرض *
                <input required value={parcelForm.parcel_reference} onChange={(event) => setParcelForm({ ...parcelForm, parcel_reference: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100" />
              </label>
              <label className="text-xs font-bold text-slate-300">
                المنطقة *
                <input required value={parcelForm.region} onChange={(event) => setParcelForm({ ...parcelForm, region: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100" />
              </label>
              <label className="text-xs font-bold text-slate-300">
                رصيد العميل الافتتاحي (ج.م)
                <input type="number" min="0" step="0.01" value={parcelForm.opening_balance ?? 0} onChange={(event) => setParcelForm({ ...parcelForm, opening_balance: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-lg border border-emerald-700/60 bg-slate-950 px-3 text-sm text-slate-100" />
              </label>
              <label className="text-xs font-bold text-slate-300">
                تاريخ الرصيد
                <input type="date" value={parcelForm.transaction_date || today()} onChange={(event) => setParcelForm({ ...parcelForm, transaction_date: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100" />
              </label>
              <label className="text-xs font-bold text-slate-300 sm:col-span-2">
                رقم مرجع دفع العميل
                <input value={parcelForm.reference_number || ''} onChange={(event) => setParcelForm({ ...parcelForm, reference_number: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100" />
              </label>
            </div>
            <label className="block text-xs font-bold text-slate-300">
              ملاحظات
              <textarea value={parcelForm.notes || ''} onChange={(event) => setParcelForm({ ...parcelForm, notes: event.target.value })} className="mt-1 min-h-24 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100" />
            </label>
            {parcelFormError && <p role="alert" className="text-xs font-bold text-rose-300">{parcelFormError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setParcelFormOpen(false)}>إلغاء</Button>
              <Button type="submit" variant="primary" isLoading={saving}>حفظ حساب القطعة</Button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* ── CUSTOMER FUNDING MODAL ── */}
      {fundingParcel && createPortal(
        <div className="modal-top-viewport fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/85 p-2 sm:p-4" role="dialog" aria-modal="true">
          <form onSubmit={submitFunding} className="max-h-[calc(100vh-1rem)] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl border border-emerald-800/70 bg-slate-900 p-4 shadow-2xl sm:max-h-[calc(100vh-3rem)] sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-100">إضافة تمويل عميل</h2>
                <p className="mt-1 text-xs leading-6 text-slate-400">إضافة مبلغ جديد إلى حساب قطعة الأرض. هذا المبلغ لا يخصم من مديونية المورد.</p>
              </div>
              <button type="button" onClick={() => setFundingParcel(null)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-2xl font-black text-slate-300 hover:bg-slate-800 hover:text-white" aria-label="إغلاق النافذة">×</button>
            </div>
            <div className="rounded-lg border border-cyan-800/60 bg-cyan-950/20 p-3 text-xs">
              <div className="text-slate-400">قطعة الأرض</div>
              <strong className="text-cyan-200">{fundingParcel.parcel_reference} — {fundingParcel.region}</strong>
              <div className="mt-2 text-slate-400">
                الرصيد الحالي: <strong className={Number(fundingParcel.balance) < 0 ? 'text-rose-300' : 'text-emerald-300'}>{money(fundingParcel.balance)}</strong>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-300">
                مبلغ التمويل (ج.م) *
                <input type="number" min="0.01" step="0.01" required value={fundingForm.amount} onChange={(event) => setFundingForm({ ...fundingForm, amount: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-lg border border-emerald-700/60 bg-slate-950 px-3 text-sm text-slate-100" />
              </label>
              <label className="text-xs font-bold text-slate-300">
                تاريخ التمويل
                <input type="date" required value={fundingForm.transaction_date || today()} onChange={(event) => setFundingForm({ ...fundingForm, transaction_date: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100" />
              </label>
              <label className="text-xs font-bold text-slate-300 sm:col-span-2">
                رقم مرجع دفع العميل
                <input value={fundingForm.reference_number || ''} onChange={(event) => setFundingForm({ ...fundingForm, reference_number: event.target.value })} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100" />
              </label>
            </div>
            <label className="block text-xs font-bold text-slate-300">
              ملاحظات
              <textarea value={fundingForm.notes || ''} onChange={(event) => setFundingForm({ ...fundingForm, notes: event.target.value })} className="mt-1 min-h-24 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100" />
            </label>
            {fundingFormError && <p role="alert" className="text-xs font-bold text-rose-300">{fundingFormError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setFundingParcel(null)}>إلغاء</Button>
              <Button type="submit" variant="success" isLoading={saving}>تسجيل تمويل العميل</Button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
};

export default LandParcelsPage;
