import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ErrorMessage from '../../components/ErrorMessage';
import { TableSkeleton } from '../../components/ui/StateFeedback';
import PurchaseRequestStatusBadge from '../../components/purchase-requests/PurchaseRequestStatusBadge';
import AddReviewItemDialog from '../../components/reviewer/AddReviewItemDialog';
import ApproveRequestDialog from '../../components/reviewer/ApproveRequestDialog';
import RejectRequestDialog from '../../components/reviewer/RejectRequestDialog';
import { useAuth } from '../../context/AuthContext';
import {
  addReviewItemApi,
  approvePurchaseRequestApi,
  deleteReviewItemApi,
  getReviewerPurchaseRequestApi,
  rejectPurchaseRequestApi,
  ReviewItemPayload,
  startReviewApi,
  updateReviewHeaderApi,
  updateReviewItemApi,
} from '../../api/reviewer';
import { ApiError } from '../../types/api';
import { PR_ACTION_LABELS, PR_STATUS_LABELS, PurchaseRequest, PurchaseRequestPriority } from '../../types/purchaseRequest';
import { parseApiError } from '../../utils/apiError';
import { getUnitLabel } from '../../utils/units';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { FormField, Input, Select } from '../../components/ui/FormField';

export const ReviewPurchaseRequestPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [requestData, setRequestData] = useState<PurchaseRequest | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMutating, setIsMutating] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Editable header state
  const [headerPriority, setHeaderPriority] = useState<PurchaseRequestPriority>('NORMAL');
  const [headerDateNeeded, setHeaderDateNeeded] = useState('');
  const [headerNotes, setHeaderNotes] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const fetchRequest = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getReviewerPurchaseRequestApi(parseInt(id, 10));
      setRequestData(data);
      setHeaderPriority(data.priority);
      setHeaderDateNeeded(data.date_needed || '');
      setHeaderNotes(data.notes || '');
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const handleSaveHeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !requestData) return;
    setIsMutating(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const updated = await updateReviewHeaderApi(parseInt(id, 10), {
        priority: headerPriority,
        date_needed: headerDateNeeded || undefined,
        notes: headerNotes || undefined,
      });
      setRequestData(updated);
      setSuccessMessage('تم تحديث بيانات الطلب.');
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setIsMutating(false);
    }
  };

  const handleStartReview = async () => {
    if (!id) return;
    setIsMutating(true);
    setError(null);
    try {
      const updated = await startReviewApi(parseInt(id, 10));
      setRequestData(updated);
      setHeaderPriority(updated.priority);
      setHeaderDateNeeded(updated.date_needed || '');
      setHeaderNotes(updated.notes || '');
      setSuccessMessage('بدأت المراجعة.');
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setIsMutating(false);
    }
  };

  const handleUpdateItem = async (itemId: number, field: keyof ReviewItemPayload, value: any) => {
    if (!id) return;
    setIsMutating(true);
    setError(null);
    try {
      const currentItem = requestData?.items?.find(i => i.id === itemId);
      if (!currentItem) return;
      const payload: ReviewItemPayload = {
        item_description: currentItem.item_description,
        item_reference: currentItem.item_reference || '',
        region: currentItem.region || '',
        quantity: parseFloat(currentItem.quantity),
        uom: currentItem.uom || undefined,
        specifications: currentItem.specifications || undefined,
        notes: currentItem.notes || undefined,
        [field]: value,
      };
      const updated = await updateReviewItemApi(parseInt(id, 10), itemId, payload);
      setRequestData(updated);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setIsMutating(false);
    }
  };

  const handleAddItem = async (payload: ReviewItemPayload) => {
    if (!id) return;
    setIsMutating(true);
    setError(null);
    try {
      const updated = await addReviewItemApi(parseInt(id, 10), payload);
      setRequestData(updated);
      setIsAddModalOpen(false);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!id) return;
    if (!confirm('هل أنت متأكد من حذف هذا البند؟')) return;
    setIsMutating(true);
    setError(null);
    try {
      const updated = await deleteReviewItemApi(parseInt(id, 10), itemId);
      setRequestData(updated);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setIsMutating(false);
    }
  };

  const handleApprove = async (comments?: string) => {
    if (!id) return;
    setIsMutating(true);
    setError(null);
    try {
      await approvePurchaseRequestApi(parseInt(id, 10), comments || '');
      setIsApproveModalOpen(false);
      navigate('/reviewer/requests', {
        state: { message: 'تم اعتماد طلب الشراء وإرساله إلى مدير المشتريات.' },
      });
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setIsMutating(false);
    }
  };

  const handleReject = async (comments: string) => {
    if (!id) return;
    setIsMutating(true);
    setError(null);
    try {
      await rejectPurchaseRequestApi(parseInt(id, 10), comments);
      setIsRejectModalOpen(false);
      navigate('/reviewer/requests', {
        state: { message: 'تم رفض طلب الشراء.' },
      });
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setIsMutating(false);
    }
  };

  if (isLoading) return <TableSkeleton rows={8} columns={6} className="min-h-[340px]" />;

  if (error && !requestData) {
    return (
      <div className="space-y-4" dir="rtl">
        <ErrorMessage error={error} />
        <Link to="/reviewer/requests">
          <Button variant="secondary" size="sm">← العودة للقائمة</Button>
        </Link>
      </div>
    );
  }

  if (!requestData) {
    return (
      <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center" dir="rtl">
        <h2 className="text-base font-bold text-slate-100">تعذر تحميل طلب الشراء</h2>
        <p className="text-xs text-slate-400">لم يتم العثور على بيانات الطلب المطلوبة. يمكنك العودة إلى قائمة الطلبات والمحاولة مرة أخرى.</p>
        <Link to="/reviewer/requests"><Button variant="secondary" size="sm">العودة إلى قائمة الطلبات</Button></Link>
      </div>
    );
  }

  const isUnderReview = requestData.status === 'UNDER_REVIEW';
  const reviewerEditableStatuses = ['UNDER_REVIEW', 'PENDING_PROCUREMENT_APPROVAL', 'APPROVED_BY_REVIEWER'];
  const canEdit = reviewerEditableStatuses.includes(requestData.status) && hasPermission('purchase_request.edit_during_review') && !isMutating;
  const isFinalized = !reviewerEditableStatuses.includes(requestData.status);
  const isConflictError = error?.status === 409;

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Flash */}
      {successMessage && (
        <div className="bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 font-bold ml-2">✕</button>
        </div>
      )}
      <ErrorMessage error={error} onDismiss={() => setError(null)} />

      {/* Stale data alert */}
      {isConflictError && (
        <div className="bg-amber-950/40 border border-amber-800/80 text-amber-300 p-4 rounded-xl flex items-center justify-between text-xs font-semibold">
          <span>بيانات الطلب قديمة. أعد تحميل البيانات قبل المتابعة.</span>
          <Button variant="warning" size="sm" onClick={fetchRequest}>إعادة تحميل</Button>
        </div>
      )}

      {/* Procurement waiting / finalized banners */}
      {requestData.status === 'PENDING_PROCUREMENT_APPROVAL' && (
        <div className="bg-cyan-950/30 border border-cyan-700/50 p-4 rounded-xl text-xs text-cyan-200 flex items-center gap-3">
          <span className="text-lg">✏️</span>
          <div>
            <strong>الطلب بانتظار اعتماد مدير المشتريات</strong>
            <div className="text-cyan-300/80 mt-0.5">يمكنك تعديل البيانات والبنود حتى يصدر مدير المشتريات اعتماده.</div>
          </div>
        </div>
      )}

      {/* Finalized banner */}
      {isFinalized && (
        <div className="bg-slate-800/60 border border-slate-700/50 p-4 rounded-xl text-xs text-slate-300 flex items-center gap-3">
          <span className="text-lg">🔒</span>
          <div>
            <strong>الطلب مُغلق</strong>
            <div className="text-slate-400 mt-0.5">
              {PR_STATUS_LABELS[requestData.status] || 'حالة غير معروفة'} — لا يمكن إجراء تعديلات إضافية
            </div>
          </div>
        </div>
      )}

      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black font-mono text-cyan-400">
              مساحة المراجعة — {requestData.request_number}
            </h1>
            <PurchaseRequestStatusBadge status={requestData.status} />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {requestData.department && `القسم: ${requestData.department.name}`}
            {requestData.requester && ` • مقدم الطلب: ${requestData.requester.name}`}
          </p>
        </div>

        <Card className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs border-cyan-900/50 bg-cyan-950/10">
          <div><div className="text-[10px] text-slate-400 font-semibold">القسم المستهدف</div><div className="mt-1 font-bold text-cyan-300">{requestData.target_department?.name || requestData.department?.name || 'غير محدد'}</div></div>
          <div><div className="text-[10px] text-slate-400 font-semibold">مدير القسم</div><div className="mt-1 font-bold text-slate-200">{requestData.target_department?.manager?.name || 'غير محدد'}</div></div>
          <div><div className="text-[10px] text-slate-400 font-semibold">مهندس الموقع</div><div className="mt-1 font-bold text-slate-200">{requestData.target_department?.site_engineer?.name || 'غير محدد'}</div></div>
          <div><div className="text-[10px] text-slate-400 font-semibold">رقم قطعة الأرض</div><div className="mt-1 font-mono font-bold text-slate-200">{requestData.items?.map((item) => item.item_reference).filter(Boolean).join('، ') || 'غير محدد'}</div></div>
          <div><div className="text-[10px] text-slate-400 font-semibold">المنطقة</div><div className="mt-1 font-bold text-slate-200">{requestData.items?.map((item) => item.region).filter(Boolean).join('، ') || 'غير محددة'}</div></div>
        </Card>

        {/* Action Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {requestData.status === 'SUBMITTED' && hasPermission('purchase_request.review') && (
            <Button variant="primary" size="md" onClick={handleStartReview} isLoading={isMutating}>
              {isMutating ? 'جارٍ بدء المراجعة...' : 'بدء المراجعة'}
            </Button>
          )}

          {isUnderReview && !isFinalized && (
            <div className="flex items-center gap-2 flex-wrap">
              {hasPermission('purchase_request.approve') && (
                <Button
                  variant="success"
                  size="md"
                  onClick={() => setIsApproveModalOpen(true)}
                  disabled={isMutating}
                  title="اعتماد الطلب"
                >
                  اعتماد
                </Button>
              )}
              {hasPermission('purchase_request.reject') && (
                <Button variant="danger" size="md" onClick={() => setIsRejectModalOpen(true)} disabled={isMutating}>
                  رفض
                </Button>
              )}
            </div>
          )}

          <Link to="/reviewer/requests">
            <Button variant="secondary" size="md">← إلغاء</Button>
          </Link>
        </div>
      </div>

      {/* Editable Header */}
      <Card>
        <form onSubmit={handleSaveHeader} className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>📝</span> تعديل معلومات الطلب
            </h3>
            {canEdit && (
              <Button type="submit" variant="primary" size="sm" isLoading={isMutating}>
                حفظ
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <FormField label="الأولوية">
              <Select disabled={!canEdit} value={headerPriority} onChange={e => setHeaderPriority(e.target.value as PurchaseRequestPriority)}>
                <option value="NORMAL">عادي</option>
                <option value="LOW">منخفض</option>
                <option value="HIGH">عالي</option>
                <option value="URGENT">عاجل</option>
              </Select>
            </FormField>
            <FormField label="تاريخ الاحتياج">
              <Input type="date" disabled={!canEdit} value={headerDateNeeded} onChange={e => setHeaderDateNeeded(e.target.value)} />
            </FormField>
            <FormField label="ملاحظات">
              <Input type="text" disabled={!canEdit} value={headerNotes} onChange={e => setHeaderNotes(e.target.value)} />
            </FormField>
          </div>
        </form>
      </Card>

      {/* Line البنود Table */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span>📦</span> تعديل بنود الطلب({requestData.items?.length || 0})
          </h3>
          {canEdit && (
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsAddModalOpen(true)} disabled={isMutating}>
              + إضافة بند
            </Button>
          )}
        </div>
        <div className="hidden min-w-0 md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>رقم قطعة الأرض</TableHead>
                <TableHead>وصف العنصر</TableHead>
                <TableHead>المنطقة</TableHead>
                <TableHead>الكمية</TableHead>
                <TableHead>الوحدة</TableHead>
                {!isFinalized && <TableHead className="text-center">إجراء</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {requestData.items?.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="font-bold text-slate-400">{index + 1}</TableCell>
                  <TableCell className="min-w-[140px]">
                    <Input
                      type="text"
                      disabled={!canEdit}
                      defaultValue={item.item_reference || ''}
                      onBlur={e => {
                        if (e.target.value !== (item.item_reference || '')) {
                          handleUpdateItem(item.id, 'item_reference', e.target.value);
                        }
                      }}
                      className="py-1 px-2 text-xs font-mono"
                      dir="ltr"
                      required
                    />
                  </TableCell>
                  <TableCell className="font-bold text-slate-100 min-w-[200px]">
                    <Input
                      type="text"
                      disabled={!canEdit}
                      defaultValue={item.item_description}
                      onBlur={e => {
                        if (e.target.value !== item.item_description) {
                          handleUpdateItem(item.id, 'item_description', e.target.value);
                        }
                      }}
                      className="py-1 px-2 text-xs"
                    />
                  </TableCell>
                  <TableCell className="min-w-[170px]">
                    <Input
                      type="text"
                      disabled={!canEdit}
                      defaultValue={item.region || ''}
                      onBlur={e => {
                        if (e.target.value !== (item.region || '')) {
                          handleUpdateItem(item.id, 'region', e.target.value);
                        }
                      }}
                      className="py-1 px-2 text-xs"
                      placeholder="المنطقة"
                      required
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      disabled={!canEdit}
                      defaultValue={parseFloat(item.quantity)}
                      onBlur={e => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0 && val !== parseFloat(item.quantity)) {
                          handleUpdateItem(item.id, 'quantity', val);
                        }
                      }}
                      className="w-20 text-center py-1 px-2 font-mono text-xs"
                    />
                  </TableCell>
                  <TableCell className="text-slate-400">{getUnitLabel(item.uom)}</TableCell>
                  {!isFinalized && (
                    <TableCell className="text-center">
                      {canEdit && (
                        <Button type="button" variant="danger" size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={isMutating}
                          className="px-2 py-0.5 text-[10px]">
                          حذف
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-3 md:hidden">
          {requestData.items?.map((item, index) => (
            <article key={`mobile-review-item-${item.id}`} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <span className="shrink-0 rounded-md bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-300">
                  بند {index + 1}
                </span>
                <span className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-300">
                  الوحدة: <strong className="text-slate-100">{getUnitLabel(item.uom)}</strong>
                </span>
              </div>

              <div className="mt-3 space-y-3 text-xs">
                <div>
                  <label className="mb-1 block text-slate-400 font-medium">رقم قطعة الأرض</label>
                  <Input
                    type="text"
                    disabled={!canEdit}
                    defaultValue={item.item_reference || ''}
                    onBlur={e => {
                      if (e.target.value !== (item.item_reference || '')) {
                        handleUpdateItem(item.id, 'item_reference', e.target.value);
                      }
                    }}
                    className="h-10 w-full px-3 text-xs font-mono"
                    dir="ltr"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-slate-400 font-medium">وصف العنصر</label>
                  <Input
                    type="text"
                    disabled={!canEdit}
                    defaultValue={item.item_description}
                    onBlur={e => {
                      if (e.target.value !== item.item_description) {
                        handleUpdateItem(item.id, 'item_description', e.target.value);
                      }
                    }}
                    className="h-10 w-full px-3 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-slate-400 font-medium">المنطقة</label>
                    <Input
                      type="text"
                      disabled={!canEdit}
                      defaultValue={item.region || ''}
                      onBlur={e => {
                        if (e.target.value !== (item.region || '')) {
                          handleUpdateItem(item.id, 'region', e.target.value);
                        }
                      }}
                      className="h-10 w-full px-3 text-xs"
                      placeholder="المنطقة"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-400 font-medium">الكمية</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      disabled={!canEdit}
                      defaultValue={parseFloat(item.quantity)}
                      onBlur={e => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0 && val !== parseFloat(item.quantity)) {
                          handleUpdateItem(item.id, 'quantity', val);
                        }
                      }}
                      className="h-10 w-full px-3 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {!isFinalized && canEdit && (
                <div className="mt-4 border-t border-slate-800/80 pt-3">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteItem(item.id)}
                    disabled={isMutating}
                    className="w-full whitespace-nowrap min-h-10"
                  >
                    حذف هذا البند
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      </Card>

      {/* Approval History*/}
      {requestData.approval_history && requestData.approval_history.length > 0 && (
        <Card className="space-y-3">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
            <span>📅</span> سجل الإجراءات
          </h3>
          <div className="space-y-0">
            {[...requestData.approval_history].reverse().map((entry, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full border-2 mt-1 flex-shrink-0 ${
                    entry.action?.includes('APPROVED') ? 'border-emerald-400 bg-emerald-900' :
                    entry.action?.includes('REJECTED') ? 'border-rose-400 bg-rose-900' :
                    'border-cyan-500 bg-cyan-900'
                  }`} />
                  {idx < requestData.approval_history!.length - 1 && (
                    <div className="w-px flex-1 bg-slate-700/60 min-h-[24px]" />
                  )}
                </div>
                <div className="pb-4 flex-1">
                  <div className="text-xs font-semibold text-slate-200">
                    {PR_ACTION_LABELS[entry.action] || entry.action}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>{entry.actor?.name || 'النظام'}</span>
                    {entry.created_at && <span>• {new Date(entry.created_at).toLocaleString('ar-EG')}</span>}
                  </div>
                  {entry.comments && (
                    <div className="mt-1 text-xs text-slate-300 bg-slate-800/40 border border-slate-700/40 rounded-lg px-3 py-2">
                      {entry.comments}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modals */}
      <AddReviewItemDialog
        isOpen={isAddModalOpen}
        isAdding={isMutating}
        onConfirm={handleAddItem}
        onCancel={() => setIsAddModalOpen(false)}
      />
      <ApproveRequestDialog
        isOpen={isApproveModalOpen}
        requestNumber={requestData.request_number}
        isApproving={isMutating}
        onConfirm={handleApprove}
        onCancel={() => setIsApproveModalOpen(false)}
      />
      <RejectRequestDialog
        isOpen={isRejectModalOpen}
        requestNumber={requestData.request_number}
        isRejecting={isMutating}
        onConfirm={handleReject}
        onCancel={() => setIsRejectModalOpen(false)}
      />
    </div>
  );
};

export default ReviewPurchaseRequestPage;
