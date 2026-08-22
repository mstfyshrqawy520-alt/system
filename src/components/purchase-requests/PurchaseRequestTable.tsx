import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PR_ACTION_LABELS, PR_STATUS_LABELS, PurchaseRequest } from '../../types/purchaseRequest';
import PurchaseRequestStatusBadge from './PurchaseRequestStatusBadge';
import PurchaseRequestTimeline from '../procurement/PurchaseRequestTimeline';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table';
import { Button } from '../ui/Button';

const REQUESTER_EDITABLE_STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'];
const REQUESTER_DELETABLE_STATUSES = ['DRAFT'];
const formatRequestDate = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium' }).format(date);
};

const getRequestType = (pr: PurchaseRequest): string => {
  if (pr.procurement_route === 'DIRECT') return 'شراء مباشر';
  if (pr.procurement_route === 'QUOTES') return 'عروض أسعار';
  return 'طلب شراء';
};

const isOverdueRequest = (pr: PurchaseRequest): boolean => {
  if (!pr.date_needed || ['DRAFT', 'REJECTED', 'CANCELLED', 'COMPLETED'].includes(pr.status)) return false;
  return new Date(`${pr.date_needed}T23:59:59`).getTime() < Date.now();
};

const getLastAction = (pr: PurchaseRequest): string => {
  const latestAction = pr.approval_history?.[pr.approval_history.length - 1]?.action;
  if (latestAction && PR_ACTION_LABELS[latestAction]) return PR_ACTION_LABELS[latestAction];
  return PR_STATUS_LABELS[pr.status as keyof typeof PR_STATUS_LABELS] || 'قيد المتابعة';
};

interface Props {
  requests: PurchaseRequest[];
  onOpenSubmitModal: (pr: PurchaseRequest) => void;
  onOpenDeleteModal: (pr: PurchaseRequest) => void;
  emptyMessage?: string;
  emptyDescription?: string;
}

export const PurchaseRequestTable: React.FC<Props> = ({
  requests,
  onOpenSubmitModal,
  onOpenDeleteModal,
  emptyMessage = 'لا توجد طلبات شراء حالياً',
  emptyDescription = 'ابدأ بإنشاء أول طلب شراء جديد لمؤسستك.',
}) => {
  const { hasPermission } = useAuth();

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-900/50 border border-dashed border-slate-800 rounded-xl p-6 space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 text-xl">
          📋
        </div>
        <h3 className="text-sm font-bold text-slate-200">
          {emptyMessage}
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          {emptyDescription}
        </p>
        {hasPermission('purchase_request.create') && (
          <div className="pt-2">
            <Link to="/requests/create">
              <Button variant="primary" size="sm">
                + إنشاء طلب شراء جديد
              </Button>
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>رقم الطلب#</TableHead>
          <TableHead>تاريخ الطلب</TableHead>
          <TableHead>نوع الطلب</TableHead>
          <TableHead>القسم / المشروع</TableHead>
          <TableHead>الحالة</TableHead>
          <TableHead>آخر إجراء</TableHead>
          <TableHead className="text-center">الإجراءات</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((pr) => {
          const isDraft = pr.status === 'DRAFT';
          const canEdit = REQUESTER_EDITABLE_STATUSES.includes(pr.status) && hasPermission('purchase_request.edit_own');
          const canDelete = REQUESTER_DELETABLE_STATUSES.includes(pr.status) && hasPermission('purchase_request.edit_own');
          const canSubmit = isDraft && hasPermission('purchase_request.submit');
          const overdue = isOverdueRequest(pr);

          return (
            <TableRow key={pr.id}>
              <TableCell className="font-mono font-bold text-cyan-400">
                <Link to={`/requests/${pr.id}`} className="hover:underline">
                  {pr.request_number}
                </Link>
              </TableCell>
              <TableCell className="text-slate-400 text-xs">{formatRequestDate(pr.created_at)}</TableCell>
              <TableCell className="text-slate-300 text-xs">{getRequestType(pr)}</TableCell>
              <TableCell className="text-slate-300 text-xs">{pr.target_department?.name || pr.department?.name || '—'}</TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <PurchaseRequestStatusBadge status={pr.status} />
                  {overdue && <span className="rounded-full border border-rose-800/70 bg-rose-950/40 px-2 py-1 text-[10px] font-bold text-rose-300">متأخر</span>}
                </div>
              </TableCell>
              <TableCell className="max-w-[210px] text-xs text-slate-400">{getLastAction(pr)}</TableCell>
              <TableCell>
                <div className="flex gap-2 justify-center">
                  <Link to={`/requests/${pr.id}`}>
                    <Button variant="secondary" size="sm" className="px-2 py-0.5 text-[10px]">
                      عرض
                    </Button>
                  </Link>

                  {canEdit && (
                    <Link to={`/requests/${pr.id}/edit`}>
                      <Button variant="warning" size="sm" className="px-2 py-0.5 text-[10px] bg-amber-950/60 text-amber-300 border-amber-800/60 hover:bg-amber-900/60">
                        تعديل
                      </Button>
                    </Link>
                  )}

                  {canSubmit && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onOpenSubmitModal(pr)}
                      className="px-2 py-0.5 text-[10px]"
                    >
                      تقديم
                    </Button>
                  )}

                  {canDelete && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onOpenDeleteModal(pr)}
                      className="px-2 py-0.5 text-[10px]"
                    >
                      حذف
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {requests.map((pr) => {
          const isDraft = pr.status === 'DRAFT';
          const canEdit = REQUESTER_EDITABLE_STATUSES.includes(pr.status) && hasPermission('purchase_request.edit_own');
          const canDelete = REQUESTER_DELETABLE_STATUSES.includes(pr.status) && hasPermission('purchase_request.edit_own');
          const canSubmit = isDraft && hasPermission('purchase_request.submit');
          const overdue = isOverdueRequest(pr);

          return (
            <article key={`mobile-${pr.id}`} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between">
                <Link to={`/requests/${pr.id}`} className="font-mono text-sm font-black text-cyan-300 hover:underline">{pr.request_number}</Link>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <PurchaseRequestStatusBadge status={pr.status} />
                  {overdue && <span className="rounded-full border border-rose-800/70 bg-rose-950/40 px-2 py-1 text-[10px] font-bold text-rose-300">متأخر</span>}
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-1 gap-3 text-xs min-[420px]:grid-cols-2">
                <div><dt className="text-slate-500">تاريخ الطلب</dt><dd className="mt-1 text-slate-300">{formatRequestDate(pr.created_at)}</dd></div>
                <div><dt className="text-slate-500">نوع الطلب</dt><dd className="mt-1 font-bold text-slate-200">{getRequestType(pr)}</dd></div>
                <div><dt className="text-slate-500">القسم / المشروع</dt><dd className="mt-1 font-bold text-slate-200">{pr.target_department?.name || pr.department?.name || 'غير محدد'}</dd></div>
                <div><dt className="text-slate-500">آخر إجراء</dt><dd className="mt-1 text-slate-300">{getLastAction(pr)}</dd></div>
                                <div className="col-span-1 min-[420px]:col-span-2"><dt className="text-slate-500">الحالة</dt>
<dd className="mt-1 font-bold text-slate-200">{PR_STATUS_LABELS[pr.status as keyof typeof PR_STATUS_LABELS] || 'حالة غير معروفة'}{canEdit ? ' — قابلة للتعديل' : ''}</dd></div>
              </dl>
              <div className="mt-4 border-t border-slate-800 pt-3">
                <PurchaseRequestTimeline request={pr} compact />
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:flex min-[420px]:flex-wrap">
                <Link to={`/requests/${pr.id}`} className="w-full min-[420px]:w-auto"><Button variant="secondary" size="sm" className="w-full min-[420px]:w-auto">عرض</Button></Link>
                {canEdit && <Link to={`/requests/${pr.id}/edit`} className="w-full min-[420px]:w-auto"><Button variant="warning" size="sm" className="w-full min-[420px]:w-auto">تعديل</Button></Link>}
                {canSubmit && <Button variant="primary" size="sm" className="w-full min-[420px]:w-auto" onClick={() => onOpenSubmitModal(pr)}>تقديم الطلب</Button>}
                {canDelete && <Button variant="danger" size="sm" className="w-full min-[420px]:w-auto" onClick={() => onOpenDeleteModal(pr)}>حذف</Button>}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
};

export default PurchaseRequestTable;
