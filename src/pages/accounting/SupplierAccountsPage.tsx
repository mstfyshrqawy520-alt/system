import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupplierAccountApi, getSupplierAccountsApi, SupplierAccountDetails, SupplierAccountSummary } from '../../api/supplierFinance';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import ErrorMessage from '../../components/ErrorMessage';
import TableColumnFilters from '../../components/ui/TableColumnFilters';
import { parseApiError } from '../../utils/apiError';

const money = (value: string | number | null | undefined) => `${Number(value || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;
const paymentMethods: Record<string, string> = { BANK_TRANSFER: 'تحويل بنكي', CASH: 'نقدي', CHEQUE: 'شيك' };

const SupplierAccountDetailsView: React.FC<{ selected: SupplierAccountDetails; onClose: () => void }> = ({ selected, onClose }) => (
  <Card className="space-y-5 border-cyan-800/60">
    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0"><h2 className="break-normal text-lg font-black text-slate-100">كشف حساب: {selected.supplier.company_name}</h2><p className="mt-1 break-normal text-xs text-slate-400">{selected.supplier.phone || 'بدون هاتف'} — {selected.supplier.email || 'بدون بريد'}</p></div>
      <button type="button" className="self-start text-sm text-slate-400 underline" onClick={onClose}>إغلاق الكشف</button>
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-xl bg-slate-950 p-4"><div className="text-xs text-slate-400">الفواتير</div><div className="mt-1 whitespace-nowrap font-mono font-black text-cyan-300">{money(selected.summary.total_invoiced)}</div></div>
      <div className="rounded-xl bg-slate-950 p-4"><div className="text-xs text-slate-400">المدفوع</div><div className="mt-1 whitespace-nowrap font-mono font-black text-emerald-300">{money(selected.summary.total_paid)}</div></div>
      <div className={`rounded-xl p-4 ${selected.summary.is_overpaid ? 'bg-rose-950/40' : 'bg-slate-950'}`}><div className="text-xs text-slate-400">الرصيد</div><div className={`mt-1 whitespace-nowrap font-mono font-black ${selected.summary.is_overpaid ? 'text-rose-300' : 'text-amber-300'}`}>{money(selected.summary.balance)}</div>{selected.summary.is_overpaid && <div className="mt-1 text-xs font-bold text-rose-300">تحذير: المدفوعات تجاوزت المديونية.</div>}</div>
    </div>

    <div>
      <h3 className="mb-2 text-sm font-black text-slate-200">الفواتير وأوامر الشراء</h3>
      <div className="hidden min-w-0 md:block">
        <Table><TableHeader><TableRow><TableHead className="whitespace-nowrap">الفاتورة</TableHead><TableHead className="whitespace-nowrap">أمر الشراء</TableHead><TableHead className="whitespace-nowrap">التاريخ</TableHead><TableHead className="whitespace-nowrap">المبلغ</TableHead><TableHead className="whitespace-nowrap">المدفوع</TableHead><TableHead className="whitespace-nowrap">المتبقي</TableHead><TableHead className="whitespace-nowrap">الحالة</TableHead></TableRow></TableHeader><TableBody>{selected.invoices.map(invoice => <TableRow key={invoice.id}><TableCell className="whitespace-nowrap font-mono text-cyan-300">{invoice.invoice_number}</TableCell><TableCell className="whitespace-nowrap font-mono">{invoice.purchase_order?.po_number || '—'}</TableCell><TableCell className="whitespace-nowrap">{invoice.invoice_date}</TableCell><TableCell className="whitespace-nowrap font-mono">{money(invoice.amount)}</TableCell><TableCell className="whitespace-nowrap font-mono text-emerald-300">{money(invoice.paid_amount)}</TableCell><TableCell className="whitespace-nowrap font-mono text-amber-300">{money(invoice.outstanding_amount)}</TableCell><TableCell className="whitespace-nowrap">{invoice.status === 'PAID' ? 'مدفوعة' : invoice.status === 'PARTIALLY_PAID' ? 'جزئية' : invoice.status === 'OPEN' ? 'مفتوحة' : invoice.status}</TableCell></TableRow>)}</TableBody></Table>
      </div>
      <div className="space-y-3 md:hidden">{selected.invoices.map(invoice => <article key={`mobile-invoice-${invoice.id}`} className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/70 p-4"><div className="flex min-w-0 items-start justify-between gap-3"><span className="min-w-0 break-normal font-mono text-sm font-black text-cyan-300">{invoice.invoice_number}</span><span className="shrink-0 text-[11px] text-slate-300">{invoice.status === 'PAID' ? 'مدفوعة' : invoice.status === 'PARTIALLY_PAID' ? 'جزئية' : invoice.status === 'OPEN' ? 'مفتوحة' : invoice.status}</span></div><dl className="mt-3 grid grid-cols-1 gap-2 text-xs min-[420px]:grid-cols-2"><div><dt className="text-slate-500">أمر الشراء</dt><dd className="mt-1 break-normal font-mono text-slate-300">{invoice.purchase_order?.po_number || '—'}</dd></div><div><dt className="text-slate-500">التاريخ</dt><dd className="mt-1 text-slate-300">{invoice.invoice_date}</dd></div><div><dt className="text-slate-500">المبلغ</dt><dd className="mt-1 whitespace-nowrap font-mono text-slate-200">{money(invoice.amount)}</dd></div><div><dt className="text-slate-500">المدفوع</dt><dd className="mt-1 whitespace-nowrap font-mono text-emerald-300">{money(invoice.paid_amount)}</dd></div><div className="min-[420px]:col-span-2"><dt className="text-slate-500">المتبقي</dt><dd className="mt-1 whitespace-nowrap font-mono font-bold text-amber-300">{money(invoice.outstanding_amount)}</dd></div></dl></article>)}{!selected.invoices.length && <div className="py-6 text-center text-sm text-slate-500">لا توجد فواتير مسجلة لهذا المورد.</div>}</div>
    </div>

    <div>
      <h3 className="mb-2 text-sm font-black text-slate-200">سجل الدفعات</h3>
      <div className="hidden min-w-0 md:block">
        <Table><TableHeader><TableRow><TableHead className="whitespace-nowrap">رقم الدفعة</TableHead><TableHead className="whitespace-nowrap">التاريخ</TableHead><TableHead className="whitespace-nowrap">طريقة الدفع</TableHead><TableHead className="whitespace-nowrap">المبلغ</TableHead><TableHead className="whitespace-nowrap">الموزع على الفواتير</TableHead><TableHead className="whitespace-nowrap">الزيادة</TableHead><TableHead className="whitespace-nowrap">المرجع</TableHead></TableRow></TableHeader><TableBody>{selected.payments.map(payment => <TableRow key={payment.id}><TableCell className="whitespace-nowrap font-mono text-cyan-300">{payment.payment_number}</TableCell><TableCell className="whitespace-nowrap">{payment.payment_date}</TableCell><TableCell className="whitespace-nowrap">{paymentMethods[payment.payment_method] || payment.payment_method}</TableCell><TableCell className="whitespace-nowrap font-mono text-emerald-300">{money(payment.amount)}</TableCell><TableCell className="min-w-[220px] font-mono">{payment.allocations?.length ? <div className="space-y-1">{payment.allocations.map((allocation) => <div key={allocation.id} className="whitespace-nowrap text-[11px]">فاتورة {allocation.invoice?.invoice_number || `#${allocation.supplier_invoice_id}`}: <span className="font-bold text-cyan-300">{money(allocation.amount)}</span></div>)}</div> : money(payment.allocated_amount)}</TableCell><TableCell className="whitespace-nowrap font-mono text-rose-300">{money(payment.overpayment_amount)}</TableCell><TableCell>{payment.reference_number || '—'}</TableCell></TableRow>)}</TableBody></Table>
      </div>
      <div className="space-y-3 md:hidden">{selected.payments.map(payment => <article key={`mobile-payment-${payment.id}`} className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/70 p-4"><div className="flex min-w-0 items-start justify-between gap-3"><span className="min-w-0 break-normal font-mono text-sm font-black text-cyan-300">{payment.payment_number}</span><span className="shrink-0 text-[11px] text-slate-400">{payment.payment_date}</span></div><dl className="mt-3 grid grid-cols-1 gap-2 text-xs min-[420px]:grid-cols-2"><div><dt className="text-slate-500">طريقة الدفع</dt><dd className="mt-1 break-normal text-slate-300">{paymentMethods[payment.payment_method] || payment.payment_method}</dd></div><div><dt className="text-slate-500">المبلغ</dt><dd className="mt-1 whitespace-nowrap font-mono text-emerald-300">{money(payment.amount)}</dd></div><div className="min-[420px]:col-span-2"><dt className="text-slate-500">الموزع على الفواتير</dt><dd className="mt-1 break-normal font-mono leading-6 text-slate-300">{payment.allocations?.length ? payment.allocations.map((allocation) => <div key={allocation.id}>فاتورة {allocation.invoice?.invoice_number || `#${allocation.supplier_invoice_id}`}: <span className="font-bold text-cyan-300">{money(allocation.amount)}</span></div>) : money(payment.allocated_amount)}</dd></div><div><dt className="text-slate-500">الزيادة</dt><dd className="mt-1 whitespace-nowrap font-mono text-rose-300">{money(payment.overpayment_amount)}</dd></div><div><dt className="text-slate-500">المرجع</dt><dd className="mt-1 break-normal text-slate-300">{payment.reference_number || '—'}</dd></div></dl></article>)}{!selected.payments.length && <div className="py-6 text-center text-sm text-slate-500">لا توجد دفعات مسجلة لهذا المورد.</div>}</div>
    </div>
  </Card>
);

export const SupplierAccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<SupplierAccountSummary[]>([]);
  const [selected, setSelected] = useState<SupplierAccountDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supplierSearch, setSupplierSearch] = useState('');

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      setAccounts(await getSupplierAccountsApi());
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadAccounts(); }, []);

  const openAccount = async (account: SupplierAccountSummary) => {
    setDetailsLoading(true);
    setError(null);
    try {
      setSelected(await getSupplierAccountApi(account.supplier_id));
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const filteredAccounts = useMemo(() => {
    const normalized = supplierSearch.trim().toLocaleLowerCase('ar-EG');
    if (!normalized) return accounts;
    return accounts.filter((account) => `${account.company_name} ${account.code || ''} ${account.email || ''} ${account.phone || ''} ${account.supplier_id}`.toLocaleLowerCase('ar-EG').includes(normalized));
  }, [accounts, supplierSearch]);

  const totalInvoiced = accounts.reduce((sum, account) => sum + account.total_invoiced, 0);
  const totalPaid = accounts.reduce((sum, account) => sum + account.total_paid, 0);
  const totalBalance = accounts.reduce((sum, account) => sum + Math.max(account.balance, 0), 0);
  const overpaidCount = accounts.filter(account => account.is_overpaid).length;

  if (loading) return <div className="min-h-[360px] p-6 text-sm font-bold text-cyan-300" dir="rtl">جاري تحميل حسابات الموردين...</div>;

  return (
    <div className="min-w-0 space-y-6 animate-fade-in" dir="rtl">
      <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 md:flex-row md:items-center md:justify-between"><div className="min-w-0"><h1 className="text-xl font-black text-slate-100">حسابات الموردين</h1><p className="mt-1 break-normal text-xs leading-6 text-slate-400">كشف مستقل لمديونية المورد والفواتير والمدفوعات والتوزيع على أقدم مديونية.</p></div><Link to="/accounting/supplier-payments" className="w-full md:w-auto"><Button variant="primary" className="w-full whitespace-nowrap md:w-auto">الفواتير وتسجيل الدفعات</Button></Link></div>
      {error && <ErrorMessage error={error} onDismiss={() => setError(null)} onRetry={() => void loadAccounts()} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"><Card><div className="text-xs text-slate-400">إجمالي الفواتير المطابقة</div><div className="mt-2 whitespace-nowrap text-xl font-black text-cyan-300">{money(totalInvoiced)}</div></Card><Card><div className="text-xs text-slate-400">إجمالي المدفوعات</div><div className="mt-2 whitespace-nowrap text-xl font-black text-emerald-300">{money(totalPaid)}</div></Card><Card><div className="text-xs text-slate-400">إجمالي المديونية</div><div className="mt-2 whitespace-nowrap text-xl font-black text-amber-300">{money(totalBalance)}</div></Card><Card><div className="text-xs text-slate-400">حسابات بها دفع زائد</div><div className="mt-2 text-xl font-black text-rose-300">{overpaidCount}</div></Card></div>
      <Card className="min-w-0 space-y-4"><div><h2 className="text-base font-black text-slate-100">ملخص الموردين ({filteredAccounts.length} من {accounts.length})</h2><p className="mt-1 break-normal text-xs leading-6 text-slate-400">اضغط على أي مورد لعرض كشف الحساب التفصيلي وسجل الدفعات المرتبط بالفواتير وأوامر الشراء. يمكنك البحث بالاسم أو الكود أو البريد أو الهاتف.</p></div><TableColumnFilters filters={[{ key: 'supplier', label: 'اسم المورد أو الكود أو الرقم', value: supplierSearch, onChange: setSupplierSearch }]} hasActiveFilters={Boolean(supplierSearch)} onClear={() => setSupplierSearch('')} /><div className="hidden min-w-0 md:block"><Table><TableHeader><TableRow><TableHead className="whitespace-nowrap">المورد</TableHead><TableHead className="whitespace-nowrap">عدد الفواتير</TableHead><TableHead className="whitespace-nowrap">إجمالي الفواتير</TableHead><TableHead className="whitespace-nowrap">إجمالي المدفوع</TableHead><TableHead className="whitespace-nowrap">المديونية</TableHead><TableHead className="whitespace-nowrap">الدفعات</TableHead><TableHead className="whitespace-nowrap">الحالة</TableHead><TableHead className="whitespace-nowrap">الإجراء</TableHead></TableRow></TableHeader><TableBody>{filteredAccounts.map(account => <TableRow key={account.supplier_id}><TableCell className="max-w-[200px] font-bold text-slate-100">{account.company_name}</TableCell><TableCell>{account.invoices_count}</TableCell><TableCell className="whitespace-nowrap font-mono">{money(account.total_invoiced)}</TableCell><TableCell className="whitespace-nowrap font-mono text-emerald-300">{money(account.total_paid)}</TableCell><TableCell className={`whitespace-nowrap font-mono font-bold ${account.balance < 0 ? 'text-rose-300' : 'text-amber-300'}`}>{money(account.balance)}</TableCell><TableCell>{account.payments_count}</TableCell><TableCell className="whitespace-nowrap"><span className={`rounded-md px-2 py-1 text-[11px] font-bold ${account.is_overpaid ? 'bg-rose-950 text-rose-300' : account.balance > 0 ? 'bg-amber-950 text-amber-300' : 'bg-slate-800 text-slate-300'}`}>{account.is_overpaid ? 'دفع زائد' : account.balance > 0 ? 'مديونية قائمة' : 'مسدد'}</span></TableCell><TableCell><Button size="sm" variant="secondary" isLoading={detailsLoading} onClick={() => void openAccount(account)}>فتح الحساب</Button></TableCell></TableRow>)}</TableBody></Table></div><div className="space-y-3 md:hidden">{filteredAccounts.map(account => <article key={`mobile-${account.supplier_id}`} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-4"><div className="flex min-w-0 items-start justify-between gap-3"><span className="min-w-0 break-normal text-sm font-black text-slate-100">{account.company_name}</span><span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold ${account.is_overpaid ? 'bg-rose-950 text-rose-300' : account.balance > 0 ? 'bg-amber-950 text-amber-300' : 'bg-slate-800 text-slate-300'}`}>{account.is_overpaid ? 'دفع زائد' : account.balance > 0 ? 'مديونية قائمة' : 'مسدد'}</span></div><dl className="mt-4 grid min-w-0 grid-cols-1 gap-3 text-xs min-[420px]:grid-cols-2"><div><dt className="text-slate-500">عدد الفواتير</dt><dd className="mt-1 font-bold text-slate-200">{account.invoices_count}</dd></div><div><dt className="text-slate-500">عدد الدفعات</dt><dd className="mt-1 font-bold text-slate-200">{account.payments_count}</dd></div><div><dt className="text-slate-500">إجمالي الفواتير</dt><dd className="mt-1 whitespace-nowrap font-mono text-cyan-300">{money(account.total_invoiced)}</dd></div><div><dt className="text-slate-500">إجمالي المدفوع</dt><dd className="mt-1 whitespace-nowrap font-mono text-emerald-300">{money(account.total_paid)}</dd></div><div className="min-[420px]:col-span-2"><dt className="text-slate-500">الرصيد الحالي</dt><dd className={`mt-1 whitespace-nowrap font-mono font-black ${account.balance < 0 ? 'text-rose-300' : 'text-amber-300'}`}>{money(account.balance)}</dd></div></dl><Button size="sm" variant="secondary" className="mt-4 w-full whitespace-nowrap" isLoading={detailsLoading} onClick={() => void openAccount(account)}>فتح كشف الحساب</Button></article>)} </div>{!filteredAccounts.length && <div className="py-8 text-center text-sm text-slate-500">{accounts.length ? 'لا توجد نتائج مطابقة للبحث الحالي.' : 'لا توجد حسابات موردين متاحة.'}</div>}</Card>
      {selected && <SupplierAccountDetailsView selected={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default SupplierAccountsPage;
