import React, { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { getGeneralManagerAnalyticsApi } from '../../api/generalManager';
import { usePersistedState } from '../../hooks/usePersistedState';
import ErrorMessage from '../../components/ErrorMessage';
import { ProcurementAnalyticsResponse } from '../../api/procurement';
import { CurrencyDisplay } from '../../components/ui/CurrencyDisplay';
import { KpiCard } from '../../components/ui/Card';
import { parseApiError } from '../../utils/apiError';
import { DashboardBars, DashboardDonut } from '../../components/ui/DashboardCharts';

const REQUEST_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'مسودة',
  SUBMITTED: 'تم الإرسال',
  UNDER_REVIEW: 'قيد المراجعة',
  PENDING_PROCUREMENT_APPROVAL: 'بانتظار اعتماد المشتريات',
  APPROVED_BY_REVIEWER: 'معتمد من المراجع',
  APPROVED_BY_PROCUREMENT: 'معتمد من المشتريات',
  REJECTED: 'مرفوض',
};

const PURCHASE_ORDER_STATUS_LABELS: Record<string, string> = {
  PO_DRAFT: 'مسودة أمر شراء',
  ISSUED: 'صادر',
  PENDING_ACCOUNTING_REVIEW: 'بانتظار الحسابات',
  RETURNED_TO_PROCUREMENT: 'معاد للمشتريات',
  APPROVED_BY_ACCOUNTING: 'معتمد من الحسابات',
  FINAL_APPROVED: 'اعتماد نهائي',
  REJECTED: 'مرفوض',
};

const formatNumber = (value: number | string | null | undefined) =>
  Number(value || 0).toLocaleString('ar-EG', { maximumFractionDigits: 0 });

const formatCurrency = (value: number | string | null | undefined) =>
  Number(value || 0).toLocaleString('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
};

const statusTone = (status: string) => {
  if (['COMPLETE', 'ISSUED', 'APPROVED_BY_ACCOUNTING', 'FINAL_APPROVED', 'APPROVED_BY_PROCUREMENT'].includes(status)) {
    return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
  }
  if (['LATE', 'REJECTED', 'RETURNED_TO_PROCUREMENT'].includes(status)) {
    return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
  }
  if (['UNDER_REVIEW', 'PENDING_ACCOUNTING_REVIEW', 'PENDING_PROCUREMENT_APPROVAL', 'PARTIAL'].includes(status)) {
    return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
  }
  return 'bg-slate-800 text-slate-300 border-slate-700';
};

const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <div className="py-10 text-center text-sm text-slate-500">لا توجد بيانات {label} ضمن الفترة المحددة.</div>
);

const ProgressBar: React.FC<{ value: number; max: number; color?: string }> = ({ value, max, color = 'bg-cyan-400' }) => {
  const width = max > 0 ? Math.max(4, Math.min(100, (value / max) * 100)) : 4;
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden" dir="ltr">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
    </div>
  );
};

export const GeneralManagerReportsPage: React.FC = () => {
  const [period, setPeriod] = usePersistedState('gm-report.period.v1', '90');
  const [status, setStatus] = usePersistedState('gm-report.status.v1', '');
  const [report, setReport] = useState<ProcurementAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async () => {
    setError(null);
    setRefreshing(true);
    try {
      const data = await getGeneralManagerAnalyticsApi(period, status || undefined);
      setReport(data);
    } catch (err) {
      setError(parseApiError(err).message || 'تعذر تحميل تقرير المدير العام.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, [period, status]);

  const metrics = report?.metrics;
  const requestStatuses = report?.request_status_breakdown ?? [];
  const purchaseOrderStatuses = report?.status_breakdown ?? [];
  const departments = report?.department_breakdown ?? [];
  const suppliers = report?.supplier_breakdown ?? [];

  const maxRequestCount = useMemo(() => Math.max(...requestStatuses.map(item => item.count), 1), [requestStatuses]);
  const maxOrderCount = useMemo(() => Math.max(...purchaseOrderStatuses.map(item => item.count), 1), [purchaseOrderStatuses]);

  if (loading && !report) {
    return <div className="min-h-[40vh] flex items-center justify-center text-cyan-300" dir="rtl">جاري تجهيز تقرير المدير العام...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10" dir="rtl">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-300 text-lg">▣</span>
            <h1 className="text-2xl font-bold text-slate-100">التقرير التنفيذي للمشتريات</h1>
          </div>
          <p className="text-sm text-slate-400 mt-2 max-w-3xl">
            ملخص شامل لحالة طلبات الشراء وأوامر الشراء والإنفاق حسب القسم والمورد، للعرض والرقابة التنفيذية فقط.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-2 rounded-lg border border-blue-700/50 bg-blue-900/30 px-3 py-2 text-xs text-blue-200">
            <span>للاطلاع فقط</span>
          </span>
          <button type="button" onClick={() => window.print()} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800">
            طباعة التقرير
          </button>
          <button type="button" onClick={() => void loadReport()} disabled={refreshing} className="rounded-lg bg-cyan-700 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-600 disabled:opacity-60">
            {refreshing ? 'جاري التحديث...' : 'تحديث البيانات'}
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-end gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        <label className="flex-1 text-xs text-slate-400">
          الفترة الزمنية
          <select value={period} onChange={event => setPeriod(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400">
            <option value="30">آخر 30 يوماً</option>
            <option value="90">آخر 90 يوماً</option>
            <option value="180">آخر 180 يوماً</option>
            <option value="all">كل الفترات</option>
          </select>
        </label>
        <label className="flex-1 text-xs text-slate-400">
          حالة أمر الشراء للعرض التفصيلي
          <select value={status} onChange={event => setStatus(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400">
            <option value="">كل الحالات</option>
            {Object.entries(PURCHASE_ORDER_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <div className="text-xs text-slate-500 md:max-w-xs">الأرقام والقيم معروضة بالجنيه المصري، ولا يتضمن التقرير ضرائب أو خصومات.</div>
      </div>

      {error && <ErrorMessage error={error} onRetry={() => void loadReport()} />}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <RouterLink to="/employee/requests" className="block"><KpiCard title="إجمالي طلبات الشراء" value={formatNumber(metrics?.purchase_requests_count)} accentColor="cyan" icon={<span>PR</span>} /></RouterLink>
        <KpiCard title="طلبات بانتظار المشتريات" value={formatNumber(metrics?.pending_procurement_count)} accentColor="amber" icon={<span>↳</span>} />
        <RouterLink to="/general-manager/purchase-orders" className="block"><KpiCard title="أوامر الشراء" value={formatNumber(metrics?.purchase_orders_count)} accentColor="cyan" icon={<span>PO</span>} /></RouterLink>
        <KpiCard title="إجمالي قيمة أوامر الشراء" value={<CurrencyDisplay amount={Number(metrics?.total_value || 0)} amountClassName="text-base font-bold font-mono text-emerald-300" />} accentColor="emerald" icon={<span>ج.م</span>} />
        <KpiCard title="بانتظار مراجعة الحسابات" value={formatNumber(metrics?.pending_accounting_count)} accentColor="amber" icon={<span>ح</span>} />
        <KpiCard title="متوسط أمر الشراء" value={<CurrencyDisplay amount={Number(metrics?.average_value || 0)} amountClassName="text-base font-bold font-mono text-cyan-300" />} accentColor="cyan" icon={<span>∅</span>} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardDonut title="توزيع حالات الطلبات" subtitle="حسب العدد ضمن الفترة والفلاتر الحالية" segments={requestStatuses.map((item, index) => ({ label: REQUEST_STATUS_LABELS[item.status] || item.status, value: item.count, color: ['#06b6d4', '#f59e0b', '#22c55e', '#8b5cf6', '#f43f5e'][index % 5] }))} centerLabel="الطلبات" centerValue={metrics?.purchase_requests_count || 0} />
        <DashboardDonut title="توزيع حالات أوامر الشراء" subtitle="عدد الأوامر حسب الحالة" segments={purchaseOrderStatuses.map((item, index) => ({ label: PURCHASE_ORDER_STATUS_LABELS[item.status] || item.status, value: item.count, color: ['#22c55e', '#f59e0b', '#fb923c', '#06b6d4', '#f43f5e'][index % 5] }))} centerLabel="الأوامر" centerValue={metrics?.purchase_orders_count || 0} />
        <DashboardBars title="الإنفاق حسب القسم" subtitle="القيمة الإجمالية بالجنيه المصري" segments={departments.map(item => ({ label: item.name || 'غير محدد', value: Number(item.total_value || 0) }))} unit="ج.م" />
        <DashboardBars title="أبرز الموردين" subtitle="أعلى الموردين حسب قيمة الأوامر" segments={suppliers.map(item => ({ label: item.company_name || 'غير محدد', value: Number(item.total_value || 0) }))} unit="ج.م" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <div className="flex items-center justify-between mb-5"><h2 className="text-base font-bold text-slate-100">حالة طلبات الشراء</h2><span className="text-xs text-slate-500">حسب عدد الطلبات ضمن الفترة</span></div>
          {requestStatuses.length === 0 ? <EmptyState label="طلبات الشراء" /> : <div className="space-y-4">
            {requestStatuses.map(item => <div key={item.status}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className={`rounded-md border px-2 py-1 ${statusTone(item.status)}`}>{REQUEST_STATUS_LABELS[item.status] || item.status}</span><span className="font-semibold text-slate-200">{formatNumber(item.count)} طلب</span></div>
              <ProgressBar value={item.count} max={maxRequestCount} color="bg-cyan-400" />
            </div>)}
          </div>}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <div className="flex items-center justify-between mb-5"><h2 className="text-base font-bold text-slate-100">حالة أوامر الشراء</h2><span className="text-xs text-slate-500">العدد والقيمة بالجنيه المصري</span></div>
          {purchaseOrderStatuses.length === 0 ? <EmptyState label="أوامر الشراء" /> : <div className="space-y-4">
            {purchaseOrderStatuses.map(item => <div key={item.status}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className={`rounded-md border px-2 py-1 ${statusTone(item.status)}`}>{PURCHASE_ORDER_STATUS_LABELS[item.status] || item.status}</span><span className="font-semibold text-slate-200">{formatNumber(item.count)} أمر — {formatCurrency(item.total_value)} ج.م</span></div>
              <ProgressBar value={item.count} max={maxOrderCount} color="bg-emerald-400" />
            </div>)}
          </div>}
        </div>
      </section>


      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <h2 className="mb-4 text-base font-bold text-slate-100">الإنفاق حسب القسم</h2>
          {departments.length === 0 ? <EmptyState label="الأقسام" /> : <div className="overflow-x-auto"><table className="w-full text-right text-xs"><thead className="border-b border-slate-800 text-slate-500"><tr><th className="pb-3 font-medium">القسم</th><th className="pb-3 font-medium">الأوامر</th><th className="pb-3 font-medium">القيمة</th></tr></thead><tbody>{departments.map(item => <tr key={`${item.department_id}-${item.name}`} className="border-b border-slate-900"><td className="py-3 text-slate-200">{item.name || 'غير محدد'}</td><td className="py-3 text-slate-400">{formatNumber(item.count)}</td><td className="py-3 font-mono text-cyan-300">{formatCurrency(item.total_value)} ج.م</td></tr>)}</tbody></table></div>}
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <h2 className="mb-4 text-base font-bold text-slate-100">أبرز الموردين</h2>
          {suppliers.length === 0 ? <EmptyState label="الموردين" /> : <div className="overflow-x-auto"><table className="w-full text-right text-xs"><thead className="border-b border-slate-800 text-slate-500"><tr><th className="pb-3 font-medium">المورد</th><th className="pb-3 font-medium">الأوامر</th><th className="pb-3 font-medium">القيمة</th></tr></thead><tbody>{suppliers.map(item => <tr key={`${item.supplier_id}-${item.company_name}`} className="border-b border-slate-900"><td className="py-3 text-slate-200">{item.company_name || 'غير محدد'}</td><td className="py-3 text-slate-400">{formatNumber(item.count)}</td><td className="py-3 font-mono text-emerald-300">{formatCurrency(item.total_value)} ج.م</td></tr>)}</tbody></table></div>}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-base font-bold text-slate-100">آخر أوامر الشراء</h2><RouterLink to="/general-manager/purchase-orders" className="text-xs text-cyan-300 hover:text-cyan-200">عرض الكل</RouterLink></div>{(report?.recent_purchase_orders ?? []).length === 0 ? <EmptyState label="أوامر الشراء" /> : <div className="space-y-3">{(report?.recent_purchase_orders ?? []).map(item => <RouterLink key={item.id} to={`/general-manager/purchase-orders/${item.id}`} className="block rounded-lg border border-slate-800 bg-slate-900/60 p-3 hover:border-cyan-700"><div className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-200">{item.po_number}</span><span className={`rounded-md border px-2 py-1 text-[11px] ${statusTone(item.status)}`}>{PURCHASE_ORDER_STATUS_LABELS[item.status] || item.status}</span></div><div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span>{item.supplier_name || 'غير محدد'} — {item.department_name || 'غير محدد'}</span><span className="font-mono text-emerald-300">{formatCurrency(item.grand_total)} ج.م</span></div><div className="mt-1 text-[11px] text-slate-600">آخر تحديث: {formatDate(item.updated_at)}</div></RouterLink>)}</div>}</div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-base font-bold text-slate-100">آخر الطلبات المتابعة</h2><span className="text-xs text-slate-500">الحالة الحالية</span></div>{(report?.recent_purchase_requests ?? []).length === 0 ? <EmptyState label="الطلبات" /> : <div className="space-y-3">{(report?.recent_purchase_requests ?? []).map(item => <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3"><div className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-200">{item.request_number}</span><span className={`rounded-md border px-2 py-1 text-[11px] ${statusTone(item.status)}`}>{REQUEST_STATUS_LABELS[item.status] || item.status}</span></div><div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-slate-500"><span>{item.requester_name || 'غير محدد'} — {item.department_name || 'غير محدد'}</span><span>{formatDate(item.updated_at)}</span></div></div>)}</div>}</div>
      </section>
    </div>
  );
};

export default GeneralManagerReportsPage;
