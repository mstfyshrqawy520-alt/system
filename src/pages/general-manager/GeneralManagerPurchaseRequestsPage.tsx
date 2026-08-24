import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  approveGeneralManagerPurchaseRequestApi,
  getGeneralManagerPurchaseRequestsApi,
  rejectGeneralManagerPurchaseRequestApi,
  updateGeneralManagerPurchaseRequestApi,
} from '../../api/generalManager';
import { Button } from '../../components/ui/Button';
import {
  PurchaseRequest,
  PurchaseRequestItemFormInput,
  PurchaseRequestPriority,
  PR_PRIORITY_LABELS,
  PR_STATUS_LABELS,
} from '../../types/purchaseRequest';
import { parseApiError } from '../../utils/apiError';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import TableFilterBar from '../../components/ui/TableFilterBar';
import PurchaseRequestTimeline from '../../components/procurement/PurchaseRequestTimeline';
import { getUnitLabel } from '../../utils/units';

interface DraftItemState extends PurchaseRequestItemFormInput {
  isExcluded?: boolean;
}

const toDraftItems = (request: PurchaseRequest): DraftItemState[] =>
  (request.items || []).map((item) => ({
    item_id: item.item_id ?? null,
    item_description: item.item_description,
    item_reference: item.item_reference || '',
    region: item.region || '',
    quantity: item.quantity,
    uom: item.uom || 'PCS',
    specifications: item.specifications || '',
    notes: item.notes || '',
    isExcluded: false,
  }));

export const GeneralManagerPurchaseRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [selected, setSelected] = useState<PurchaseRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [routeFilter, setRouteFilter] = useState('ALL');
  const [draftPriority, setDraftPriority] = useState<PurchaseRequestPriority>('NORMAL');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftItems, setDraftItems] = useState<DraftItemState[]>([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const loadRequests = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getGeneralManagerPurchaseRequestsApi();
      setRequests(data);
      if (!silent) setError(null);
    } catch (err) {
      if (!silent) setError(parseApiError(err).message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests(false);
  }, []);

  useRealtimeRefresh(() => {
    void loadRequests(true);
  });

  useEffect(() => {
    const requestId = Number(searchParams.get('open'));
    if (!requestId || selected || loading) return;

    const request = requests.find((item) => item.id === requestId);
    if (request) {
      openRequest(request);
      setSearchParams({}, { replace: true });
    }
  }, [loading, requests, searchParams, selected, setSearchParams]);

  const openRequest = (request: PurchaseRequest) => {
    setSelected(request);
    setDraftPriority(request.priority || 'NORMAL');
    setDraftNotes(request.notes || '');
    setDraftItems(toDraftItems(request));
    setComment('');
    setError(null);
  };

  const updateItem = (index: number, field: keyof PurchaseRequestItemFormInput, value: any) => {
    setDraftItems((items) =>
      items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
  };

  const toggleExcludeItem = (index: number) => {
    setDraftItems((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, isExcluded: !item.isExcluded } : item,
      ),
    );
  };

  const removeItemPermanently = (index: number) => {
    setDraftItems((items) => items.filter((_, itemIndex) => itemIndex !== index));
  };

  const activeApprovedItems = draftItems.filter((item) => !item.isExcluded);

  const filteredRequests = requests.filter((request) => {
    const search = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !search ||
      request.request_number.toLowerCase().includes(search) ||
      (request.requester?.name || '').toLowerCase().includes(search) ||
      (request.direct_supplier?.company_name || '').toLowerCase().includes(search);
    const matchesRoute =
      routeFilter === 'ALL' ||
      (routeFilter === 'DIRECT'
        ? request.procurement_route === 'DIRECT'
        : request.procurement_route !== 'DIRECT');
    return matchesSearch && matchesRoute;
  });

  const performAction = async (action: 'approve' | 'reject') => {
    if (!selected) return;

    if (action === 'reject') {
      if (!comment.trim()) {
        setError('يرجى كتابة سبب الرفض في خانة تعليق القرار قبل تنفيذ الرفض.');
        return;
      }
      setActionLoading(true);
      setError(null);
      try {
        await rejectGeneralManagerPurchaseRequestApi(selected.id, comment.trim());
        setSelected(null);
        setSearchParams({}, { replace: true });
        await loadRequests();
      } catch (err) {
        setError(parseApiError(err).message);
      } finally {
        setActionLoading(false);
      }
      return;
    }

    // Action === 'approve'
    if (activeApprovedItems.length === 0) {
      setError(
        'تم استبعاد جميع البنود! إذا كنت ترغب في رفض الطلب بالكامل يرجى الضغط على "رفض الطلب"، أو اترك بنداً واحداً على الأقل للاعتماد.',
      );
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const isModified =
        activeApprovedItems.length !== (selected.items || []).length ||
        draftPriority !== (selected.priority || 'NORMAL') ||
        draftNotes !== (selected.notes || '') ||
        activeApprovedItems.some((item, i) => {
          const original = selected.items?.[i];
          if (!original) return true;
          return (
            item.item_description !== original.item_description ||
            Number(item.quantity) !== Number(original.quantity) ||
            item.item_reference !== (original.item_reference || '') ||
            item.region !== (original.region || '')
          );
        });

      if (isModified) {
        // Send the updated clean items (only approved ones)
        const cleanedItems: PurchaseRequestItemFormInput[] = activeApprovedItems.map((item) => ({
          item_id: item.item_id ?? null,
          item_description: item.item_description,
          item_reference: item.item_reference || 'قطعة عامة',
          region: item.region || 'المنطقة الرئيسية',
          quantity: Number(item.quantity) || 1,
          uom: item.uom || 'PCS',
          specifications: item.specifications || '',
          notes: item.notes || '',
        }));

        await updateGeneralManagerPurchaseRequestApi(selected.id, {
          priority: draftPriority,
          notes: draftNotes,
          items: cleanedItems,
          comment:
            comment.trim() ||
            (activeApprovedItems.length < (selected.items || []).length
              ? `تم اعتماد عدد (${activeApprovedItems.length}) بند واستبعاد باقي البنود من المدير التنفيذي.`
              : 'تم اعتماد وتعديل الطلب من المدير التنفيذي.'),
        });
      } else {
        await approveGeneralManagerPurchaseRequestApi(selected.id, comment.trim() || undefined);
      }

      setSelected(null);
      setSearchParams({}, { replace: true });
      await loadRequests();
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-sm text-cyan-300" dir="rtl">
        جاري تحميل طلبات القرار التنفيذي...
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <span>👑</span> طلبات القرار التنفيذي
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            طلبات الشراء التي اعتمدها المراجع وتنتظر موافقتك أو اعتماد بنود محددة واستبعاد أخرى أو الرفض التنفيذي.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-amber-700/50 bg-amber-950/40 px-3 py-2 text-xs font-black text-amber-200">
            {requests.length} طلب بانتظار قرارك
          </span>
          <a
            href="/purchase-quotes/decision"
            className="rounded-lg border border-indigo-700/50 bg-indigo-950/40 px-3 py-2 text-xs font-bold text-indigo-200 hover:bg-indigo-900/60 transition-colors"
          >
            ⚖️ شاشة البت في عروض الأسعار ←
          </a>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-800/50 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <TableFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="بحث برقم الطلب أو الموظف أو المورد..."
        selects={[
          {
            label: 'مسار الطلب',
            value: routeFilter,
            onChange: setRouteFilter,
            options: [
              { value: 'ALL', label: 'كل المسارات' },
              { value: 'QUOTES', label: 'عروض أسعار' },
            ],
          },
        ]}
        onClear={() => {
          setSearchTerm('');
          setRouteFilter('ALL');
        }}
        hasActiveFilters={Boolean(searchTerm || routeFilter !== 'ALL')}
        resultCount={filteredRequests.length}
        totalCount={requests.length}
        resultLabel="طلب"
      />

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-10 text-center text-sm text-slate-400">
          لا توجد طلبات بانتظار القرار التنفيذي حاليًا.
        </div>
      ) : (
        <>
          <div className="hidden min-w-0 md:block overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
            <table className="min-w-[850px] w-full text-right text-xs">
              <thead className="bg-slate-900 text-slate-300">
                <tr>
                  <th className="px-4 py-3">رقم الطلب</th>
                  <th className="px-4 py-3">مقدم الطلب</th>
                  <th className="px-4 py-3">القسم</th>
                  <th className="px-4 py-3">المورد</th>
                  <th className="px-4 py-3">عدد البنود</th>
                  <th className="px-4 py-3">الإجمالي التقديري</th>
                  <th className="px-4 py-3">المراجع</th>
                  <th className="px-4 py-3">الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="border-t border-slate-800 text-slate-200">
                    <td className="px-4 py-3 font-bold text-cyan-300 font-mono">
                      {request.request_number}
                    </td>
                    <td className="px-4 py-3">{request.requester?.name || '—'}</td>
                    <td className="px-4 py-3">{request.department?.name || '—'}</td>
                    <td className="px-4 py-3 font-bold text-emerald-300">
                      {request.direct_supplier?.company_name || '—'}
                    </td>
                    <td className="px-4 py-3 font-bold text-amber-300">
                      {request.items?.length || 0} بنود
                    </td>
                    <td className="px-4 py-3 font-mono text-emerald-300">
                      {request.procurement_route === 'DIRECT'
                        ? `${Number(request.total_estimated_cost || 0).toLocaleString('ar-EG', {
                            minimumFractionDigits: 2,
                          })} ج.م`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">{request.assigned_reviewer?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => openRequest(request)}
                      >
                        فتح الطلب ومراجعة البنود
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {filteredRequests.map((request) => (
              <article
                key={`mobile-gm-pr-${request.id}`}
                className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-4"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <span className="min-w-0 break-normal font-mono text-sm font-black text-cyan-300">
                    {request.request_number}
                  </span>
                  <span className="shrink-0 rounded-md border border-amber-700/50 bg-amber-950/30 px-2 py-1 text-[11px] font-bold text-amber-200">
                    {request.items?.length || 0} بنود
                  </span>
                </div>
                <dl className="mt-4 grid min-w-0 grid-cols-1 gap-3 text-xs min-[420px]:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="text-slate-500">مقدم الطلب</dt>
                    <dd className="mt-1 font-bold text-slate-200">{request.requester?.name || '—'}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-slate-500">القسم</dt>
                    <dd className="mt-1 text-slate-300">{request.department?.name || '—'}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-slate-500">المورد</dt>
                    <dd className="mt-1 font-bold text-emerald-300">
                      {request.direct_supplier?.company_name || 'غير محدد'}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-slate-500">المراجع</dt>
                    <dd className="mt-1 text-slate-300">{request.assigned_reviewer?.name || '—'}</dd>
                  </div>
                </dl>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="mt-4 w-full"
                  onClick={() => openRequest(request)}
                >
                  فتح الطلب ومراجعة البنود
                </Button>
              </article>
            ))}
          </div>
        </>
      )}

      {/* ── General Manager Review & Item Control Modal ── */}
      {selected &&
        createPortal(
          <div
            className="modal-top-viewport fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-y-auto bg-slate-950/80 p-3 sm:p-6 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="قرار المدير التنفيذي"
          >
            <div className="min-h-0 max-h-[calc(100dvh-2rem)] w-full max-w-[1150px] overflow-y-auto rounded-3xl border border-slate-700 bg-slate-950 p-4 pb-24 sm:p-6 sm:pb-6 shadow-2xl space-y-4">
              {/* Top Modal Bar */}
              <div className="flex flex-col gap-2 border-b border-slate-800 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-black text-slate-100 font-mono">
                      {selected.request_number}
                    </h2>
                    <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/30">
                      قرار المدير العام
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    الحالة: {PR_STATUS_LABELS[selected.status]}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-600 bg-slate-900/60 text-xl font-black text-slate-300 hover:border-cyan-400 hover:text-white"
                  onClick={() => {
                    setSelected(null);
                    setSearchParams({}, { replace: true });
                  }}
                >
                  ×
                </button>
              </div>

              {/* Request Info Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <span className="text-slate-500 block">مقدم الطلب</span>
                  <strong className="mt-1 text-slate-100 block">{selected.requester?.name || '—'}</strong>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <span className="text-slate-500 block">القسم</span>
                  <strong className="mt-1 text-slate-100 block">{selected.department?.name || '—'}</strong>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <span className="text-slate-500 block">المراجع</span>
                  <strong className="mt-1 text-slate-100 block">{selected.assigned_reviewer?.name || '—'}</strong>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <span className="text-slate-500 block">المورد المقترح</span>
                  <strong className="mt-1 text-emerald-300 block">{selected.direct_supplier?.company_name || 'عروض أسعار'}</strong>
                </div>
              </div>

              {/* Timeline */}
              <PurchaseRequestTimeline request={selected} />

              {/* Priority & Comment */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-300">
                  الأولوية
                  <select
                    value={draftPriority}
                    onChange={(event) => setDraftPriority(event.target.value as PurchaseRequestPriority)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                  >
                    {Object.entries(PR_PRIORITY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-300">
                  تعليق أو توجيه المدير العام
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                    placeholder="اكتب توجيهاتك لقسم المشتريات (اختياري للاعتماد، وإلزامي للرفض)..."
                  />
                </label>
              </div>

              {/* Items Management Box (Selective Item Approval / Removal) */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
                      <span>📦</span> مراجعة بنود الطلب والاعتماد الجزئي
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      يمكنك استبعاد أو مسح أي بند لا توافق عليه، أو تعديل الكمية لأي بند بشكل منفصل.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-950/80 border border-emerald-800/60 px-3 py-1 text-xs font-bold text-emerald-300">
                      معتمد: {activeApprovedItems.length} من {draftItems.length} بند
                    </span>
                  </div>
                </div>

                {/* Items Table */}
                <div className="space-y-3">
                  <div className="hidden min-w-0 md:block overflow-x-auto rounded-xl border border-slate-800">
                    <table className="min-w-[900px] w-full text-right text-xs">
                      <thead className="bg-slate-950 text-slate-300">
                        <tr>
                          <th className="px-3 py-2.5">الحالة</th>
                          <th className="px-3 py-2.5">الصنف</th>
                          <th className="px-3 py-2.5">المواصفات</th>
                          <th className="px-3 py-2.5">رقم القطعة</th>
                          <th className="px-3 py-2.5">المنطقة</th>
                          <th className="px-3 py-2.5">الكمية</th>
                          <th className="px-3 py-2.5 text-center">التحكم بالبند</th>
                        </tr>
                      </thead>
                      <tbody>
                        {draftItems.map((item, index) => {
                          const isExcluded = item.isExcluded;
                          return (
                            <tr
                              key={index}
                              className={`border-t border-slate-800 transition-colors ${
                                isExcluded
                                  ? 'bg-rose-950/20 opacity-60'
                                  : 'hover:bg-slate-800/30'
                              }`}
                            >
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                {isExcluded ? (
                                  <span className="rounded bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                                    ❌ مستبعد
                                  </span>
                                ) : (
                                  <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                                    ✓ معتمد
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                <input
                                  disabled={isExcluded}
                                  value={item.item_description}
                                  onChange={(e) => updateItem(index, 'item_description', e.target.value)}
                                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-slate-100 disabled:bg-slate-950 disabled:text-slate-500"
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <input
                                  disabled={isExcluded}
                                  value={item.specifications || ''}
                                  onChange={(e) => updateItem(index, 'specifications', e.target.value)}
                                  placeholder="مواصفات البند..."
                                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-100 disabled:bg-slate-950 disabled:text-slate-500"
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <input
                                  disabled={isExcluded}
                                  value={item.item_reference || ''}
                                  onChange={(e) => updateItem(index, 'item_reference', e.target.value)}
                                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-slate-100 font-mono text-xs disabled:bg-slate-950 disabled:text-slate-500"
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <input
                                  disabled={isExcluded}
                                  value={item.region || ''}
                                  onChange={(e) => updateItem(index, 'region', e.target.value)}
                                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-slate-100 disabled:bg-slate-950 disabled:text-slate-500"
                                />
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <input
                                    disabled={isExcluded}
                                    type="number"
                                    min="0.01"
                                    step="any"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                    className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-slate-100 font-bold disabled:bg-slate-950 disabled:text-slate-500"
                                  />
                                  <span className="text-xs text-slate-400">{getUnitLabel(item.uom)}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => toggleExcludeItem(index)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                                      isExcluded
                                        ? 'border-emerald-600 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60'
                                        : 'border-amber-600/60 bg-amber-950/40 text-amber-200 hover:bg-amber-900/60'
                                    }`}
                                    title={isExcluded ? 'إلغاء الاستبعاد وإعادة اعتماد البند' : 'استبعاد البند من أمر الشراء'}
                                  >
                                    {isExcluded ? '↩️ استرجاع البند' : '🚫 استبعاد البند'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeItemPermanently(index)}
                                    className="px-2 py-1 rounded-lg text-xs text-rose-400 hover:bg-rose-950/50 hover:text-rose-200 border border-transparent hover:border-rose-800/60"
                                    title="حذف البند نهائياً من الطلب"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View */}
                  <div className="space-y-3 md:hidden">
                    {draftItems.map((item, index) => {
                      const isExcluded = item.isExcluded;
                      return (
                        <article
                          key={`mobile-draft-item-${index}`}
                          className={`rounded-2xl border p-3.5 space-y-3 ${
                            isExcluded
                              ? 'border-rose-900/60 bg-rose-950/20 opacity-70'
                              : 'border-slate-800 bg-slate-950/70'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-100 text-sm">بند {index + 1}</span>
                            {isExcluded ? (
                              <span className="rounded bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                                ❌ مستبعد من الشراء
                              </span>
                            ) : (
                              <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                                ✓ معتمد
                              </span>
                            )}
                          </div>

                          <div className="space-y-2 text-xs">
                            <div>
                              <label className="text-slate-400 block mb-1">اسم الصنف</label>
                              <input
                                disabled={isExcluded}
                                value={item.item_description}
                                onChange={(e) => updateItem(index, 'item_description', e.target.value)}
                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-slate-100"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-slate-400 block mb-1">رقم القطعة</label>
                                <input
                                  disabled={isExcluded}
                                  value={item.item_reference || ''}
                                  onChange={(e) => updateItem(index, 'item_reference', e.target.value)}
                                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-slate-100"
                                />
                              </div>
                              <div>
                                <label className="text-slate-400 block mb-1">الكمية</label>
                                <input
                                  disabled={isExcluded}
                                  type="number"
                                  min="0.01"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-slate-100 font-bold"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => toggleExcludeItem(index)}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${
                                isExcluded
                                  ? 'border-emerald-600 bg-emerald-950 text-emerald-300'
                                  : 'border-amber-600 bg-amber-950 text-amber-200'
                              }`}
                            >
                              {isExcluded ? '↩️ استرجاع البند' : '🚫 استبعاد هذا البند'}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItemPermanently(index)}
                              className="px-3 py-1.5 rounded-lg text-xs border border-rose-800 text-rose-300 bg-rose-950/40"
                            >
                              🗑️
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="fixed bottom-0 inset-x-0 z-30 flex items-center gap-3 border-t border-slate-800 bg-slate-950/95 p-3 shadow-2xl backdrop-blur sm:static sm:z-auto sm:mt-5 sm:flex sm:w-auto sm:justify-start sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
                <Button
                  type="button"
                  variant="primary"
                  isLoading={actionLoading}
                  onClick={() => void performAction('approve')}
                  className="flex-1 sm:flex-none min-h-11 text-xs sm:text-sm font-black bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 shadow-lg"
                >
                  <span>
                    ✓ اعتماد البنود المحددة ({activeApprovedItems.length}) وإرسال للمشتريات
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  isLoading={actionLoading}
                  onClick={() => void performAction('reject')}
                  className="flex-1 sm:flex-none min-h-11 text-xs sm:text-sm font-bold"
                >
                  <span>✕ رفض الطلب بالكامل</span>
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default GeneralManagerPurchaseRequestsPage;
