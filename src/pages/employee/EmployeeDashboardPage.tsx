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
