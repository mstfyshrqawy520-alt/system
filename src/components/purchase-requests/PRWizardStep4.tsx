import React from 'react';
import { CreatePurchaseRequestPayload, PR_PRIORITY_LABELS } from '../../types/purchaseRequest';
import { Button } from '../ui/Button';

interface ChecklistItem {
  id: string;
  label: string;
  passed: boolean;
  mandatory: boolean;
}

interface Props {
  data: CreatePurchaseRequestPayload;
  onSubmit: () => void;
  isSubmitting: boolean;
  isGeneralManager?: boolean;
}

function buildChecklist(data: CreatePurchaseRequestPayload): ChecklistItem[] {
  const items = data.items || [];
  return [
    {
      id: 'items_count',
      label: 'الطلب يحتوي على بند واحد على الأقل',
      passed: items.length >= 1,
      mandatory: true,
    },
    {
      id: 'item_desc',
      label: 'جميع البنود لها وصف',
      passed: items.every(i => i.item_description && i.item_description.trim().length > 0),
      mandatory: true,
    },
    {
      id: 'item_qty',
      label: 'جميع الكميات أكبر من صفر> 0',
      passed: items.every(i => parseFloat(String(i.quantity)) > 0),
      mandatory: true,
    },
    {
      id: 'item_reference',
      label: 'جميع البنود لها رقم قطعة',
      passed: items.every(i => !!i.item_reference && i.item_reference.trim().length > 0),
      mandatory: true,
    },
    {
      id: 'region',
      label: 'جميع البنود مرتبطة بمنطقة',
      passed: items.every(i => !!i.region && i.region.trim().length > 0),
      mandatory: true,
    },
    {
      id: 'item_uom',
      label: 'جميع البنود لها وحدة قياس',
      passed: items.every(i => i.uom && i.uom.trim().length > 0),
      mandatory: false,
    },
    {
      id: 'date_needed',
      label: 'تاريخ الاحتياج محدد',
      passed: !!(data.date_needed),
      mandatory: false,
    },
    {
      id: 'no_prices',
      label: 'لا توجد أسعار في الطلب (غير مالي)(non-financial)',
      passed: true, // Always true - we don't collect prices
      mandatory: true,
    },
    {
      id: 'specifications',
      label: 'المواصفات التقنية محددة',
      passed: items.some(i => i.specifications && i.specifications.trim().length > 0),
      mandatory: false,
    },
  ];
}

export const PRWizardStep4: React.FC<Props> = ({ data, onSubmit, isSubmitting, isGeneralManager = false }) => {
  const checklist = buildChecklist(data);
  const mandatoryFailed = checklist.filter(c => c.mandatory && !c.passed);
  const canSubmit = mandatoryFailed.length === 0;
  const items = data.items || [];

  return (
    <div className="space-y-6">
      {/* Non-financial reminder */}
      <div className="bg-amber-950/30 border border-amber-700/40 rounded-xl p-3 text-xs text-amber-300 flex items-start gap-2">
        <span className="text-base">⚠️</span>
        <span>
          <strong>تذكير مهم:</strong> هذا الطلب غير مالي. لا يحق لمنشئ الطلب تحديد الأسعار أو الموردين.
          {isGeneralManager
            ? ' بعد الإرسال ينتقل الطلب مباشرة إلى مدير المشتريات لاختيار مسار عروض الأسعار أو الطلب المباشر.'
            : ' يختص قسم المشتريات بإعداد أوامر الشراء والتفاوض مع الموردين.'}
        </span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
          <div className="text-[10px] text-slate-400 font-semibold">الأولوية</div>
          <div className="font-bold text-slate-100 mt-1">{PR_PRIORITY_LABELS[data.priority || 'NORMAL']}</div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
          <div className="text-[10px] text-slate-400 font-semibold">عدد البنود</div>
          <div className="font-bold text-slate-100 mt-1">{items.length}</div>
        </div>
        {data.date_needed && (
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
            <div className="text-[10px] text-slate-400 font-semibold">تاريخ الاحتياج</div>
            <div className="font-bold text-slate-100 mt-1">{data.date_needed}</div>
          </div>
        )}
      </div>

      {/* Items Summary */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">📦 ملخص البنود</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-700/50">
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-slate-900 text-slate-300">
              <tr>
                <th className="p-2">م</th>
                <th className="p-2">رقم قطعة الأرض</th>
                <th className="p-2">المنطقة</th>
                <th className="p-2">الصنف</th>
                <th className="p-2">الكمية</th>
                <th className="p-2">الوحدة</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-t border-slate-800/60 text-slate-200">
                  <td className="p-2 font-mono">{index + 1}</td>
                  <td className="p-2 font-mono">{item.item_reference || 'مطلوب'}</td>
                  <td className="p-2">{item.region || 'مطلوبة'}</td>
                  <td className="p-2 font-semibold">{item.item_description || '—'}</td>
                  <td className="p-2 font-mono">{item.quantity}</td>
                  <td className="p-2">{item.uom || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          ✅ قائمة التحقق قبل الإرسال
        </h3>
        <div className="space-y-1">
          {checklist.map(item => (
            <div
              key={item.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs ${
                item.passed
                  ? 'bg-emerald-950/30 border border-emerald-800/30 text-emerald-300'
                  : item.mandatory
                  ? 'bg-rose-950/40 border border-rose-800/40 text-rose-300'
                  : 'bg-slate-800/30 border border-slate-700/30 text-slate-400'
              }`}
            >
              <span className="text-base flex-shrink-0">
                {item.passed ? '✅' : item.mandatory ? '❌' : '⚠️'}
              </span>
              <span className={item.mandatory && !item.passed ? 'font-semibold' : ''}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* إرسال */}
      {!canSubmit && (
        <div className="bg-rose-950/30 border border-rose-800/50 rounded-xl p-3 text-xs text-rose-300">
          <strong>لا يمكن إرسال الطلب:</strong> يجب إتمام البنود المطلوبة أعلاه.
        </div>
      )}

      <Button
        type="button"
        variant="primary"
        size="lg"
        disabled={!canSubmit || isSubmitting}
        isLoading={isSubmitting}
        onClick={onSubmit}
        className="w-full"
      >
        {isSubmitting ? 'جارٍ الإرسال...' : '📤 إرسال طلب الشراء'}
      </Button>
    </div>
  );
};

export default PRWizardStep4;
