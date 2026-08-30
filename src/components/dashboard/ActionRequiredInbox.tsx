import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import QuickPeekDrawer, { PeekType } from '../ui/QuickPeekDrawer';
import { getSiteEngineerReceiverOptionsApi } from '../../api/purchaseRequests';
import { useAuth } from '../../context/AuthContext';

export interface ActionInboxItemDetail {
  description: string;
  quantity: number | string;
  uom?: string | null;
  parcel?: string | null;
  region?: string | null;
}

export interface ActionInboxItem {
  id: string | number;
  rawId: number;
  type: 'PR' | 'PO' | 'QUOTE' | 'INVOICE' | 'RECEIPT';
  code: string;
  title: string;
  subtitle?: string;
  department?: string;
  requester?: string;
  supplier?: string;
  amount?: number | string;
  urgency?: 'CRITICAL' | 'HIGH' | 'NORMAL';
  reason: string;
  actionUrl: string;
  actionLabel: string;
  timeAgo?: string;
  
  // --- Rich Details Fields ---
  request_type?: 'PROJECT' | 'OFFICE_SUPPLIES';
  date_needed?: string;
  priority?: 'NORMAL' | 'HIGH' | 'URGENT' | 'LOW' | string;
  parcel_number?: string;
  region?: string;
  items_summary?: string;
  items_count?: number;
  items_list?: ActionInboxItemDetail[];

  // --- Direct Action Callbacks ---
  onDirectApprove?: (item: ActionInboxItem, comment?: string, siteEngineerUserId?: number | null) => Promise<void> | void;
  onDirectReject?: (item: ActionInboxItem, reason: string) => Promise<void> | void;
  onDirectSubmit?: (item: ActionInboxItem) => Promise<void> | void;
  directApproveLabel?: string;
  directRejectLabel?: string;
}

export interface ActionRequiredInboxProps {
  title?: string;
  description?: string;
  items: ActionInboxItem[];
  loading?: boolean;
  roleName?: string;
  onItemActionComplete?: () => void;
}

export const ActionRequiredInbox: React.FC<ActionRequiredInboxProps> = ({
  title = 'المهام والإجراءات المطلوبة منك الآن',
  description = 'هذه المعاملات تقف حالياً على خطوتك وقرارك، يمكنك اتخاذ الإجراء بضغطة زر واحدة.',
  items,
  loading = false,
  roleName,
  onItemActionComplete,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isReviewer = Boolean(
    user?.roles?.some((r) => r.slug === 'reviewer') ||
    roleName?.includes('قسم') ||
    roleName?.includes('مراجع')
  );

  // Drawer Peek State
  const [peekState, setPeekState] = useState<{ isOpen: boolean; type: PeekType; id: number | null }>({
    isOpen: false,
    type: 'PR',
    id: null,
  });

  // Direct Action Modals State
  const [approveModal, setApproveModal] = useState<{
    isOpen: boolean;
    item: ActionInboxItem | null;
    comment: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    item: null,
    comment: '',
    isSubmitting: false,
  });

  const [receiverOptions, setReceiverOptions] = useState<{
    siteEngineers: Array<{ id: number; name: string; department_name?: string }>;
    otherUsers: Array<{ id: number; name: string; role_name?: string; department_name?: string }>;
  }>({ siteEngineers: [], otherUsers: [] });
  const [selectedEngineerId, setSelectedEngineerId] = useState<number | string>('');
  const [receiverError, setReceiverError] = useState<string | null>(null);
  const [isLoadingReceivers, setIsLoadingReceivers] = useState(false);

  useEffect(() => {
    if (approveModal.isOpen && approveModal.item?.type === 'PR' && isReviewer) {
      setIsLoadingReceivers(true);
      setReceiverError(null);
      getSiteEngineerReceiverOptionsApi()
        .then((res) => {
          setReceiverOptions({
            siteEngineers: res.site_engineers || [],
            otherUsers: res.other_users || [],
          });
          if (res.site_engineers && res.site_engineers.length > 0) {
            setSelectedEngineerId(res.site_engineers[0].id);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingReceivers(false));
    }
  }, [approveModal.isOpen, approveModal.item, isReviewer]);

  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    item: ActionInboxItem | null;
    reason: string;
    isSubmitting: boolean;
    error?: string;
  }>({
    isOpen: false,
    item: null,
    reason: '',
    isSubmitting: false,
  });

  const [directSubmittingId, setDirectSubmittingId] = useState<string | number | null>(null);

  const handleOpenPeek = (item: ActionInboxItem) => {
    if (item.type === 'PR' || item.type === 'PO') {
      setPeekState({
        isOpen: true,
        type: item.type,
        id: item.rawId,
      });
    } else {
      navigate(item.actionUrl);
    }
  };

  const handleConfirmDirectApprove = async () => {
    if (!approveModal.item?.onDirectApprove) return;
    if (approveModal.item.type === 'PR' && isReviewer && !selectedEngineerId) {
      setReceiverError('يجب تحديد مهندس الموقع / مسؤول الاستلام قبل اعتماد الطلب.');
      return;
    }
    setReceiverError(null);
    setApproveModal((prev) => ({ ...prev, isSubmitting: true }));
    try {
      await approveModal.item.onDirectApprove(
        approveModal.item,
        approveModal.comment,
        isReviewer && selectedEngineerId ? Number(selectedEngineerId) : undefined
      );
      setApproveModal({ isOpen: false, item: null, comment: '', isSubmitting: false });
      onItemActionComplete?.();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء اعتماد الطلب');
      setApproveModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleConfirmDirectReject = async () => {
    if (!rejectModal.item?.onDirectReject) return;
    if (!rejectModal.reason.trim()) {
      setRejectModal((prev) => ({ ...prev, error: 'يرجى كتابة سبب الرفض أو الإعادة أولاً' }));
      return;
    }
    setRejectModal((prev) => ({ ...prev, isSubmitting: true, error: undefined }));
    try {
      await rejectModal.item.onDirectReject(rejectModal.item, rejectModal.reason.trim());
      setRejectModal({ isOpen: false, item: null, reason: '', isSubmitting: false });
      onItemActionComplete?.();
    } catch (err: any) {
      console.error(err);
      setRejectModal((prev) => ({
        ...prev,
        isSubmitting: false,
        error: err?.response?.data?.message || err?.message || 'حدث خطأ أثناء الرفض',
      }));
    }
  };

  const handleDirectSubmit = async (item: ActionInboxItem) => {
    if (!item.onDirectSubmit) return;
    setDirectSubmittingId(item.id);
    try {
      await item.onDirectSubmit(item);
      onItemActionComplete?.();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء إرسال الطلب');
    } finally {
      setDirectSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-cyan-800/40 bg-slate-900/90 p-5 shadow-xl animate-pulse" dir="rtl">
        <div className="h-6 w-64 bg-slate-800 rounded mb-2"></div>
        <div className="h-4 w-96 bg-slate-800/60 rounded mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="h-48 bg-slate-800/40 rounded-xl"></div>
          <div className="h-48 bg-slate-800/40 rounded-xl"></div>
          <div className="h-48 bg-slate-800/40 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const hasItems = items && items.length > 0;

  return (
    <>
      <div
        className={`rounded-2xl border-2 transition-all p-4 sm:p-5 shadow-xl space-y-4 ${
          hasItems
            ? 'border-cyan-500/60 bg-gradient-to-r from-slate-900 via-slate-900/95 to-cyan-950/25 shadow-cyan-950/40'
            : 'border-slate-800 bg-slate-900/60'
        }`}
        dir="rtl"
      >
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl font-black shadow-inner ${
                hasItems
                  ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {hasItems ? '⚡' : '✅'}
            </span>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-black text-slate-100">{title}</h2>
                {hasItems ? (
                  <span className="rounded-full bg-rose-500 text-white px-3 py-0.5 text-xs font-black shadow-md shadow-rose-600/40 animate-bounce">
                    {items.length} {items.length === 1 ? 'مهمة تنتظر قرارك' : 'مهام تنتظر قرارك'}
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-bold">
                    لا توجد معلقات حالياً
                  </span>
                )}
                {roleName && (
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700 hidden sm:inline-block">
                    {roleName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{description}</p>
            </div>
          </div>
        </div>

        {/* Action Items List */}
        {hasItems ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {items.map((item) => {
              const isUrgent = item.urgency === 'CRITICAL' || item.urgency === 'HIGH' || item.priority === 'HIGH' || item.priority === 'URGENT';
              const canPeek = item.type === 'PR' || item.type === 'PO';
              const isOffice = item.request_type === 'OFFICE_SUPPLIES';
              const isSubmitting = directSubmittingId === item.id;

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`rounded-2xl border p-4 flex flex-col justify-between gap-3.5 transition-all hover:shadow-2xl ${
                    isUrgent
                      ? 'border-amber-500/70 bg-slate-950/95 shadow-amber-950/20 ring-1 ring-amber-500/30'
                      : 'border-slate-800 bg-slate-950/85 hover:border-cyan-500/60'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Code, Badges & Date */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-black text-cyan-300 bg-cyan-950/90 border border-cyan-700/60 px-2 py-0.5 rounded-lg">
                          {item.code}
                        </span>

                        {isOffice ? (
                          <span className="text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <span>🏢</span> مستلزمات مكتبية
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-slate-900 text-amber-300 border border-amber-800/50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <span>🏗️</span> مشتريات مواقع
                          </span>
                        )}

                        {isUrgent && (
                          <span className="text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-lg animate-pulse">
                            🔥 عاجل
                          </span>
                        )}
                      </div>

                      {item.timeAgo && (
                        <span className="text-[10px] text-slate-500 font-mono shrink-0">
                          {item.timeAgo}
                        </span>
                      )}
                    </div>

                    {/* Title & Subtitle */}
                    <div>
                      <h4 className="text-sm font-black text-slate-100 leading-snug">
                        {item.title}
                      </h4>
                      {item.subtitle && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {item.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Detailed Line Items Box (If available) */}
                    {item.items_list && item.items_list.length > 0 && (
                      <div className="rounded-xl border border-slate-800/90 bg-slate-900/70 p-2.5 space-y-1.5 text-xs">
                        <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                          <span className="flex items-center gap-1 text-cyan-400">
                            <span>📦</span> بنود الطلب ({item.items_list.length}):
                          </span>
                          {item.items_count && item.items_count > item.items_list.length && (
                            <span className="text-[10px] text-slate-500">+{item.items_count - item.items_list.length} أصناف أخرى</span>
                          )}
                        </div>
                        <div className="space-y-1 max-h-24 overflow-y-auto custom-select-scrollbar pr-1">
                          {item.items_list.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px] text-slate-200 bg-slate-950/50 px-2 py-1 rounded border border-slate-800/60">
                              <span className="truncate max-w-[150px] font-medium" title={it.description}>
                                • {it.description}
                              </span>
                              <span className="font-mono font-bold text-amber-300 shrink-0">
                                {it.quantity} {it.uom || ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Meta Info Grid: Requester, Department, Parcel/Location, Date Needed */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {item.requester && (
                        <div className="rounded-lg bg-slate-900/80 px-2 py-1 border border-slate-800/80 text-slate-300 flex items-center gap-1.5 truncate">
                          <span className="text-slate-500">👤 الطالب:</span>
                          <strong className="truncate font-semibold text-slate-200">{item.requester}</strong>
                        </div>
                      )}

                      {item.department && (
                        <div className="rounded-lg bg-slate-900/80 px-2 py-1 border border-slate-800/80 text-slate-300 flex items-center gap-1.5 truncate">
                          <span className="text-slate-500">🏢 القسم:</span>
                          <strong className="truncate font-semibold text-slate-200">{item.department}</strong>
                        </div>
                      )}

                      {/* Location / Parcel */}
                      {(item.parcel_number || item.region || isOffice) && (
                        <div className="rounded-lg bg-slate-900/80 px-2 py-1 border border-slate-800/80 text-slate-300 flex items-center gap-1.5 truncate col-span-2 sm:col-span-1">
                          <span className="text-slate-500">📍 الموقع:</span>
                          <strong className="truncate font-semibold text-cyan-300">
                            {isOffice ? 'مقر الشركة' : `${item.parcel_number ? `ق ${item.parcel_number}` : ''} ${item.region ? `(${item.region})` : ''}`.trim() || '—'}
                          </strong>
                        </div>
                      )}

                      {/* Date Needed */}
                      {item.date_needed && (
                        <div className="rounded-lg bg-slate-900/80 px-2 py-1 border border-slate-800/80 text-slate-300 flex items-center gap-1.5 truncate col-span-2 sm:col-span-1">
                          <span className="text-slate-500">📅 الاحتياج:</span>
                          <strong className="truncate font-mono font-semibold text-amber-300">{item.date_needed}</strong>
                        </div>
                      )}

                      {/* Amount if available */}
                      {item.amount !== undefined && Number(item.amount) > 0 && (
                        <div className="rounded-lg bg-emerald-950/50 px-2 py-1 border border-emerald-800/60 text-emerald-300 flex items-center gap-1.5 col-span-2 font-mono font-bold">
                          <span>💰 القيمة:</span>
                          <span>{Number(item.amount).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</span>
                        </div>
                      )}

                      {/* Supplier if available */}
                      {item.supplier && item.title !== item.supplier && (
                        <div className="rounded-lg bg-slate-900/80 px-2 py-1 border border-slate-800/80 text-slate-300 flex items-center gap-1.5 col-span-2 truncate">
                          <span className="text-slate-500">🤝 المورد:</span>
                          <strong className="truncate font-semibold text-slate-200">{item.supplier}</strong>
                        </div>
                      )}
                    </div>

                    {/* Operational Reason Box */}
                    <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-2.5 text-xs font-medium text-amber-200">
                      <span className="font-bold text-amber-400">⚡ المطلوب: </span>
                      {item.reason}
                    </div>
                  </div>

                  {/* Actions Toolbar on the Card */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    {/* Top Action Row: Direct Approve & Direct Reject (if provided) */}
                    {(item.onDirectApprove || item.onDirectReject || item.onDirectSubmit) && (
                      <div className="flex items-center gap-2">
                        {item.onDirectApprove && (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => setApproveModal({ isOpen: true, item, comment: '', isSubmitting: false })}
                            className="flex-1 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40"
                          >
                            <span>✓</span>
                            <span>{item.directApproveLabel || 'اعتماد فوري'}</span>
                          </Button>
                        )}

                        {item.onDirectSubmit && (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={isSubmitting}
                            onClick={() => handleDirectSubmit(item)}
                            className="flex-1 text-xs font-black shadow-md shadow-cyan-950/40"
                          >
                            <span>{isSubmitting ? 'جاري الإرسال...' : '🚀 إرسال للاعتماد'}</span>
                          </Button>
                        )}

                        {item.onDirectReject && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setRejectModal({ isOpen: true, item, reason: '', isSubmitting: false, error: undefined })}
                            className="text-xs font-bold px-3 bg-rose-950/80 text-rose-300 border-rose-800/60 hover:bg-rose-900/80"
                          >
                            <span>✕</span>
                            <span>{item.directRejectLabel || 'رفض'}</span>
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Bottom Action Row: Detailed Review + Quick Peek */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(item.actionUrl)}
                        className="flex-1 text-xs font-bold bg-slate-900 border-slate-700 hover:border-cyan-500/60 hover:text-cyan-300"
                      >
                        <span>{item.actionLabel}</span>
                        <span className="mr-1">←</span>
                      </Button>

                      {canPeek && (
                        <button
                          type="button"
                          onClick={() => handleOpenPeek(item)}
                          className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-cyan-500/60 hover:bg-slate-800 hover:text-cyan-300 transition-colors cursor-pointer shrink-0"
                          title="معاينة سريعة لكافة التفاصيل"
                        >
                          <span>👁️</span>
                          <span className="mr-1">معاينة</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <span className="text-3xl block">🎉</span>
            <p className="text-sm font-bold text-slate-200">أنت على دراية تامة بكل المعاملات!</p>
            <p className="text-xs text-slate-500">لا توجد طلبات أو موافقات معلقة بانتظار قرارك الآن.</p>
          </div>
        )}
      </div>

      {/* Direct Approval Modal */}
      <Modal
        isOpen={approveModal.isOpen}
        onClose={() => !approveModal.isSubmitting && setApproveModal((prev) => ({ ...prev, isOpen: false }))}
        title={`تأكيد الاعتماد السريع: ${approveModal.item?.code || ''}`}
        size="md"
      >
        <div className="space-y-4" dir="rtl">
          <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/30 p-3.5 text-xs text-emerald-200">
            <p className="font-bold text-sm text-emerald-300 mb-1">
              هل أنت متأكد من اعتماد هذا الطلب فوراً؟
            </p>
            <p className="text-slate-300">
              سيتم تسجيل اعتمادك ونقل الطلب تلقائياً إلى المرحلة التالية في دورة العمل.
            </p>
            {approveModal.item && (
              <div className="mt-2.5 pt-2 border-t border-emerald-800/40 text-slate-200 space-y-1 font-mono">
                <div>• المعاملة: <strong>{approveModal.item.title}</strong></div>
                {approveModal.item.department && <div>• القسم: {approveModal.item.department}</div>}
              </div>
            )}
          </div>

          {approveModal.item?.type === 'PR' && isReviewer && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                مهندس الموقع / مسؤول استلام المواد بالموقع <span className="text-rose-400">*</span>
              </label>
              {isLoadingReceivers ? (
                <div className="text-slate-400 text-xs py-2">جاري تحميل قائمة المهندسين والمستلمين...</div>
              ) : (
                <select
                  value={selectedEngineerId}
                  onChange={(e) => {
                    setSelectedEngineerId(e.target.value ? Number(e.target.value) : '');
                    setReceiverError(null);
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-slate-100 outline-none focus:border-emerald-400 font-bold"
                >
                  <option value="" disabled>-- اختر مهندس الموقع أو مسؤول الاستلام --</option>
                  {receiverOptions.siteEngineers.length > 0 && (
                    <optgroup label="👷 مهندسو الموقع الأساسيون">
                      {receiverOptions.siteEngineers.map((eng) => (
                        <option key={`se-${eng.id}`} value={eng.id}>
                          {eng.name} {eng.department_name ? `(${eng.department_name})` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {receiverOptions.otherUsers.length > 0 && (
                    <optgroup label="👥 مستخدمو النظام الآخرون (تفويض أي دور آخر)">
                      {receiverOptions.otherUsers.map((u) => (
                        <option key={`other-${u.id}`} value={u.id}>
                          {u.name} — {u.role_name || 'مستخدم'} {u.department_name ? `(${u.department_name})` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              )}
              {receiverError && <p className="mt-1 text-xs text-rose-400 font-bold">{receiverError}</p>}
              <p className="mt-1 text-[11px] text-slate-400">
                الشخص المختار سيتولى مراجعة إذن الاستلام واعتماده بالموقع فور توريد الأصناف.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              ملاحظات أو تعليق الاعتماد (اختياري):
            </label>
            <textarea
              value={approveModal.comment}
              onChange={(e) => setApproveModal((prev) => ({ ...prev, comment: e.target.value }))}
              placeholder="اكتب أي توجيهات أو ملاحظات للاعتماد..."
              rows={3}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              variant="secondary"
              size="sm"
              disabled={approveModal.isSubmitting}
              onClick={() => setApproveModal((prev) => ({ ...prev, isOpen: false }))}
            >
              إلغاء
            </Button>
            <Button
              variant="success"
              size="sm"
              disabled={approveModal.isSubmitting}
              onClick={handleConfirmDirectApprove}
              className="font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {approveModal.isSubmitting ? 'جاري الاعتماد...' : '✓ تأكيد الاعتماد الفوري'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Direct Rejection Modal */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() => !rejectModal.isSubmitting && setRejectModal((prev) => ({ ...prev, isOpen: false }))}
        title={`رفض أو إعادة المعاملة: ${rejectModal.item?.code || ''}`}
        size="md"
      >
        <div className="space-y-4" dir="rtl">
          <div className="rounded-xl border border-rose-800/40 bg-rose-950/30 p-3.5 text-xs text-rose-200">
            <p className="font-bold text-sm text-rose-300 mb-1">
              سيتم رفض أو إعادة هذا الطلب لمقدمه
            </p>
            <p className="text-slate-300">
              يرجى توضيح سبب الرفض بالتفصيل لمقدم الطلب ليتمكن من معالجته.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              سبب الرفض أو الإعادة <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value, error: undefined }))}
              placeholder="اكتب سبب الرفض الإلزامي هنا..."
              rows={3}
              className={`w-full rounded-xl border p-3 text-xs text-slate-100 outline-none ${
                rejectModal.error
                  ? 'border-rose-500 bg-rose-950/20'
                  : 'border-slate-700 bg-slate-950 focus:border-rose-400 focus:ring-1 focus:ring-rose-400'
              }`}
            />
            {rejectModal.error && (
              <p className="text-[11px] text-rose-400 mt-1 font-bold">⚠️ {rejectModal.error}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              variant="secondary"
              size="sm"
              disabled={rejectModal.isSubmitting}
              onClick={() => setRejectModal((prev) => ({ ...prev, isOpen: false }))}
            >
              إلغاء
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={rejectModal.isSubmitting}
              onClick={handleConfirmDirectReject}
              className="font-bold bg-rose-600 hover:bg-rose-500 text-white"
            >
              {rejectModal.isSubmitting ? 'جاري الرفض...' : '✕ تأكيد الرفض والإعادة'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Quick Peek Drawer */}
      <QuickPeekDrawer
        isOpen={peekState.isOpen}
        onClose={() => setPeekState((prev) => ({ ...prev, isOpen: false }))}
        type={peekState.type}
        id={peekState.id}
      />
    </>
  );
};

export default ActionRequiredInbox;
