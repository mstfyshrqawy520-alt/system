import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PurchaseRequest, PR_STATUS_LABELS } from '../../types/purchaseRequest';
import { getUnitLabel } from '../../utils/units';
import PurchaseRequestTimeline from './PurchaseRequestTimeline';

interface PrDetailsModalProps {
  pr: PurchaseRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onCreatePo?: (prId: number) => void;
}

export const PrDetailsModal: React.FC<PrDetailsModalProps> = ({ pr, isOpen, onClose, onCreatePo }) => {
  const [mobileViewMode, setMobileViewMode] = useState<'cards' | 'table'>('cards');

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !pr) return null;

  const isDirect = pr.procurement_route === 'DIRECT';
  const estimatedTotal = pr.items?.reduce((sum, item) => sum + Number(item.estimated_line_total || (Number(item.quantity || 0) * Number(item.estimated_unit_price || 0))), 0) || 0;
  const canCreatePo = Boolean(onCreatePo) && (!pr.purchase_order_issued && (!isDirect || pr.status === 'APPROVED_BY_ACCOUNTING'));

  const itemSuppliers = (pr.items || [])
    .map((i) => i.supplier?.company_name)
    .filter(Boolean) as string[];
  const uniqueSuppliers = Array.from(new Set(itemSuppliers));
  const supplierLabel = uniqueSuppliers.length > 1
    ? `موردون متعددون (${uniqueSuppliers.length})`
    : uniqueSuppliers[0] || pr.direct_supplier?.company_name || '—';

  return createPortal((
    <div
      className="modal-top-viewport fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-y-auto bg-slate-950/80 p-2 sm:p-4 md:p-6 backdrop-blur-sm"
      dir="rtl"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex min-h-0 max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
        
        {/* Header */}
        <div className="bg-slate-800/90 border-b border-slate-700 px-5 py-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-base sm:text-lg font-bold text-slate-100">تفاصيل طلب الشراء #{pr.request_number}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-600 bg-slate-900/60 text-2xl font-black leading-none text-slate-300 hover:border-cyan-400 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/70 transition-colors"
            aria-label="إغلاق النافذة"
            title="إغلاق النافذة"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          {/* Metadata Card */}
          <div className="bg-slate-950 p-4 sm:p-5 rounded-xl border border-slate-800 space-y-3 text-xs shadow-inner">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex justify-between gap-3 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
                <span className="text-slate-400">القسم:</span>
                <span className="font-bold text-slate-200">{pr.department?.name || '—'}</span>
              </div>
              <div className="flex justify-between gap-3 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
                <span className="text-slate-400">صاحب الطلب:</span>
                <span className="font-bold text-slate-200">{pr.requester?.name || '—'}</span>
              </div>
              <div className="flex justify-between gap-3 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
                <span className="text-slate-400">الحالة:</span>
                <span className="font-bold text-cyan-300">{PR_STATUS_LABELS[pr.status] || pr.status}</span>
              </div>
              <div className="flex justify-between gap-3 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
                <span className="text-slate-400">مهندس الموقع:</span>
                <span className="font-bold text-slate-200">{pr.site_engineer?.name || '—'}</span>
              </div>
              <div className="flex justify-between gap-3 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
                <span className="text-amber-400 font-semibold">تاريخ الاحتياج:</span>
                <span className="font-mono font-bold text-amber-300">{pr.date_needed || 'غير محدد'}</span>
              </div>
              {pr.request_type !== 'OFFICE_SUPPLIES' && (
                <>
                  <div className="flex justify-between gap-3 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
                    <span className="text-amber-400 font-semibold">قطعة الأرض:</span>
                    <span className="font-mono font-bold text-amber-300">{pr.parcel_reference || pr.items?.[0]?.item_reference || '—'}</span>
                  </div>
                  <div className="flex justify-between gap-3 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
                    <span className="text-amber-400 font-semibold">المنطقة:</span>
                    <span className="font-semibold text-slate-200">{pr.region || pr.items?.[0]?.region || '—'}</span>
                  </div>
                </>
              )}
              {isDirect && (
                <div className="flex justify-between gap-3 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
                  <span className="text-slate-400">المورد:</span>
                  <span className="font-bold text-emerald-300" title={uniqueSuppliers.join('، ')}>
                    {supplierLabel}
                  </span>
                </div>
              )}
              {isDirect && (
                <div className="flex justify-between gap-3 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
                  <span className="text-slate-400">الإجمالي المقترح:</span>
                  <span className="font-mono font-bold text-emerald-300">{estimatedTotal.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</span>
                </div>
              )}
            </div>
            {pr.justification && (
              <div className="pt-3 border-t border-slate-800">
                <span className="text-slate-400 block mb-1 font-semibold">مبررات الشراء:</span>
                <p className="text-slate-300 bg-slate-900/90 p-3 rounded-lg border border-slate-800 leading-relaxed text-xs">{pr.justification}</p>
              </div>
            )}
          </div>

          {/* Timeline */}
          <PurchaseRequestTimeline request={pr} />

          {/* Items Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-200 flex items-center gap-2">
                  <span>📦</span> البنود المطلوبة ({pr.items?.length || 0})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {isDirect && (
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded-lg">
                    الإجمالي: {estimatedTotal.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                  </span>
                )}
                {/* Mobile View Toggle */}
                <div className="flex md:hidden rounded-lg border border-slate-700 bg-slate-950 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setMobileViewMode('cards')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                      mobileViewMode === 'cards'
                        ? 'bg-cyan-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    بطاقات
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileViewMode('table')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                      mobileViewMode === 'table'
                        ? 'bg-cyan-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    جدول أفقي
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop / Tablet Table (and on mobile when table mode selected) */}
            <div className={`${mobileViewMode === 'cards' ? 'hidden md:block' : 'block'} overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70 shadow-inner`}>
              <table className="w-full min-w-[780px] text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-slate-300 font-bold border-b border-slate-800">
                    <th className="p-3 text-center w-12 whitespace-nowrap">#</th>
                    <th className="p-3 whitespace-nowrap min-w-[140px]">رقم قطعة الأرض</th>
                    <th className="p-3 whitespace-nowrap min-w-[110px]">المنطقة</th>
                    <th className="p-3 min-w-[180px]">البند / الوصف</th>
                    {isDirect && <th className="p-3 whitespace-nowrap min-w-[140px]">المورد</th>}
                    <th className="p-3 text-center whitespace-nowrap min-w-[100px]">الكمية</th>
                    {isDirect && <th className="p-3 text-center whitespace-nowrap min-w-[110px]">سعر الوحدة</th>}
                    {isDirect && <th className="p-3 text-center whitespace-nowrap min-w-[120px]">الإجمالي</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {pr.items?.map((item, idx) => (
                    <tr key={item.id || idx} className="bg-slate-900/40 even:bg-slate-950/60 hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-mono whitespace-nowrap">{idx + 1}</td>
                      <td className="p-3 text-slate-300 font-mono text-xs whitespace-nowrap">{item.item_reference || pr.parcel_reference || '—'}</td>
                      <td className="p-3 text-slate-300 whitespace-nowrap">{item.region || pr.region || '—'}</td>
                      <td className="p-3 text-slate-100 font-semibold">{item.item_description}</td>
                      {isDirect && (
                        <td className="p-3 text-emerald-300 text-xs font-semibold whitespace-nowrap">
                          {item.supplier?.company_name || pr.direct_supplier?.company_name || '—'}
                        </td>
                      )}
                      <td className="p-3 text-center font-mono text-slate-200 whitespace-nowrap">{item.quantity} {getUnitLabel(item.uom)}</td>
                      {isDirect && (
                        <td className="p-3 text-center font-mono text-emerald-300 whitespace-nowrap">
                          {Number(item.estimated_unit_price || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                        </td>
                      )}
                      {isDirect && (
                        <td className="p-3 text-center font-mono font-bold text-emerald-300 whitespace-nowrap">
                          {Number(item.estimated_line_total || (Number(item.quantity || 0) * Number(item.estimated_unit_price || 0))).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                {isDirect && pr.items && pr.items.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-900/90 font-bold border-t-2 border-slate-700 text-slate-200">
                      <td colSpan={7} className="p-3 text-left pl-4 font-bold text-slate-300">
                        الإجمالي الكلي:
                      </td>
                      <td className="p-3 text-center font-mono font-black text-emerald-400 whitespace-nowrap text-sm">
                        {estimatedTotal.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Mobile Responsive Cards (when cards mode is selected) */}
            {mobileViewMode === 'cards' && (
              <div className="md:hidden space-y-3">
                {pr.items?.map((item, idx) => (
                  <div key={item.id || idx} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3 shadow-sm">
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-mono font-bold text-cyan-300">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-100 break-words">{item.item_description}</h4>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      {(item.item_reference || pr.parcel_reference) && (
                        <span className="rounded-md bg-amber-950/40 border border-amber-800/40 px-2.5 py-0.5 font-mono font-bold text-amber-300">
                          قطعة: {item.item_reference || pr.parcel_reference}
                        </span>
                      )}
                      {(item.region || pr.region) && (
                        <span className="rounded-md bg-slate-800/80 px-2.5 py-0.5 text-slate-300">
                          المنطقة: {item.region || pr.region}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2.5 border-t border-slate-800/80">
                      <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800/50">
                        <span className="text-slate-400 block text-[10px] mb-0.5">الكمية المطلوبة</span>
                        <span className="font-mono font-bold text-slate-200">{item.quantity} {getUnitLabel(item.uom)}</span>
                      </div>
                      {isDirect && (
                        <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800/50">
                          <span className="text-slate-400 block text-[10px] mb-0.5">المورد المقترح</span>
                          <span className="font-semibold text-emerald-300 truncate block">
                            {item.supplier?.company_name || pr.direct_supplier?.company_name || '—'}
                          </span>
                        </div>
                      )}
                      {isDirect && (
                        <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800/50">
                          <span className="text-slate-400 block text-[10px] mb-0.5">سعر الوحدة</span>
                          <span className="font-mono font-bold text-emerald-300">
                            {Number(item.estimated_unit_price || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                          </span>
                        </div>
                      )}
                      {isDirect && (
                        <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800/50">
                          <span className="text-slate-400 block text-[10px] mb-0.5">الإجمالي</span>
                          <span className="font-mono font-black text-emerald-400">
                            {Number(item.estimated_line_total || (Number(item.quantity || 0) * Number(item.estimated_unit_price || 0))).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              إغلاق
            </button>
            {canCreatePo && (
              <button
                onClick={() => {
                  onClose();
                  onCreatePo?.(pr.id);
                }}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-cyan-600/20 transition-all hover:shadow-cyan-600/30"
              >
                {isDirect ? '+ إنشاء أمر شراء بعد اعتماد الحسابات' : '+ إنشاء أمر شراء لهذا الطلب'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  ), document.body);
};

export default PrDetailsModal;
