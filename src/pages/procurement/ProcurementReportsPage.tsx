import React, { useEffect, useState } from 'react';
import { getProcurementAnalyticsApi, ProcurementAnalyticsResponse } from '../../api/procurement';
import { usePersistedState } from '../../hooks/usePersistedState';
import { CurrencyDisplay } from '../../components/ui/CurrencyDisplay';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import ReportPrintModal from '../../components/procurement/ReportPrintModal';
import { parseApiError } from '../../utils/apiError';

export const ProcurementReportsPage: React.FC = () => {
  const [data, setData] = useState<ProcurementAnalyticsResponse | null>(null);
  const [period, setPeriod] = usePersistedState<string>('procurement-report.period.v1', '90');
  const [statusFilter, setStatusFilter] = usePersistedState<string>('procurement-report.status.v1', '');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProcurementAnalyticsApi(period, statusFilter || undefined);
      setData(res);
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period, statusFilter]);

  const handleExportCsv = () => {
    if (!data) return;
    const headers = ['رقم الأمر', 'المورد', 'القسم', 'الحالة', 'الإجمالي (ج.م)'];
    const rows = data.recent_purchase_orders.map(po => [
      po.po_number,
      po.supplier_name || 'غير محدد',
      po.department_name || 'عام',
      po.status,
      po.grand_total,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `procurement_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="procurement-reference-page space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <h1 className="text-xl font-bold text-slate-100">التقارير والتحليلات الفورية</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            تحليل شامل لأوامر الشراء، أداء الموردين، الإنفاق حسب الأقسام والتكلفة المترتبة
          </p>
        </div>

        <div className="flex items-center space-x-2 space-x-reverse">
          <button
            onClick={handleExportCsv}
            disabled={!data}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-2 rounded-lg transition-colors border border-slate-700 flex items-center gap-1.5 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            تصدير CSV
          </button>
          <button
            onClick={() => setIsPrintModalOpen(true)}
            disabled={!data}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-cyan-600/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            معاينة وطباعة التقرير
          </button>
        </div>
      </div>

      {error && <ErrorMessage error={error} onRetry={() => void loadData()} />}

      {/* تصفية Section */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3 space-x-reverse">
          <span className="text-xs font-semibold text-slate-300">الفترة الزمنية:</span>
          <div className="flex items-center space-x-1 space-x-reverse bg-slate-900 p-1 rounded-lg border border-slate-800">
            {[
              ['30', '30 يوم'],
              ['90', '90 يوم'],
              ['365', 'سنة كاملة'],
              ['all', 'الكل']
            ].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setPeriod(val)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  period === val ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2 space-x-reverse">
          <span className="text-xs font-semibold text-slate-300">فلترة حسب الحالة:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">جميع الحالات</option>
            <option value="PO_DRAFT">مسودة PO_DRAFT</option>
            <option value="PENDING_ACCOUNTING_REVIEW">مراجعة المحاسبة</option>
            <option value="RETURNED_TO_PROCUREMENT">معادة للمشتريات</option>
            <option value="APPROVED_BY_ACCOUNTING">معتمدة من المحاسبة</option>
            <option value="FINAL_APPROVED">معتمدة نهائياً FINAL_APPROVED</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="جاري تحليل وحساب مؤشرات المشتريات..." />
      ) : data ? (
        <div className="space-y-6">
          
          {/* KPI Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400">إجمالي قيم التوريد</div>
              <div className="mt-2"><CurrencyDisplay amount={data.metrics.total_value} amountClassName="text-xl font-extrabold text-cyan-400" currencyClassName="text-xs text-slate-400 mr-1" /></div>
              <div className="text-[11px] text-slate-500 mt-1">المبلغ المالي الكلي لأوامر الشراء</div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400">عدد أوامر الشراء</div>
              <div className="text-xl font-extrabold text-emerald-400 font-mono mt-2">{data.metrics.purchase_orders_count}</div>
              <div className="mt-1 text-[11px] text-slate-500">متوسط: <CurrencyDisplay amount={data.metrics.average_value} amountClassName="text-slate-400" currencyClassName="text-[10px] text-slate-500 mr-1" />/أمر</div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400">الطلبات المعتمدة الجاهزة</div>
              <div className="text-xl font-extrabold text-amber-400 font-mono mt-2">{data.metrics.approved_requests_count}</div>
              <div className="text-[11px] text-slate-500 mt-1">طلبات بانتظار تحويلها لأوامر شراء</div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400">الموردون النشطون</div>
              <div className="text-xl font-extrabold text-purple-400 font-mono mt-2">{data.metrics.active_supplier_count}</div>
              <div className="text-[11px] text-slate-500 mt-1">إجمالي الموردين: {data.metrics.supplier_count}</div>
            </div>
          </div>

          {/* القسم Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">توزيع الإنفاق حسب الأقسام</h3>
              <div className="space-y-3">
                {data.department_breakdown.map((dept, idx) => {
                  const maxVal = Math.max(...data.department_breakdown.map(d => parseFloat(d.total_value) || 0), 0);
                  const pct = maxVal > 0 ? Math.min(100, Math.round(((parseFloat(dept.total_value) || 0) / maxVal) * 100)) : 0;

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-200">{dept.name || 'عام'}</span>
                        <span className="font-mono text-cyan-400">{dept.total_value} ج.م ({dept.count} أمر)</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* المورد Share Breakdown */}
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">أبرز الموردين حظوة بالطلب</h3>
              <div className="space-y-3">
                {data.supplier_breakdown.map((sup, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-900 rounded-lg border border-slate-800/80">
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className="w-7 h-7 rounded bg-purple-500/20 text-purple-400 font-mono text-xs font-bold flex items-center justify-center">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200">{sup.company_name || 'غير محدد'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{sup.code || '—'}</div>
                      </div>
                    </div>
                    <div className="text-left font-mono">
                      <div className="text-xs font-bold text-emerald-400">{sup.total_value} ج.م</div>
                      <div className="text-[10px] text-slate-400">{sup.count} أمر شراء</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Report طباعة Modal */}
          <ReportPrintModal
            data={data}
            isOpen={isPrintModalOpen}
            onClose={() => setIsPrintModalOpen(false)}
          />

        </div>
      ) : null}
    </div>
  );
};

export default ProcurementReportsPage;
