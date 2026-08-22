import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';
import PurchaseRequestTable from '../../components/purchase-requests/PurchaseRequestTable';
import DeleteRequestDialog from '../../components/purchase-requests/DeleteRequestDialog';
import SubmitRequestDialog from '../../components/purchase-requests/SubmitRequestDialog';
import { useAuth } from '../../context/AuthContext';
import {
  deletePurchaseRequestApi,
  getOwnPurchaseRequestsApi,
  submitPurchaseRequestApi,
} from '../../api/purchaseRequests';
import { ApiError } from '../../types/api';
import { PurchaseRequest } from '../../types/purchaseRequest';
import { parseApiError } from '../../utils/apiError';
import { KpiCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DashboardDonut } from '../../components/ui/DashboardCharts';

export const EmployeeDashboardPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Modals
  const [selectedSubmitPr, setSelectedSubmitPr] = useState<PurchaseRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedDeletePr, setSelectedDeletePr] = useState<PurchaseRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getOwnPurchaseRequestsApi();
      setRequests(data);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const totalCount = requests.length;
  const draftCount = requests.filter((r) => r.status === 'DRAFT').length;
  const pendingCount = requests.filter(
    (r) => r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW'
  ).length;
  const approvedCount = requests.filter((r) =>
    r.status === 'APPROVED_BY_REVIEWER' || r.status === 'PENDING_PROCUREMENT_APPROVAL' || r.status === 'APPROVED_BY_PROCUREMENT'
  ).length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;
  const statusSegments = [
    { label: 'مسودات', value: draftCount, color: '#64748b' },
    { label: 'قيد المراجعة', value: pendingCount, color: '#f59e0b' },
    { label: 'معتمدة', value: approvedCount, color: '#10b981' },
    { label: 'مرفوضة', value: rejectedCount, color: '#f43f5e' },
  ];


  const handleConfirmSubmit = async () => {
    if (!selectedSubmitPr) return;
    setIsSubmitting(true);
    try {
      await submitPurchaseRequestApi(selectedSubmitPr.id);
      setSelectedSubmitPr(null);
      await fetchRequests();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedDeletePr) return;
    setIsDeleting(true);
    try {
      await deletePurchaseRequestApi(selectedDeletePr.id);
      setSelectedDeletePr(null);
      await fetchRequests();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="تحميل لوحة معلومات الموظف..." />;
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-100 flex items-center gap-2 tracking-tight">
            <span>📊</span> لوحة الموظف
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            أهلاً بك، <strong className="text-cyan-400 font-bold">{user?.name}</strong> ({user?.department?.name || 'قسم الموظف'}). يمكنك إدارة طلبات الشراء الخاصة بك هنا.
          </p>
        </div>

        {hasPermission('purchase_request.create') && (
          <Link to="/employee/requests/create">
            <Button variant="primary" size="md">
              + إنشاء طلب شراء جديد
            </Button>
          </Link>
        )}
      </div>

      <ErrorMessage error={error} onDismiss={() => setError(null)} />

      {/* ── صندوق الإجراءات المطلوبة منك (Employee Action Inbox) ── */}
      <div className="rounded-2xl border-2 border-cyan-500/40 bg-gradient-to-r from-slate-900 via-cyan-950/20 to-slate-900 p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-cyan-900/40 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600/30 border border-cyan-500/50 text-cyan-300 text-lg font-black shadow-inner">
              ⚡
            </span>
            <div>
              <h2 className="text-base font-black text-slate-100 flex items-center gap-2">
                المهام والإجراءات المطلوبة منك
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                يمكنك إنشاء طلبات شراء جديدة لمشروعك أو استكمال إرسال المسودات ومتابعة دورة الاعتمادات.
              </p>
            </div>
          </div>

          {hasPermission('purchase_request.create') && (
            <Link to="/employee/requests/create" className="shrink-0">
              <Button variant="primary" size="md" className="w-full sm:w-auto font-black shadow-lg shadow-cyan-950">
                ➕ إنشاء طلب شراء جديد
              </Button>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Action 1: Drafts */}
          <div className={`rounded-xl border p-3.5 flex flex-col justify-between gap-2.5 transition-colors ${draftCount > 0 ? 'border-amber-700/60 bg-amber-950/20' : 'border-slate-800 bg-slate-950/80'}`}>
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">مسودات لم تُرسل بعد</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${draftCount > 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                  {draftCount} مسودة
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {draftCount > 0 ? 'لديك طلبات تم حفظها كمسودة ولم تُرسل للمراجعة بعد.' : 'لا توجد مسودات معلقة.'}
              </p>
            </div>
            {draftCount > 0 ? (
              <Link to="/employee/requests">
                <Button variant="warning" size="sm" className="w-full text-xs font-bold bg-amber-600 hover:bg-amber-500 text-slate-950">
                  إرسال المسودات للمراجعة ←
                </Button>
              </Link>
            ) : (
              <div className="text-[11px] text-emerald-400 font-bold">✅ كل طلباتك مرسلة</div>
            )}
          </div>

          {/* Action 2: In Review */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 flex flex-col justify-between gap-2.5">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">طلبات قيد دورة المراجعة</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {pendingCount} طلب
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                تتنقل طلباتك الآن بين المراجع والمشتريات والمدير العام.
              </p>
            </div>
            <Link to="/employee/requests">
              <Button variant="secondary" size="sm" className="w-full text-xs font-bold border-cyan-800/60 text-cyan-200 hover:bg-cyan-950">
                متابعة حركة الطلبات ←
              </Button>
            </Link>
          </div>

          {/* Action 3: Approved */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 flex flex-col justify-between gap-2.5">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">طلبات معتمدة للتوريد</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {approvedCount} طلب
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                طلبات اكتمل اعتمادها وتم تحويلها لأوامر شراء وتوريد.
              </p>
            </div>
            <Link to="/employee/requests">
              <Button variant="secondary" size="sm" className="w-full text-xs font-bold border-emerald-800/60 text-emerald-200 hover:bg-emerald-950">
                عرض الطلبات المعتمدة ←
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KpiCard
          title="إجمالي"
          value={totalCount}
          accentColor="cyan"
          icon={<span className="text-sm">📋</span>}
        />
        <KpiCard
          title="مسودات"
          value={draftCount}
          accentColor="slate"
          icon={<span className="text-sm">✏️</span>}
        />
        <KpiCard
          title="قيد المراجعة"
          value={pendingCount}
          accentColor="amber"
          icon={<span className="text-sm">⏳</span>}
        />
        <KpiCard
          title="معتمدة"
          value={approvedCount}
          accentColor="emerald"
          icon={<span className="text-sm">✅</span>}
        />
        <KpiCard
          title="مرفوضة"
          value={rejectedCount}
          accentColor="rose"
          icon={<span className="text-sm">❌</span>}
        />
      </div>

      <DashboardDonut title="توزيع حالات طلباتك" subtitle="ملخص بصري لحالة الطلبات الحالية" segments={statusSegments} centerLabel="إجمالي الطلبات" centerValue={totalCount} />

      {/* Recent Requests Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200">
            📋 طلبات الشراء الأخيرة
          </h2>
          <Link
            to="/employee/requests"
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
          >
            <span>عرض كافة الطلبات({totalCount})</span>
            <span>&rarr;</span>
          </Link>
        </div>

        <PurchaseRequestTable
          requests={requests.slice(0, 5)}
          onOpenSubmitModal={(pr) => setSelectedSubmitPr(pr)}
          onOpenDeleteModal={(pr) => setSelectedDeletePr(pr)}
        />
      </div>

      {/* Confirmation Dialogs */}
      <SubmitRequestDialog
        isOpen={!!selectedSubmitPr}
        requestNumber={selectedSubmitPr?.request_number || ''}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirmSubmit}
        onCancel={() => setSelectedSubmitPr(null)}
      />

      <DeleteRequestDialog
        isOpen={!!selectedDeletePr}
        requestNumber={selectedDeletePr?.request_number || ''}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setSelectedDeletePr(null)}
      />
    </div>
  );
};

export default EmployeeDashboardPage;
