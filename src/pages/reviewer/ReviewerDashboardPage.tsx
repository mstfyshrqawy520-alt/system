import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';
import PurchaseRequestStatusBadge from '../../components/purchase-requests/PurchaseRequestStatusBadge';
import { useAuth } from '../../context/AuthContext';
import { getReviewableRequestsApi } from '../../api/reviewer';
import { ApiError } from '../../types/api';
import { PurchaseRequest } from '../../types/purchaseRequest';
import { parseApiError } from '../../utils/apiError';
import { KpiCard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { DashboardDonut } from '../../components/ui/DashboardCharts';

export const ReviewerDashboardPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getReviewableRequestsApi();
      setRequests(data);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchRequests();
  }, []);

  const submittedCount = requests.filter((r) => r.status === 'SUBMITTED').length;
  const underReviewCount = requests.filter((r) => r.status === 'UNDER_REVIEW').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED_BY_REVIEWER' || r.status === 'PENDING_PROCUREMENT_APPROVAL').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;
  const statusSegments = [
    { label: 'في انتظار المراجعة', value: submittedCount, color: '#6366f1' },
    { label: 'قيد المراجعة', value: underReviewCount, color: '#06b6d4' },
    { label: 'معتمدة', value: approvedCount, color: '#22c55e' },
    { label: 'مرفوضة', value: rejectedCount, color: '#f43f5e' },
  ];
  const visibleRequests = requests.slice(0, 5);

  if (isLoading) {
    return <LoadingSpinner fullScreen message="تحميل لوحة مراجعة الطلبات..." />;
  }

  return (
    <div className="min-w-0 space-y-6 animate-fade-in" dir="rtl">
      <div className="flex min-w-0 flex-col justify-between gap-4 border-b border-slate-800 pb-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-black text-slate-100">
            <span aria-hidden="true">📊</span> لوحة مراجعة الطلبات
          </h1>
          <p className="mt-1 text-xs leading-6 text-slate-400">
            مرحباً <strong className="font-bold text-cyan-400">{user?.name}</strong>. الطلبات المتاحة لمراجعتك ضمن النطاق المعتمد (قسم: {user?.department?.name || 'الكل'}).
          </p>
        </div>

        {hasPermission('purchase_request.view_assigned') && (
          <Link to="/reviewer/requests" className="w-full sm:w-auto">
            <Button variant="primary" size="md" className="w-full whitespace-nowrap sm:w-auto">
              عرض قائمة مراجعة الطلبات ←
            </Button>
          </Link>
        )}
      </div>

      <ErrorMessage error={error} onDismiss={() => setError(null)} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard title="في انتظار المراجعة" value={submittedCount} accentColor="indigo" icon={<span className="text-sm">⏳</span>} />
        <KpiCard title="قيد المراجعة" value={underReviewCount} accentColor="cyan" icon={<span className="text-sm">🔍</span>} />
        <KpiCard title="معتمدة" value={approvedCount} accentColor="emerald" icon={<span className="text-sm">✅</span>} />
        <KpiCard title="مرفوضة" value={rejectedCount} accentColor="rose" icon={<span className="text-sm">❌</span>} />
      </div>

      <DashboardDonut title="توزيع حالات المراجعة" subtitle="الطلبات الواقعة ضمن نطاق قسمك" segments={statusSegments} centerLabel="إجمالي الطلبات" centerValue={requests.length} />

      <section className="min-w-0 space-y-4">
        <h2 className="text-sm font-bold text-slate-200">📋 طلبات تنتظر المراجعة والاعتماد</h2>

        {requests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-6 py-12 text-center text-xs text-slate-400">
            لا توجد طلبات شراء تنتظر المراجعة حالياً ضمن اختصاصك.
          </div>
        ) : (
          <>
            <div className="hidden min-w-0 md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">رقم الطلب#</TableHead>
                    <TableHead className="whitespace-nowrap">مقدم الطلب</TableHead>
                    <TableHead className="whitespace-nowrap">القسم</TableHead>
                    <TableHead className="whitespace-nowrap">الحالة</TableHead>
                    <TableHead className="whitespace-nowrap text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRequests.map((pr) => (
                    <TableRow key={pr.id}>
                      <TableCell className="whitespace-nowrap font-mono font-bold text-cyan-400">
                        <Link to={`/reviewer/requests/${pr.id}`} className="hover:underline">{pr.request_number}</Link>
                      </TableCell>
                      <TableCell className="max-w-[180px] font-bold text-slate-100">{pr.requester?.name || 'غير محدد'}</TableCell>
                      <TableCell className="max-w-[180px] text-slate-400">{pr.department?.name || 'غير محدد'}</TableCell>
                      <TableCell className="whitespace-nowrap"><PurchaseRequestStatusBadge status={pr.status} /></TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-2">
                          <Link to={`/reviewer/requests/${pr.id}`}>
                            <Button variant="secondary" size="sm" className="whitespace-nowrap px-2 py-0.5 text-[10px]">عرض</Button>
                          </Link>
                          {pr.status === 'SUBMITTED' && hasPermission('purchase_request.review') && (
                            <Link to={`/reviewer/requests/${pr.id}/review`}>
                              <Button variant="primary" size="sm" className="whitespace-nowrap px-2 py-0.5 text-[10px]">بدء المراجعة</Button>
                            </Link>
                          )}
                          {pr.status === 'UNDER_REVIEW' && hasPermission('purchase_request.review') && (
                            <Link to={`/reviewer/requests/${pr.id}/review`}>
                              <Button variant="warning" size="sm" className="whitespace-nowrap bg-amber-950/60 px-2 py-0.5 text-[10px] text-amber-300 hover:bg-amber-900/60">متابعة</Button>
                            </Link>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 md:hidden">
              {visibleRequests.map((pr) => (
                <article key={`mobile-${pr.id}`} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <Link to={`/reviewer/requests/${pr.id}`} className="min-w-0 break-normal text-sm font-black text-cyan-300 hover:underline">
                      {pr.request_number}
                    </Link>
                    <div className="shrink-0"><PurchaseRequestStatusBadge status={pr.status} /></div>
                  </div>

                  <dl className="mt-4 grid min-w-0 grid-cols-1 gap-3 text-xs min-[420px]:grid-cols-2">
                    <div className="min-w-0">
                      <dt className="text-slate-500">مقدم الطلب</dt>
                      <dd className="mt-1 break-normal font-bold leading-6 text-slate-100">{pr.requester?.name || 'غير محدد'}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-slate-500">القسم</dt>
                      <dd className="mt-1 break-normal font-bold leading-6 text-slate-200">{pr.department?.name || 'غير محدد'}</dd>
                    </div>
                    <div className="min-w-0 min-[420px]:col-span-2">
                      <dt className="text-slate-500">الحالة الحالية</dt>
                      <dd className="mt-1 break-normal font-bold leading-6 text-slate-200"><PurchaseRequestStatusBadge status={pr.status} /></dd>
                    </div>
                  </dl>

                  <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                    <Link to={`/reviewer/requests/${pr.id}`} className="min-w-0">
                      <Button variant="secondary" size="sm" className="w-full whitespace-nowrap">عرض الطلب</Button>
                    </Link>
                    {pr.status === 'SUBMITTED' && hasPermission('purchase_request.review') && (
                      <Link to={`/reviewer/requests/${pr.id}/review`} className="min-w-0">
                        <Button variant="primary" size="sm" className="w-full whitespace-nowrap">بدء المراجعة</Button>
                      </Link>
                    )}
                    {pr.status === 'UNDER_REVIEW' && hasPermission('purchase_request.review') && (
                      <Link to={`/reviewer/requests/${pr.id}/review`} className="min-w-0">
                        <Button variant="warning" size="sm" className="w-full whitespace-nowrap bg-amber-950/60 text-amber-300 hover:bg-amber-900/60">متابعة المراجعة</Button>
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default ReviewerDashboardPage;
