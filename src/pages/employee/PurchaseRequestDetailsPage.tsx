import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';
import PurchaseRequestStatusBadge from '../../components/purchase-requests/PurchaseRequestStatusBadge';
import DeleteRequestDialog from '../../components/purchase-requests/DeleteRequestDialog';
import SubmitRequestDialog from '../../components/purchase-requests/SubmitRequestDialog';
import PurchaseRequestPrintModal from '../../components/purchase-requests/PurchaseRequestPrintModal';
import { useAuth } from '../../context/AuthContext';
import {
  deletePurchaseRequestApi,
  getPurchaseRequestApi,
  submitPurchaseRequestApi,
} from '../../api/purchaseRequests';
import { ApiError } from '../../types/api';
import {
  PR_STATUS_LABELS,
  PurchaseRequest,
} from '../../types/purchaseRequest';
import { parseApiError } from '../../utils/apiError';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import SystemEventTimeline from '../../components/ui/SystemEventTimeline';
import PurchaseRequestTimeline from '../../components/procurement/PurchaseRequestTimeline';

const REQUESTER_EDITABLE_STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'];
const REVIEWER_DECISION_STATUSES = ['REJECTED', 'APPROVED_BY_REVIEWER', 'PENDING_PROCUREMENT_APPROVAL', 'APPROVED_BY_PROCUREMENT', 'PO_DRAFT', 'ISSUED'];

export const PurchaseRequestDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();

  const [requestData, setRequestData] = useState<PurchaseRequest | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(
    (location.state as any)?.message || null
  );

  // Modals
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  const fetchRequest = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPurchaseRequestApi(parseInt(id, 10));
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

  const handleConfirmSubmit = async () => {
    if (!requestData) return;
    setIsSubmitting(true);
    try {
      await submitPurchaseRequestApi(requestData.id);
      setIsSubmitModalOpen(false);
      setFlashMessage('تم إرسال طلب الشراء للمراجعة بنجاح.');
      await fetchRequest();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!requestData) return;
    setIsDeleting(true);
    try {
      await deletePurchaseRequestApi(requestData.id);
      setIsDeleteModalOpen(false);
      navigate('/requests', {
        state: { message: 'تم حذف مسودة طلب الشراء بنجاح.' },
      });
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen message="تحميل تفاصيل طلب الشراء..." />;

  if (error && !requestData) {
    return (
      <div className="space-y-4" dir="rtl">
        <ErrorMessage error={error} />
        <Link to="/requests">
          <Button variant="secondary" size="sm">← العودة</Button>
        </Link>
      </div>
    );
  }

  if (!requestData) return null;

  const isDraft = requestData.status === 'DRAFT';
  const canEdit = REQUESTER_EDITABLE_STATUSES.includes(requestData.status) && hasPermission('purchase_request.edit_own');
  const canDelete = isDraft && hasPermission('purchase_request.edit_own');
  const canSubmit = isDraft && hasPermission('purchase_request.submit');
  const reviewerDecisionFinal = REVIEWER_DECISION_STATUSES.includes(requestData.status);

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Flash */}
      {flashMessage && (
        <div className="bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between">
          <span>{flashMessage}</span>
          <button onClick={() => setFlashMessage(null)} className="text-emerald-400 font-bold ml-2">✕</button>
        </div>
      )}
      <ErrorMessage error={error} onDismiss={() => setError(null)} />

      {['SUBMITTED', 'UNDER_REVIEW'].includes(requestData.status) && (
        <div className="rounded-xl border border-cyan-700/40 bg-cyan-950/25 px-4 py-3 text-xs text-cyan-200">
          الطلب قابل للتعديل حاليًا؛ سيتم إغلاق التعديل فور اعتماد المراجع.
        </div>
      )}

      {reviewerDecisionFinal && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-xs text-slate-300">
          تم اتخاذ قرار المراجع على هذا الطلب، لذلك تم إغلاق التعديل من جهة الموظف.
        </div>
      )}

      {/* Rejection Alert */}
      {requestData.status === 'REJECTED' && requestData.rejection_reason && (
        <div className="bg-rose-950/40 border border-rose-800/80 p-4 rounded-xl">
          <h3 className="font-bold text-rose-200 text-xs flex items-center gap-2">
            <span>⚠️</span> سبب الرفض:
          </h3>
          <p className="text-xs mt-1 text-rose-300">{requestData.rejection_reason}</p>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black font-mono text-cyan-400">{requestData.request_number}</h1>
              <PurchaseRequestStatusBadge status={requestData.status} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => setIsPrintModalOpen(true)}
            className="bg-cyan-950/60 text-cyan-300 border-cyan-800/60 hover:bg-cyan-900/60 flex items-center gap-1.5">
            🖨️ طباعة
          </Button>
          {canEdit && (
            <Link to={`/requests/${requestData.id}/edit`}>
              <Button variant="warning" size="sm">تعديل</Button>
            </Link>
          )}
          {canSubmit && (
            <Button variant="primary" size="sm" onClick={() => setIsSubmitModalOpen(true)}>
              تقديم
            </Button>
          )}
          {canDelete && (
            <Button variant="danger" size="sm" onClick={() => setIsDeleteModalOpen(true)}>
              حذف
            </Button>
          )}
          <Link to="/requests">
            <Button variant="secondary" size="sm">← العودة</Button>
          </Link>
        </div>
      </div>

      {/* Summary metadata */}
      <Card className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div>
          <div className="text-[10px] text-slate-400 font-semibold">القسم المستهدف</div>
          <div className="font-bold text-slate-200 mt-1">{requestData.target_department?.name || requestData.department?.name || 'غير محدد'}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 font-semibold">مقدم الطلب</div>
          <div className="font-bold text-slate-200 mt-1">{requestData.requester?.name}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 font-semibold">الحالة</div>
          <div className="font-bold text-slate-200 mt-1">{PR_STATUS_LABELS[requestData.status] || requestData.status}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 font-semibold">الأولوية</div>
          <div className="font-bold text-slate-200 mt-1 uppercase font-mono">{requestData.priority}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 font-semibold">تاريخ الاحتياج</div>
          <div className="font-bold text-slate-200 mt-1 font-mono">{requestData.date_needed || '-'}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 font-semibold">تاريخ الإنشاء</div>
          <div className="font-bold text-slate-200 mt-1 font-mono">
            {new Date(requestData.created_at).toLocaleDateString('ar-EG')}
          </div>
        </div>
        <div className="col-span-2">
          <div className="text-[10px] text-slate-400 font-semibold">ملاحظات</div>
          <div className="font-bold text-slate-200 mt-1">{requestData.notes || '-'}</div>
        </div>
      </Card>

      <Card className="border-cyan-900/60 bg-slate-950/40">
        <PurchaseRequestTimeline request={requestData} />
      </Card>

      {/* Line البنود */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-200">
          <span>📦</span> بنود طلب الشراء
        </h3>
        <div className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>م</TableHead>
                <TableHead>رقم قطعة الأرض</TableHead>
                <TableHead>المنطقة</TableHead>
                <TableHead>الصنف</TableHead>
                <TableHead>الكمية</TableHead>
                <TableHead>الوحدة</TableHead>
                <TableHead>المواصفات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requestData.items?.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="font-bold font-mono text-slate-400">{index + 1}</TableCell>
                  <TableCell className="font-mono text-slate-300">{item.item_reference || '—'}</TableCell>
                  <TableCell className="text-slate-300">{item.region || '—'}</TableCell>
                  <TableCell className="font-bold text-slate-100">{item.item_description}</TableCell>
                  <TableCell className="font-bold font-mono text-slate-200">
                    {parseFloat(item.quantity).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-slate-400">{item.uom || '-'}</TableCell>
                  <TableCell className="text-xs text-slate-300">{item.specifications || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="space-y-3 sm:hidden">
          {requestData.items?.length ? requestData.items.map((item, index) => (
            <article key={`mobile-${item.id}`} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-cyan-300">بند #{index + 1}</p>
                  <p className="mt-1 break-words text-sm font-black text-slate-100">{item.item_description || 'بدون وصف'}</p>
                </div>
                <span className="shrink-0 font-mono text-xs font-bold text-slate-300">{item.item_reference || '—'}</span>
              </div>
              <dl className="mt-3 grid grid-cols-1 gap-3 text-xs min-[420px]:grid-cols-2">
                <div><dt className="text-slate-500">المنطقة</dt><dd className="mt-1 text-slate-200">{item.region || '—'}</dd></div>
                <div><dt className="text-slate-500">الكمية</dt><dd className="mt-1 font-bold text-slate-200">{parseFloat(item.quantity).toLocaleString()} {item.uom || ''}</dd></div>
                <div className="col-span-1 min-[420px]:col-span-2"><dt className="text-slate-500">المواصفات</dt><dd className="mt-1 break-words leading-6 text-slate-300">{item.specifications || '—'}</dd></div>
              </dl>
            </article>
          )) : (
            <div className="rounded-xl border border-dashed border-slate-700 px-3 py-6 text-center text-xs text-slate-400">لا توجد بنود مرتبطة بالطلب.</div>
          )}
        </div>
      </div>

      <SystemEventTimeline entity="purchase_request" entityId={requestData.id} />

      {/* Dialogs */}
      <SubmitRequestDialog
        isOpen={isSubmitModalOpen}
        requestNumber={requestData.request_number}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirmSubmit}
        onCancel={() => setIsSubmitModalOpen(false)}
      />
      <DeleteRequestDialog
        isOpen={isDeleteModalOpen}
        requestNumber={requestData.request_number}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
      <PurchaseRequestPrintModal
        isOpen={isPrintModalOpen}
        pr={requestData}
        onClose={() => setIsPrintModalOpen(false)}
      />
    </div>
  );
};

export default PurchaseRequestDetailsPage;
