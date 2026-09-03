import React, { useEffect, useMemo, useState } from 'react';
import { getProcurementAnalyticsApi, ProcurementAnalyticsResponse } from '../../api/procurement';
import { usePersistedState } from '../../hooks/usePersistedState';
import ErrorMessage from '../../components/ErrorMessage';
import { CurrencyDisplay } from '../../components/ui/CurrencyDisplay';
import { KpiCard } from '../../components/ui/Card';
import { parseApiError } from '../../utils/apiError';
import { DashboardBars, DashboardDonut, DashboardChartSegment } from '../../components/ui/DashboardCharts';
import { getUnitLabel } from '../../utils/units';

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

export const UniversalReportsPage: React.FC = () => {
  const [period, setPeriod] = usePersistedState('reports.period.v2', '90');
  const [status, setStatus] = usePersistedState('reports.status.v2', '');
  const [report, setReport] = useState<ProcurementAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async () => {
    setError(null);
    setRefreshing(true);
    try {
      const data = await getProcurementAnalyticsApi(period, status || undefined);
      setReport(data);
    } catch (err) {
      setError(parseApiError(err).message || 'تعذر تحميل التقرير الشامل.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, [period, status]);

  const metrics = report?.metrics;

  const departmentSegments: DashboardChartSegment[] = useMemo(() => {
    if (!report?.department_breakdown?.length) return [];
    return report.department_breakdown.slice(0, 6).map((item) => ({
      label: item.name || 'عام',
      value: Number(item.total_value || 0),
    }));
  }, [report?.department_breakdown]);

  const supplierSegments: DashboardChartSegment[] = useMemo(() => {
    if (!report?.supplier_breakdown?.length) return [];
    return report.supplier_breakdown.slice(0, 6).map((item) => ({
      label: item.company_name || 'غير محدد',
      value: Number(item.total_value || 0),
    }));
  }, [report?.supplier_breakdown]);

  const statusSegments: DashboardChartSegment[] = useMemo(() => {
    if (!report?.status_breakdown?.length) return [];
    return report.status_breakdown.map((item) => ({
      label: PURCHASE_ORDER_STATUS_LABELS[item.status] || item.status,
      value: Number(item.count || 0),
    }));
  }, [report?.status_breakdown]);

  const maxDeptSpend = useMemo(
    () => Math.max(...(report?.department_breakdown?.map((d) => Number(d.total_value || 0)) || [0]), 1),
    [report?.department_breakdown],
  );

  const maxSupplierSpend = useMemo(
    () => Math.max(...(report?.supplier_breakdown?.map((s) => Number(s.total_value || 0)) || [0]), 1),
    [report?.supplier_breakdown],
  );

  const handleExportCsv = () => {
    if (!report) return;
    const headers = ['رقم الأمر', 'المورد', 'القسم', 'الحالة', 'الإجمالي (ج.م)', 'تاريخ التحديث'];
    const rows = (report.recent_purchase_orders || []).map((po) => [
      po.po_number,
      po.supplier_name || 'غير محدد',
      po.department_name || 'عام',
      PURCHASE_ORDER_STATUS_LABELS[po.status] || po.status,
      po.grand_total,
      formatDate(po.updated_at),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financial_procurement_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in print-container print-document" dir="rtl">
      {/* ── OFFICIAL PRINT HEADER ── */}
      <div className="hidden print:block mb-4 border-b-2 border-slate-900 pb-3">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-black text-slate-950">شركة اشبيلية للتطوير العقاري والمقاولات</h1>
            <p className="text-xs text-slate-700">تقرير المشتريات والمصروفات والتحليلات المالية المعتمد</p>
          </div>
          <div className="text-left text-xs font-mono text-slate-700">
            <div>تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')}</div>
            <div>الفترة: {period === 'all' ? 'جميع الفترات' : `آخر ${period} يوم`}</div>
          </div>
        </div>
      </div>

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 print:border-b-0 print:pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse" />
            <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
              <span>📈</span> التقارير والتحليلات الشاملة للمشتريات والمالية
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            تحليل فوري وموحد لمؤشرات الأداء المالي، وأوامر الشراء، ومصروفات الأقسام، وحجم تعاملات الموردين.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!report}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <span>📥</span>
            <span>تصدير إكسيل (CSV)</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-800/60 bg-cyan-950/40 px-3.5 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-900/60 transition-colors"
          >
            <span>🖨️</span>
            <span>طباعة التقرير</span>
          </button>

          <button
            type="button"
            onClick={() => void loadReport()}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {error && <ErrorMessage error={error} />}

      {/* ── Filters Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">الفترة الزمنية:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value="30">آخر 30 يوم</option>
              <option value="90">آخر 90 يوم (الربع الحالي)</option>
              <option value="180">آخر 6 أشهر</option>
              <option value="365">آخر سنة مالية</option>
              <option value="all">كل الفترات المسجلة</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">حالة أمر الشراء:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value="">كل الحالات</option>
              <option value="APPROVED_BY_ACCOUNTING">معتمد من الحسابات</option>
              <option value="FINAL_APPROVED">اعتماد نهائي</option>
              <option value="PENDING_ACCOUNTING_REVIEW">بانتظار الحسابات</option>
              <option value="ISSUED">صادر</option>
              <option value="PO_DRAFT">مسودة</option>
              <option value="REJECTED">مرفوض</option>
            </select>
          </div>
        </div>

        {report && (
          <div className="text-[11px] font-mono text-slate-400">
            آخر تحديث للبيانات: <strong className="text-slate-200">{new Date().toLocaleTimeString('ar-EG')}</strong>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/40 p-8 text-cyan-300">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <span className="text-xs font-bold text-slate-400">جاري تجميع وحساب المؤشرات المالية والتحليلية...</span>
          </div>
        </div>
      ) : (
        <>
          {/* ── Executive & Financial KPI Grid ── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              title="إجمالي الإنفاق والمشتريات"
              value={
                <div className="flex items-baseline gap-1">
                  <CurrencyDisplay amount={metrics?.total_value || '0'} className="text-emerald-300" />
                </div>
              }
              accentColor="emerald"
              subtext="إجمالي قيمة أوامر الشراء للفترة"
            />
            <KpiCard
              title="عدد أوامر الشراء"
              value={formatNumber(metrics?.purchase_orders_count || 0)}
              accentColor="cyan"
              subtext={`${formatNumber(metrics?.pending_accounting_count || 0)} بانتظار الحسابات`}
            />
            <KpiCard
              title="الطلبات المعتمدة"
              value={formatNumber(metrics?.approved_requests_count || 0)}
              accentColor="indigo"
              subtext="طلبات شراء جاهزة أو محولة لأوامر"
            />
            <KpiCard
              title="متوسط قيمة أمر الشراء"
              value={
                <div className="flex items-baseline gap-1">
                  <CurrencyDisplay amount={metrics?.average_value || '0'} className="text-cyan-300" />
                </div>
              }
              accentColor="cyan"
              subtext="معدل قيمة كل أمر صادر"
            />
            <KpiCard
              title="الموردين النشطين"
              value={formatNumber(metrics?.active_supplier_count || report?.supplier_breakdown?.length || 0)}
              accentColor="amber"
              subtext="تم إصدار أوامر شراء لهم"
            />
            <KpiCard
              title="أوامر متأخرة أو متوقفة"
              value={formatNumber(metrics?.late_delivery_count || metrics?.returned_count || 0)}
              accentColor={(metrics?.late_delivery_count || metrics?.returned_count) ? 'rose' : 'slate'}
              subtext={(metrics?.late_delivery_count || metrics?.returned_count) ? 'تتطلب متابعة' : 'لا توجد تأخيرات'}
            />
          </div>

          {/* ── Visual Charts Section ── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Department Breakdown Donut */}
            <DashboardDonut
              title="🏢 توزيع الإنفاق حسب الأقسام"
              subtitle="نسبة مشاركة كل قسم من إجمالي ميزانية المشتريات"
              segments={departmentSegments}
              centerLabel="إجمالي المصروف"
              centerValue={`${formatNumber(Number(metrics?.total_value || 0))} ج.م`}
            />

            {/* Top Suppliers Donut / Bar */}
            <DashboardBars
              title="🤝 كبار الموردين وحجم المشتريات"
              subtitle="أكبر الموردين من حيث إجمالي قيمة أوامر الشراء الصادرة"
              segments={supplierSegments}
              unit="ج.م"
            />
          </div>

          {/* ── Detailed Tables Section ── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Department Spending Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <h2 className="text-sm font-black text-slate-100 flex items-center gap-2">
                  <span>🏗️</span> تفاصيل إنفاق الأقسام والمشاريع
                </h2>
                <span className="text-xs text-slate-400">
                  إجمالي الأقسام: <strong>{report?.department_breakdown?.length || 0}</strong>
                </span>
              </div>
              {report?.department_breakdown?.length ? (
                <div className="space-y-3.5">
                  {report.department_breakdown.map((dept, index) => {
                    const spend = Number(dept.total_value || 0);
                    return (
                      <div key={index} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="font-bold text-slate-200 flex items-center gap-1.5">
                            <span className="text-slate-500 font-mono text-[11px]">#{index + 1}</span>
                            <span>{dept.name || 'عام'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400 text-[11px]">{formatNumber(dept.count)} أمر شراء</span>
                            <strong className="font-mono text-emerald-300 font-bold">
                              {formatCurrency(spend)} ج.م
                            </strong>
                          </div>
                        </div>
                        <ProgressBar value={spend} max={maxDeptSpend} color="bg-cyan-400" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState label="إنفاق الأقسام" />
              )}
            </div>

            {/* Top Suppliers Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <h2 className="text-sm font-black text-slate-100 flex items-center gap-2">
                  <span>🤝</span> كبار الموردين وحجم التعاملات
                </h2>
                <span className="text-xs text-slate-400">
                  إجمالي الموردين: <strong>{report?.supplier_breakdown?.length || 0}</strong>
                </span>
              </div>
              {report?.supplier_breakdown?.length ? (
                <div className="space-y-3.5">
                  {report.supplier_breakdown.map((sup, index) => {
                    const spend = Number(sup.total_value || 0);
                    return (
                      <div key={index} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="font-bold text-slate-200 flex items-center gap-1.5">
                            <span className="text-slate-500 font-mono text-[11px]">#{index + 1}</span>
                            <span>{sup.company_name || 'غير محدد'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400 text-[11px]">{formatNumber(sup.count)} أمر شراء</span>
                            <strong className="font-mono text-amber-300 font-bold">
                              {formatCurrency(spend)} ج.م
                            </strong>
                          </div>
                        </div>
                        <ProgressBar value={spend} max={maxSupplierSpend} color="bg-amber-400" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState label="تعاملات الموردين" />
              )}
            </div>
          </div>

          {/* ── Recent Purchase Orders Table ── */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h2 className="text-sm font-black text-slate-100 flex items-center gap-2">
                  <span>📋</span> أحدث أوامر الشراء الصادرة ضمن نطاق التقرير
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">تفاصيل الأوامر، والجهات المستفيدة، وحالات الاعتماد والبنود المطلوبة</p>
              </div>
              <span className="text-xs text-slate-400">
                المعروض: <strong>{report?.recent_purchase_orders?.length || 0}</strong> أمر
              </span>
            </div>

            {report?.recent_purchase_orders?.length ? (
              <>
                {/* Mobile View: Cards */}
                <div className="block md:hidden space-y-3">
                  {report.recent_purchase_orders.map((po) => {
                    const firstItem = po.items?.[0];
                    const otherItemsCount = (po.items?.length || 0) - 1;

                    return (
                      <div key={po.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono font-bold text-cyan-300 text-xs block">
                              {po.po_number}
                            </span>
                            <span className="font-bold text-slate-100 text-xs block mt-0.5">
                              {po.supplier_name || 'غير محدد'}
                            </span>
                          </div>
                          <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold shrink-0 ${statusTone(po.status)}`}>
                            {PURCHASE_ORDER_STATUS_LABELS[po.status] || po.status}
                          </span>
                        </div>

                        {firstItem && (
                          <div className="bg-slate-950/70 rounded-lg p-2 border border-slate-800/80 text-xs space-y-0.5">
                            <span className="text-slate-300 font-medium block">
                              {firstItem.item_description}
                            </span>
                            <span className="text-[11px] text-amber-300 font-mono">
                              {firstItem.quantity} {getUnitLabel(firstItem.uom)}
                              {otherItemsCount > 0 && ` (+${otherItemsCount} بنود أخرى)`}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800 text-slate-400">
                          <span>{po.department_name || 'عام'}</span>
                          <span className="font-mono font-bold text-emerald-300">
                            {formatCurrency(po.grand_total)} ج.م
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop/Tablet View: Table */}
                <div className="hidden md:block overflow-x-auto -mx-2 sm:mx-0">
                  <table className="min-w-[850px] w-full text-right text-xs">
                    <thead className="bg-slate-900 text-slate-300">
                      <tr>
                        <th className="px-4 py-3 whitespace-nowrap font-bold">رقم الأمر</th>
                        <th className="px-4 py-3 whitespace-nowrap font-bold">المورد</th>
                        <th className="px-4 py-3 whitespace-nowrap font-bold">القسم المستفيد</th>
                        <th className="px-4 py-3 whitespace-nowrap font-bold">الأصناف المطلوبة</th>
                        <th className="px-4 py-3 whitespace-nowrap font-bold">الحالة</th>
                        <th className="px-4 py-3 whitespace-nowrap font-bold">الإجمالي (ج.م)</th>
                        <th className="px-4 py-3 whitespace-nowrap font-bold">تاريخ التحديث</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.recent_purchase_orders.map((po) => {
                        const firstItem = po.items?.[0];
                        const otherItemsCount = (po.items?.length || 0) - 1;

                        return (
                          <tr key={po.id} className="border-t border-slate-800 hover:bg-slate-900/40 text-slate-200">
                            <td className="px-4 py-3 font-mono font-bold text-cyan-300 whitespace-nowrap">
                              {po.po_number}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-100 whitespace-nowrap">
                              {po.supplier_name || 'غير محدد'}
                            </td>
                            <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                              {po.department_name || 'عام'}
                            </td>
                            <td className="px-4 py-3 max-w-[240px]">
                              {firstItem ? (
                                <div>
                                  <span className="font-bold text-slate-200 truncate block">
                                    {firstItem.item_description}
                                  </span>
                                  <span className="text-[11px] text-amber-300 font-mono">
                                    {firstItem.quantity} {getUnitLabel(firstItem.uom)}
                                    {otherItemsCount > 0 && ` (+${otherItemsCount} بنود أخرى)`}
                                  </span>
                                </div>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold ${statusTone(po.status)}`}>
                                {PURCHASE_ORDER_STATUS_LABELS[po.status] || po.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-emerald-300 whitespace-nowrap">
                              {formatCurrency(po.grand_total)} ج.م
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">
                              {formatDate(po.updated_at)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <EmptyState label="أوامر الشراء" />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default UniversalReportsPage;
