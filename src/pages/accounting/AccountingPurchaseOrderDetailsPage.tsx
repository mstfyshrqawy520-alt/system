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
import { UnifiedNotesCard } from '../../components/common/UnifiedNotesCard';

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
          <Link to={`/accounting/supplier-payments?po=${po.po_number || po.id}`}>
            <Button variant="primary" size="sm" className="font-bold shadow-md shadow-cyan-900/40">
              <span>🧾 تسجيل فاتورة وسداد مستحقات</span>
              <span className="mr-1">←</span>
            </Button>
          </Link>
          <button
            onClick={() => setPrintPo(po)}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
          >
            🖨️ طباعة PO
          </button>
          <button
            onClick={handleExportJson}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
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

      {/* Operational Invoice & Payment Banner */}
      <div className="rounded-2xl border border-cyan-500/60 bg-gradient-to-r from-slate-900 via-cyan-950/20 to-slate-900 p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💳</span>
          <div>
            <h4 className="text-sm font-bold text-cyan-300">أمر الشراء جاهز للمطابقة وتسجيل الفواتير</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              يمكنك الانتقال فوراً لشاشة فواتير ودفعات الموردين لتسجيل فاتورة المورد وتوزيع المصروف على قطع الأراضي.
            </p>
          </div>
        </div>
        <Link to={`/accounting/supplier-payments?po=${po.po_number || po.id}`}>
          <Button variant="primary" size="sm" className="whitespace-nowrap font-black">
            تسجيل الفاتورة والدفعات ←
          </Button>
        </Link>
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

      {/* Items Table */}
      <Card className="space-y-4">
        <h3 className="text-sm font-bold text-slate-200">📦 بنود أمر الشراء</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>اسم الصنف</TableHead>
              <TableHead>المنطقة</TableHead>
              <TableHead>الكمية والوحدة</TableHead>
              <TableHead>سعر الوحدة</TableHead>
              <TableHead>إجمالي البند</TableHead>
              <TableHead>الوصف والمواصفات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {po.items && po.items.length > 0 ? (
              po.items.map((item, index) => (
                <TableRow key={item.id || index}>
                  <TableCell className="font-mono text-cyan-400">{index + 1}</TableCell>
                  <TableCell className="font-bold text-slate-100">{item.item_name || item.item?.name || '—'}</TableCell>
                  <TableCell className="font-mono text-slate-300">{item.region || '—'}</TableCell>
                  <TableCell className="text-slate-300">
                    {item.quantity} {getUnitLabel(item.uom || '')}
                  </TableCell>
                  <TableCell className="font-mono text-cyan-400">
                    <CurrencyDisplay amount={item.unit_price || 0} currency={po.currency || 'ج.م'} />
                  </TableCell>
                  <TableCell className="font-mono text-emerald-400 font-bold">
                    <CurrencyDisplay amount={item.line_total || (Number(item.quantity || 0) * Number(item.unit_price || 0))} currency={po.currency || 'ج.م'} />
                  </TableCell>
                  <TableCell className="text-slate-400 text-[11px] max-w-xs truncate">
                    {item.item_description || item.specifications || 'لا توجد مواصفات إضافية'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4 text-slate-500">
                  لا توجد بنود مضافة لهذا الأمر
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Totals Box */}
        <div className="flex justify-end pt-2">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5 w-full sm:w-80 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>إجمالي البنود:</span>
              <span className="font-mono font-bold text-slate-200">
                <CurrencyDisplay amount={po.subtotal || po.grand_total || 0} currency={po.currency || 'ج.م'} />
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-1.5 text-sm font-bold text-cyan-300">
              <span>المبلغ الإجمالي الكلي:</span>
              <span className="font-mono font-black text-cyan-400">
                <CurrencyDisplay amount={po.grand_total || po.subtotal || 0} currency={po.currency || 'ج.م'} />
              </span>
            </div>
          </div>
        </div>
      </Card>

      <UnifiedNotesCard purchaseOrder={po} />

      {/* Printable PO Modal */}
      {printPo && (
        <PrintablePO
          po={printPo}
          onClose={() => setPrintPo(null)}
        />
      )}
    </div>
  );
};

export default AccountingPurchaseOrderDetailsPage;
