import React from 'react';
import { PurchaseRequest, PR_STATUS_LABELS } from '../../types/purchaseRequest';

interface PurchaseRequestTimelineProps {
  request: PurchaseRequest;
  compact?: boolean;
}

const DIRECT_STEPS = [
  { key: 'created', label: 'إنشاء الطلب', description: 'تم تسجيل طلب الشراء المباشر' },
  { key: 'accounting', label: 'الحسابات', description: 'مراجعة واعتماد البيانات المالية' },
  { key: 'procurement', label: 'مدير المشتريات', description: 'إنشاء أمر الشراء' },
  { key: 'warehouse', label: 'أمين المخزن', description: 'اعتماد إذن الاستلام أولًا' },
  { key: 'site', label: 'مهندس الموقع', description: 'مراجعة واعتماد الاستلام' },
  { key: 'invoice', label: 'الحسابات', description: 'استلام PO وGRN وتسجيل الفاتورة' },
];

const STANDARD_STEPS = [
  { key: 'created', label: 'إنشاء الطلب', description: 'تم تسجيل طلب الشراء' },
  { key: 'department', label: 'مراجعة القسم', description: 'مراجعة واعتماد رئيس القسم' },
  { key: 'executive', label: 'المدير التنفيذي', description: 'اتخاذ القرار التنفيذي' },
  { key: 'procurement', label: 'المشتريات', description: 'تنفيذ مسار الشراء وإنشاء أمر الشراء' },
  { key: 'receipt', label: 'الاستلام', description: 'تسجيل واعتماد إذن الاستلام' },
  { key: 'accounting', label: 'الحسابات', description: 'مراجعة المستندات وتسجيل الفاتورة' },
];

const historyHas = (request: PurchaseRequest, actions: string[]) =>
  request.approval_history?.some(entry => actions.includes(entry.action)) || false;

const currentDirectIndex = (request: PurchaseRequest) => {
  const status = request.status;
  if (status === 'REJECTED') return -1;
  if (request.purchase_order_issued) return 5;
  if (historyHas(request, ['SITE_ENGINEER_APPROVED', 'RECEIPT_APPROVED_BY_SITE_ENGINEER'])) return 5;
  if (historyHas(request, ['WAREHOUSE_RECEIPT_APPROVED', 'PURCHASE_RECEIPT_CREATED'])) return 4;
  if (status === 'PENDING_PROCUREMENT_APPROVAL' || status === 'APPROVED_BY_PROCUREMENT') return 2;
  if (status === 'PENDING_ACCOUNTING_APPROVAL' || status === 'APPROVED_BY_ACCOUNTING') return 1;
  return 0;
};

const currentStandardIndex = (request: PurchaseRequest) => {
  const status = request.status;
  if (status === 'REJECTED') return -1;
  if (request.purchase_order_issued) return 5;
  if (historyHas(request, ['SITE_ENGINEER_APPROVED', 'RECEIPT_APPROVED_BY_SITE_ENGINEER'])) return 5;
  if (historyHas(request, ['WAREHOUSE_RECEIPT_APPROVED', 'PURCHASE_RECEIPT_CREATED'])) return 4;
  if (status === 'PENDING_ACCOUNTING_APPROVAL' || status === 'APPROVED_BY_ACCOUNTING') return 5;
  if (status === 'PENDING_PROCUREMENT_APPROVAL' || status === 'APPROVED_BY_PROCUREMENT' || status === 'PENDING_QUOTE_RECOMMENDATIONS' || status === 'PENDING_EXECUTIVE_QUOTE_DECISION') return 3;
  if (status === 'PENDING_EXECUTIVE_APPROVAL') return 2;
  if (status === 'SUBMITTED' || status === 'UNDER_REVIEW' || status === 'APPROVED_BY_REVIEWER') return 1;
  return 0;
};

const PurchaseRequestTimeline: React.FC<PurchaseRequestTimelineProps> = ({ request, compact = false }) => {
  const isDirect = request.procurement_route === 'DIRECT';
  const steps = isDirect ? DIRECT_STEPS : STANDARD_STEPS;
  const currentIndex = isDirect ? currentDirectIndex(request) : currentStandardIndex(request);
  const rejected = request.status === 'REJECTED';

  return (
    <section className={compact ? 'space-y-2' : 'space-y-3'} dir="rtl" aria-label="شريط تقدم طلب الشراء">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-cyan-200">متابعة تقدم طلب الشراء</h3>
          <p className="mt-1 text-[11px] text-slate-400">{rejected ? 'تم إيقاف الطلب بسبب الرفض.' : PR_STATUS_LABELS[request.status] || request.status}</p>
        </div>
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${rejected ? 'border-rose-400/40 bg-rose-400/10 text-rose-300' : 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200'}`}>
            {isDirect ? 'شراء مباشر' : request.procurement_route === 'QUOTES' ? 'عروض أسعار' : 'مسار الشراء'}
          </span>
      </div>

      <div className={`grid gap-2 ${compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'}`}>
        {steps.map((step, index) => {
          const completed = !rejected && index < currentIndex;
          const active = !rejected && index === currentIndex;
          return (
            <div key={step.key} className={`relative rounded-lg border p-2.5 ${completed ? 'border-emerald-400/40 bg-emerald-400/10' : active ? 'border-cyan-400/60 bg-cyan-400/10' : rejected ? 'border-rose-400/30 bg-rose-400/10' : 'border-slate-700 bg-slate-950/50'}`}>
              <div className="flex items-center gap-2">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${completed ? 'bg-emerald-400 text-slate-950' : active ? 'bg-cyan-400 text-slate-950' : rejected ? 'bg-rose-400 text-slate-950' : 'bg-slate-700 text-slate-300'}`}>
                  {completed ? '✓' : index + 1}
                </span>
                <span className="text-[11px] font-bold text-slate-100">{step.label}</span>
              </div>
              {!compact && <p className="mt-2 text-[10px] leading-5 text-slate-400">{step.description}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default PurchaseRequestTimeline;
