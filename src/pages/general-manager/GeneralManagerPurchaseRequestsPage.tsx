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
import TableFilterBar from '../../components/ui/TableFilterBar';
import PurchaseRequestTimeline from '../../components/procurement/PurchaseRequestTimeline';

const toFormItems = (request: PurchaseRequest): PurchaseRequestItemFormInput[] =>
  (request.items || []).map(item => ({
    item_id: item.item_id ?? null,
    item_description: item.item_description,
    item_reference: item.item_reference || '',
    region: item.region || '',
    quantity: item.quantity,
    uom: item.uom || 'PCS',
    specifications: item.specifications || '',
    notes: item.notes || '',
  }));

export const GeneralManagerPurchaseRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [selected, setSelected] = useState<PurchaseRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [routeFilter, setRouteFilter] = useState('ALL');
  const [draftPriority, setDraftPriority] = useState<PurchaseRequestPriority>('NORMAL');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftItems, setDraftItems] = useState<PurchaseRequestItemFormInput[]>([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const loadRequests = async () => {
    setLoading(true);
    try {
      setRequests(await getGeneralManagerPurchaseRequestsApi());
      setError(null);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  useEffect(() => {
    const requestId = Number(searchParams.get('open'));
    if (!requestId || selected || loading) return;

    const request = requests.find(item => item.id === requestId);
    if (request) {
      openRequest(request);
      setSearchParams({}, { replace: true });
    }
  }, [loading, requests, searchParams, selected, setSearchParams]);

  const openRequest = (request: PurchaseRequest) => {
    setSelected(request);
    setDraftPriority(request.priority || 'NORMAL');
    setDraftNotes(request.notes || '');
    setDraftItems(toFormItems(request));
    setComment('');
    setError(null);
  };

  const updateItem = (index: number, field: keyof PurchaseRequestItemFormInput, value: string) => {
    setDraftItems(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  };

  const filteredRequests = requests.filter(request => {
    const search = searchTerm.trim().toLowerCase();
    const matchesSearch = !search || request.request_number.toLowerCase().includes(search) || (request.requester?.name || '').toLowerCase().includes(search) || (request.direct_supplier?.company_name || '').toLowerCase().includes(search);
    const matchesRoute = routeFilter === 'ALL' || (routeFilter === 'DIRECT' ? request.procurement_route === 'DIRECT' : request.procurement_route !== 'DIRECT');
    return matchesSearch && matchesRoute;
  });

  const performAction = async (action: 'save' | 'approve' | 'reject') => {
    if (!selected) return;
    if (action === 'reject' && !comment.trim()) {
      setError('اكتب سبب الرفض قبل تنفيذ الرفض.');
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      if (action === 'save') {
        await updateGeneralManagerPurchaseRequestApi(selected.id, {
          priority: draftPriority,
          notes: draftNotes,
          items: draftItems,
          comment: comment || undefined,
        });
      } else if (action === 'approve') {
        await approveGeneralManagerPurchaseRequestApi(selected.id, comment || undefined);
      } else {
        await rejectGeneralManagerPurchaseRequestApi(selected.id, comment.trim());
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
    return <div className="p-6 text-sm text-cyan-300" dir="rtl">جاري تحميل طلبات المدير التنفيذي...</div>;
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <span>👑</span> طلبات القرار التنفيذي
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            طلبات الشراء التي اعتمدها المراجع وتنتظر موافقتك أو تعديلك أو رفضك التنفيذي.
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

      {error && <div className="rounded-xl border border-rose-800/50 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{error}</div>}

      <TableFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="بحث برقم الطلب أو الموظف أو المورد..."
        selects={[{ label: 'مسار الطلب', value: routeFilter, onChange: setRouteFilter, options: [{ value: 'ALL', label: 'كل المسارات' }, { value: 'QUOTES', label: 'عروض أسعار' }] }]}
        onClear={() => { setSearchTerm(''); setRouteFilter('ALL'); }}
        hasActiveFilters={Boolean(searchTerm || routeFilter !== 'ALL')}
        resultCount={filteredRequests.length}
        totalCount={requests.length}
        resultLabel="طلب"
      />

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-10 text-center text-sm text-slate-400">لا توجد طلبات بانتظار القرار التنفيذي حاليًا.</div>
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
                  <th className="px-4 py-3">الإجمالي</th>
                  <th className="px-4 py-3">المراجع</th>
                  <th className="px-4 py-3">مهندس الموقع</th>
                  <th className="px-4 py-3">الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map(request => (
                  <tr key={request.id} className="border-t border-slate-800 text-slate-200">
                    <td className="px-4 py-3 font-bold text-cyan-300">{request.request_number}</td>
                    <td className="px-4 py-3">{request.requester?.name || '—'}</td>
                    <td className="px-4 py-3">{request.department?.name || '—'}</td>
                    <td className="px-4 py-3 font-bold text-emerald-300">{request.direct_supplier?.company_name || '—'}</td>
                    <td className="px-4 py-3 font-mono text-emerald-300">{request.procurement_route === 'DIRECT' ? `${Number(request.total_estimated_cost || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م` : '—'}</td>
                    <td className="px-4 py-3">{request.assigned_reviewer?.name || '—'}</td>
                    <td className="px-4 py-3">{request.site_engineer?.name || '—'}</td>
                    <td className="px-4 py-3"><Button type="button" size="sm" variant="secondary" onClick={() => openRequest(request)}>فتح الطلب</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {filteredRequests.map(request => (
              <article key={`mobile-gm-pr-${request.id}`} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <span className="min-w-0 break-normal font-mono text-sm font-black text-cyan-300">{request.request_number}</span>
                  <span className="shrink-0 rounded-md border border-amber-700/50 bg-amber-950/30 px-2 py-1 text-[11px] font-bold text-amber-200">
                    {request.procurement_route === 'DIRECT' ? 'شراء مباشر' : 'عروض أسعار'}
                  </span>
                </div>
                <dl className="mt-4 grid min-w-0 grid-cols-1 gap-3 text-xs min-[420px]:grid-cols-2">
                  <div className="min-w-0"><dt className="text-slate-500">مقدم الطلب</dt><dd className="mt-1 break-normal font-bold leading-6 text-slate-200">{request.requester?.name || 'غير محدد'}</dd></div>
                  <div className="min-w-0"><dt className="text-slate-500">القسم</dt><dd className="mt-1 break-normal text-slate-300">{request.department?.name || 'غير محدد'}</dd></div>
                  <div className="min-w-0"><dt className="text-slate-500">المورد</dt><dd className="mt-1 break-normal font-bold leading-6 text-emerald-300">{request.direct_supplier?.company_name || 'غير محدد'}</dd></div>
                  <div className="min-w-0"><dt className="text-slate-500">الإجمالي التقديري</dt><dd className="mt-1 whitespace-nowrap font-mono font-bold text-emerald-300">{request.procurement_route === 'DIRECT' ? `${Number(request.total_estimated_cost || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م` : '—'}</dd></div>
                  <div className="min-w-0"><dt className="text-slate-500">المراجع</dt><dd className="mt-1 break-normal text-slate-300">{request.assigned_reviewer?.name || 'غير محدد'}</dd></div>
                  <div className="min-w-0"><dt className="text-slate-500">مهندس الموقع</dt><dd className="mt-1 break-normal text-slate-300">{request.site_engineer?.name || 'غير محدد'}</dd></div>
                </dl>
                <Button type="button" size="sm" variant="secondary" className="mt-4 w-full whitespace-nowrap min-h-10" onClick={() => openRequest(request)}>
                  فتح الطلب ومراجعة القرار
                </Button>
              </article>
            ))}
          </div>
        </>
      )}

      {selected && createPortal((
        <div className="modal-top-viewport fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label="قرار المدير التنفيذي">
          <div className="min-h-0 max-h-[calc(100dvh-2rem)] w-full max-w-[1100px] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-4 pb-24 sm:p-6 sm:pb-6 shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
            <div className="flex flex-col gap-2 border-b border-slate-800 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-100">{selected.request_number}</h2>
                <p className="mt-1 text-xs text-slate-400">الحالة: {PR_STATUS_LABELS[selected.status]}</p>
              </div>
              <button type="button" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-600 bg-slate-900/60 text-2xl font-black leading-none text-slate-300 hover:border-cyan-400 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/70" onClick={() => { setSelected(null); setSearchParams({}, { replace: true }); }} aria-label="إغلاق النافذة" title="إغلاق النافذة">×</button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs"><span className="text-slate-500">مقدم الطلب</span><div className="mt-1 font-bold text-slate-100">{selected.requester?.name || '—'}</div></div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs"><span className="text-slate-500">المراجع</span><div className="mt-1 font-bold text-slate-100">{selected.assigned_reviewer?.name || '—'}</div></div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs"><span className="text-slate-500">مهندس الموقع</span><div className="mt-1 font-bold text-slate-100">{selected.site_engineer?.name || '—'}</div></div>
            </div>

            <div className="mt-4"><PurchaseRequestTimeline request={selected} /></div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-300">الأولوية
                <select value={draftPriority} onChange={event => setDraftPriority(event.target.value as PurchaseRequestPriority)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
                  {Object.entries(PR_PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold text-slate-300">تعليق القرار
                <textarea value={comment} onChange={event => setComment(event.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100" placeholder="اختياري للاعتماد، وإلزامي للرفض" />
              </label>
            </div>

            <label className="mt-4 block text-xs font-bold text-slate-300">ملاحظات الطلب
              <textarea value={draftNotes} onChange={event => setDraftNotes(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100" />
            </label>

            <div className="mt-4">
              <div className="hidden min-w-0 md:block overflow-x-auto rounded-xl border border-slate-800">
                <table className="min-w-[900px] w-full text-right text-xs">
                  <thead className="bg-slate-900 text-slate-300"><tr><th className="px-3 py-2">الصنف</th><th className="px-3 py-2">رقم قطعة الأرض</th><th className="px-3 py-2">المنطقة</th><th className="px-3 py-2">الكمية</th></tr></thead>
                  <tbody>{draftItems.map((item, index) => <tr key={index} className="border-t border-slate-800">
                    <td className="px-3 py-2"><input value={item.item_description} onChange={event => updateItem(index, 'item_description', event.target.value)} className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100" /></td>
                    <td className="px-3 py-2"><input value={item.item_reference || ''} onChange={event => updateItem(index, 'item_reference', event.target.value)} className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100" /></td>
                    <td className="px-3 py-2"><input value={item.region || ''} onChange={event => updateItem(index, 'region', event.target.value)} className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100" /></td>
                    <td className="px-3 py-2"><input type="number" min="0.01" value={item.quantity} onChange={event => updateItem(index, 'quantity', event.target.value)} className="w-24 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100" /></td>
                  </tr>)}</tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {draftItems.map((item, index) => (
                  <article key={`mobile-draft-item-${index}`} className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs">
                    <div className="mb-2 font-bold text-cyan-300">بند {index + 1}</div>
                    <div className="space-y-2">
                      <div>
                        <label className="mb-1 block text-slate-400">الصنف</label>
                        <input value={item.item_description} onChange={event => updateItem(index, 'item_description', event.target.value)} className="h-10 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100" />
                      </div>
                      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-slate-400">رقم قطعة الأرض</label>
                          <input value={item.item_reference || ''} onChange={event => updateItem(index, 'item_reference', event.target.value)} className="h-10 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-slate-100" />
                        </div>
                        <div>
                          <label className="mb-1 block text-slate-400">المنطقة</label>
                          <input value={item.region || ''} onChange={event => updateItem(index, 'region', event.target.value)} className="h-10 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100" />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-slate-400">الكمية</label>
                        <input type="number" min="0.01" value={item.quantity} onChange={event => updateItem(index, 'quantity', event.target.value)} className="h-10 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-slate-100" />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {/* Modal Actions: Sticky bottom on mobile, inline on desktop */}
            <div className="fixed bottom-0 inset-x-0 z-30 flex items-center gap-2 border-t border-slate-800 bg-slate-950/95 p-3 shadow-2xl backdrop-blur sm:static sm:z-auto sm:mt-5 sm:flex sm:w-auto sm:justify-start sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
              <Button type="button" variant="primary" isLoading={actionLoading} onClick={() => void performAction('approve')} className="flex-1 sm:flex-none min-h-10 text-xs sm:text-sm font-bold">اعتماد وإرسال للمشتريات</Button>
              <Button type="button" variant="danger" isLoading={actionLoading} onClick={() => void performAction('reject')} className="flex-1 sm:flex-none min-h-10 text-xs sm:text-sm font-bold">رفض الطلب</Button>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
};

export default GeneralManagerPurchaseRequestsPage;
