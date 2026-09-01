import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { TableSkeleton } from '../../components/ui/StateFeedback';
import ErrorMessage from '../../components/ErrorMessage';
import { parseApiError } from '../../utils/apiError';
import { getUnitLabel } from '../../utils/units';
import TableFilterBar from '../../components/ui/TableFilterBar';
import { getDefaultDateFrom, getTodayInputDate, isDefaultTodayRange } from '../../utils/dateFilters';
import {
  approvePurchaseReceiptApi,
  createPurchaseReceiptApi,
  getAssignedReceiptsApi,
  getPurchaseReceiptArchiveApi,
  getWarehouseReceiptQueueApi,
  updatePurchaseReceiptApi,
  ReceiptPurchaseOrder,
  ReceiptRecord,
} from '../../api/purchaseReceipts';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';

type ReceiptMode = 'warehouse' | 'site';
type ActiveTab = 'QUEUE' | 'ARCHIVE';

export const PurchaseReceiptPage: React.FC<{ mode: ReceiptMode }> = ({ mode }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('QUEUE');
  const [orders, setOrders] = useState<ReceiptPurchaseOrder[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [archiveReceipts, setArchiveReceipts] = useState<ReceiptRecord[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [expandedArchiveId, setExpandedArchiveId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const today = getTodayInputDate();
  const defaultDateFrom = getDefaultDateFrom();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(today);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      if (mode === 'warehouse') {
        const [queueData, archiveData] = await Promise.all([
          getWarehouseReceiptQueueApi(),
          getPurchaseReceiptArchiveApi().catch(() => []),
        ]);
        setOrders(queueData || []);
        setArchiveReceipts(archiveData || []);
      } else {
        const [assignedData, archiveData] = await Promise.all([
          getAssignedReceiptsApi(),
          getPurchaseReceiptArchiveApi().catch(() => []),
        ]);
        setReceipts(assignedData || []);
        setArchiveReceipts(archiveData || []);
      }
    } catch (err) {
      if (!silent) setError(parseApiError(err).message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void load(false);
  }, [mode]);

  useRealtimeRefresh(() => {
    void load(true);
  });

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('ar-EG');
  const ignoreDefaultDateForSearch = Boolean(normalizedSearch) && isDefaultTodayRange(dateFrom, dateTo);
  const matchesFilter = (text: string, value: string) =>
    (!normalizedSearch || text.toLocaleLowerCase('ar-EG').includes(normalizedSearch)) &&
    (ignoreDefaultDateForSearch || ((!dateFrom || value >= dateFrom) && (!dateTo || value <= dateTo)));

  const visibleOrders = orders.filter((order) =>
    matchesFilter(
      [
        order.po_number,
        order.purchase_request?.request_number,
        order.supplier?.company_name,
        order.purchase_request?.department?.name,
        order.purchase_request?.requester?.name,
        order.purchase_request?.project_name,
      ]
        .filter(Boolean)
        .join(' '),
      String(order.created_at || order.purchase_request?.created_at || '').slice(0, 10),
    ),
  );

  const visibleReceipts = receipts.filter((receipt) =>
    matchesFilter(
      [
        receipt.receipt_number,
        receipt.purchase_order?.po_number,
        receipt.purchase_order?.supplier?.company_name,
        receipt.purchase_order?.purchase_request?.department?.name,
        receipt.warehouse_keeper?.name,
      ]
        .filter(Boolean)
        .join(' '),
      String(receipt.received_at || receipt.created_at || '').slice(0, 10),
    ),
  );

  const visibleArchive = archiveReceipts.filter((receipt) =>
    matchesFilter(
      [
        receipt.receipt_number,
        receipt.purchase_order?.po_number,
        receipt.purchase_order?.supplier?.company_name,
        receipt.purchase_order?.purchase_request?.department?.name,
        receipt.warehouse_keeper?.name,
        receipt.site_engineer?.name,
        receipt.warehouse_notes,
        receipt.site_engineer_notes,
      ]
        .filter(Boolean)
        .join(' '),
      String(receipt.received_at || receipt.created_at || '').slice(0, 10),
    ),
  );

  const setAllReceivedFull = (order: ReceiptPurchaseOrder) => {
    const updated: Record<string, string> = { ...quantities };
    (order.items || []).forEach((item) => {
      updated[`${order.id}-${item.id}`] = String(item.quantity);
    });
    setQuantities(updated);
  };

  const submitWarehouseReceipt = async (order: ReceiptPurchaseOrder) => {
    const items = (order.items || []).map((item) => ({
      purchase_order_item_id: item.id,
      received_quantity: Number(quantities[`${order.id}-${item.id}`] ?? item.quantity),
      notes: itemNotes[`${order.id}-${item.id}`] || undefined,
    }));

    if (items.some((item) => Number.isNaN(item.received_quantity) || item.received_quantity < 0)) {
      setError('يرجى إدخال كميات مستلمة صحيحة لكل بند.');
      return;
    }

    setSaving(order.id);
    setError(null);
    setSuccessMessage(null);
    try {
      await createPurchaseReceiptApi(order.id, { items, warehouse_notes: notes[order.id] });
      setSuccessMessage(`تم تسجيل استلام أمر الشراء ${order.po_number} وإرساله لمهندس الموقع بنجاح!`);
      await load();
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setSaving(null);
    }
  };

  const approveReceipt = async (receipt: ReceiptRecord) => {
    const items = (receipt.items || []).map((item) => ({
      id: item.id,
      received_quantity: Number(quantities[`receipt-${receipt.id}-${item.id}`] ?? item.received_quantity),
      notes: itemNotes[`receipt-${receipt.id}-${item.id}`] || undefined,
    }));

    if (items.some((item) => Number.isNaN(item.received_quantity) || item.received_quantity < 0)) {
      setError('يرجى إدخال كميات مستلمة صحيحة قبل الاعتماد.');
      return;
    }

    setSaving(receipt.id);
    setError(null);
    try {
      await approvePurchaseReceiptApi(receipt.id, {
        site_engineer_notes: notes[receipt.id],
        items,
      });
      setSuccessMessage(`تم اعتماد إذن الاستلام ${receipt.receipt_number} وإرساله للحسابات لصرف الدفعات.`);
      await load();
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <TableSkeleton rows={5} columns={6} className="min-h-[360px]" />;

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Page Header Banner ── */}
      <div
        className={`rounded-2xl border-2 p-4 sm:p-6 shadow-xl space-y-3 ${
          mode === 'warehouse'
            ? 'border-amber-500/40 bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900'
            : 'border-emerald-500/40 bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl font-black shadow-inner ${
                mode === 'warehouse'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              {mode === 'warehouse' ? '📦' : '🏗️'}
            </span>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-100 flex items-center gap-2.5 flex-wrap">
                {mode === 'warehouse' ? 'مهام وأرشيف استلام المواد بالمخزن' : 'إذن استلام المواد — فحص واعتماد الاستلام'}
                {(mode === 'warehouse' ? orders.length : receipts.length) > 0 && (
                  <span
                    className={`rounded-full px-3 py-0.5 text-xs font-black ${
                      mode === 'warehouse' ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
                    }`}
                  >
                    {(mode === 'warehouse' ? orders.length : receipts.length)} أمر بانتظار الفحص
                  </span>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {mode === 'warehouse'
                  ? 'قم بفحص بضاعة الموردين ومطابقة الأصناف والمواصفات، وسجل الكميات المستلمة أو راجع أرشيف الاستلامات المعتمدة.'
                  : 'راجع استلام المخزن وافحص المواد هندسياً وفنياً في الموقع للتأكد من مطابقتها قبل الاعتماد النهائي وإرسالها للحسابات.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-emerald-700/60 bg-emerald-950/50 p-4 text-sm font-bold text-emerald-300 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-emerald-400 hover:text-white cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {error && <ErrorMessage error={error} onDismiss={() => setError(null)} />}

      {/* ── Main Navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('QUEUE')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'QUEUE'
              ? mode === 'warehouse'
                ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-950/40'
                : 'bg-emerald-600 text-white font-black shadow-lg shadow-emerald-950/40'
              : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <span>📦 مهام الاستلام المعلقة</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
              activeTab === 'QUEUE'
                ? 'bg-slate-950/20 text-current'
                : (mode === 'warehouse' ? orders.length : receipts.length) > 0
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {mode === 'warehouse' ? orders.length : receipts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ARCHIVE')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'ARCHIVE'
              ? 'bg-cyan-600 text-white font-black shadow-lg shadow-cyan-950/40'
              : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <span>🗄️ أرشيف استلام المواد</span>
          <span className="px-2.5 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">
            {archiveReceipts.length}
          </span>
        </button>
      </div>

      <TableFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={
          activeTab === 'ARCHIVE'
            ? 'بحث في الأرشيف برقم الإذن، أمر الشراء، المورد، أمين المخزن، مهندس الموقع...'
            : mode === 'warehouse'
            ? 'بحث برقم أمر الشراء، رقم الطلب، المورد، القسم، الصنف...'
            : 'بحث برقم إذن الاستلام، أمر الشراء، المورد، القسم...'
        }
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onClear={() => {
          setSearchTerm('');
          setDateFrom(defaultDateFrom);
          setDateTo(today);
        }}
        hasActiveFilters={Boolean(searchTerm || dateFrom !== defaultDateFrom || dateTo !== today)}
        resultCount={
          activeTab === 'ARCHIVE'
            ? visibleArchive.length
            : mode === 'warehouse'
            ? visibleOrders.length
            : visibleReceipts.length
        }
      />

      {/* ── TAB 1: PENDING QUEUE ── */}
      {activeTab === 'QUEUE' && (
        <>
          {mode === 'warehouse' ? (
            /* Warehouse Keeper Pending Orders Queue */
            visibleOrders.length > 0 ? (
              <div className="space-y-6">
                {visibleOrders.map((order) => {
                  const isSavingThis = saving === order.id;

                  return (
                    <Card key={order.id} className="p-4 sm:p-6 space-y-5 border-2 border-amber-500/50 bg-slate-900/95 shadow-2xl rounded-2xl">
                      {/* Header Card with PO info */}
                      <div className="space-y-3 border-b border-slate-800 pb-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono text-base sm:text-lg font-black text-cyan-300 bg-cyan-950 border border-cyan-700 px-3.5 py-1.5 rounded-xl shadow-inner">
                              {order.po_number}
                            </span>
                            {order.purchase_request && (
                              <span className="text-xs sm:text-sm font-bold text-slate-200 bg-slate-800 border border-slate-700 px-3 py-1 rounded-lg">
                                طلب #{order.purchase_request.request_number}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setAllReceivedFull(order)}
                            className="text-xs sm:text-sm font-black text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 border border-cyan-800/80 px-3 py-1.5 rounded-xl transition-all hover:bg-cyan-900/80 cursor-pointer flex items-center gap-1.5"
                          >
                            <span>🔄</span> إعادة ضبط كافة الكميات للمطلوب
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm pt-1">
                          <div className="flex items-center gap-2 text-slate-200 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                            <span className="text-base">🏢</span>
                            <div>
                              <span className="text-slate-400 block text-[11px]">المورد:</span>
                              <span className="font-bold text-slate-100">{order.supplier?.company_name || 'مورد غير محدد'}</span>
                            </div>
                          </div>

                          {order.purchase_request?.site_engineer && (
                            <div className="flex items-center gap-2 text-emerald-300 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/50">
                              <span className="text-base">👷</span>
                              <div>
                                <span className="text-emerald-400/80 block text-[11px]">مهندس الموقع المسؤول:</span>
                                <span className="font-bold">{order.purchase_request.site_engineer.name}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Items List as Touch-Friendly High-Contrast Cards */}
                      <div className="space-y-4">
                        <h4 className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-2">
                          <span>📦</span> بنود أمر الشراء والكميات المستلمة ({order.items?.length || 0} بنود):
                        </h4>

                        <div className="space-y-3.5">
                          {(order.items || []).map((item, idx) => {
                            const key = `${order.id}-${item.id}`;
                            const val = quantities[key] ?? String(item.quantity);

                            return (
                              <div
                                key={item.id}
                                className="rounded-2xl border-2 border-slate-700/80 bg-slate-950/90 p-4 sm:p-5 space-y-3.5 shadow-lg"
                              >
                                {/* Item Title & Index */}
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 font-black text-sm border border-cyan-500/40 shrink-0">
                                        #{idx + 1}
                                      </span>
                                      <h4 className="text-base sm:text-lg font-black text-slate-50 tracking-wide">
                                        {item.item_description || item.item?.name}
                                      </h4>
                                    </div>
                                    {item.specifications && (
                                      <p className="text-xs sm:text-sm text-slate-400 leading-relaxed pr-9">
                                        المواصفات: {item.specifications}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Tags: Land parcel & Region */}
                                <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm">
                                  {(item.item_reference || item.pr_item?.item_reference) && (
                                    <span className="inline-flex items-center gap-1.5 font-mono text-cyan-200 bg-cyan-950 border border-cyan-700/80 px-3 py-1 rounded-xl font-black">
                                      <span>🏷️</span> قطعة الأرض: {item.item_reference || item.pr_item?.item_reference}
                                    </span>
                                  )}
                                  {(item.region || item.pr_item?.region) && (
                                    <span className="inline-flex items-center gap-1.5 text-amber-200 bg-amber-950 border border-amber-700/80 px-3 py-1 rounded-xl font-black">
                                      <span>📍</span> المنطقة: {item.region || item.pr_item?.region}
                                    </span>
                                  )}
                                </div>

                                {/* Quantities Comparison Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                  {/* Box 1: Required in PO */}
                                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 flex flex-col justify-between space-y-1">
                                    <span className="text-xs font-bold text-slate-400">الكمية المطلوبة بأمر الشراء:</span>
                                    <div className="font-mono text-lg sm:text-xl font-black text-slate-100 flex items-baseline gap-1.5">
                                      <span>{item.quantity}</span>
                                      <span className="text-sm font-bold text-slate-400">{getUnitLabel(item.uom || '')}</span>
                                    </div>
                                  </div>

                                  {/* Box 2: Received Quantity (Editable, Big Input) */}
                                  <div className="rounded-xl border-2 border-emerald-500/70 bg-emerald-950/30 p-3.5 space-y-1.5 shadow-inner">
                                    <label className="text-xs font-black text-emerald-300 flex items-center justify-between">
                                      <span>الكمية المستلمة فعلياً بالمخزن:</span>
                                      <span className="text-[11px] font-normal text-emerald-400/80">(جاهزة للتعديل)</span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={val}
                                        onChange={(e) => setQuantities({ ...quantities, [key]: e.target.value })}
                                        className="w-full rounded-xl border-2 border-emerald-400 bg-slate-950 px-3.5 py-2 text-lg sm:text-xl text-emerald-300 font-black focus:ring-2 focus:ring-emerald-400 focus:outline-none shadow-inner"
                                      />
                                      <span className="text-sm sm:text-base font-black text-emerald-300 shrink-0 px-1">
                                        {getUnitLabel(item.uom || '')}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Item Notes */}
                                <div className="space-y-1 pt-1">
                                  <input
                                    type="text"
                                    placeholder="ملاحظات حالة الصنف إن وجدت (اختياري)..."
                                    value={itemNotes[key] || ''}
                                    onChange={(e) => setItemNotes({ ...itemNotes, [key]: e.target.value })}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs sm:text-sm text-slate-200 focus:border-cyan-400 focus:outline-none"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* General Order Notes */}
                        <div className="space-y-1.5 pt-2">
                          <label className="text-xs sm:text-sm font-bold text-slate-300">ملاحظات عامة على الاستلام (اختياري):</label>
                          <textarea
                            rows={2}
                            value={notes[order.id] || ''}
                            onChange={(e) => setNotes({ ...notes, [order.id]: e.target.value })}
                            placeholder="مثال: تم فحص البضاعة ومطابقة الأختام، البضاعة سليمة وبحالة جيدة..."
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs sm:text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                          />
                        </div>

                        {/* Big Submit Button */}
                        <div className="pt-3 border-t border-slate-800 space-y-2">
                          <Button
                            variant="success"
                            size="lg"
                            isLoading={isSavingThis}
                            onClick={() => submitWarehouseReceipt(order)}
                            className="w-full font-black text-base sm:text-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3.5 rounded-2xl shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2"
                          >
                            <span>✓</span> اعتماد واستلام المواد وإرسالها لمهندس الموقع
                          </Button>
                          <p className="text-center text-xs text-slate-400">
                            💡 بمجرد الضغط على الزر، سيتم حفظ إذن الاستلام فوراً وإرساله لمهندس الموقع لاعتماده.
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 space-y-2 rounded-2xl border border-slate-800 bg-slate-900/60">
                <span className="text-4xl block">📦</span>
                <p className="text-base font-bold text-slate-200">لا توجد مهام استلام معلقة حالياً بالمخزن</p>
                <p className="text-xs text-slate-500">
                  تظهر هنا أوامر الشراء الصادرة للموردين فور اعتمادها، لتسجيل استلام المواد بالمخزن. يمكنك الاطلاع على الاستلامات السابقة من تبويب «أرشيف استلام المواد».
                </p>
              </div>
            )
          ) : (
            /* Site Engineer Pending Receipts Queue */
            visibleReceipts.length > 0 ? (
              <div className="space-y-6">
                {visibleReceipts.map((receipt) => {
                  const isSavingThis = saving === receipt.id;

                  return (
                    <Card key={receipt.id} className="p-4 sm:p-6 space-y-5 border-2 border-emerald-500/50 bg-slate-900/95 shadow-2xl rounded-2xl">
                      {/* Header */}
                      <div className="space-y-3 border-b border-slate-800 pb-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono text-base sm:text-lg font-black text-emerald-300 bg-emerald-950 border border-emerald-700 px-3.5 py-1.5 rounded-xl shadow-inner">
                              {receipt.receipt_number}
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-slate-300 bg-slate-800 border border-slate-700 px-3 py-1 rounded-lg">
                              أمر شراء: <span className="font-mono text-cyan-300">{receipt.purchase_order?.po_number}</span>
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm pt-1">
                          <div className="flex items-center gap-2 text-slate-200 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                            <span className="text-base">🏢</span>
                            <div>
                              <span className="text-slate-400 block text-[11px]">المورد:</span>
                              <span className="font-bold text-slate-100">{receipt.purchase_order?.supplier?.company_name || 'مورد غير محدد'}</span>
                            </div>
                          </div>

                          {receipt.warehouse_keeper && (
                            <div className="flex items-center gap-2 text-amber-300 bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/50">
                              <span className="text-base">📦</span>
                              <div>
                                <span className="text-amber-400/80 block text-[11px]">أمين المخزن:</span>
                                <span className="font-bold">{receipt.warehouse_keeper.name}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {receipt.warehouse_notes && (
                          <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 text-xs sm:text-sm text-amber-200">
                            <strong className="text-amber-400">ملاحظات أمين المخزن: </strong>
                            {receipt.warehouse_notes}
                          </div>
                        )}
                      </div>

                      {/* Items Cards */}
                      <div className="space-y-4">
                        <h4 className="text-xs sm:text-sm font-black text-emerald-300 flex items-center gap-2">
                          <span>🏗️</span> بنود الاستلام المطلوب فحصها هندسياً ({receipt.items?.length || 0} بنود):
                        </h4>

                        <div className="space-y-3.5">
                          {(receipt.items || []).map((item, idx) => {
                            const key = `receipt-${receipt.id}-${item.id}`;
                            const val = quantities[key] ?? String(item.received_quantity);

                            return (
                              <div
                                key={item.id}
                                className="rounded-2xl border-2 border-slate-700/80 bg-slate-950/90 p-4 sm:p-5 space-y-3.5 shadow-lg"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 font-black text-sm border border-emerald-500/40 shrink-0">
                                        #{idx + 1}
                                      </span>
                                      <h4 className="text-base sm:text-lg font-black text-slate-50 tracking-wide">
                                        {item.purchase_order_item?.item_description || item.purchase_order_item?.item?.name}
                                      </h4>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm">
                                  {(item.purchase_order_item?.item_reference || item.purchase_order_item?.pr_item?.item_reference) && (
                                    <span className="inline-flex items-center gap-1.5 font-mono text-cyan-200 bg-cyan-950 border border-cyan-700/80 px-3 py-1 rounded-xl font-black">
                                      <span>🏷️</span> قطعة الأرض: {item.purchase_order_item?.item_reference || item.purchase_order_item?.pr_item?.item_reference}
                                    </span>
                                  )}
                                  {(item.purchase_order_item?.region || item.purchase_order_item?.pr_item?.region) && (
                                    <span className="inline-flex items-center gap-1.5 text-amber-200 bg-amber-950 border border-amber-700/80 px-3 py-1 rounded-xl font-black">
                                      <span>📍</span> المنطقة: {item.purchase_order_item?.region || item.purchase_order_item?.pr_item?.region}
                                    </span>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 flex flex-col justify-between space-y-1">
                                    <span className="text-xs font-bold text-slate-400">الكمية المطلوبة بأمر الشراء:</span>
                                    <div className="font-mono text-lg sm:text-xl font-black text-slate-100 flex items-baseline gap-1.5">
                                      <span>{item.ordered_quantity}</span>
                                      <span className="text-sm font-bold text-slate-400">{getUnitLabel(item.purchase_order_item?.uom || '')}</span>
                                    </div>
                                  </div>

                                  <div className="rounded-xl border-2 border-emerald-500/70 bg-emerald-950/30 p-3.5 space-y-1.5 shadow-inner">
                                    <label className="text-xs font-black text-emerald-300 flex items-center justify-between">
                                      <span>الكمية المعتمدة ميدانياً:</span>
                                      <span className="text-[11px] font-normal text-emerald-400/80">(جاهزة للتعديل)</span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={val}
                                        onChange={(e) => setQuantities({ ...quantities, [key]: e.target.value })}
                                        className="w-full rounded-xl border-2 border-emerald-400 bg-slate-950 px-3.5 py-2 text-lg sm:text-xl text-emerald-300 font-black focus:ring-2 focus:ring-emerald-400 focus:outline-none shadow-inner"
                                      />
                                      <span className="text-sm sm:text-base font-black text-emerald-300 shrink-0 px-1">
                                        {getUnitLabel(item.purchase_order_item?.uom || '')}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-1 pt-1">
                                  <input
                                    type="text"
                                    placeholder="ملاحظات مهندس الموقع على هذا الصنف..."
                                    value={itemNotes[key] ?? (item.notes || '')}
                                    onChange={(e) => setItemNotes({ ...itemNotes, [key]: e.target.value })}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs sm:text-sm text-slate-200 focus:border-cyan-400 focus:outline-none"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* General Site Notes */}
                        <div className="space-y-1.5 pt-2">
                          <label className="text-xs sm:text-sm font-bold text-slate-300">ملاحظات واعتماد مهندس الموقع (اختياري):</label>
                          <textarea
                            rows={2}
                            value={notes[receipt.id] || ''}
                            onChange={(e) => setNotes({ ...notes, [receipt.id]: e.target.value })}
                            placeholder="ملاحظات مهندس الموقع على استلام وفحص المواد بالموقع..."
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs sm:text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                          />
                        </div>

                        {/* Big Submit Button */}
                        <div className="pt-3 border-t border-slate-800 space-y-2">
                          <Button
                            variant="success"
                            size="lg"
                            isLoading={isSavingThis}
                            onClick={() => approveReceipt(receipt)}
                            className="w-full font-black text-base sm:text-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3.5 rounded-2xl shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2"
                          >
                            <span>✓</span> اعتماد مطابق للموقع وإرسال للحسابات لصرف الدفعات
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 space-y-2 rounded-2xl border border-slate-800 bg-slate-900/60">
                <span className="text-4xl block">🏗️</span>
                <p className="text-base font-bold text-slate-200">لا توجد أذونات استلام بانتظار الاعتماد الميداني</p>
                <p className="text-xs text-slate-500">
                  تظهر هنا أذونات الاستلام المسجلة من أمين المخزن لاعتمادها هندسياً قبل إرسالها للحسابات.
                </p>
              </div>
            )
          )}
        </>
      )}

      {/* ── TAB 2: MATERIALS RECEIPT ARCHIVE (أرشيف استلام المواد) ── */}
      {activeTab === 'ARCHIVE' && (
        <div className="space-y-4 animate-fade-in">
          {visibleArchive.length > 0 ? (
            visibleArchive.map((receipt) => {
              const isExpanded = expandedArchiveId === receipt.id;
              const isApproved = receipt.status === 'APPROVED';
              const isPendingSite = receipt.status === 'PENDING_SITE_ENGINEER';

              return (
                <Card
                  key={`archive-${receipt.id}`}
                  className={`p-4 sm:p-6 space-y-4 border rounded-2xl transition-all ${
                    isApproved
                      ? 'border-emerald-800/70 bg-slate-900/90'
                      : 'border-slate-800 bg-slate-900/80'
                  }`}
                >
                  {/* Top Summary Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-sm sm:text-base font-black text-cyan-300 bg-cyan-950 border border-cyan-800/80 px-3 py-1 rounded-xl">
                        {receipt.receipt_number}
                      </span>
                      {receipt.purchase_order && (
                        <span className="text-xs sm:text-sm font-bold text-slate-300">
                          أمر شراء: <span className="font-mono text-cyan-400">{receipt.purchase_order.po_number}</span>
                        </span>
                      )}
                      <span className="text-xs sm:text-sm text-slate-300">
                        🏢 {receipt.purchase_order?.supplier?.company_name || 'مورد غير محدد'}
                      </span>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          isApproved
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800/60'
                            : isPendingSite
                            ? 'bg-amber-950 text-amber-300 border-amber-800/60'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {isApproved ? '✓ معتمد ومطابق (جاهز للحسابات)' : isPendingSite ? '⏳ بانتظار اعتماد مهندس الموقع' : receipt.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setExpandedArchiveId(isExpanded ? null : receipt.id)}
                        className="text-xs sm:text-sm font-bold rounded-xl"
                      >
                        {isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل والبنود ←'}
                      </Button>
                    </div>
                  </div>

                  {/* Audit Trail & Sign-offs Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-1">
                      <div className="flex items-center justify-between text-slate-400 font-bold">
                        <span>📦 استلام أمين المخزن:</span>
                        <span className="font-mono text-xs text-slate-500">
                          {receipt.received_at || receipt.created_at?.slice(0, 10) || '—'}
                        </span>
                      </div>
                      <p className="text-slate-100 font-bold text-sm sm:text-base">
                        {receipt.warehouse_keeper?.name || 'عم سلامة (أمين المخزن)'}
                      </p>
                      {receipt.warehouse_notes && (
                        <p className="text-amber-300 text-xs sm:text-sm bg-amber-950/30 p-2.5 rounded-lg border border-amber-900/40 mt-1">
                          «{receipt.warehouse_notes}»
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-1">
                      <div className="flex items-center justify-between text-slate-400 font-bold">
                        <span>👷 اعتماد مهندس الموقع:</span>
                        <span className="font-mono text-xs text-slate-500">
                          {isApproved ? 'تم الاعتماد الميداني' : 'قيد المراجعة'}
                        </span>
                      </div>
                      <p className="text-slate-100 font-bold text-sm sm:text-base">
                        {receipt.site_engineer?.name || receipt.purchase_order?.purchase_request?.site_engineer?.name || 'مهندس الموقع'}
                      </p>
                      {receipt.site_engineer_notes && (
                        <p className="text-emerald-300 text-xs sm:text-sm bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-900/40 mt-1">
                          «{receipt.site_engineer_notes}»
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Expanded Items Cards in Archive */}
                  {isExpanded && (
                    <div className="space-y-3 pt-3 border-t border-slate-800 animate-fade-in">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-300">تفاصيل البنود والكميات المسجلة في هذا الإذن:</h4>
                      <div className="space-y-2.5">
                        {(receipt.items || []).map((item, idx) => (
                          <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-cyan-400 font-bold text-xs">#{idx + 1}</span>
                                <span className="font-black text-sm text-slate-100">
                                  {item.purchase_order_item?.item_description || item.purchase_order_item?.item?.name}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              {(item.purchase_order_item?.item_reference || item.purchase_order_item?.pr_item?.item_reference) && (
                                <span className="font-mono text-cyan-300 bg-cyan-950/80 border border-cyan-800/60 px-2.5 py-0.5 rounded-lg font-bold">
                                  قطعة الأرض: {item.purchase_order_item?.item_reference || item.purchase_order_item?.pr_item?.item_reference}
                                </span>
                              )}
                              {(item.purchase_order_item?.region || item.purchase_order_item?.pr_item?.region) && (
                                <span className="text-amber-300 bg-amber-950/80 border border-amber-800/60 px-2.5 py-0.5 rounded-lg font-bold">
                                  المنطقة: {item.purchase_order_item?.region || item.purchase_order_item?.pr_item?.region}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm pt-1">
                              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                                <span className="text-slate-400 block text-[11px]">المطلوب بأمر الشراء:</span>
                                <span className="font-mono font-bold text-slate-200">
                                  {item.ordered_quantity} {getUnitLabel(item.purchase_order_item?.uom || '')}
                                </span>
                              </div>
                              <div className="bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/60">
                                <span className="text-emerald-400 block text-[11px]">المستلم الفعلي:</span>
                                <span className="font-mono font-black text-emerald-300">
                                  {item.received_quantity} {getUnitLabel(item.purchase_order_item?.uom || '')}
                                </span>
                              </div>
                            </div>
                            {item.notes && (
                              <p className="text-xs text-slate-400 bg-slate-900/60 p-2 rounded-lg">
                                ملاحظات: {item.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          ) : (
            <div className="p-12 text-center text-slate-400 space-y-2 rounded-2xl border border-slate-800 bg-slate-900/60">
              <span className="text-4xl block">🗄️</span>
              <p className="text-base font-bold text-slate-200">لا توجد سجلات في أرشيف الاستلام حتى الآن</p>
              <p className="text-xs text-slate-500">
                يتم أرشفة وحفظ كل إذن استلام فور تسجيله من أمين المخزن واعتماده من مهندس الموقع لتوثيق دورة الاستلام بالكامل.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PurchaseReceiptPage;
