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
import { approvePurchaseReceiptApi, createPurchaseReceiptApi, getAssignedReceiptsApi, getWarehouseReceiptQueueApi, updatePurchaseReceiptApi, ReceiptPurchaseOrder, ReceiptRecord } from '../../api/purchaseReceipts';

type ReceiptMode = 'warehouse' | 'site';

import { useRealtimeRefresh, emitAppDataUpdated } from '../../hooks/useRealtimeRefresh';

export const PurchaseReceiptPage: React.FC<{ mode: ReceiptMode }> = ({ mode }) => {
  const [orders, setOrders] = useState<ReceiptPurchaseOrder[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const today = getTodayInputDate();
  const defaultDateFrom = getDefaultDateFrom();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(today);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      if (mode === 'warehouse') setOrders(await getWarehouseReceiptQueueApi());
      else setReceipts(await getAssignedReceiptsApi());
    } catch (err) {
      if (!silent) setError(parseApiError(err).message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { void load(false); }, [mode]);

  useRealtimeRefresh(() => { void load(true); });

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('ar-EG');
  const ignoreDefaultDateForSearch = Boolean(normalizedSearch) && isDefaultTodayRange(dateFrom, dateTo);
  const matchesFilter = (text: string, value: string) => (!normalizedSearch || text.toLocaleLowerCase('ar-EG').includes(normalizedSearch)) && (ignoreDefaultDateForSearch || ((!dateFrom || value >= dateFrom) && (!dateTo || value <= dateTo)));
  const visibleOrders = orders.filter((order) => matchesFilter([order.po_number, order.purchase_request?.request_number, order.supplier?.company_name, order.purchase_request?.department?.name].filter(Boolean).join(' '), String(order.created_at || order.purchase_request?.created_at || '').slice(0, 10)));
  const visibleReceipts = receipts.filter((receipt) => matchesFilter([receipt.receipt_number, receipt.purchase_order?.po_number, receipt.purchase_order?.supplier?.company_name].filter(Boolean).join(' '), String(receipt.received_at || receipt.created_at || '').slice(0, 10)));

  const submitWarehouseReceipt = async (order: ReceiptPurchaseOrder) => {
    const items = (order.items || []).map(item => ({
      purchase_order_item_id: item.id,
      received_quantity: Number(quantities[`${order.id}-${item.id}`] ?? item.quantity),
    }));
    if (items.some(item => Number.isNaN(item.received_quantity) || item.received_quantity < 0)) {
      setError('أدخل كميات مستلمة صحيحة لكل بند.');
      return;
    }
    setSaving(order.id);
    try {
      await createPurchaseReceiptApi(order.id, { items, warehouse_notes: notes[order.id] });
      await load();
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setSaving(null);
    }
  };

  const updateReceipt = async (receipt: ReceiptRecord) => {
    const items = (receipt.items || []).map(item => ({
      id: item.id,
      received_quantity: Number(quantities[`receipt-${receipt.id}-${item.id}`] ?? item.received_quantity),
    }));
    if (items.some(item => Number.isNaN(item.received_quantity) || item.received_quantity < 0)) {
      setError('أدخل كميات مستلمة صحيحة قبل حفظ التعديل.');
      return;
    }
    setSaving(receipt.id);
    try {
      await updatePurchaseReceiptApi(receipt.id, { items, site_engineer_notes: notes[receipt.id] });
      await load();
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setSaving(null);
    }
  };

  const approveReceipt = async (receipt: ReceiptRecord) => {
    setSaving(receipt.id);
    try {
      await approvePurchaseReceiptApi(receipt.id, notes[receipt.id]);
      await load();
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <TableSkeleton rows={5} columns={6} className="min-h-[360px]" />;

  return (
    <div className="space-y-5" dir="rtl">
      {/* ── Action Inbox Header ── */}
      <div className={`rounded-2xl border-2 p-4 sm:p-5 shadow-xl space-y-3 ${mode === 'warehouse' ? 'border-amber-500/40 bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900' : 'border-emerald-500/40 bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg font-black shadow-inner ${mode === 'warehouse' ? 'bg-amber-600/30 border border-amber-500/50 text-amber-300' : 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300'}`}>
              {mode === 'warehouse' ? '📦' : '🏗️'}
            </span>
            <div>
              <h1 className="text-lg font-black text-slate-100 flex items-center gap-2">
                {mode === 'warehouse' ? 'مهام استلام المواد بالمخزن' : 'مهام فحص واعتماد الاستلام الميداني'}
                {(mode === 'warehouse' ? orders.length : receipts.length) > 0 && (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${mode === 'warehouse' ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'}`}>
                    {(mode === 'warehouse' ? orders.length : receipts.length)} مهمة بانتظار إجرائك
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {mode === 'warehouse'
                  ? 'هذه أوامر الشراء المصدرة للموردين. فور وصول البضاعة للمخزن، سجّل الكميات المستلمة واضغط "إرسال إلى مهندس الموقع".'
                  : 'هذه أذون الاستلام المسجلة من أمين المخزن. افحص البضاعة هندسيًا وفنيًا في الموقع واضغط "اعتماد الاستلام وإرساله للحسابات".'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && <ErrorMessage error={error} onDismiss={() => setError(null)} />}
      <TableFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={mode === 'warehouse' ? 'بحث برقم أمر الشراء أو الطلب أو المورد...' : 'بحث برقم إذن الاستلام أو أمر الشراء أو المورد...'}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onClear={() => { setSearchTerm(''); setDateFrom(defaultDateFrom); setDateTo(today); }}
        hasActiveFilters={Boolean(searchTerm || dateFrom !== defaultDateFrom || dateTo !== today)}
        resultCount={mode === 'warehouse' ? visibleOrders.length : visibleReceipts.length}
        totalCount={mode === 'warehouse' ? orders.length : receipts.length}
        resultLabel="مهمة استلام"
      />

      {mode === 'warehouse' ? visibleOrders.map(order => (
        <Card key={order.id} className="space-y-4">
          <div className="flex flex-col gap-1 border-b border-slate-800 pb-3 md:flex-row md:items-center md:justify-between">
            <div><h2 className="font-bold text-cyan-300">أمر الشراء {order.po_number}</h2><p className="text-xs text-slate-400">{order.supplier?.company_name || '—'} — {order.purchase_request?.request_number || '—'}</p></div>
            <span className="text-xs text-amber-300">{order.purchase_request?.department?.name || '—'}</span>
          </div>
          <div className="hidden min-w-0 md:block"><Table><TableHeader><TableRow><TableHead className="whitespace-nowrap">الصنف</TableHead><TableHead className="whitespace-nowrap">رقم قطعة الأرض</TableHead><TableHead className="whitespace-nowrap">المنطقة</TableHead><TableHead className="whitespace-nowrap">المطلوب</TableHead><TableHead className="whitespace-nowrap">المستلم فعليًا</TableHead></TableRow></TableHeader><TableBody>{(order.items || []).map(item => <TableRow key={item.id}><TableCell className="max-w-[220px] font-bold">{item.item?.name || item.item_description}</TableCell><TableCell className="whitespace-nowrap font-mono">{item.item_reference || '—'}</TableCell><TableCell>{item.region || '—'}</TableCell><TableCell className="whitespace-nowrap">{item.quantity} {getUnitLabel(item.uom)}</TableCell><TableCell><input type="number" min="0" value={quantities[`${order.id}-${item.id}`] ?? String(item.quantity)} onChange={event => setQuantities(current => ({ ...current, [`${order.id}-${item.id}`]: event.target.value }))} className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100" /></TableCell></TableRow>)}</TableBody></Table></div><div className="space-y-3 md:hidden">{(order.items || []).map(item => <article key={`mobile-warehouse-item-${item.id}`} className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/70 p-4"><div className="break-normal font-bold leading-6 text-slate-100">{item.item?.name || item.item_description || 'غير محدد'}</div><dl className="mt-3 grid min-w-0 grid-cols-1 gap-3 text-xs min-[420px]:grid-cols-2"><div><dt className="text-slate-500">رقم قطعة الأرض</dt><dd className="mt-1 break-normal font-mono text-cyan-300">{item.item_reference || '—'}</dd></div><div><dt className="text-slate-500">المنطقة</dt><dd className="mt-1 break-normal text-slate-300">{item.region || 'غير محددة'}</dd></div><div><dt className="text-slate-500">المطلوب</dt><dd className="mt-1 whitespace-nowrap font-mono text-slate-200">{item.quantity} {getUnitLabel(item.uom)}</dd></div><div><dt className="text-slate-500">المستلم فعليًا</dt><dd className="mt-1"><input type="number" min="0" value={quantities[`${order.id}-${item.id}`] ?? String(item.quantity)} onChange={event => setQuantities(current => ({ ...current, [`${order.id}-${item.id}`]: event.target.value }))} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100" /></dd></div></dl></article>)}</div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><label className="flex-1 text-xs text-slate-300">ملاحظات الاستلام<textarea value={notes[order.id] || ''} onChange={event => setNotes(current => ({ ...current, [order.id]: event.target.value }))} className="mt-1 min-h-20 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-slate-100" /></label><Button variant="primary" isLoading={saving === order.id} onClick={() => void submitWarehouseReceipt(order)}>إرسال إلى مهندس الموقع</Button></div>
        </Card>
      )) : visibleReceipts.map(receipt => (
        <Card key={receipt.id} className="space-y-4">
          <div className="flex flex-col gap-1 border-b border-slate-800 pb-3 md:flex-row md:items-center md:justify-between"><div><h2 className="font-bold text-cyan-300">إذن الاستلام {receipt.receipt_number}</h2><p className="text-xs text-slate-400">أمر الشراء: {receipt.purchase_order?.po_number || '—'} — المورد: {receipt.purchase_order?.supplier?.company_name || '—'}</p></div><span className="text-xs text-amber-300">بانتظار اعتمادك</span></div>
          <div className="hidden min-w-0 md:block"><Table><TableHeader><TableRow><TableHead className="whitespace-nowrap">الصنف</TableHead><TableHead className="whitespace-nowrap">المطلوب</TableHead><TableHead className="whitespace-nowrap">المستلم</TableHead><TableHead className="whitespace-nowrap">رقم قطعة الأرض</TableHead><TableHead className="whitespace-nowrap">المنطقة</TableHead></TableRow></TableHeader><TableBody>{(receipt.items || []).map(item => <TableRow key={item.id}><TableCell className="max-w-[220px] font-bold">{item.purchase_order_item?.item?.name || item.purchase_order_item?.item_description || '—'}</TableCell><TableCell className="whitespace-nowrap">{item.ordered_quantity}</TableCell><TableCell><input type="number" min="0" value={quantities[`receipt-${receipt.id}-${item.id}`] ?? String(item.received_quantity)} onChange={event => setQuantities(current => ({ ...current, [`receipt-${receipt.id}-${item.id}`]: event.target.value }))} className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm font-mono text-emerald-300" /></TableCell><TableCell className="whitespace-nowrap font-mono">{item.purchase_order_item?.item_reference || '—'}</TableCell><TableCell>{item.purchase_order_item?.region || '—'}</TableCell></TableRow>)}</TableBody></Table></div><div className="space-y-3 md:hidden">{(receipt.items || []).map(item => <article key={`mobile-site-item-${item.id}`} className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/70 p-4"><div className="break-normal font-bold leading-6 text-slate-100">{item.purchase_order_item?.item?.name || item.purchase_order_item?.item_description || 'غير محدد'}</div><dl className="mt-3 grid min-w-0 grid-cols-1 gap-3 text-xs min-[420px]:grid-cols-2"><div><dt className="text-slate-500">المطلوب</dt><dd className="mt-1 whitespace-nowrap font-mono text-slate-200">{item.ordered_quantity}</dd></div><div><dt className="text-slate-500">المستلم</dt><dd className="mt-1"><input type="number" min="0" value={quantities[`receipt-${receipt.id}-${item.id}`] ?? String(item.received_quantity)} onChange={event => setQuantities(current => ({ ...current, [`receipt-${receipt.id}-${item.id}`]: event.target.value }))} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm font-mono text-emerald-300" /></dd></div><div><dt className="text-slate-500">رقم قطعة الأرض</dt><dd className="mt-1 break-normal font-mono text-cyan-300">{item.purchase_order_item?.item_reference || '—'}</dd></div><div><dt className="text-slate-500">المنطقة</dt><dd className="mt-1 break-normal text-slate-300">{item.purchase_order_item?.region || 'غير محددة'}</dd></div></dl></article>)}</div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><label className="flex-1 text-xs text-slate-300">ملاحظات مهندس الموقع<textarea value={notes[receipt.id] || ''} onChange={event => setNotes(current => ({ ...current, [receipt.id]: event.target.value }))} className="mt-1 min-h-20 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-slate-100" /></label><div className="flex flex-wrap gap-2"><Button variant="outline" isLoading={saving === receipt.id} onClick={() => void updateReceipt(receipt)}>حفظ التعديل</Button><Button variant="success" isLoading={saving === receipt.id} onClick={() => void approveReceipt(receipt)}>اعتماد الاستلام وإرساله للحسابات</Button></div></div>
        </Card>
      ))}

      {((mode === 'warehouse' && !visibleOrders.length) || (mode === 'site' && !visibleReceipts.length)) && <Card className="py-12 text-center text-slate-400">{(mode === 'warehouse' ? orders.length : receipts.length) ? 'لا توجد مهام مطابقة للفلاتر الحالية.' : 'لا توجد مهام استلام معلقة حاليًا.'}</Card>}
    </div>
  );
};

export default PurchaseReceiptPage;
