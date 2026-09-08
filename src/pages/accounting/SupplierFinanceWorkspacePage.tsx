import React from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SupplierAccountsPage } from './SupplierAccountsPage';
import { SupplierPaymentsPage } from './SupplierPaymentsPage';

export const SupplierFinanceWorkspacePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { hasRole } = useAuth();

  const isSiteAccountant = hasRole('site_accountant') && !hasRole('accountant') && !hasRole('admin');

  const isPaymentsTarget =
    isSiteAccountant ||
    location.pathname.includes('supplier-payments') ||
    searchParams.has('purchase_receipt_id') ||
    searchParams.has('po') ||
    searchParams.has('payment_id');

  const defaultTab = isPaymentsTarget ? 'payments' : 'accounts';
  const currentTab = isSiteAccountant ? 'payments' : (searchParams.get('tab') || defaultTab);

  const setTab = (tab: 'accounts' | 'payments') => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-4 animate-fade-in" dir="rtl">
      {/* Top Navigation Tabs Header (Hidden on print) */}
      {isSiteAccountant ? (
        <div className="print:hidden flex items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🧾</span>
            <div>
              <h1 className="text-sm font-black text-slate-100">تسجيل فواتير الموردين ومطابقة أذونات الاستلام</h1>
              <p className="text-xs text-slate-400 mt-0.5">خاصة بأقسام التنفيذ والتشطيبات والمباني فقط</p>
            </div>
          </div>
          <span className="text-xs font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-800/80 px-3 py-1 rounded-xl">
            قسم الحسابات
          </span>
        </div>
      ) : (
        <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setTab('accounts')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                currentTab === 'accounts'
                  ? 'bg-[#2a2111]/80 text-[#f0d695] border border-[#c7a45b]/50 shadow-md shadow-[#a47a2c]/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span>🏦</span>
              <span>كشف وأرصدة حسابات الموردين</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('payments')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                currentTab === 'payments'
                  ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/50 shadow-md shadow-cyan-950/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span>💳</span>
              <span>فواتير وسداد الموردين والأذونات</span>
            </button>
          </div>

          <div className="text-[11px] font-bold text-slate-400 px-2 flex items-center gap-2">
            <span>💼 مساحة عمل المدير المالي</span>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div>
        {currentTab === 'payments' ? (
          <SupplierPaymentsPage />
        ) : (
          <SupplierAccountsPage />
        )}
      </div>
    </div>
  );
};

export default SupplierFinanceWorkspacePage;
