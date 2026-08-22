import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAccountingPurchaseOrderApi } from '../../api/accounting';
import Badge from '../../components/procurement/PurchaseOrderStatusBadge';
import { PurchaseOrder } from '../../types/purchaseOrder';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { CurrencyDisplay } from '../../components/ui/CurrencyDisplay';
import { getUnitLabel } from '../../utils/units';
import PrintablePO from '../../components/procurement/PrintablePO';

export const AccountingPurchaseOrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [printPo, setPrintPo] = useState<PurchaseOrder | null>(null);

  const load = () => id && getAccountingPurchaseOrderApi(parseInt(id, 10)).then(setPo);

  useEffect(() => {
    load();
  }, [id]);

  if (!po) {
    return <div className="text-cyan-400 animate-pulse text-xs p-6" dir="rtl">جاري تحميل بيانات أمر الشراء...</div>;
  }

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(po, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `PO_${po.po_number}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold font-mono text-cyan-400">
            {po.po_number}
          </h1>
          <Badge status={po.status} />
          <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2.5 py-1 rounded text-xs font-bold">
            EGP / ج.م
          </span>
          <span className="bg-blue-900/40 text-blue-300 border border-blue-700/50 px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1">
            👁️ للاطلاع المالي فقط (Read-Only)
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setPrintPo(po)}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-bold transition-colors flex items-center gap-1"
          >
            🖨️ طباعة PO
          </button>
          <button
            onClick={handleExportJson}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold transition-colors flex items-center gap-1"
          >
            📥 تصدير البيانات
          </button>
          <Link to="/accounting/purchase-orders">
            <Button variant="secondary" size="sm">
              &rarr; العودة للطلبات
            </Button>
          </Link>
        </div>
      </div>

      {/* المورد & PR Metadata Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <Card className="space-y-2">
          <h3 className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2">🏢 تفاصيل المورد</h3>
          <div className="space-y-1 text-slate-300">
            <div><strong className="text-slate-400">الشركة:</strong> {po.supplier?.company_name || 'غير محدد'}</div>
            <div><strong className="text-slate-400">الكود:</strong> <span className="font-mono text-cyan-400">{po.supplier?.code || '-'}</span></div>
            <div><strong className="text-slate-400">الهاتف والبريد:</strong> {po.supplier?.phone || '-'} | {po.supplier?.email || '-'}</div>
          </div>
        </Card>

        <Card className="space-y-2">
          <h3 className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2">📋 طلب الشراء المرتبط</h3>
          <div className="space-y-1 text-slate-300">
            <div>
              <strong className="text-slate-400">رقم طلب الشراء:</strong>{' '}
              {po.purchase_request_id
                ? (po.purchase_request?.request_number || `#PR-${po.purchase_request_id}`)
                : '—'}
            </div>
            <div><strong className="text-slate-400">القسم:</strong> {po.department?.name || po.purchase_request?.department?.name || '—'}</div>
            <div><strong className="text-slate-400">مُقدّم الطلب:</strong> <span className="font-bold text-slate-100">{po.requested_by?.name || po.purchase_request?.requester?.name || '—'}</span></div>
            <div><strong className="text-slate-400">رئيس القسم المعتمد:</strong> <span className="font-bold text-emerald-300">{po.department_approver?.name || po.purchase_request?.assigned_reviewer?.name || '—'}</span></div>
            <div><strong className="text-slate-400">تاريخ الإصدار:</strong> {po.created_at ? new Date(po.created_at).toLocaleDateString('ar-EG') : '—'}</div>
          </div>
        </Card>
      </div>

      {/* Line البنود Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200">📦 بنود أمر الشراء</h3>
        <div className="hidden min-w-0 md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">#</TableHead><TableHead className="whitespace-nowrap">رقم قطعة الأرض</TableHead><TableHead className="whitespace-nowrap">المنطقة</TableHead><TableHead className="whitespace-nowrap">اسم الصنف</TableHead><TableHead className="whitespace-nowrap">الوصف</TableHead><TableHead className="whitespace-nowrap">المواصفات</TableHead><TableHead className="whitespace-nowrap">الكمية</TableHead><TableHead className="whitespace-nowrap">الوحدة</TableHead><TableHead className="whitespace-nowrap">سعر الوحدة (ج.م)</TableHead><TableHead className="whitespace-nowrap">الإجمالي (ج.م)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{po.items?.map((item, index) => <TableRow key={item.id || index}><TableCell className="whitespace-nowrap font-bold text-slate-400">{index + 1}</TableCell><TableCell className="whitespace-nowrap font-mono text-slate-300">{item.item_reference || '—'}</TableCell><TableCell className="max-w-[150px]">{item.region || '—'}</TableCell><TableCell className="max-w-[180px] font-bold text-slate-100">{item.item_name || item.item_description}</TableCell><TableCell className="max-w-[220px] text-slate-300">{item.item_description || '—'}</TableCell><TableCell className="max-w-[180px] text-[11px] text-slate-400">{item.specifications || '-'}</TableCell><TableCell className="whitespace-nowrap font-mono">{parseFloat(item.quantity as any || 0).toLocaleString()}</TableCell><TableCell className="whitespace-nowrap text-slate-300">{getUnitLabel(item.uom)}</TableCell><TableCell className="whitespace-nowrap"><CurrencyDisplay amount={item.unit_price} amountClassName="font-mono text-slate-200" /></TableCell><TableCell className="whitespace-nowrap"><CurrencyDisplay amount={item.line_total} amountClassName="font-mono font-bold text-emerald-400" /></TableCell></TableRow>)}</TableBody>
          </Table>
        </div>
        <div className="space-y-3 md:hidden">{po.items?.map((item, index) => <article key={`mobile-item-${item.id || index}`} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-4"><div className="flex min-w-0 items-start justify-between gap-3"><span className="shrink-0 rounded-md bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-300">بند {index + 1}</span><span className="min-w-0 break-normal font-mono text-sm font-black text-cyan-300">{item.item_reference || 'بدون رقم قطعة'}</span></div><dl className="mt-4 grid min-w-0 grid-cols-1 gap-3 text-xs min-[420px]:grid-cols-2"><div className="min-w-0 min-[420px]:col-span-2"><dt className="text-slate-500">اسم الصنف</dt><dd className="mt-1 break-normal font-bold leading-6 text-slate-100">{item.item_name || item.item_description || 'غير محدد'}</dd></div><div><dt className="text-slate-500">المنطقة</dt><dd className="mt-1 break-normal text-slate-300">{item.region || 'غير محددة'}</dd></div><div><dt className="text-slate-500">الكمية والوحدة</dt><dd className="mt-1 whitespace-nowrap font-mono text-slate-200">{parseFloat(item.quantity as any || 0).toLocaleString()} {getUnitLabel(item.uom)}</dd></div><div><dt className="text-slate-500">سعر الوحدة</dt><dd className="mt-1 whitespace-nowrap"><CurrencyDisplay amount={item.unit_price} amountClassName="font-mono text-slate-200" /></dd></div><div><dt className="text-slate-500">إجمالي البند</dt><dd className="mt-1 whitespace-nowrap"><CurrencyDisplay amount={item.line_total} amountClassName="font-mono font-bold text-emerald-400" /></dd></div><div className="min-[420px]:col-span-2"><dt className="text-slate-500">الوصف والمواصفات</dt><dd className="mt-1 break-normal text-xs leading-6 text-slate-300"><div>{item.item_description || '—'}</div><div className="mt-1 text-slate-400">{item.specifications || 'لا توجد مواصفات إضافية'}</div></dd></div></dl></article>)}</div>
      </div>

      {/* Financial Totals Display (EGP) */}
      <div className="flex justify-end">
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 w-full max-w-xs text-xs">
          <div className="flex justify-between items-center text-slate-400">
            <span>إجمالي البنود:</span>
            <span className="font-mono font-bold text-slate-200">{Number(po.grand_total || 0).toFixed(2)} ج.م</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            
            <span className="font-mono text-slate-500"></span>
          </div>
          <div className="border-t border-slate-800 pt-2 flex justify-between items-center font-bold text-sm">
            <span className="text-cyan-400">المبلغ الإجمالي الكلي:</span>
            <span className="font-mono text-emerald-400">{Number(po.grand_total || 0).toFixed(2)} ج.م</span>
          </div>
        </div>
      </div>

      {/* Printable PO Modal */}
      {printPo && (
        <PrintablePO po={printPo} onClose={() => setPrintPo(null)} />
      )}
    </div>
  );
};

export default AccountingPurchaseOrderDetailsPage;
