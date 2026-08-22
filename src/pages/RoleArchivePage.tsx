import React, { useEffect, useState } from 'react';
import { getMyArchiveApi, SystemEvent } from '../api/systemEvents';
import { parseApiError } from '../utils/apiError';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import { Card } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import TableColumnFilters from '../components/ui/TableColumnFilters';
import { getDefaultDateFrom, getTodayInputDate } from '../utils/dateFilters';

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'إنشاء',
  SUBMITTED: 'إرسال للمراجعة',
  REVIEW_STARTED: 'بدء المراجعة',
  APPROVED_BY_REVIEWER: 'اعتماد المراجع',
  APPROVED_BY_EXECUTIVE: 'اعتماد المدير التنفيذي',
  THREE_QUOTES_REQUIRED: 'بدء عروض الأسعار',
  THREE_QUOTES_SUBMITTED: 'إرسال عروض الأسعار',
  EXECUTIVE_SELECTED_QUOTE: 'اختيار العرض',
  EXECUTIVE_REJECTED_QUOTES: 'رفض العروض',
  PO_CREATED: 'إنشاء أمر الشراء',
  PO_ISSUED: 'إصدار أمر الشراء',
  RECEIPT_CREATED: 'إنشاء إذن الاستلام',
  RECEIPT_APPROVED: 'اعتماد إذن الاستلام',
  INVOICE_CREATED: 'تسجيل فاتورة المورد',
  PAYMENT_CREATED: 'تسجيل دفعة',
};

const ENTITY_LABELS: Record<string, string> = {
  'App\\Models\\PurchaseRequest': 'طلب شراء',
  'App\\Models\\PurchaseOrder': 'أمر شراء',
  'App\\Models\\PurchaseReceipt': 'إذن استلام',
  'App\\Models\\SupplierInvoice': 'فاتورة مورد',
};

export const RoleArchivePage: React.FC = () => {
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const today = getTodayInputDate();
  const defaultDateFrom = getDefaultDateFrom();
  const [filters, setFilters] = useState({ dateFrom: defaultDateFrom, dateTo: today, entity: '', action: '', from: '', to: '', description: '' });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setEvents(await getMyArchiveApi());
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const contains = (value: unknown, filter: string) => !filter || String(value ?? '').toLocaleLowerCase('ar-EG').includes(filter.toLocaleLowerCase('ar-EG'));
  const hasNonDateSearch = Boolean(filters.entity || filters.action || filters.from || filters.to || filters.description);
  const ignoreDefaultDateForSearch = hasNonDateSearch && filters.dateFrom === defaultDateFrom && filters.dateTo === today;
  const filteredEvents = events.filter((event) => { const eventDate = String(event.occurred_at || '').slice(0, 10); return (ignoreDefaultDateForSearch || ((!filters.dateFrom || eventDate >= filters.dateFrom) && (!filters.dateTo || eventDate <= filters.dateTo))) && contains(ENTITY_LABELS[event.entity_type || ''] || 'سجل مشتريات', filters.entity) && contains(ACTION_LABELS[event.action] || event.action, filters.action) && contains(event.from_state, filters.from) && contains(event.to_state, filters.to) && contains(event.description, filters.description); });

  if (loading) return <LoadingSpinner message="جاري تحميل أرشيف إجراءاتك..." />;

  return (
    <div className="space-y-5" dir="rtl">
      <div>
        <h1 className="text-xl font-black text-slate-100">أرشيف إجراءاتي</h1>
        <p className="mt-1 text-sm text-slate-400">سجل مستقل بكل ما نفذته داخل دورة المشتريات، مع انتقال الحالة من وإلى.</p>
      </div>
      {error && <ErrorMessage error={error} onDismiss={() => setError(null)} />}
      <TableColumnFilters filters={[{ key: 'dateFrom', label: 'من تاريخ', type: 'date', value: filters.dateFrom, onChange: (value) => setFilters(current => ({ ...current, dateFrom: value })) }, { key: 'dateTo', label: 'إلى تاريخ', type: 'date', value: filters.dateTo, onChange: (value) => setFilters(current => ({ ...current, dateTo: value })) }, { key: 'entity', label: 'نوع السجل', value: filters.entity, onChange: (value) => setFilters(current => ({ ...current, entity: value })) }, { key: 'action', label: 'الإجراء', value: filters.action, onChange: (value) => setFilters(current => ({ ...current, action: value })) }, { key: 'from', label: 'من الحالة', value: filters.from, onChange: (value) => setFilters(current => ({ ...current, from: value })) }, { key: 'to', label: 'إلى الحالة', value: filters.to, onChange: (value) => setFilters(current => ({ ...current, to: value })) }, { key: 'description', label: 'التفاصيل', value: filters.description, onChange: (value) => setFilters(current => ({ ...current, description: value })) }]} hasActiveFilters={Boolean(filters.dateFrom !== defaultDateFrom || filters.dateTo !== today || filters.entity || filters.action || filters.from || filters.to || filters.description)} onClear={() => setFilters({ dateFrom: defaultDateFrom, dateTo: today, entity: '', action: '', from: '', to: '', description: '' })} />
      <div className="hidden sm:block">
        <Card className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>التاريخ والوقت</TableHead><TableHead>نوع السجل</TableHead><TableHead>الإجراء</TableHead><TableHead>من الحالة</TableHead><TableHead>إلى الحالة</TableHead><TableHead>التفاصيل</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredEvents.length === 0 ? <TableRow><TableCell colSpan={6} className="py-12 text-center text-slate-400">لا توجد إجراءات مطابقة للفلاتر الحالية.</TableCell></TableRow> : filteredEvents.map((event) => <TableRow key={event.id}>
                <TableCell className="font-mono text-xs text-slate-300">{event.occurred_at ? new Date(event.occurred_at).toLocaleString('ar-EG') : '—'}</TableCell>
                <TableCell className="font-bold text-cyan-300">{ENTITY_LABELS[event.entity_type || ''] || 'سجل مشتريات'}</TableCell>
                <TableCell className="font-bold text-amber-300">{ACTION_LABELS[event.action] || event.action || 'إجراء'}</TableCell>
                <TableCell className="font-mono text-xs text-slate-400">{event.from_state || '—'}</TableCell>
                <TableCell className="font-mono text-xs text-emerald-300">{event.to_state || '—'}</TableCell>
                <TableCell className="max-w-[360px] text-xs leading-6 text-slate-300">{event.description || '—'}</TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
        </Card>
      </div>
      <div className="space-y-3 sm:hidden">
        {filteredEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 px-3 py-8 text-center text-xs text-slate-400">لا توجد إجراءات مطابقة للفلاتر الحالية.</div>
        ) : filteredEvents.map((event) => (
          <article key={`mobile-${event.id}`} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="min-w-0">
                <p className="text-[10px] text-slate-500">التاريخ والوقت</p>
                <p className="mt-1 break-words font-mono text-xs text-slate-200">{event.occurred_at ? new Date(event.occurred_at).toLocaleString('ar-EG') : '—'}</p>
              </div>
              <span className="shrink-0 rounded-full border border-cyan-800/70 bg-cyan-950/50 px-2 py-1 text-[10px] font-bold text-cyan-300">{ENTITY_LABELS[event.entity_type || ''] || 'سجل مشتريات'}</span>
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-xs min-[420px]:grid-cols-2">
              <div><dt className="text-slate-500">الإجراء</dt><dd className="mt-1 font-bold text-amber-300">{ACTION_LABELS[event.action] || event.action || 'إجراء'}</dd></div>
              <div><dt className="text-slate-500">من الحالة</dt><dd className="mt-1 break-words font-mono text-slate-300">{event.from_state || '—'}</dd></div>
              <div><dt className="text-slate-500">إلى الحالة</dt><dd className="mt-1 break-words font-mono text-emerald-300">{event.to_state || '—'}</dd></div>
              <div className="col-span-1 min-[420px]:col-span-2"><dt className="text-slate-500">التفاصيل</dt><dd className="mt-1 break-words leading-6 text-slate-300">{event.description || '—'}</dd></div>
            </dl>
          </article>
        ))}
      </div>
      <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => void load()}>تحديث الأرشيف</Button></div>
    </div>
  );
};

export default RoleArchivePage;
