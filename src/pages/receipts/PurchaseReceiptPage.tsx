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
  getWarehouseReceiptQueueApi,
  updatePurchaseReceiptApi,
  ReceiptPurchaseOrder,
  ReceiptRecord,
} from '../../api/purchaseReceipts';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';

type ReceiptMode = 'warehouse' | 'site';

export const PurchaseReceiptPage: React.FC<{ mode: ReceiptMode }> = ({ mode }) => {
  const [orders, setOrders] = useState<ReceiptPurchaseOrder[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
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
        const data = await getWarehouseReceiptQueueApi();
        setOrders(data);
      } else {
        const data = await getAssignedReceiptsApi();
        setReceipts(data);
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
    setSaving(receipt.id);
    setError(null);
    try {
      await approvePurchaseReceiptApi(receipt.id, notes[receipt.id]);
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
                  ? 'bg-amber-600/30 border border-amber-500/50 text-amber-300'
                  : 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300'
              }`}
            >
              {mode === 'warehouse' ? '📦' : '🏗️'}
            </span>
            <div>
              <h1 className="text-xl font-black text-slate-100 flex items-center gap-2.5 flex-wrap">
                {mode === 'warehouse' ? 'مهام استلام المواد بالمخزن' : 'مهام فحص واعتماد الاستلام الميداني'}
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
                  ? 'قم بفحص بضاعة الموردين ومطابقة الأصناف والمواصفات والكميات، ثم سجّل المستلم واضغط "إرسال إلى مهندس الموقع".'
                  : 'راجع استلام المخزن وافحص المواد هندسياً وفنياً في الموقع للتأكد من مطابقتها قبل الاعتماد النهائي وإرسالها للحسابات.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="rounded-xl border border-emerald-700/60 bg-emerald-950/50 p-4 text-sm font-bold text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-emerald-400 hover:text-white"
          >
            إغلاق
          </button>
        </div>
      )}

      {error && <ErrorMessage error={error} onDismiss={() => setError(null)} />}

      <TableFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={
          mode === 'warehouse'
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
        resultCount={mode === 'warehouse' ? visibleOrders.length : visibleReceipts.length}
        totalCount={mode === 'warehouse' ? orders.length : receipts.length}
        resultLabel="مهمة استلام"
      />

      {/* ── Warehouse Keeper Orders List ── */}
      {mode === 'warehouse' &&
        visibleOrders.map((order) => {
          const isExpanded = expandedOrderId === order.id;
          return (
            <Card key={order.id} className="space-y-4 border-slate-800 bg-slate-900/90 shadow-md">
              {/* Header Box */}
              <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-xs font-black text-amber-300 font-mono">
                      {order.po_number}
                    </span>
                    <span className="text-xs text-slate-400">
                      طلب شراء:{' '}
                      <strong className="text-slate-200 font-mono">
                        {order.purchase_request?.request_number || '—'}
                      </strong>
                    </span>
                    {order.purchase_request?.project_name && (
                      <span className="rounded-md bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 text-xs text-cyan-300">
                        مشروع: {order.purchase_request.project_name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap pt-1">
                    <span>
                      المورد:{' '}
                      <strong className="text-amber-200">{order.supplier?.company_name || 'غير محدد'}</strong>
                      {order.supplier?.phone && <span className="mr-1 text-slate-500 font-mono" dir="ltr">({order.supplier.phone})</span>}
                    </span>
                    <span>•</span>
                    <span>
                      القسم:{' '}
                      <strong className="text-slate-300">{order.purchase_request?.department?.name || '—'}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      صاحب الطلب:{' '}
                      <strong className="text-slate-300">{order.purchase_request?.requester?.name || '—'}</strong>
                    </span>
                    {order.purchase_request?.site_engineer && (
                      <>
                        <span>•</span>
                        <span>
                          مهندس الموقع:{' '}
                          <strong className="text-emerald-300">{order.purchase_request.site_engineer.name}</strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => setAllReceivedFull(order)}
                    title="ملء جميع الكميات المستلمة بالكميات المطلوبة تلقائياً"
                  >
                    استلام كامل الكميات ✓
                  </Button>
                </div>
              </div>

              {/* Items Table / Cards */}
              <div className="space-y-3">
                <div className="hidden min-w-0 md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-950/50">
                        <TableHead className="whitespace-nowrap">اسم الصنف والكود</TableHead>
                        <TableHead className="whitespace-nowrap">المواصفات الفنية</TableHead>
                        <TableHead className="whitespace-nowrap">رقم القطعة</TableHead>
                        <TableHead className="whitespace-nowrap">المنطقة</TableHead>
                        <TableHead className="whitespace-nowrap">الكمية المطلوبة</TableHead>
                        <TableHead className="whitespace-nowrap">الكمية المستلمة بالمخزن</TableHead>
                        <TableHead className="whitespace-nowrap">ملاحظات الصنف</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(order.items || []).map((item) => {
                        const itemName = item.item?.name || (item as any).item_name || item.item_description || item.pr_item?.item_description || '—';
                        const spec = item.specifications || item.pr_item?.specifications || '—';
                        return (
                          <TableRow key={item.id} className="hover:bg-slate-800/40">
                            <TableCell className="max-w-[240px]">
                              <div className="font-black text-slate-100 text-sm">
                                {itemName}
                              </div>
                              {item.item?.sku && (
                                <div className="text-[11px] font-mono text-cyan-400 mt-0.5">
                                  كود: {item.item.sku}
                                </div>
                              )}
                              {item.item?.category?.name && (
                                <div className="text-[10px] text-slate-500">
                                  التصنيف: {item.item.category.name}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px] text-xs text-slate-300">
                              <p className="line-clamp-2" title={spec}>
                                {spec}
                              </p>
                            </TableCell>
                            <TableCell className="whitespace-nowrap font-mono text-cyan-300 text-xs">
                              {item.item_reference || '—'}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-slate-300">
                              {item.region || '—'}
                            </TableCell>
                            <TableCell className="whitespace-nowrap font-bold text-amber-200">
                              {item.quantity} {getUnitLabel(item.uom)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={quantities[`${order.id}-${item.id}`] ?? String(item.quantity)}
                                  onChange={(event) =>
                                    setQuantities((current) => ({
                                      ...current,
                                      [`${order.id}-${item.id}`]: event.target.value,
                                    }))
                                  }
                                  className="w-28 rounded-lg border border-amber-600/50 bg-slate-950 px-2.5 py-1.5 text-sm font-bold font-mono text-amber-300 focus:border-amber-400 focus:outline-none"
                                />
                                <span className="text-xs text-slate-400">{getUnitLabel(item.uom)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[160px]">
                              <input
                                type="text"
                                placeholder="ملاحظات الصنف..."
                                value={itemNotes[`${order.id}-${item.id}`] || ''}
                                onChange={(event) =>
                                  setItemNotes((current) => ({
                                    ...current,
                                    [`${order.id}-${item.id}`]: event.target.value,
                                  }))
                                }
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View */}
                <div className="space-y-3 md:hidden">
                  {(order.items || []).map((item) => (
                    <article
                      key={`mobile-warehouse-item-${item.id}`}
                      className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-100 text-sm">
                            {item.item?.name || item.item_description || 'غير محدد'}
                          </div>
                          {item.item?.sku && (
                            <div className="text-[11px] font-mono text-cyan-400">كود: {item.item.sku}</div>
                          )}
                        </div>
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300">
                          {item.quantity} {getUnitLabel(item.uom)}
                        </span>
                      </div>

                      {(item.specifications || item.pr_item?.specifications) && (
                        <div className="rounded-lg bg-slate-900 p-2 text-xs text-slate-300">
                          <span className="text-slate-500 block mb-0.5">المواصفات:</span>
                          {item.specifications || item.pr_item?.specifications}
                        </div>
                      )}

                      <dl className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <dt className="text-slate-500">رقم القطعة</dt>
                          <dd className="font-mono text-cyan-300">{item.item_reference || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">المنطقة</dt>
                          <dd className="text-slate-300">{item.region || '—'}</dd>
                        </div>
                      </dl>

                      <div className="pt-1">
                        <label className="text-xs font-bold text-slate-300 block mb-1">
                          الكمية المستلمة فعلياً ({getUnitLabel(item.uom)}):
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={quantities[`${order.id}-${item.id}`] ?? String(item.quantity)}
                          onChange={(event) =>
                            setQuantities((current) => ({
                              ...current,
                              [`${order.id}-${item.id}`]: event.target.value,
                            }))
                          }
                          className="h-10 w-full rounded-lg border border-amber-600/50 bg-slate-900 px-3 py-1 text-sm font-bold font-mono text-amber-300"
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              {/* Bottom Action / Notes Area */}
              <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 md:flex-row md:items-end md:justify-between">
                <label className="flex-1 text-xs text-slate-300">
                  <span className="font-bold">ملاحظات أمين المخزن العامة عن الإرسالية (إن وجدت):</span>
                  <textarea
                    value={notes[order.id] || ''}
                    onChange={(event) =>
                      setNotes((current) => ({ ...current, [order.id]: event.target.value }))
                    }
                    placeholder="اكتب أي ملاحظات عن حالة الاستلام أو التغليف أو النواقص إن وجدت..."
                    className="mt-1 min-h-16 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-sm text-slate-100 focus:border-amber-400 focus:outline-none"
                  />
                </label>
                <Button
                  variant="primary"
                  className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black shadow-lg"
                  isLoading={saving === order.id}
                  onClick={() => void submitWarehouseReceipt(order)}
                >
                  <span>📦 تسجيل الاستلام وإرساله لمهندس الموقع</span>
                </Button>
              </div>
            </Card>
          );
        })}

      {/* ── Site Engineer Assigned Receipts List ── */}
      {mode === 'site' &&
        visibleReceipts.map((receipt) => {
          const po = receipt.purchase_order;
          return (
            <Card key={receipt.id} className="space-y-4 border-slate-800 bg-slate-900/90 shadow-md">
              {/* Header Box */}
              <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-xs font-black text-emerald-300 font-mono">
                      {receipt.receipt_number}
                    </span>
                    <span className="text-xs text-slate-400">
                      أمر الشراء:{' '}
                      <strong className="text-cyan-300 font-mono">{po?.po_number || '—'}</strong>
                    </span>
                    {po?.purchase_request?.request_number && (
                      <span className="text-xs text-slate-400">
                        طلب الشراء:{' '}
                        <strong className="text-slate-200 font-mono">
                          {po.purchase_request.request_number}
                        </strong>
                      </span>
                    )}
                    <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                      بانتظار فحصك الهندسي بالموقع ⏳
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap pt-1">
                    <span>
                      المورد:{' '}
                      <strong className="text-slate-200">{po?.supplier?.company_name || 'غير محدد'}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      القسم:{' '}
                      <strong className="text-slate-300">
                        {po?.purchase_request?.department?.name || '—'}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      مستلم المخزن:{' '}
                      <strong className="text-amber-300">
                        {receipt.warehouse_keeper?.name || 'أمين المخزن'}
                      </strong>
                    </span>
                    {receipt.received_at && (
                      <>
                        <span>•</span>
                        <span>
                          تاريخ الاستلام:{' '}
                          <strong className="text-slate-300 font-mono">
                            {receipt.received_at.slice(0, 10)}
                          </strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Warehouse Keeper Notes Alert */}
              {receipt.warehouse_notes && (
                <div className="rounded-xl border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200 flex items-start gap-2">
                  <span className="text-base">📝</span>
                  <div>
                    <strong className="text-amber-300 block mb-0.5">ملاحظات أمين المخزن:</strong>
                    <p className="leading-5">{receipt.warehouse_notes}</p>
                  </div>
                </div>
              )}

              {/* Items Table */}
              <div className="space-y-3">
                <div className="hidden min-w-0 md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-950/50">
                        <TableHead className="whitespace-nowrap">الصنف والكود</TableHead>
                        <TableHead className="whitespace-nowrap">المواصفات الفنية</TableHead>
                        <TableHead className="whitespace-nowrap">الكمية المطلوبة بأمر الشراء</TableHead>
                        <TableHead className="whitespace-nowrap">المستلم المعتمد في الموقع</TableHead>
                        <TableHead className="whitespace-nowrap">رقم القطعة</TableHead>
                        <TableHead className="whitespace-nowrap">المنطقة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(receipt.items || []).map((item) => {
                        const poItem = item.purchase_order_item;
                        const spec =
                          poItem?.specifications ||
                          poItem?.pr_item?.specifications ||
                          poItem?.item_description ||
                          '—';
                        return (
                          <TableRow key={item.id} className="hover:bg-slate-800/40">
                            <TableCell className="max-w-[240px]">
                              <div className="font-black text-slate-100 text-sm">
                                {poItem?.item?.name || poItem?.item_description || '—'}
                              </div>
                              {poItem?.item?.sku && (
                                <div className="text-[11px] font-mono text-cyan-400 mt-0.5">
                                  كود: {poItem.item.sku}
                                </div>
                              )}
                              {poItem?.item?.category?.name && (
                                <div className="text-[10px] text-slate-500">
                                  التصنيف: {poItem.item.category.name}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px] text-xs text-slate-300">
                              <p className="line-clamp-2" title={spec}>
                                {spec}
                              </p>
                            </TableCell>
                            <TableCell className="whitespace-nowrap font-mono text-slate-300 font-bold">
                              {item.ordered_quantity} {getUnitLabel(poItem?.uom)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={
                                    quantities[`receipt-${receipt.id}-${item.id}`] ??
                                    String(item.received_quantity)
                                  }
                                  onChange={(event) =>
                                    setQuantities((current) => ({
                                      ...current,
                                      [`receipt-${receipt.id}-${item.id}`]: event.target.value,
                                    }))
                                  }
                                  className="w-28 rounded-lg border border-emerald-600/50 bg-slate-950 px-2.5 py-1.5 text-sm font-mono font-bold text-emerald-300 focus:border-emerald-400 focus:outline-none"
                                />
                                <span className="text-xs text-slate-400">{getUnitLabel(poItem?.uom)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap font-mono text-cyan-300 text-xs">
                              {poItem?.item_reference || '—'}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-slate-300">
                              {poItem?.region || '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View */}
                <div className="space-y-3 md:hidden">
                  {(receipt.items || []).map((item) => {
                    const poItem = item.purchase_order_item;
                    return (
                      <article
                        key={`mobile-site-item-${item.id}`}
                        className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-100 text-sm">
                              {poItem?.item?.name || poItem?.item_description || 'غير محدد'}
                            </div>
                            {poItem?.item?.sku && (
                              <div className="text-[11px] font-mono text-cyan-400">
                                كود: {poItem.item.sku}
                              </div>
                            )}
                          </div>
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                            مطلوب: {item.ordered_quantity} {getUnitLabel(poItem?.uom)}
                          </span>
                        </div>

                        {(poItem?.specifications || poItem?.pr_item?.specifications) && (
                          <div className="rounded-lg bg-slate-900 p-2 text-xs text-slate-300">
                            <span className="text-slate-500 block mb-0.5">المواصفات الفنية:</span>
                            {poItem.specifications || poItem.pr_item?.specifications}
                          </div>
                        )}

                        <dl className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <dt className="text-slate-500">رقم القطعة</dt>
                            <dd className="font-mono text-cyan-300">{poItem?.item_reference || '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">المنطقة</dt>
                            <dd className="text-slate-300">{poItem?.region || '—'}</dd>
                          </div>
                        </dl>

                        <div className="pt-1">
                          <label className="text-xs font-bold text-slate-300 block mb-1">
                            الكمية المعتمدة في الموقع ({getUnitLabel(poItem?.uom)}):
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={
                              quantities[`receipt-${receipt.id}-${item.id}`] ??
                              String(item.received_quantity)
                            }
                            onChange={(event) =>
                              setQuantities((current) => ({
                                ...current,
                                [`receipt-${receipt.id}-${item.id}`]: event.target.value,
                              }))
                            }
                            className="h-10 w-full rounded-lg border border-emerald-600/50 bg-slate-900 px-3 py-1 text-sm font-bold font-mono text-emerald-300"
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 md:flex-row md:items-end md:justify-between">
                <label className="flex-1 text-xs text-slate-300">
                  <span className="font-bold">ملاحظات مهندس الموقع والاعتماد الهندسي:</span>
                  <textarea
                    value={notes[receipt.id] || ''}
                    onChange={(event) =>
                      setNotes((current) => ({ ...current, [receipt.id]: event.target.value }))
                    }
                    placeholder="اكتب نتائج الفحص الهندسي والميداني والملاحظات إن وجدت..."
                    className="mt-1 min-h-16 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
                  />
                </label>
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <Button
                    variant="outline"
                    isLoading={saving === receipt.id}
                    onClick={() => void updateReceipt(receipt)}
                  >
                    حفظ التعديل
                  </Button>
                  <Button
                    variant="success"
                    className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 font-black shadow-lg"
                    isLoading={saving === receipt.id}
                    onClick={() => void approveReceipt(receipt)}
                  >
                    <span>🏗️ اعتماد الاستلام وإرساله للحسابات</span>
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}

      {((mode === 'warehouse' && !visibleOrders.length) || (mode === 'site' && !visibleReceipts.length)) && (
        <Card className="py-16 text-center text-slate-400 border-slate-800 bg-slate-900/60">
          <div className="text-4xl mb-3">{mode === 'warehouse' ? '📦' : '🏗️'}</div>
          <div className="font-bold text-slate-300 text-base">
            {(mode === 'warehouse' ? orders.length : receipts.length)
              ? 'لا توجد مهام استلام مطابقة للفلاتر المحددة.'
              : 'لا توجد مهام استلام معلقة حاليًا.'}
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {mode === 'warehouse'
              ? 'تظهر هنا أوامر الشراء المصدرة للموردين فور اعتمادها، لتسجيل استلام المواد بالمخزن.'
              : 'تظهر هنا أذون الاستلام المسجلة من أمين المخزن لفحصها واعتمادها هندسياً في الموقع.'}
          </p>
        </Card>
      )}
    </div>
  );
};

export default PurchaseReceiptPage;
