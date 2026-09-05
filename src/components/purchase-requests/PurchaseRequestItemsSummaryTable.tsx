import React from 'react';
import { PurchaseRequestItemFormInput, PurchaseRequestType } from '../../types/purchaseRequest';
import { getUnitLabel } from '../../utils/units';

interface Props {
  items: PurchaseRequestItemFormInput[];
  requestType?: PurchaseRequestType;
  onRemoveItem?: (index: number) => void;
  onScrollToItem?: (index: number) => void;
  className?: string;
}

export const PurchaseRequestItemsSummaryTable: React.FC<Props> = ({
  items,
  requestType = 'PROJECT',
  onRemoveItem,
  onScrollToItem,
  className = '',
}) => {
  const isOffice = requestType === 'OFFICE_SUPPLIES';

  // Calculate totals
  const totalItemsCount = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  // Check validity
  const validItemsCount = items.filter((item) => {
    const hasDesc = Boolean(item.item_description?.trim());
    const hasQty = (Number(item.quantity) || 0) > 0;
    if (isOffice) return hasDesc && hasQty;
    return hasDesc && hasQty && Boolean(item.item_reference?.trim()) && Boolean(item.region?.trim());
  }).length;

  const isAllValid = totalItemsCount > 0 && validItemsCount === totalItemsCount;

  return (
    <div
      className={`rounded-2xl border border-cyan-900/40 bg-slate-900/95 p-4 sm:p-6 shadow-2xl backdrop-blur-sm space-y-4 ${className}`}
      dir="rtl"
    >
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-sm">
              📊
            </span>
            <h3 className="text-sm sm:text-base font-black text-slate-100">
              جدول مراجعة وملخص البنود المضافة
            </h3>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
            معاينة شاملة ومنظمة لجميع الأصناف والكميات المدخلة على غرار جدول عروض الأسعار.
          </p>
        </div>

        {/* Stats Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-center shadow-inner">
            <span className="block text-[10px] text-slate-400 font-bold">عدد البنود</span>
            <span className="font-mono text-xs font-black text-cyan-300">{totalItemsCount} صنف</span>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-center shadow-inner">
            <span className="block text-[10px] text-slate-400 font-bold">إجمالي الكميات</span>
            <span className="font-mono text-xs font-black text-amber-300">
              {Number.isInteger(totalQuantity) ? totalQuantity : totalQuantity.toFixed(2)}
            </span>
          </div>

          <div className={`rounded-xl border px-3 py-1.5 text-center shadow-inner ${
            isAllValid
              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
              : 'border-amber-500/40 bg-amber-950/40 text-amber-300'
          }`}>
            <span className="block text-[10px] opacity-80 font-bold">حالة البيانات</span>
            <span className="text-xs font-black flex items-center gap-1 justify-center">
              {isAllValid ? '✅ مكتمل وجاهز' : `⚠️ ${validItemsCount}/${totalItemsCount} مكتمل`}
            </span>
          </div>
        </div>
      </div>

      {/* Table Container */}
      {items.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-xs bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
          لم يتم إضافة أي بنود بعد.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70 shadow-inner">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-300 border-b border-slate-800">
                <th className="px-3 py-2.5 font-bold text-center w-12">#</th>
                <th className="px-3.5 py-2.5 font-bold min-w-[180px]">الصنف / المادة المطلوبة</th>
                <th className="px-3 py-2.5 font-bold min-w-[140px]">المواصفات الفنية</th>
                <th className="px-3 py-2.5 font-bold min-w-[110px]">
                  {isOffice ? 'مقر / مكتب الاستلام' : 'رقم قطعة الأرض'}
                </th>
                <th className="px-3 py-2.5 font-bold min-w-[110px]">المنطقة</th>
                <th className="px-3 py-2.5 font-bold text-center min-w-[90px]">الكمية</th>
                <th className="px-3 py-2.5 font-bold text-center min-w-[80px]">الوحدة</th>
                {(onRemoveItem || onScrollToItem) && (
                  <th className="px-3 py-2.5 font-bold text-center w-24">إجراءات</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {items.map((item, index) => {
                const isItemValid =
                  Boolean(item.item_description?.trim()) &&
                  (Number(item.quantity) || 0) > 0 &&
                  (isOffice || (Boolean(item.item_reference?.trim()) && Boolean(item.region?.trim())));

                return (
                  <tr
                    key={index}
                    className={`transition-colors hover:bg-slate-800/40 ${
                      !isItemValid ? 'bg-amber-950/10' : index % 2 === 0 ? 'bg-slate-950/30' : 'bg-slate-900/20'
                    }`}
                  >
                    {/* Index */}
                    <td className="px-3 py-2.5 text-center">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800/80 text-cyan-300 font-mono font-bold text-[11px] border border-slate-700">
                        {index + 1}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="px-3.5 py-2.5 font-bold">
                      {item.item_description?.trim() ? (
                        <span className="text-slate-100">{item.item_description}</span>
                      ) : (
                        <span className="text-rose-400/80 italic text-[11px]">⚠️ لم يُكتب وصف الصنف بعد</span>
                      )}
                    </td>

                    {/* Specifications */}
                    <td className="px-3 py-2.5 text-slate-400">
                      {item.specifications?.trim() ? (
                        <span className="text-slate-300">{item.specifications}</span>
                      ) : (
                        <span className="text-slate-600 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Reference / Parcel */}
                    <td className="px-3 py-2.5">
                      {item.item_reference?.trim() ? (
                        <span className="inline-block rounded-md bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 font-mono text-cyan-300 font-bold text-[11px]">
                          {item.item_reference}
                        </span>
                      ) : isOffice ? (
                        <span className="text-slate-400 text-[11px]">مقر الشركة</span>
                      ) : (
                        <span className="text-rose-400/80 text-[11px]">⚠️ غير محدد</span>
                      )}
                    </td>

                    {/* Region */}
                    <td className="px-3 py-2.5">
                      {item.region?.trim() ? (
                        <span className="text-slate-300 font-medium">{item.region}</span>
                      ) : isOffice ? (
                        <span className="text-slate-400 text-[11px]">إداري</span>
                      ) : (
                        <span className="text-rose-400/80 text-[11px]">⚠️ غير محددة</span>
                      )}
                    </td>

                    {/* Quantity */}
                    <td className="px-3 py-2.5 text-center">
                      <span className="inline-block rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 font-mono font-black text-amber-300 text-xs">
                        {item.quantity !== undefined && item.quantity !== null && item.quantity !== ('' as any)
                          ? item.quantity
                          : 0}
                      </span>
                    </td>

                    {/* Unit */}
                    <td className="px-3 py-2.5 text-center">
                      <span className="inline-block rounded-md bg-slate-800 px-2 py-0.5 font-medium text-slate-300 text-[11px]">
                        {getUnitLabel(item.uom || 'PCS')}
                      </span>
                    </td>

                    {/* Actions */}
                    {(onRemoveItem || onScrollToItem) && (
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {onScrollToItem && (
                            <button
                              type="button"
                              onClick={() => onScrollToItem(index)}
                              className="rounded p-1 text-cyan-400 hover:bg-cyan-950/60 hover:text-cyan-200 transition-colors"
                              title="الانتقال وتعديل هذا البند"
                            >
                              ✏️
                            </button>
                          )}
                          {onRemoveItem && items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => onRemoveItem(index)}
                              className="rounded p-1 text-rose-400 hover:bg-rose-950/60 hover:text-rose-200 transition-colors"
                              title="حذف هذا البند"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            {/* Table Footer */}
            <tfoot className="border-t-2 border-slate-700 bg-slate-900/90 text-xs font-bold text-slate-300">
              <tr>
                <td colSpan={5} className="px-3.5 py-2.5 text-slate-400">
                  الإجمالي الكلي: <span className="font-mono text-cyan-300">{totalItemsCount}</span> بنود
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className="font-mono font-black text-amber-300">
                    {Number.isInteger(totalQuantity) ? totalQuantity : totalQuantity.toFixed(2)}
                  </span>
                </td>
                <td colSpan={(onRemoveItem || onScrollToItem) ? 2 : 1} className="px-3 py-2.5 text-left text-slate-500 text-[11px]">
                  مجموع الكميات المطلوبة
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
