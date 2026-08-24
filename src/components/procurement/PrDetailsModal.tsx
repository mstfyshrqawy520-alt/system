import React from 'react';
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
  if (!isOpen || !pr) return null;

  const isDirect = pr.procurement_route === 'DIRECT';
  const estimatedTotal = pr.items?.reduce((sum, item) => sum + Number(item.estimated_line_total || (Number(item.quantity || 0) * Number(item.estimated_unit_price || 0))), 0) || 0;
  const canCreatePo = Boolean(onCreatePo) && (!pr.purchase_order_issued && (!isDirect || pr.status === 'APPROVED_BY_ACCOUNTING'));

  return createPortal((
    <div className="modal-top-viewport fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm sm:p-6" dir="rtl">
      <div className="flex min-h-0 max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
        
        <div className="bg-slate-800/90 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <h2 className="text-base font-bold text-slate-100">تفاصيل طلب الشراء #{pr.request_number}</h2>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-600 bg-slate-900/60 text-2xl font-black leading-none text-slate-300 hover:border-cyan-400 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/70" aria-label="إغلاق النافذة" title="إغلاق النافذة">
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2 text-xs">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex justify-between gap-3"><span className="text-slate-400">القسم:</span><span className="text-slate-200">{pr.department?.name || '—'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-400">صاحب الطلب:</span><span className="text-slate-200">{pr.requester?.name || '—'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-400">الحالة:</span><span className="font-bold text-cyan-200">{PR_STATUS_LABELS[pr.status] || pr.status}</span></div>
              <div className="flex justify-between gap-3"><span className="text-slate-400">مهندس الموقع:</span><span className="text-slate-200">{pr.site_engineer?.name || '—'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-amber-400 font-semibold">تاريخ الاحتياج:</span><span className="font-mono font-bold text-amber-300">{pr.date_needed || 'غير محدد'}</span></div>
              {isDirect && <div className="flex justify-between gap-3"><span className="text-slate-400">المورد:</span><span className="font-bold text-emerald-300">{pr.direct_supplier?.company_name || '—'}</span></div>}
              {isDirect && <div className="flex justify-between gap-3"><span className="text-slate-400">الإجمالي المقترح:</span><span className="font-mono font-bold text-emerald-300">{estimatedTotal.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</span></div>}
            </div>
            {pr.justification && (
              <div className="pt-2 border-t border-slate-800"><span className="text-slate-400 block mb-1">مبررات الشراء:</span><p className="text-slate-300 bg-slate-900 p-2 rounded">{pr.justification}</p></div>
            )}
          </div>

          <PurchaseRequestTimeline request={pr} />

          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">البنود المطلوبة</h3>
            <table className="w-full text-right text-xs border-collapse border border-slate-800">
              <thead>
                <tr className="bg-slate-950 text-slate-300 font-bold border-b border-slate-800">
                  <th className="p-2">#</th>
                  <th className="p-2">رقم قطعة الأرض</th>
                  <th className="p-2">المنطقة</th>
                  <th className="p-2">البند / الوصف</th>
                  <th className="p-2">الكمية</th>
                  {isDirect && <th className="p-2">سعر الوحدة</th>}
                  {isDirect && <th className="p-2">الإجمالي</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {pr.items?.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="p-2 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="p-2 text-slate-300 font-mono">{item.item_reference || '—'}</td>
                    <td className="p-2 text-slate-300">{item.region || '—'}</td>
                    <td className="p-2 text-slate-200 font-medium">{item.item_description}</td>
                    <td className="p-2 font-mono text-slate-200">{item.quantity} {getUnitLabel(item.uom)}</td>
                    {isDirect && <td className="p-2 font-mono text-emerald-300">{Number(item.estimated_unit_price || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</td>}
                    {isDirect && <td className="p-2 font-mono font-bold text-emerald-300">{Number(item.estimated_line_total || (Number(item.quantity || 0) * Number(item.estimated_unit_price || 0))).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-lg"
            >
              إغلاق
            </button>
            {canCreatePo && (
              <button
                onClick={() => {
                  onClose();
                  onCreatePo?.(pr.id);
                }}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-5 py-2 rounded-lg font-bold shadow-lg shadow-cyan-600/20"
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
