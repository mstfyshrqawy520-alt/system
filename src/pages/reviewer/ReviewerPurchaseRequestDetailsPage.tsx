import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';
import PurchaseRequestStatusBadge from '../../components/purchase-requests/PurchaseRequestStatusBadge';
import { useAuth } from '../../context/AuthContext';
import { getReviewerPurchaseRequestApi, startReviewApi } from '../../api/reviewer';
import { ApiError } from '../../types/api';
import { PurchaseRequest } from '../../types/purchaseRequest';
import { parseApiError } from '../../utils/apiError';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { getUnitLabel } from '../../utils/units';
import SystemEventTimeline from '../../components/ui/SystemEventTimeline';

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'منخفضة',
  MEDIUM: 'متوسطة',
  HIGH: 'عالية',
  URGENT: 'عاجلة',
};

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'إنشاء الطلب',
  SUBMITTED: 'إرسال الطلب',
  REVIEW_STARTED: 'بدء المراجعة',
  APPROVED_BY_REVIEWER: 'اعتماد رئيس القسم',
  PROCUREMENT_APPROVED: 'اعتماد المشتريات',
  APPROVED_BY_PROCUREMENT: 'اعتماد مدير المشتريات',
  REJECTED: 'رفض الطلب',
  PROCUREMENT_REJECTED: 'رفض المشتريات',
  REJECTED_BY_PROCUREMENT: 'رفض مدير المشتريات',
  RETURNED_TO_PROCUREMENT: 'إعادة للمشتريات للتعديل',
  HEADER_UPDATED: 'تحديث البيانات الأساسية',
  ITEM_ADDED: 'إضافة صنف',
  ITEM_UPDATED: 'تعديل صنف',
  ITEM_REMOVED: 'حذف صنف',
  QUANTITY_CHANGED: 'تغيير الكمية',
  PO_CREATED: 'إنشاء أمر شراء',
  PO_HEADER_UPDATED: 'تحديث أمر الشراء',
  PO_ITEM_ADDED: 'إضافة صنف إلى أمر الشراء',
  PO_ITEM_UPDATED: 'تعديل صنف في أمر الشراء',
  PO_ITEM_REMOVED: 'حذف صنف من أمر الشراء',
  PO_ISSUED: 'إصدار أمر الشراء',
  ACCOUNTING_APPROVED: 'اعتماد الحسابات',
  DELIVERY_STATUS_UPDATED: 'تحديث حالة التوريد',
};

export const ReviewerPurchaseRequestDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [requestData, setRequestData] = useState<PurchaseRequest | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isStartingReview, setIsStartingReview] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchRequest = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getReviewerPurchaseRequestApi(parseInt(id, 10));
      setRequestData(data);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const handleStartReview = async () => {
    if (!requestData) return;
    setIsStartingReview(true);
    try {
      await startReviewApi(requestData.id);
      navigate(`/reviewer/requests/${requestData.id}/review`);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setIsStartingReview(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="تحميل تفاصيل طلب الشراء للمراجعة..." />;
  }

  if (error && !requestData) {
    return (
      <div className="space-y-4" dir="rtl">
        <ErrorMessage error={error} />
        <Link to="/reviewer/requests">
          <Button variant="secondary" size="sm">
            &rarr; العودة لقائمة المراجعة
          </Button>
        </Link>
      </div>
    );
  }

  if (!requestData) return null;

  const isSubmitted = requestData.status === 'SUBMITTED';
  const isUnderReview = requestData.status === 'UNDER_REVIEW';
  const canEditBeforeApproval = isUnderReview && hasPermission('purchase_request.edit_during_review');
  const isLockedAfterApproval = !isSubmitted && !isUnderReview;

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <ErrorMessage error={error} onDismiss={() => setError(null)} />

      {isLockedAfterApproval && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-xs text-slate-300">
          تم اعتماد المرحلة السابقة وإرسال الطلب إلى المرحلة التالية، لذلك تم إغلاق التعديل من جهة المراجع.
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-3 space-x-reverse">
            <h1 className="text-xl font-black font-mono text-cyan-400">
              {requestData.request_number}
            </h1>
            <PurchaseRequestStatusBadge status={requestData.status} />
          </div>
        </div>

        {/* الإجراءات */}
        <div className="flex items-center gap-2">
          {isSubmitted && hasPermission('purchase_request.review') && (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleStartReview}
              isLoading={isStartingReview}
            >
              بدء المراجعة &rarr;
            </Button>
          )}

          {canEditBeforeApproval && (
            <Link to={`/reviewer/requests/${requestData.id}/review`}>
              <Button variant="warning" size="md" className="bg-amber-950/60 text-amber-300 border-amber-800/60 hover:bg-amber-900/60">
                مساحة العمل والتعديل &rarr;
              </Button>
            </Link>
          )}

          <Link to="/reviewer/requests">
            <Button variant="secondary" size="md">
              &rarr; القائمة
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Metadata Grid */}
      <Card className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div>
          <div className="text-[10px] text-slate-400 font-semibold">القسم</div>
          <div className="font-bold text-slate-200 mt-1">
            {requestData.department?.name} ({requestData.department?.code})
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-400 font-semibold">القسم المستهدف</div>
          <div className="font-bold text-cyan-300 mt-1">
            {requestData.target_department?.name || requestData.department?.name || 'غير محدد'}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-400 font-semibold">مدير القسم</div>
          <div className="font-bold text-slate-200 mt-1">
            {requestData.target_department?.manager?.name || 'غير محدد'}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-400 font-semibold">مهندس الموقع</div>
          <div className="font-bold text-slate-200 mt-1">
            {requestData.target_department?.site_engineer?.name || 'غير محدد'}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-400 font-semibold">مقدم الطلب</div>
          <div className="font-bold text-slate-200 mt-1">
            {requestData.requester?.name} ({requestData.requester?.email})
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-400 font-semibold">درجة الأولوية</div>
          <div className="font-bold text-slate-200 mt-1 uppercase font-mono">
            {PRIORITY_LABELS[requestData.priority] || 'غير محددة'}
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-400 font-semibold">تاريخ الاحتياج</div>
          <div className="font-bold text-slate-200 mt-1 font-mono">
            {requestData.date_needed || '-'}
          </div>
        </div>
      </Card>

      {/* Line البنود Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <span>📦</span> عناصر طلب الشراء
        </h3>

        <div className="hidden min-w-0 md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>رقم قطعة الأرض</TableHead>
                <TableHead>المنطقة</TableHead>
                <TableHead>وصف العنصر</TableHead>
                <TableHead>الكمية</TableHead>
                <TableHead>الوحدة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requestData.items?.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="font-bold text-slate-400">{index + 1}</TableCell>
                  <TableCell className="font-mono text-slate-300">{item.item_reference || '—'}</TableCell>
                  <TableCell className="text-slate-300">{item.region || '—'}</TableCell>
                  <TableCell className="font-bold text-slate-100">{item.item_description}</TableCell>
                  <TableCell className="font-mono font-bold text-slate-200">
                    {parseFloat(item.quantity).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-slate-400">{getUnitLabel(item.uom)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-3 md:hidden">
          {requestData.items?.map((item, index) => (
            <article key={`mobile-reviewer-item-${item.id}`} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <span className="shrink-0 rounded-md bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-300">
                  بند {index + 1}
                </span>
                <span className="min-w-0 break-normal font-mono text-sm font-black text-cyan-300">
                  {item.item_reference || 'بدون رقم قطعة'}
                </span>
              </div>
              <dl className="mt-4 grid min-w-0 grid-cols-1 gap-3 text-xs min-[420px]:grid-cols-2">
                <div className="min-w-0 min-[420px]:col-span-2">
                  <dt className="text-slate-500">وصف العنصر</dt>
                  <dd className="mt-1 break-normal font-bold leading-6 text-slate-100">
                    {item.item_description}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">المنطقة</dt>
                  <dd className="mt-1 break-normal text-slate-300">{item.region || 'غير محددة'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">الكمية والوحدة</dt>
                  <dd className="mt-1 whitespace-nowrap font-mono text-slate-200">
                    {parseFloat(item.quantity).toLocaleString()} {getUnitLabel(item.uom)}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </div>

      <SystemEventTimeline entity="purchase_request" entityId={requestData.id} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <Card className="space-y-2">
          <h3 className="font-bold text-slate-100 flex items-center gap-2">
            <span>📝</span>
            <span>الملاحظات</span>
          </h3>
          <p className="whitespace-pre-wrap text-slate-300">{requestData.notes || 'لا توجد ملاحظات.'}</p>
          {requestData.rejection_reason && (
            <p className="text-rose-400 pt-2 border-t border-slate-800">
              <strong className="font-bold">سبب الرفض:</strong> {requestData.rejection_reason}
            </p>
          )}
        </Card>

        <Card className="space-y-3">
          <h3 className="font-bold text-slate-100 flex items-center gap-2">
            <span>📜</span>
            <span>سجل المراجعة</span>
          </h3>
          {requestData.approval_history?.length ? (
            <ol className="space-y-3">
              {requestData.approval_history.map((entry, index) => (
                <li key={`${entry.action}-${index}`} className="border-r-2 border-slate-800 pr-3">
                  <div className="font-bold text-slate-200">{ACTION_LABELS[entry.action] || 'إجراء في الطلب'}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {entry.actor?.name || 'غير معروف'} · {entry.created_at ? new Date(entry.created_at).toLocaleString('ar-EG') : '—'}
                  </div>
                  {entry.comments && (
                    <div className="text-slate-300 mt-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800 font-mono text-[11px]">
                      {entry.comments}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-slate-400">لا يوجد سجل مراجعة متاح.</p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ReviewerPurchaseRequestDetailsPage;
