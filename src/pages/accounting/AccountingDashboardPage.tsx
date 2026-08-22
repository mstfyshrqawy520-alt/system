import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAccountingPurchaseOrdersApi, getAccountingPurchaseOrderApi } from '../../api/accounting';
import { PurchaseOrder } from '../../types/purchaseOrder';
import { KpiCard } from '../../components/ui/Card';
import { CurrencyDisplay } from '../../components/ui/CurrencyDisplay';
import PurchaseOrderPrintModal from '../../components/procurement/PurchaseOrderPrintModal';
import { DashboardBars, DashboardDonut } from '../../components/ui/DashboardCharts';

export const AccountingDashboardPage: React.FC = () => {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
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

  useEffect(() => {
    getAccountingPurchaseOrdersApi()
      .then(setPos)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-cyan-400 animate-pulse text-xs p-6" dir="rtl">جاري تحميل بيانات لوحة المحاسبة...</div>;
  }

  const issuedPos = pos.filter(x => x.status === 'ISSUED');
  const totalIssuedEgp = issuedPos.reduce((acc, x) => acc + Number(x.grand_total || 0), 0);
  const upcomingDeliveriesCount = pos.filter(x => x.delivery_status === 'NOT_STARTED' || x.delivery_status === 'PARTIAL').length;
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
              الاطلاع على الحركات المالية والتحليلات لأوامر الشراء المعتمدة والمصدرة بـ (EGP / ج.م).
            </p>
          </div>
          <span className="bg-blue-900/40 text-blue-300 border border-blue-700/50 px-3 py-1.5 rounded-lg text-xs font-medium">
            👁️ للاطلاع المالي والرقابة فقط
          </span>
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
