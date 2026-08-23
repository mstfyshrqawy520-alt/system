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

import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';

export const ReviewerDashboardPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchRequests = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const data = await getReviewableRequestsApi();
      setRequests(data);
    } catch (err) {
      if (!silent) setError(parseApiError(err));
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchRequests(false);
  }, []);

  useRealtimeRefresh(() => fetchRequests(true));

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

      {/* ── صندوق المهام والإجراءات المطلوبة منك الآن (Action Inbox) ── */}
      <div className="rounded-2xl border-2 border-indigo-500/40 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-indigo-900/40 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/30 border border-indigo-500/50 text-indigo-300 text-lg font-black shadow-inner">
              ⚡
            </span>
            <div>
              <h2 className="text-base font-black text-slate-100 flex items-center gap-2">
                المهام والإجراءات المطلوبة منك الآن
                {(submittedCount + underReviewCount) > 0 && (
                  <span className="rounded-full bg-indigo-500 text-white px-2.5 py-0.5 text-xs font-black">
                    {submittedCount + underReviewCount} طلب بانتظارك
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                هذه الطلبات مقدمة من موظفي قسمك وتتطلب مراجعتك واعتمادك الفني للانتقال إلى قسم المشتريات.
              </p>
            </div>
          </div>

          {(submittedCount + underReviewCount) > 0 && hasPermission('purchase_request.view_assigned') && (
            <Link to="/reviewer/requests" className="shrink-0">
              <Button variant="primary" size="sm" className="whitespace-nowrap font-bold">
                فتح جدول مراجعة الكل ({submittedCount + underReviewCount}) ←
              </Button>
            </Link>
          )}
        </div>

        {(submittedCount + underReviewCount) > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pt-1">
            {requests
              .filter(r => r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW')
              .slice(0, 6)
              .map(req => (
                <div
                  key={`pending-act-${req.id}`}
                  className="rounded-xl border border-indigo-900/60 bg-slate-950/80 p-3.5 flex flex-col justify-between gap-3 hover:border-indigo-500/60 transition-colors shadow-sm"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-black text-cyan-300">{req.request_number}</span>
                      <PurchaseRequestStatusBadge status={req.status} />
                    </div>
                    <div className="text-xs font-bold text-slate-200 truncate">
                      مقدم الطلب: <span className="text-indigo-200">{req.requester?.name || 'غير محدد'}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-1">
                      القسم: {req.department?.name || 'غير محدد'} — {req.items?.length || 0} بنود
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <Link to={`/reviewer/requests/${req.id}`} className="flex-1">
                      <Button variant="secondary" size="sm" className="w-full text-xs">
                        تفاصيل
                      </Button>
                    </Link>
                    {hasPermission('purchase_request.review') && (
                      <Link to={`/reviewer/requests/${req.id}/review`} className="flex-[2]">
                        <Button variant="primary" size="sm" className="w-full text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white">
                          {req.status === 'SUBMITTED' ? 'مراجعة واعتماد الآن ←' : 'متابعة المراجعة ←'}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4 text-center">
            <span className="text-2xl block mb-1">🎉</span>
            <div className="text-sm font-bold text-emerald-300">لا توجد طلبات معلقة بانتظار مراجعتك حالياً!</div>
            <p className="text-xs text-slate-400 mt-1">كافة طلبات الشراء الواردة لقسمك تمت مراجعتها بالكامل.</p>
          </div>
        )}
      </div>

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
