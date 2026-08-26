import React from 'react';
import { createPortal } from 'react-dom';
import { ProcurementAnalyticsResponse } from '../../api/procurement';
import { printDocumentOnly } from '../../utils/print';

interface ReportPrintModalProps {
  data: ProcurementAnalyticsResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReportPrintModal: React.FC<ReportPrintModalProps> = ({ data, isOpen, onClose }) => {
  if (!isOpen || !data) return null;

  const handlePrint = () => printDocumentOnly();

  const handleCopyText = () => {
    const summary = `تقرير المشتريات والتحليلات\nإجمالي المشتريات: ${data.metrics.total_value} ج.م\nعدد أوامر الشراء: ${data.metrics.purchase_orders_count}\nعدد الموردين النشطين: ${data.metrics.active_supplier_count}`;
    navigator.clipboard.writeText(summary);
    alert('تم نسخ ملخص التقرير بنجاح');
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `*تقرير المشتريات والتحليلات - شركة اشبيلية*\n*إجمالي المشتريات:* ${data.metrics.total_value} ج.م\n*أوامر الشراء:* ${data.metrics.purchase_orders_count}\n*الطلبات المعتمدة:* ${data.metrics.approved_requests_count}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return createPortal((
    <div className="print-container modal-top-viewport fixed inset-0 z-[9999] flex items-start justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col text-slate-100 overflow-hidden">
        
        {/* الإجراءات Bar */}
        <div className="print:hidden bg-slate-800/90 border-b border-slate-700 px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3 space-x-reverse">
            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-100">معاينة وتصدير تقرير المشتريات الفوري</h2>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <button
              onClick={handlePrint}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              طباعة التقرير
            </button>
            <button
              onClick={handleCopyText}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              نسخ النص
            </button>
            <button
              onClick={handleWhatsAppShare}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              واتساب
            </button>
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white p-2 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Printable Report Body */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-900 print:bg-white print:text-slate-900 print:p-0">
          <div className="print-document bg-slate-950 print:bg-white border border-slate-800 print:border-none p-8 rounded-xl shadow-inner space-y-6 max-w-3xl mx-auto font-sans">
            
            {/* Report Header */}
            <div className="flex items-center justify-between pb-4 border-b-2 border-slate-700 print:border-slate-300">
              <div>
                <img src="/eshbelia-logo.png" alt="شعار شركة اشبيلية" className="document-logo h-16 w-auto object-contain mb-2" />
                <h1 className="text-xl font-extrabold text-cyan-400 print:text-slate-900">أحدث المشتريات</h1>
                <p className="text-xs text-slate-400 print:text-slate-600 mt-1">شركة اشبيلية للتطوير والاستثمار العقاري</p>
              </div>
              <div className="text-left font-mono text-xs text-slate-400 print:text-slate-600">
                <div>التاريخ: {new Date().toLocaleDateString('ar-EG')}</div>
              </div>
            </div>


            {/* Recent Orders List */}
            <div>
              <h3 className="text-sm font-bold text-slate-300 print:text-slate-900 mb-2">أحدث أوامر الشراء</h3>
              <table className="w-full text-right text-xs border-collapse border border-slate-800 print:border-slate-300">
                <thead>
                  <tr className="bg-slate-900 print:bg-slate-100 font-bold border-b border-slate-800 print:border-slate-300">
                    <th className="p-2 border-l border-slate-800 print:border-slate-300">رقم الأمر</th>
                    <th className="p-2 border-l border-slate-800 print:border-slate-300">رقم قطعة الأرض</th>
                    <th className="p-2 border-l border-slate-800 print:border-slate-300">المنطقة</th>
                    <th className="p-2 border-l border-slate-800 print:border-slate-300">المورد</th>
                    <th className="p-2 border-l border-slate-800 print:border-slate-300">الحالة</th>
                    <th className="p-2">المبلغ الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                  {data.recent_purchase_orders.map((po) => (
                    <tr key={po.id}>
                      <td className="p-2 font-mono font-semibold text-cyan-400 print:text-slate-900 border-l border-slate-800 print:border-slate-300">{po.po_number}</td>
                      <td className="p-2 font-mono text-slate-200 print:text-slate-900 border-l border-slate-800 print:border-slate-300">{po.items?.map((item) => item.item_reference || '—').join('، ') || '—'}</td>
                      <td className="p-2 text-slate-200 print:text-slate-900 border-l border-slate-800 print:border-slate-300">{po.items?.map((item) => item.region || '—').join('، ') || '—'}</td>
                      <td className="p-2 text-slate-200 print:text-slate-900 border-l border-slate-800 print:border-slate-300">{po.supplier_name || 'غير محدد'}</td>
                      <td className="p-2 text-slate-300 print:text-slate-800 border-l border-slate-800 print:border-slate-300">{po.status}</td>
                      <td className="p-2 font-mono font-bold text-slate-100 print:text-slate-900">{po.grand_total} ج.م</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>
    </div>
  ), document.body);
};

export default ReportPrintModal;
