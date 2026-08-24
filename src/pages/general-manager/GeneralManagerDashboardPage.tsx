import React, { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { getGeneralManagerPurchaseOrdersApi, getGeneralManagerPurchaseRequestsApi } from '../../api/generalManager';
import { PurchaseOrder } from '../../types/purchaseOrder';
import { PurchaseRequest } from '../../types/purchaseRequest';
import { Button } from '../../components/ui/Button';
import { KpiCard } from '../../components/ui/Card';
import { CurrencyDisplay } from '../../components/ui/CurrencyDisplay';
import { DashboardBars, DashboardDonut } from '../../components/ui/DashboardCharts';
import { getDefaultDateFrom, getTodayInputDate } from '../../utils/dateFilters';

import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';

export const GeneralManagerDashboardPage: React.FC = () => {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const today = getTodayInputDate();
  const defaultDateFrom = getDefaultDateFrom();
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(today);
  const [departmentId, setDepartmentId] = useState('');
  const [supplierId, setSupplierId] = useState('');

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [posData, reqsData] = await Promise.all([
        getGeneralManagerPurchaseOrdersApi().catch(() => []),
        getGeneralManagerPurchaseRequestsApi().catch(() => []),
      ]);
      setPos(posData);
      setRequests(reqsData);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void loadData(false);
  }, []);

  useRealtimeRefresh(() => { void loadData(true); });

  const filteredPos = useMemo(() => {
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    return pos.filter((po) => {
      const createdAt = po.created_at ? new Date(po.created_at) : null;
      const currentDepartmentId = po.department?.id ?? po.purchase_request?.department?.id;
      const currentSupplierId = po.supplier_id ?? po.supplier?.id;
      const matchesFrom = !from || (!!createdAt && createdAt >= from);
      const matchesTo = !to || (!!createdAt && createdAt <= to);
      const matchesDepartment = !departmentId || String(currentDepartmentId) === departmentId;
      const matchesSupplier = !supplierId || String(currentSupplierId) === supplierId;
      return matchesFrom && matchesTo && matchesDepartment && matchesSupplier;
    });
  }, [pos, dateFrom, dateTo, departmentId, supplierId]);

  const departmentOptions = useMemo(() => {
    const options = new Map<string, string>();
    pos.forEach((po) => {
      const id = po.department?.id ?? po.purchase_request?.department?.id;
      const name = po.department?.name || po.purchase_request?.department?.name;
      if (id && name) options.set(String(id), name);
    });
    return Array.from(options, ([id, name]) => ({ id, name }));
  }, [pos]);

  const supplierOptions = useMemo(() => {
    const options = new Map<string, string>();
    pos.forEach((po) => {
      const id = po.supplier_id ?? po.supplier?.id;
      const name = po.supplier?.company_name;
      if (id && name) options.set(String(id), name);
    });
    return Array.from(options, ([id, name]) => ({ id, name }));
  }, [pos]);

  if (loading) {
    return <div className="text-cyan-400 animate-pulse text-xs p-6" dir="rtl">جاري تحميل بيانات لوحة الإدارة العامة...</div>;
  }

  const totalValue = filteredPos.reduce((acc, x) => acc + Number(x.grand_total || 0), 0);
  const pendingGmRequestsCount = requests.length;

  // القسم Spend Breakdown
  const deptSpendMap = filteredPos.reduce((acc: Record<string, number>, p) => {
    const deptName = p.purchase_request?.department?.name || 'عام';
    acc[deptName] = (acc[deptName] || 0) + Number(p.grand_total || 0);
    return acc;
  }, {});

  // المورد Share Breakdown
  const supplierSpendMap = filteredPos.reduce((acc: Record<string, number>, p) => {
    const supName = p.supplier?.company_name || 'غير محدد';
    acc[supName] = (acc[supName] || 0) + Number(p.grand_total || 0);
    return acc;
  }, {});
  const statusSegments = [
    { label: 'تم الإصدار', value: filteredPos.filter((po) => po.status === 'ISSUED').length, color: '#22c55e' },
    { label: 'في انتظار الحسابات', value: filteredPos.filter((po) => po.status === 'PENDING_ACCOUNTING_REVIEW').length, color: '#f59e0b' },
    { label: 'معاد للمشتريات', value: filteredPos.filter((po) => po.status === 'RETURNED_TO_PROCUREMENT').length, color: '#fb923c' },
    { label: 'معتمد نهائيًا', value: filteredPos.filter((po) => po.status === 'FINAL_APPROVED').length, color: '#06b6d4' },
  ];

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Executive Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <span>👑</span> لوحة المدير العام التنفيذية
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              متابعة التدفقات التنفيذية والقرارات المعلقة وأوامر الشراء المصدرة وتقارير الإنفاق بـ (EGP / ج.م).
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 bg-blue-900/40 border border-blue-700/50 rounded-lg px-3 py-1.5">
            <span className="text-xs text-blue-300 font-medium">🛡️ الإدارة التنفيذية العليا</span>
          </div>
        </div>
      </div>

      {/* ── صندوق القرارات التنفيذية المطلوبة منك الآن (Executive Action Inbox) ── */}
      <div className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-amber-900/40 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600/30 border border-amber-500/50 text-amber-300 text-lg font-black shadow-inner">
              ⚡
            </span>
            <div>
              <h2 className="text-base font-black text-slate-100 flex items-center gap-2">
                القرارات والإجراءات التنفيذية المطلوبة منك الآن
                {pendingGmRequestsCount > 0 && (
                  <span className="rounded-full bg-amber-500 text-slate-950 px-2.5 py-0.5 text-xs font-black">
                    {pendingGmRequestsCount} طلب بانتظار قرارك
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                طلبات الشراء وعروض الأسعار التي تتطلب اعتماد أو قرار المدير العام للبدء في التنفيذ.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* Card 1: Pending GM PRs */}
          <div className="rounded-xl border border-amber-800/60 bg-slate-950/80 p-4 flex flex-col justify-between gap-3 hover:border-amber-500/80 transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                  <span>📝</span> طلبات الشراء بانتظار الاعتماد
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${pendingGmRequestsCount > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}`}>
                  {pendingGmRequestsCount} طلب
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 leading-5">
                طلبات الشراء المحالة للإدارة العامة للاطلاع والموافقة أو الرفض أو تعديل الكميات والبنود.
              </p>
            </div>
            <RouterLink to="/general-manager/purchase-requests">
              <Button variant="primary" size="sm" className="w-full font-bold bg-amber-600 hover:bg-amber-500 text-slate-950">
                مراجعة واتخاذ القرار في الطلبات ←
              </Button>
            </RouterLink>
          </div>

          {/* Card 2: Executive Quotes Decision */}
          <div className="rounded-xl border border-indigo-800/60 bg-slate-950/80 p-4 flex flex-col justify-between gap-3 hover:border-indigo-500/80 transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                  <span>⚖️</span> البت في عروض الأسعار والترسية
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  قرار الترسية
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 leading-5">
                المقارنة بين عروض أسعار الموردين واختيار العرض الأنسب لإصدار أمر الشراء.
              </p>
            </div>
            <RouterLink to="/general-manager/purchase-quotes">
              <Button variant="secondary" size="sm" className="w-full font-bold border-indigo-800/60 text-indigo-200 hover:bg-indigo-950">
                شاشة البت في عروض الأسعار ←
              </Button>
            </RouterLink>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="فلاتر لوحة المدير العام">
        <label className="text-xs text-slate-400">
          من تاريخ
          <input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400" />
        </label>
        <label className="text-xs text-slate-400">
          إلى تاريخ
          <input type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400" />
        </label>
        <label className="text-xs text-slate-400">
          القسم
          <select value={departmentId} onChange={event => setDepartmentId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400">
            <option value="">كل الأقسام</option>
            {departmentOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-400">
          المورد
          <select value={supplierId} onChange={event => setSupplierId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400">
            <option value="">كل الموردين</option>
            {supplierOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => { setDateFrom(defaultDateFrom); setDateTo(today); setDepartmentId(''); setSupplierId(''); }} className="self-end rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-500 hover:text-cyan-300">
          إعادة ضبط الفلاتر
        </button>
      </div>

      {/* KPI Executive Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <RouterLink to="/general-manager/purchase-orders">
          <KpiCard
            title="إجمالي أوامر الشراء المصدرة"
            value={filteredPos.length}
            accentColor="cyan"
            icon={<span className="text-sm">📋</span>}
          />
        </RouterLink>
        <RouterLink to="/general-manager/purchase-orders">
          <KpiCard
            title="إجمالي قيم المشتريات المعتمدة (EGP)"
            value={<CurrencyDisplay amount={totalValue} amountClassName="text-base font-bold font-mono text-emerald-400" />}
            accentColor="emerald"
            icon={<span className="text-sm">💵</span>}
          />
        </RouterLink>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <DashboardDonut title="حالة أوامر الشراء" subtitle="الملخص التنفيذي بعد تطبيق الفلاتر" segments={statusSegments} centerLabel="الأوامر" centerValue={filteredPos.length} />
        <DashboardBars title="الإنفاق حسب القسم" subtitle="القيم الحالية بالمصري" segments={Object.entries(deptSpendMap).map(([label, value]) => ({ label, value }))} unit="ج.م" />
        <DashboardBars title="الإنفاق حسب المورد" subtitle="أعلى الموردين في النطاق الحالي" segments={Object.entries(supplierSpendMap).map(([label, value]) => ({ label, value }))} unit="ج.م" />
      </div>

      {/* Spend Breakdown & Executive Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spend by القسم */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">توزيع الإنفاق حسب الأقسام (EGP)</h3>
          <div className="space-y-3 text-xs">
            {Object.entries(deptSpendMap).map(([dept, amount], idx) => (
              <div key={idx} className="flex justify-between items-center p-2.5 rounded bg-slate-900 border border-slate-800">
                <span className="font-semibold text-slate-300">{dept}</span>
                <span className="font-mono font-bold text-cyan-400">{amount.toFixed(2)} ج.م</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top الموردون */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">أبرز الموردين تعاملاً (EGP)</h3>
          <div className="space-y-3 text-xs">
            {Object.entries(supplierSpendMap).slice(0, 5).map(([supplier, amount], idx) => (
              <div key={idx} className="flex justify-between items-center p-2.5 rounded bg-slate-900 border border-slate-800">
                <span className="font-semibold text-slate-300">{supplier}</span>
                <span className="font-mono font-bold text-emerald-400">{amount.toFixed(2)} ج.م</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Executive الإجراءات Bar */}
      <div className="flex gap-4 pt-4 border-t border-slate-800 flex-wrap">
        <RouterLink to="/general-manager/purchase-orders">
          <button className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg text-xs font-bold transition-colors">
            عرض كافة أوامر الشراء المعتمدة &rarr;
          </button>
        </RouterLink>
        <RouterLink to="/general-manager/reports">
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-colors">
            📈 تقارير الإنفاق التفصيلية
          </button>
        </RouterLink>
      </div>
    </div>
  );
};

export default GeneralManagerDashboardPage;
