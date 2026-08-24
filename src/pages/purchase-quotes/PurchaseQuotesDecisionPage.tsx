import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPendingQuoteRequestsApi, recommendPurchaseQuoteApi, decidePurchaseQuoteApi } from '../../api/purchaseQuotes';
import { PurchaseRequest, PurchaseRequestQuote, PurchaseRequestQuoteRecommendation } from '../../types/purchaseRequest';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { TableSkeleton } from '../../components/ui/StateFeedback';
import ErrorMessage from '../../components/ErrorMessage';
import { parseApiError } from '../../utils/apiError';
import { getUnitLabel } from '../../utils/units';
import TableColumnFilters from '../../components/ui/TableColumnFilters';
import { getDefaultDateFrom, getTodayInputDate } from '../../utils/dateFilters';

type DecisionMode = 'recommend' | 'executive';

const isGeneralManagerRequest = (request: PurchaseRequest): boolean =>
  request.is_general_manager_requester === true
  || request.requester_role === 'general_manager'
  || request.requester?.role === 'general_manager';

const renderRecommendationBadge = (
  rec: PurchaseRequestQuoteRecommendation | undefined,
  fallbackLabel: string = 'لم يرشح بعد'
) => {
  if (!rec) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-400">
        <span>⏳</span>
        <span>{fallbackLabel}</span>
      </span>
    );
  }

  const isRecommend = rec.decision === 'RECOMMEND';

  return (
    <div className="inline-flex flex-col gap-1 items-start">
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black shadow-sm ${
          isRecommend
            ? 'bg-emerald-950/90 border border-emerald-500/60 text-emerald-300'
            : 'bg-rose-950/90 border border-rose-500/60 text-rose-300'
        }`}
      >
        <span className="text-sm">{isRecommend ? '✅' : '❌'}</span>
        <span>{isRecommend ? 'مرشح' : 'مرفوض'}</span>
      </span>
      {rec.user?.name && (
        <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1 pr-0.5">
          <span className="text-slate-500">بواسطة:</span>
          <span className="text-slate-200">{rec.user.name}</span>
        </span>
      )}
    </div>
  );
};

interface PurchaseQuotesDecisionPageProps {
  mode: DecisionMode;
}

const modeCopy: Record<DecisionMode, { title: string; subtitle: string; action: string }> = {
  recommend: {
    title: 'ترشيح عروض الأسعار',
    subtitle: 'راجع عروض الموردين للطلبات المسندة إليك فقط وأرسل ترشيح القسم.',
    action: 'ترشيح هذا العرض',
  },
  executive: {
    title: 'القرار التنفيذي لعروض الأسعار',
    subtitle: 'راجع ترشيح الحسابات، ثم اختر العرض النهائي أو ارفض العروض.',
    action: 'اختيار العرض',
  },
};

export const PurchaseQuotesDecisionPage: React.FC<PurchaseQuotesDecisionPageProps> = ({ mode }) => {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<number, string>>({});
  const today = getTodayInputDate();
  const defaultDateFrom = getDefaultDateFrom();
  const [quoteFilters, setQuoteFilters] = useState({ item: '', supplier: '', unitPrice: '', total: '', currency: '', accounting: '', department: '', action: '', dateFrom: defaultDateFrom, dateTo: today });
  const [searchParams] = useSearchParams();
  const openRequestId = Number(searchParams.get('open') || 0);

  const copy = modeCopy[mode];
  const hasNonDateQuoteFilter = Boolean(quoteFilters.item || quoteFilters.supplier || quoteFilters.unitPrice || quoteFilters.total || quoteFilters.currency || quoteFilters.accounting || quoteFilters.department || quoteFilters.action);
  const ignoreDefaultQuoteDate = hasNonDateQuoteFilter && quoteFilters.dateFrom === defaultDateFrom && quoteFilters.dateTo === today;
  const visibleRequests = useMemo(() => {
    const contains = (value: unknown, filter: string) => !filter || String(value ?? '').toLocaleLowerCase('ar-EG').includes(filter.toLocaleLowerCase('ar-EG'));
    const source = (mode === 'executive' ? requests.filter(request => request.status === 'PENDING_EXECUTIVE_QUOTE_DECISION') : requests.filter(request => request.status === 'PENDING_QUOTE_RECOMMENDATIONS')).filter(request => { const requestDate = String(request.created_at || '').slice(0, 10); return request.id === openRequestId || ignoreDefaultQuoteDate || ((!quoteFilters.dateFrom || requestDate >= quoteFilters.dateFrom) && (!quoteFilters.dateTo || requestDate <= quoteFilters.dateTo)); });
    return source.map(request => ({ ...request, quotes: (request.quotes || []).filter(quote => {
      const primaryItem = request.items?.[0];
      const accounting = quote.recommendations?.find(item => item.role_type === 'ACCOUNTING');
      const department = isGeneralManagerRequest(request)
        ? undefined
        : quote.recommendations?.find(item => item.role_type === 'DEPARTMENT');
      return contains(`${primaryItem?.item_description || primaryItem?.item?.name || ''} ${primaryItem?.item_reference || ''} ${primaryItem?.region || ''}`, quoteFilters.item) && contains(quote.supplier?.company_name, quoteFilters.supplier) && contains(quote.unit_price, quoteFilters.unitPrice) && contains(quote.total_amount, quoteFilters.total) && contains(quote.currency, quoteFilters.currency) && contains(accounting?.decision === 'RECOMMEND' ? 'مرشح' : accounting ? 'مرفوض' : 'لم يرشح بعد', quoteFilters.accounting) && contains(department?.decision === 'RECOMMEND' ? 'مرشح' : department ? 'مرفوض' : 'لم يرشح بعد', quoteFilters.department) && contains(mode === 'executive' ? 'اختيار العرض رفض جميع العروض' : 'ترشيح هذا العرض رفض العرض', quoteFilters.action);
    })})).filter(request => (request.quotes || []).length > 0);
  }, [mode, requests, quoteFilters, ignoreDefaultQuoteDate, openRequestId]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await getPendingQuoteRequestsApi());
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const act = async (request: PurchaseRequest, quote: PurchaseRequestQuote, decision: 'RECOMMEND' | 'REJECT' | 'SELECT') => {
    setSavingId(quote.id);
    setError(null);
    setSuccess(null);
    try {
      if (mode === 'executive') {
        await decidePurchaseQuoteApi(quote.id, decision === 'SELECT' ? 'SELECT' : 'REJECT', comments[quote.id]);
        setSuccess(decision === 'SELECT' ? 'تم اختيار العرض بنجاح، وعاد الطلب إلى مدير المشتريات لإنشاء أمر الشراء.' : 'تم رفض عروض الأسعار والطلب بنجاح.');
        setRequests(current => current.filter(r => r.id !== request.id));
      } else {
        const updatedRequest = await recommendPurchaseQuoteApi(
          quote.id,
          decision === 'REJECT' ? 'REJECT' : 'RECOMMEND',
          comments[quote.id],
        );
        setSuccess(
          decision === 'REJECT'
            ? 'تم تسجيل القرار ورفض العرض بنجاح.'
            : updatedRequest.status === 'PENDING_EXECUTIVE_QUOTE_DECISION'
              ? updatedRequest.is_general_manager_requester
                ? 'تم ترشيح العرض بنجاح. اكتمل ترشيح الحسابات، وتم إرسال الطلب إلى المدير العام لاتخاذ القرار النهائي.'
                : 'تم ترشيح العرض بنجاح. اكتملت ترشيحات الحسابات ومدير القسم، وتم إرسال الطلب إلى المدير التنفيذي لاتخاذ القرار النهائي.'
              : updatedRequest.is_general_manager_requester
                ? 'تم ترشيح العرض بنجاح. تم إرسال الطلب لقرار المدير العام.'
                : 'تم ترشيح العرض بنجاح واكتمال دورك، تم إرسال الطلب للمتابعة.',
        );
        setRequests(current => current.filter(r => r.id !== request.id));
      }
      await load();
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <TableSkeleton rows={5} columns={7} className="min-h-[360px]" />;

  return (
    <div className="space-y-5" dir="rtl">
      <div>
        <h1 className="text-xl font-black text-slate-100">{copy.title}</h1>
        <p className="mt-1 text-sm text-slate-400">{copy.subtitle}</p>
      </div>
      {error && <ErrorMessage error={error} onDismiss={() => setError(null)} />}
      {success && (
        <div role="status" className="rounded-xl border border-emerald-700/70 bg-emerald-950/50 px-4 py-3 text-sm font-bold text-emerald-200 shadow-lg">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-base" aria-hidden="true">✓</span>
            <p>{success}</p>
            <button type="button" onClick={() => setSuccess(null)} className="mr-auto text-emerald-300 hover:text-white" aria-label="إغلاق رسالة النجاح">×</button>
          </div>
        </div>
      )}
      {!visibleRequests.length && <Card className="py-12 text-center text-slate-400">لا توجد عروض أسعار تحتاج إلى إجراء حاليًا.</Card>}
      {visibleRequests.map(request => (
        <Card key={request.id} className={`space-y-4 ${request.id === openRequestId ? 'border-cyan-400/80 ring-2 ring-cyan-400/20' : ''}`}>
          <div className="flex flex-col gap-2 border-b border-slate-800 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-bold text-cyan-300 font-mono">طلب {request.request_number}</h2>
                {request.date_needed && (
                  <span className="rounded-full border border-amber-700/60 bg-amber-950/30 px-2.5 py-0.5 text-xs font-mono font-bold text-amber-300">
                    ⏳ تاريخ الاحتياج: {request.date_needed}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {request.requester?.name || '—'} — {request.department?.name || '—'}
                {isGeneralManagerRequest(request) && <span className="mr-2 font-bold text-amber-300">طلب المدير العام — لا يحتاج ترشيح القسم</span>}
              </p>
            </div>
          </div>
          {mode === 'executive' && (() => {
            const accountingRecommendation = request.quotes?.flatMap(quote => (quote.recommendations || []).map(recommendation => ({ recommendation, quote }))).find(entry => entry.recommendation.role_type === 'ACCOUNTING' && entry.recommendation.decision === 'RECOMMEND');
            const departmentRecommendation = request.quotes?.flatMap(quote => (quote.recommendations || []).map(recommendation => ({ recommendation, quote }))).find(entry => entry.recommendation.role_type === 'DEPARTMENT' && entry.recommendation.decision === 'RECOMMEND');
            const executiveOwnRequest = isGeneralManagerRequest(request);
            return (
              <div className={`grid gap-3 rounded-xl border border-cyan-900/70 bg-slate-950/70 p-4 text-sm ${executiveOwnRequest ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
                <div className="rounded-lg border border-emerald-800/70 bg-emerald-950/20 px-3 py-2 font-bold text-emerald-200">
                  <div className="text-xs text-emerald-400">ترشيح الحسابات</div>
                  <div className="mt-1">{accountingRecommendation ? `${accountingRecommendation.recommendation.user?.name || 'الحسابات'} رشّح ${accountingRecommendation.quote.supplier?.company_name || 'هذا العرض'}` : 'لم يصل ترشيح الحسابات بعد'}</div>
                </div>
                {!executiveOwnRequest && (
                  <div className="rounded-lg border border-amber-800/70 bg-amber-950/20 px-3 py-2 font-bold text-amber-200">
                    <div className="text-xs text-amber-400">ترشيح مدير القسم</div>
                    <div className="mt-1">{departmentRecommendation ? `${departmentRecommendation.recommendation.user?.name || 'مدير القسم'} رشّح ${departmentRecommendation.quote.supplier?.company_name || 'هذا العرض'}` : 'لم يصل ترشيح مدير القسم بعد'}</div>
                  </div>
                )}
              </div>
            );
          })()}
          <TableColumnFilters filters={[{ key: 'item', label: 'الصنف / القطعة / المنطقة', value: quoteFilters.item, onChange: (value) => setQuoteFilters(current => ({ ...current, item: value })) }, { key: 'supplier', label: 'المورد', value: quoteFilters.supplier, onChange: (value) => setQuoteFilters(current => ({ ...current, supplier: value })) }, { key: 'unitPrice', label: 'سعر الوحدة', type: 'number', value: quoteFilters.unitPrice, onChange: (value) => setQuoteFilters(current => ({ ...current, unitPrice: value })) }, { key: 'total', label: 'الإجمالي', type: 'number', value: quoteFilters.total, onChange: (value) => setQuoteFilters(current => ({ ...current, total: value })) }, { key: 'currency', label: 'العملة', value: quoteFilters.currency, onChange: (value) => setQuoteFilters(current => ({ ...current, currency: value })) }, { key: 'accounting', label: 'ترشيح الحسابات', value: quoteFilters.accounting, onChange: (value) => setQuoteFilters(current => ({ ...current, accounting: value })) }, { key: 'department', label: 'ترشيح القسم', value: quoteFilters.department, onChange: (value) => setQuoteFilters(current => ({ ...current, department: value })) }, { key: 'action', label: 'الإجراء', value: quoteFilters.action, onChange: (value) => setQuoteFilters(current => ({ ...current, action: value })) }, { key: 'dateFrom', label: 'من تاريخ الطلب', type: 'date', value: quoteFilters.dateFrom, onChange: (value) => setQuoteFilters(current => ({ ...current, dateFrom: value })) }, { key: 'dateTo', label: 'إلى تاريخ الطلب', type: 'date', value: quoteFilters.dateTo, onChange: (value) => setQuoteFilters(current => ({ ...current, dateTo: value })) }]} hasActiveFilters={Boolean(hasNonDateQuoteFilter || quoteFilters.dateFrom !== defaultDateFrom || quoteFilters.dateTo !== today)} onClear={() => setQuoteFilters({ item: '', supplier: '', unitPrice: '', total: '', currency: '', accounting: '', department: '', action: '', dateFrom: defaultDateFrom, dateTo: today })} />
          
          <div className="hidden min-w-0 md:block">
            <div className="overflow-x-auto">
              <Table className="min-w-[1120px] text-sm">
                <TableHeader className="border-b-2 border-cyan-800/70 bg-slate-950"><TableRow className="border-b border-slate-700/80"><TableHead className="border-l border-slate-700/80 text-sm font-black text-slate-100">الصنف / القطعة / المنطقة</TableHead><TableHead className="border-l border-slate-700/80 text-sm font-black text-slate-100">المورد</TableHead><TableHead className="border-l border-slate-700/80 text-sm font-black text-slate-100">سعر الوحدة</TableHead><TableHead className="border-l border-slate-700/80 text-sm font-black text-slate-100">الإجمالي</TableHead><TableHead className="border-l border-slate-700/80 text-sm font-black text-slate-100">العملة</TableHead><TableHead className="border-l border-slate-700/80 text-sm font-black text-slate-100">ترشيح الحسابات</TableHead><TableHead className="border-l border-slate-700/80 text-sm font-black text-slate-100">ترشيح القسم (إن لزم)</TableHead><TableHead className="text-center text-sm font-black text-slate-100">الإجراء</TableHead></TableRow></TableHeader>
                <TableBody className="divide-y divide-slate-700/80">
                  {(request.quotes || []).map(quote => {
                    const primaryItem = request.items?.[0];
                    const accounting = quote.recommendations?.find(item => item.role_type === 'ACCOUNTING');
                    const department = quote.recommendations?.find(item => item.role_type === 'DEPARTMENT');
                    return <TableRow key={quote.id} className="border-b border-slate-700/80 even:bg-slate-800/25">
                      <TableCell className="min-w-[240px] border-l border-slate-700/70 align-top text-sm">
                        <div className="font-bold text-slate-100">{primaryItem?.item_description || primaryItem?.item?.name || '—'}</div>
                        <div className="font-mono text-xs text-cyan-300">رقم قطعة الأرض: {primaryItem?.item_reference || '—'}</div>
                        <div className="text-xs text-slate-400">المنطقة: {primaryItem?.region || '—'} — الوحدة: {getUnitLabel(primaryItem?.uom)} — الكمية: {primaryItem?.quantity || '—'}</div>
                      </TableCell>
                      <TableCell className="min-w-[190px] border-l border-slate-700/70 align-top text-sm font-black text-slate-100">{quote.supplier?.company_name || '—'}</TableCell>
                      <TableCell className="border-l border-slate-700/70 align-top font-mono text-sm font-black text-amber-300">{quote.unit_price || '—'} ج.م</TableCell><TableCell className="border-l border-slate-700/70 align-top font-mono text-sm font-black text-emerald-300">{quote.total_amount} ج.م</TableCell>
                      <TableCell className="border-l border-slate-700/70 align-top text-sm font-bold text-slate-200">{quote.currency}</TableCell>
                        <TableCell className="border-l border-slate-700/70 align-top text-sm font-bold text-slate-200">
                          {renderRecommendationBadge(accounting)}
                        </TableCell>
                        <TableCell className="border-l border-slate-700/70 align-top text-sm font-bold text-slate-200">
                          {isGeneralManagerRequest(request) ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-950/80 border border-cyan-500/50 text-cyan-300">
                              <span>👑</span>
                              <span>قرار المدير العام مباشرة</span>
                            </span>
                          ) : (
                            renderRecommendationBadge(department)
                          )}
                        </TableCell>
                      <TableCell className="min-w-[250px] border-l border-slate-700/70 align-top text-sm">
                        <input value={comments[quote.id] || ''} onChange={event => setComments(current => ({ ...current, [quote.id]: event.target.value }))} placeholder="تعليق اختياري" className="mb-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100" />
                        <div className="flex justify-center gap-2">
                          <Button size="sm" variant={mode === 'executive' ? 'primary' : 'success'} disabled={savingId === quote.id} onClick={() => void act(request, quote, mode === 'executive' ? 'SELECT' : 'RECOMMEND')}>{mode === 'executive' ? copy.action : copy.action}</Button>
                          <Button size="sm" variant="danger" disabled={savingId === quote.id} onClick={() => void act(request, quote, 'REJECT')}>{mode === 'executive' ? 'رفض جميع العروض' : 'رفض العرض'}</Button>
                        </div>
                      </TableCell>
                    </TableRow>;
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {(request.quotes || []).map(quote => {
              const primaryItem = request.items?.[0];
              const accounting = quote.recommendations?.find(item => item.role_type === 'ACCOUNTING');
              const department = quote.recommendations?.find(item => item.role_type === 'DEPARTMENT');
              return (
                <article key={`mobile-quote-${quote.id}`} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                  <div className="flex min-w-0 items-start justify-between gap-3 border-b border-slate-800 pb-3">
                    <span className="min-w-0 break-normal font-black text-sm text-slate-100">
                      {quote.supplier?.company_name || 'غير محدد'}
                    </span>
                    <span className="shrink-0 font-mono text-sm font-black text-emerald-400">
                      {quote.total_amount} {quote.currency || 'ج.م'}
                    </span>
                  </div>
                  <dl className="mt-3 grid min-w-0 grid-cols-1 gap-3 text-xs min-[420px]:grid-cols-2">
                    <div className="min-w-0 min-[420px]:col-span-2">
                      <dt className="text-slate-500">الصنف / الوصف</dt>
                      <dd className="mt-1 font-bold text-slate-200 break-normal">
                        {primaryItem?.item_description || primaryItem?.item?.name || '—'}
                      </dd>
                    </div>
                    {primaryItem?.item_reference && (
                      <div>
                        <dt className="text-slate-500">رقم القطعة</dt>
                        <dd className="mt-1 font-mono text-cyan-300">{primaryItem.item_reference}</dd>
                      </div>
                    )}
                    {primaryItem?.region && (
                      <div>
                        <dt className="text-slate-500">المنطقة</dt>
                        <dd className="mt-1 text-slate-300">{primaryItem.region}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-slate-500">الكمية</dt>
                      <dd className="mt-1 font-mono text-slate-300">
                        {primaryItem?.quantity || '—'} {getUnitLabel(primaryItem?.uom)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">سعر الوحدة</dt>
                      <dd className="mt-1 font-mono font-bold text-amber-300">
                        {quote.unit_price || '—'} ج.م
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 mb-1">ترشيح الحسابات</dt>
                      <dd className="mt-0.5">
                        {renderRecommendationBadge(accounting)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 mb-1">ترشيح القسم</dt>
                      <dd className="mt-0.5">
                        {isGeneralManagerRequest(request) ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-950/80 border border-cyan-500/50 text-cyan-300">
                            <span>👑</span>
                            <span>قرار المدير العام مباشرة</span>
                          </span>
                        ) : (
                          renderRecommendationBadge(department)
                        )}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4 space-y-2 border-t border-slate-800 pt-3">
                    <input
                      value={comments[quote.id] || ''}
                      onChange={event => setComments(current => ({ ...current, [quote.id]: event.target.value }))}
                      placeholder="تعليق اختياري"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 min-h-10"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant={mode === 'executive' ? 'primary' : 'success'}
                        disabled={savingId === quote.id}
                        onClick={() => void act(request, quote, mode === 'executive' ? 'SELECT' : 'RECOMMEND')}
                        className="w-full min-h-10"
                      >
                        {mode === 'executive' ? copy.action : copy.action}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={savingId === quote.id}
                        onClick={() => void act(request, quote, 'REJECT')}
                        className="w-full min-h-10"
                      >
                        {mode === 'executive' ? 'رفض جميع العروض' : 'رفض العرض'}
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default PurchaseQuotesDecisionPage;
