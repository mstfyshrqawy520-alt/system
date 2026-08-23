import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAccountingPurchaseOrdersApi, getAccountingPurchaseOrderApi } from '../../api/accounting';
import { getDirectAccountingPurchaseRequestsApi } from '../../api/accountingPurchaseRequests';
import { getApprovedReceiptsForAccountingApi, getSupplierAccountsApi, ApprovedReceipt, SupplierAccountSummary } from '../../api/supplierFinance';
import { PurchaseOrder } from '../../types/purchaseOrder';
import { PurchaseRequest } from '../../types/purchaseRequest';
import { Button } from '../../components/ui/Button';
import { KpiCard } from '../../components/ui/Card';
import { CurrencyDisplay } from '../../components/ui/CurrencyDisplay';
import PurchaseOrderPrintModal from '../../components/procurement/PurchaseOrderPrintModal';
import { DashboardBars, DashboardDonut } from '../../components/ui/DashboardCharts';

import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';

export const AccountingDashboardPage: React.FC = () => {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [directPrs, setDirectPrs] = useState<PurchaseRequest[]>([]);
  const [receipts, setReceipts] = useState<ApprovedReceipt[]>([]);
  const [accounts, setAccounts] = useState<SupplierAccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [openingPoId, setOpeningPoId] = useState<number | null>(null);

  const openPurchaseOrder = async (po: PurchaseOrder) => {
    setOpeningPoId(po.id);
    try {
      const fullPo = await getAccountingPurchaseOrderApi(po.id);
      setSelectedPo(fullPo);
    } catch {
      setSelectedPo(po);
    } finally {
      setOpeningPoId(null);
    }
  };

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [posData, directData, receiptsData, accountsData] = await Promise.all([
        getAccountingPurchaseOrdersApi().catch(() => []),
        getDirectAccountingPurchaseRequestsApi().catch(() => []),
        getApprovedReceiptsForAccountingApi().catch(() => []),
        getSupplierAccountsApi().catch(() => []),
      ]);
      setPos(posData);
      setDirectPrs(directData);
      setReceipts(receiptsData);
      setAccounts(accountsData);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void loadData(false);
  }, []);

  useRealtimeRefresh(() => { void loadData(true); });

  if (loading) {
    return <div className="text-cyan-400 animate-pulse text-xs p-6" dir="rtl">جاري تحميل بيانات لوحة المحاسبة...</div>;
  }

  const pendingReviewPos = pos.filter(x => x.status === 'PENDING_ACCOUNTING_REVIEW');
  const issuedPos = pos.filter(x => x.status === 'ISSUED');
  const totalIssuedEgp = issuedPos.reduce((acc, x) => acc + Number(x.grand_total || 0), 0);
  const upcomingDeliveriesCount = pos.filter(x => x.delivery_status === 'NOT_STARTED' || x.delivery_status === 'PARTIAL').length;
  const overdueOrIndebtedAccounts = accounts.filter(a => a.balance > 0);
  const totalAccountingTasks = directPrs.length + pendingReviewPos.length + receipts.length;

  const deliverySegments = [
    { label: 'تم الإصدار', value: issuedPos.length, color: '#22c55e' },
    { label: 'قيد التوريد', value: upcomingDeliveriesCount, color: '#f59e0b' },
    { label: 'مكتملة', value: pos.filter(x => x.delivery_status === 'COMPLETE').length, color: '#06b6d4' },
    { label: 'متأخرة', value: pos.filter(x => x.delivery_status === 'LATE').length, color: '#f43f5e' },
  ];
  // القسم spend breakdown
  const deptSpendMap = pos.reduce((acc: Record<string, number>, p) => {
    const deptName = p.purchase_request?.department?.name || 'عام';
    acc[deptName] = (acc[deptName] || 0) + Number(p.grand_total || 0);
    return acc;
  }, {});

  // المورد spend breakdown
  const supplierSpendMap = pos.reduce((acc: Record<string, number>, p) => {
    const supName = p.supplier?.company_name || 'غير محدد';
    acc[supName] = (acc[supName] || 0) + Number(p.grand_total || 0);
    return acc;
  }, {});
  const departmentSegments = Object.entries(deptSpendMap).map(([label, value]) => ({ label, value }));
  const supplierSegments = Object.entries(supplierSpendMap).map(([label, value]) => ({ label, value }));

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <span>📊</span> لوحة المحاسبة والرقابة المالية
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              الاطلاع على الحركات المالية والتحليلات والمهام المحاسبية المطلوبة بـ (EGP / ج.م).
            </p>
          </div>
          <span className="bg-blue-900/40 text-blue-300 border border-blue-700/50 px-3 py-1.5 rounded-lg text-xs font-medium">
            🏦 الإدارة المالية والمحاسبة
          </span>
        </div>
      </div>

      {/* ── صندوق المهام والإجراءات المالية المطلوبة منك الآن (Action Inbox) ── */}
      <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-r from-slate-900 via-emerald-950/30 to-slate-900 p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-emerald-900/40 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 text-lg font-black shadow-inner">
              ⚡
            </span>
            <div>
              <h2 className="text-base font-black text-slate-100 flex items-center gap-2">
                المهام والإجراءات المالية المطلوبة منك الآن
                {totalAccountingTasks > 0 && (
                  <span className="rounded-full bg-emerald-500 text-slate-950 px-2.5 py-0.5 text-xs font-black">
                    {totalAccountingTasks} إجراء مالي معلق
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                قائمة العمليات المالية التي تتطلب مراجعتك أو اعتمادك أو تسجيل الفواتير والسداد.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Action Card 1: Direct PRs */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 flex flex-col justify-between gap-2.5 hover:border-cyan-500/60 transition-colors">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold">طلبات شراء مباشرة</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${directPrs.length > 0 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-400'}`}>
                  {directPrs.length} بانتظار الاعتماد
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                طلبات شراء بالمسار المباشر تحتاج مراجعة واعتماد الحسابات.
              </p>
            </div>
            <Link to="/accounting/purchase-requests">
              <Button variant="secondary" size="sm" className="w-full text-xs font-bold border-cyan-800/60 text-cyan-200 hover:bg-cyan-950">
                مراجعة الطلبات المباشرة ←
              </Button>
            </Link>
          </div>

          {/* Action Card 2: POs pending review */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 flex flex-col justify-between gap-2.5 hover:border-amber-500/60 transition-colors">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold">أوامر شراء للتدقيق</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${pendingReviewPos.length > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}`}>
                  {pendingReviewPos.length} بانتظار التدقيق
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                أوامر شراء تم إنشاؤها وتتطلب مراجعة الشروط المالية.
              </p>
            </div>
            <Link to="/accounting/purchase-orders">
              <Button variant="secondary" size="sm" className="w-full text-xs font-bold border-amber-800/60 text-amber-200 hover:bg-amber-950">
                تدقيق أوامر الشراء ←
              </Button>
            </Link>
          </div>

          {/* Action Card 3: Approved receipts for invoicing */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 flex flex-col justify-between gap-2.5 hover:border-emerald-500/60 transition-colors">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold">إذونات استلام جاهزة للفوترة</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${receipts.length > 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}`}>
                  {receipts.length} جاهز للفوترة
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                بضائع تم استلامها واعتمادها بالموقع وجاهزة لتسجيل فاتورة المورد.
              </p>
            </div>
            <Link to="/accounting/supplier-payments">
              <Button variant="primary" size="sm" className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-slate-950">
                تسجيل الفواتير والمصروف ←
              </Button>
            </Link>
          </div>

          {/* Action Card 4: Supplier balances and payment */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 flex flex-col justify-between gap-2.5 hover:border-indigo-500/60 transition-colors">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold">حسابات ومديونيات الموردين</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${overdueOrIndebtedAccounts.length > 0 ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'bg-slate-800 text-slate-400'}`}>
                  {overdueOrIndebtedAccounts.length} حساب به مديونية
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                كشوف حسابات الموردين وتسجيل الدفعات البنكية والنقدية.
              </p>
            </div>
            <Link to="/accounting/supplier-accounts">
              <Button variant="secondary" size="sm" className="w-full text-xs font-bold border-indigo-800/60 text-indigo-200 hover:bg-indigo-950">
                فتح كشوف الحسابات ←
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/accounting/purchase-orders">
          <KpiCard
            title="إجمالي أوامر الشراء المصدرة"
            value={pos.length}
            accentColor="cyan"
            icon={<span className="text-sm">📋</span>}
          />
        </Link>
        <Link to="/accounting/purchase-orders">
          <KpiCard
            title="إجمالي القيم المشتراة (EGP)"
            value={<CurrencyDisplay amount={totalIssuedEgp} amountClassName="text-base font-bold font-mono text-emerald-400" />}
            accentColor="emerald"
            icon={<span className="text-sm">💵</span>}
          />
        </Link>
        <Link to="/accounting/purchase-orders">
          <KpiCard
            title="توريدات قيد الانتظار والمتابعة"
            value={upcomingDeliveriesCount}
            accentColor="amber"
            icon={<span className="text-sm">🚚</span>}
          />
        </Link>
        <Link to="/accounting/purchase-orders">
          <KpiCard
            title="عدد الموردين المتدفق لهم"
            value={Object.keys(supplierSpendMap).length}
            accentColor="purple"
            icon={<span className="text-sm">🏬</span>}
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <DashboardDonut title="حالة أوامر الشراء" subtitle="التوزيع التشغيلي للحركات المالية" segments={deliverySegments} centerLabel="الأوامر" centerValue={pos.length} />
        <DashboardBars title="الإنفاق حسب القسم" subtitle="قيمة الأوامر المصدرة" segments={departmentSegments} unit="ج.م" />
        <DashboardBars title="الإنفاق حسب المورد" subtitle="أعلى الموردين قيمة" segments={supplierSegments} unit="ج.م" />
      </div>

      {/* Spend Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spend by القسم */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">توزيع الإنفاق حسب الأقسام (EGP)</h3>
          <div className="space-y-3 text-xs">
            {Object.entries(deptSpendMap).map(([dept, amount], idx) => (
              <div key={idx} className="flex justify-between items-center p-2 rounded bg-slate-900 border border-slate-800">
                <span className="font-semibold text-slate-300">{dept}</span>
                <span className="font-mono font-bold text-cyan-400">{amount.toFixed(2)} ج.م</span>
              </div>
            ))}
          </div>
        </div>

        {/* Spend by المورد */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">توزيع الإنفاق حسب الموردين (EGP)</h3>
          <div className="space-y-3 text-xs">
            {Object.entries(supplierSpendMap).slice(0, 5).map(([supplier, amount], idx) => (
              <div key={idx} className="flex justify-between items-center p-2 rounded bg-slate-900 border border-slate-800">
                <span className="font-semibold text-slate-300">{supplier}</span>
                <span className="font-mono font-bold text-emerald-400">{amount.toFixed(2)} ج.م</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent PO Issues List */}
      <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">أحدث أوامر الشراء المصدرة</h3>
          <Link to="/accounting/purchase-orders" className="text-xs text-cyan-400 hover:underline">
            عرض الكل &rarr;
          </Link>
        </div>
        <div className="divide-y divide-slate-800 text-xs">
          {pos.slice(0, 5).map(p => (
            <div key={p.id} className="py-2.5 flex justify-between items-center">
              <div>
                <button type="button" onClick={() => void openPurchaseOrder(p)} disabled={openingPoId === p.id} className="font-mono font-bold text-cyan-400 hover:underline disabled:opacity-60">
                  {openingPoId === p.id ? 'جاري الفتح...' : p.po_number}
                </button>
                <span className="text-slate-400 mr-3">{p.supplier?.company_name || 'مورد'}</span>
              </div>
              <div className="font-mono font-bold text-emerald-400">
                {Number(p.grand_total || 0).toFixed(2)} ج.م
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedPo && (
        <PurchaseOrderPrintModal po={selectedPo} isOpen={true} onClose={() => setSelectedPo(null)} />
      )}
    </div>
  );
};

export default AccountingDashboardPage;
