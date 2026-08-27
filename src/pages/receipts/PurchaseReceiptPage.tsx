import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
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
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
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
      setActiveTab('ARCHIVE');
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setSaving(null);
    }
  };

  const updateReceipt = async (receipt: ReceiptRecord) => {
    const items = (receipt.items || []).map((item) => ({
      id: item.id,
      received_quantity: Number(quantities[`receipt-${receipt.id}-${item.id}`] ?? item.received_quantity),
      notes: itemNotes[`receipt-${receipt.id}-${item.id}`] || undefined,
    }));

    if (items.some((item) => Number.isNaN(item.received_quantity) || item.received_quantity < 0)) {
      setError('يرجى إدخال كميات مستلمة صحيحة قبل حفظ التعديل.');
      return;
    }

    setSaving(receipt.id);
    setError(null);
    try {
      await updatePurchaseReceiptApi(receipt.id, { items, site_engineer_notes: notes[receipt.id] });
      setSuccessMessage(`تم حفظ تعديل إذن الاستلام ${receipt.receipt_number} بنجاح.`);
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
      setActiveTab('ARCHIVE');
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
                  ? 'bg-amber-600/30 border border-amber-500/50 text-amber-300'
                  : 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300'
              }`}
            >
              {mode === 'warehouse' ? '📦' : '🏗️'}
            </span>
            <div>
              <h1 className="text-xl font-black text-slate-100 flex items-center gap-2.5 flex-wrap">
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
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'QUEUE'
              ? mode === 'warehouse'
                ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-950/40'
                : 'bg-emerald-600 text-white font-black shadow-lg shadow-emerald-950/40'
              : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <span>📦 مهام الاستلام المعلقة</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
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
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'ARCHIVE'
              ? 'bg-cyan-600 text-white font-black shadow-lg shadow-cyan-950/40'
              : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <span>🗄️ أرشيف استلام المواد</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
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
              <div className="space-y-5">
                {visibleOrders.map((order) => {
                  const isSavingThis = saving === order.id;

                  return (
                    <Card key={order.id} className="p-4 sm:p-6 space-y-5 border-2 border-amber-500/40 bg-slate-900/90 shadow-xl">
                      {/* Header with quick info & 1-click action */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono text-base font-black text-cyan-300 bg-cyan-950/90 border border-cyan-700/80 px-3 py-1 rounded-xl shadow-inner">
                              {order.po_number}
                            </span>
                            {order.purchase_request && (
                              <span className="text-xs font-bold text-slate-200 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg">
                                طلب #{order.purchase_request.request_number}
                              </span>
                            )}
                            <span className="text-xs font-bold text-slate-200 bg-slate-800/80 border border-slate-700/80 px-2.5 py-1 rounded-lg flex items-center gap-1">
                              <span>🏢</span> {order.supplier?.company_name || 'مورد غير محدد'}
                            </span>
                            {order.purchase_request?.site_engineer && (
                              <span className="text-xs font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-700/60 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <span>👷</span> مهندس الموقع: {order.purchase_request.site_engineer.name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            راجع الكميات بالأسفل ثم اضغط زر الاعتماد. الكميات مسجلة كاملة وجاهزة، يمكنك تعديل أي كمية مباشرة إذا كانت البضاعة ناقصة.
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="success"
                            size="md"
                            isLoading={isSavingThis}
                            onClick={() => submitWarehouseReceipt(order)}
                            className="font-black text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/50 px-5 py-2.5"
                          >
                            ✓ اعتماد واستلام المواد فوراً
                          </Button>
                        </div>
                      </div>

                      {/* Items Table - Always Open and Interactive */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                          <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                            <span>📦</span> بنود أمر الشراء والكميات المستلمة:
                          </h4>
                          <button
                            type="button"
                            onClick={() => setAllReceivedFull(order)}
                            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                          >
                            إعادة ضبط كافة الكميات للمطلوب بالكامل
                          </button>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-slate-800">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-950/80">
                                <TableHead className="w-12 text-center">#</TableHead>
                                <TableHead>اسم الصنف والمواصفات</TableHead>
                                <TableHead>الكمية المطلوبة بأمر الشراء</TableHead>
                                <TableHead className="w-48 bg-emerald-950/30 text-emerald-300 font-black">الكمية المستلمة فعلياً (جاهزة للتعديل)</TableHead>
                                <TableHead>ملاحظات البند (اختياري)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(order.items || []).map((item, idx) => {
                                const key = `${order.id}-${item.id}`;
                                const val = quantities[key] ?? String(item.quantity);

                                return (
                                  <TableRow key={item.id} className="hover:bg-slate-800/50 transition-colors">
                                    <TableCell className="font-mono text-center text-cyan-400 font-bold">{idx + 1}</TableCell>
                                    <TableCell>
                                      <div className="font-black text-sm text-slate-100">{item.item_description || item.item?.name}</div>
                                      {item.specifications && (
                                        <div className="text-[11px] text-slate-400 mt-0.5">{item.specifications}</div>
                                      )}
                                      <div className="flex items-center gap-2 flex-wrap text-[11px] mt-1.5">
                                        {(item.item_reference || item.pr_item?.item_reference) && (
                                          <span className="font-mono text-cyan-300 bg-cyan-950/70 border border-cyan-800/60 px-2 py-0.5 rounded font-bold">
                                            قطعة الأرض: {item.item_reference || item.pr_item?.item_reference}
                                          </span>
                                        )}
                                        {(item.region || item.pr_item?.region) && (
                                          <span className="text-amber-300 bg-amber-950/70 border border-amber-800/60 px-2 py-0.5 rounded font-bold">
                                            المنطقة: {item.region || item.pr_item?.region}
                                          </span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="font-mono font-bold text-slate-200">
                                      <span className="text-sm">{item.quantity}</span> {getUnitLabel(item.uom || '')}
                                    </TableCell>
                                    <TableCell className="bg-emerald-950/20">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          min="0"
                                          step="any"
                                          value={val}
                                          onChange={(e) => setQuantities({ ...quantities, [key]: e.target.value })}
                                          className="w-32 rounded-xl border-2 border-emerald-500/70 bg-slate-950 px-3 py-1.5 text-sm text-emerald-300 font-black focus:border-emerald-400 focus:outline-none shadow-inner"
                                        />
                                        <span className="text-xs text-slate-400 font-bold">{getUnitLabel(item.uom || '')}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <input
                                        type="text"
                                        placeholder="ملاحظات حالة البند إن وجدت..."
                                        value={itemNotes[key] || ''}
                                        onChange={(e) => setItemNotes({ ...itemNotes, [key]: e.target.value })}
                                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-400"
                                      />
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>

                        <div className="space-y-1 pt-1">
                          <label className="text-xs font-bold text-slate-300">ملاحظات عامة على الاستلام (اختياري):</label>
                          <textarea
                            rows={2}
                            value={notes[order.id] || ''}
                            onChange={(e) => setNotes({ ...notes, [order.id]: e.target.value })}
                            placeholder="مثال: تم فحص البضاعة ومطابقة الأختام، البضاعة سليمة وبحالة جيدة..."
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-slate-100 focus:border-cyan-400"
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
                          <span className="text-xs text-slate-400">
                            💡 بالضغط على الزر الأخضر، سيتم حفظ الاستلام فوراً وتحويل الإذن لمهندس الموقع للاعتماد.
                          </span>
                          <Button
                            variant="success"
                            size="md"
                            isLoading={isSavingThis}
                            onClick={() => submitWarehouseReceipt(order)}
                            className="w-full sm:w-auto font-black text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-6 py-2.5 shadow-lg shadow-emerald-950/50"
                          >
                            ✓ اعتماد واستلام المواد وإرسالها لمهندس الموقع
                          </Button>
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
              <div className="space-y-4">
                {visibleReceipts.map((receipt) => {
                  const isSavingThis = saving === receipt.id;

                  return (
                    <Card key={receipt.id} className="p-4 sm:p-5 space-y-4 border border-slate-800 bg-slate-900/80">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono text-sm font-black text-emerald-300 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-1 rounded-lg">
                            {receipt.receipt_number}
                          </span>
                          <span className="text-xs font-bold text-slate-300">
                            أمر شراء: <span className="font-mono text-cyan-400">{receipt.purchase_order?.po_number}</span>
                          </span>
                          <span className="text-xs text-slate-300">
                            🏢 {receipt.purchase_order?.supplier?.company_name || 'مورد غير محدد'}
                          </span>
                          {receipt.warehouse_keeper && (
                            <span className="text-xs text-amber-300 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded">
                              📦 أمين المخزن: {receipt.warehouse_keeper.name}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            isLoading={isSavingThis}
                            onClick={() => approveReceipt(receipt)}
                            className="font-bold text-xs"
                          >
                            ✓ اعتماد مطابق للموقع وإرسال للحسابات
                          </Button>
                        </div>
                      </div>

                      {/* Items List */}
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-950/80">
                            <TableHead className="w-12 text-center">#</TableHead>
                            <TableHead>الصنف</TableHead>
                            <TableHead>الكمية المطلوبة بأمر الشراء</TableHead>
                            <TableHead className="w-48 bg-emerald-950/30 text-emerald-300 font-black">الكمية المستلمة المعتمدة (جاهزة للتعديل)</TableHead>
                            <TableHead>ملاحظات فنية للموقع</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(receipt.items || []).map((item, idx) => {
                            const key = `receipt-${receipt.id}-${item.id}`;
                            const val = quantities[key] ?? String(item.received_quantity);

                            return (
                              <TableRow key={item.id} className="hover:bg-slate-800/50 transition-colors">
                                <TableCell className="font-mono text-center text-cyan-400 font-bold">{idx + 1}</TableCell>
                                <TableCell className="font-bold text-slate-100">
                                  <div>{item.purchase_order_item?.item_description || item.purchase_order_item?.item?.name}</div>
                                  <div className="flex items-center gap-2 flex-wrap text-[11px] mt-1 font-normal">
                                    {(item.purchase_order_item?.item_reference || item.purchase_order_item?.pr_item?.item_reference) && (
                                      <span className="font-mono text-cyan-300 bg-cyan-950/70 border border-cyan-800/60 px-2 py-0.5 rounded font-bold">
                                        قطعة الأرض: {item.purchase_order_item?.item_reference || item.purchase_order_item?.pr_item?.item_reference}
                                      </span>
                                    )}
                                    {(item.purchase_order_item?.region || item.purchase_order_item?.pr_item?.region) && (
                                      <span className="text-amber-300 bg-amber-950/70 border border-amber-800/60 px-2 py-0.5 rounded font-bold">
                                        المنطقة: {item.purchase_order_item?.region || item.purchase_order_item?.pr_item?.region}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono text-slate-300">
                                  {item.ordered_quantity} {getUnitLabel(item.purchase_order_item?.uom || '')}
                                </TableCell>
                                <TableCell className="bg-emerald-950/20">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      value={val}
                                      onChange={(e) => setQuantities({ ...quantities, [key]: e.target.value })}
                                      className="w-32 rounded-xl border-2 border-emerald-500/70 bg-slate-950 px-3 py-1.5 text-sm text-emerald-300 font-black focus:border-emerald-400 focus:outline-none shadow-inner"
                                    />
                                    <span className="text-xs text-slate-400 font-bold">{getUnitLabel(item.purchase_order_item?.uom || '')}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <input
                                    type="text"
                                    placeholder="ملاحظات مهندس الموقع..."
                                    value={itemNotes[key] ?? (item.notes || '')}
                                    onChange={(e) => setItemNotes({ ...itemNotes, [key]: e.target.value })}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-400"
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>

                      {receipt.warehouse_notes && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-2.5 text-xs text-amber-200">
                          <strong className="text-amber-400">ملاحظات أمين المخزن ({receipt.warehouse_keeper?.name}): </strong>
                          {receipt.warehouse_notes}
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">ملاحظات واعتماد مهندس الموقع:</label>
                        <textarea
                          rows={2}
                          value={notes[receipt.id] || ''}
                          onChange={(e) => setNotes({ ...notes, [receipt.id]: e.target.value })}
                          placeholder="ملاحظات مهندس الموقع على استلام وفحص المواد بالموقع..."
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-slate-100 focus:border-cyan-400"
                        />
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
                  className={`p-4 sm:p-5 space-y-4 border transition-all ${
                    isApproved
                      ? 'border-emerald-800/70 bg-slate-900/85'
                      : 'border-slate-800 bg-slate-900/70'
                  }`}
                >
                  {/* Top Summary Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-sm font-black text-cyan-300 bg-cyan-950/80 border border-cyan-800/60 px-2.5 py-1 rounded-lg">
                        {receipt.receipt_number}
                      </span>
                      {receipt.purchase_order && (
                        <span className="text-xs font-bold text-slate-300">
                          أمر شراء: <span className="font-mono text-cyan-400">{receipt.purchase_order.po_number}</span>
                        </span>
                      )}
                      <span className="text-xs text-slate-300">
                        🏢 {receipt.purchase_order?.supplier?.company_name || 'مورد غير محدد'}
                      </span>
                      {receipt.purchase_order?.purchase_request?.department && (
                        <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          قسم {receipt.purchase_order.purchase_request.department.name}
                        </span>
                      )}
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
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
                        className="text-xs font-bold"
                      >
                        {isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل والبنود ←'}
                      </Button>
                    </div>
                  </div>

                  {/* Audit Trail & Sign-offs Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-1">
                      <div className="flex items-center justify-between text-slate-400 font-bold">
                        <span>📦 استلام أمين المخزن:</span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {receipt.received_at || receipt.created_at?.slice(0, 10) || '—'}
                        </span>
                      </div>
                      <p className="text-slate-200 font-bold text-sm">
                        {receipt.warehouse_keeper?.name || 'عم سلامة (أمين المخزن)'}
                      </p>
                      {receipt.warehouse_notes && (
                        <p className="text-amber-300 text-xs bg-amber-950/30 p-2 rounded-lg border border-amber-900/40 mt-1">
                          «{receipt.warehouse_notes}»
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-1">
                      <div className="flex items-center justify-between text-slate-400 font-bold">
                        <span>👷 اعتماد مهندس الموقع:</span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {isApproved ? 'تم الاعتماد الميداني' : 'قيد المراجعة'}
                        </span>
                      </div>
                      <p className="text-slate-200 font-bold text-sm">
                        {receipt.site_engineer?.name || receipt.purchase_order?.purchase_request?.site_engineer?.name || 'مهندس الموقع'}
                      </p>
                      {receipt.site_engineer_notes && (
                        <p className="text-emerald-300 text-xs bg-emerald-950/30 p-2 rounded-lg border border-emerald-900/40 mt-1">
                          «{receipt.site_engineer_notes}»
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Expanded Items Table in Archive */}
                  {isExpanded && (
                    <div className="space-y-3 pt-2 border-t border-slate-800 animate-fade-in">
                      <h4 className="text-xs font-bold text-slate-300">تفاصيل البنود والكميات المسجلة في هذا الإذن:</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>الصنف</TableHead>
                            <TableHead>الكمية المطلوبة بأمر الشراء</TableHead>
                            <TableHead>الكمية المستلمة والمطابقة</TableHead>
                            <TableHead>الملاحظات الفنية</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(receipt.items || []).map((item, idx) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-mono text-cyan-400">{idx + 1}</TableCell>
                              <TableCell className="font-bold text-slate-100">
                                <div>{item.purchase_order_item?.item_description || item.purchase_order_item?.item?.name}</div>
                                <div className="flex items-center gap-2 flex-wrap text-[11px] mt-1 font-normal">
                                  {(item.purchase_order_item?.item_reference || item.purchase_order_item?.pr_item?.item_reference) && (
                                    <span className="font-mono text-cyan-300 bg-cyan-950/70 border border-cyan-800/60 px-2 py-0.5 rounded font-bold">
                                      قطعة الأرض: {item.purchase_order_item?.item_reference || item.purchase_order_item?.pr_item?.item_reference}
                                    </span>
                                  )}
                                  {(item.purchase_order_item?.region || item.purchase_order_item?.pr_item?.region) && (
                                    <span className="text-amber-300 bg-amber-950/70 border border-amber-800/60 px-2 py-0.5 rounded font-bold">
                                      المنطقة: {item.purchase_order_item?.region || item.purchase_order_item?.pr_item?.region}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-slate-300">
                                {item.ordered_quantity} {getUnitLabel(item.purchase_order_item?.uom || '')}
                              </TableCell>
                              <TableCell className="font-mono font-bold text-emerald-400">
                                {item.received_quantity} {getUnitLabel(item.purchase_order_item?.uom || '')}
                              </TableCell>
                              <TableCell className="text-slate-400 text-xs">{item.notes || '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
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
