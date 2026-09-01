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
  const status = String(request.status);
  if (status === 'REJECTED') return -1;

  const pos = (request as any).purchase_orders || [];
  const hasApprovedReceipt = pos.some((po: any) => po.has_approved_receipt || (po.receipts || []).some((r: any) => r.status === 'APPROVED')) || historyHas(request, ['SITE_ENGINEER_APPROVED', 'RECEIPT_APPROVED_BY_SITE_ENGINEER']);
  const hasWarehouseReceipt = pos.some((po: any) => (po.receipts || []).length > 0) || historyHas(request, ['WAREHOUSE_RECEIPT_APPROVED', 'PURCHASE_RECEIPT_CREATED', 'WAREHOUSE_RECEIPT_SUBMITTED']);
  const hasIssuedPo = pos.some((po: any) => ['ISSUED', 'PENDING_ACCOUNTING_REVIEW', 'APPROVED_BY_ACCOUNTING', 'FINAL_APPROVED'].includes(po.status)) || Boolean(request.purchase_order_issued) || status === 'PO_DRAFT' || status === 'ISSUED';
  const isAccountingApproved = status === 'APPROVED_BY_ACCOUNTING' || status === 'APPROVED_BY_PROCUREMENT' || status === 'PENDING_PROCUREMENT_APPROVAL';

  if (hasApprovedReceipt) return 5; // Step 6 (Invoice/Accounting) is active, steps 1-5 done
  if (hasWarehouseReceipt) return 4; // Step 5 (Site Engineer) is active, steps 1-4 done
  if (hasIssuedPo) return 3; // Step 4 (Warehouse Keeper) is active, steps 1-3 done
  if (isAccountingApproved) return 2; // Step 3 (Procurement Manager) is active, steps 1-2 done
  if (status === 'PENDING_ACCOUNTING_APPROVAL') return 1; // Step 2 (Accounting) is active, step 1 done
  return 0;
};

const currentStandardIndex = (request: PurchaseRequest) => {
  const status = String(request.status);
  if (status === 'REJECTED') return -1;

  const pos = (request as any).purchase_orders || [];
  const hasApprovedReceipt = pos.some((po: any) => po.has_approved_receipt || (po.receipts || []).some((r: any) => r.status === 'APPROVED')) || historyHas(request, ['SITE_ENGINEER_APPROVED', 'RECEIPT_APPROVED_BY_SITE_ENGINEER']);
  const hasWarehouseReceipt = pos.some((po: any) => (po.receipts || []).length > 0) || historyHas(request, ['WAREHOUSE_RECEIPT_APPROVED', 'PURCHASE_RECEIPT_CREATED', 'WAREHOUSE_RECEIPT_SUBMITTED']);
  const hasIssuedPo = pos.some((po: any) => ['ISSUED', 'PENDING_ACCOUNTING_REVIEW', 'APPROVED_BY_ACCOUNTING', 'FINAL_APPROVED'].includes(po.status)) || Boolean(request.purchase_order_issued) || status === 'PO_DRAFT' || status === 'ISSUED';

  if (hasApprovedReceipt) return 5;
  if (hasWarehouseReceipt) return 4;
  if (hasIssuedPo) return 4;
  if (status === 'PENDING_PROCUREMENT_APPROVAL' || status === 'APPROVED_BY_PROCUREMENT' || status === 'PENDING_QUOTE_RECOMMENDATIONS' || status === 'PENDING_EXECUTIVE_QUOTE_DECISION') return 3;
  if (status === 'PENDING_EXECUTIVE_APPROVAL') return 2;
  if (status === 'SUBMITTED' || status === 'UNDER_REVIEW' || status === 'APPROVED_BY_REVIEWER') return 1;
  return 0;
};

const getActionGuidance = (request: PurchaseRequest): { text: string; bg: string; icon: string } => {
  const status = String(request.status);
  const pos = (request as any).purchase_orders || [];
  const hasApprovedReceipt = pos.some((po: any) => po.has_approved_receipt || (po.receipts || []).some((r: any) => r.status === 'APPROVED')) || historyHas(request, ['SITE_ENGINEER_APPROVED', 'RECEIPT_APPROVED_BY_SITE_ENGINEER']);
  const hasWarehouseReceipt = pos.some((po: any) => (po.receipts || []).length > 0) || historyHas(request, ['WAREHOUSE_RECEIPT_APPROVED', 'PURCHASE_RECEIPT_CREATED', 'WAREHOUSE_RECEIPT_SUBMITTED']);
  const hasIssuedPo = pos.some((po: any) => ['ISSUED', 'PENDING_ACCOUNTING_REVIEW', 'APPROVED_BY_ACCOUNTING', 'FINAL_APPROVED'].includes(po.status)) || Boolean(request.purchase_order_issued) || status === 'PO_DRAFT' || status === 'ISSUED';

  if (status === 'DRAFT') {
    return {
      icon: '✍️',
      text: 'الطلب ما زال مسودة لديك. اضغط على «إرسال الطلب» لإرساله إلى رئيس قسمك للمراجعة والاعتماد.',
      bg: 'border-slate-700 bg-slate-900/80 text-slate-200',
    };
  }
  if (status === 'REJECTED') {
    return {
      icon: '❌',
      text: `تم رفض هذا الطلب. ${request.rejection_reason ? `سبب الرفض: ${request.rejection_reason}` : ''}`,
      bg: 'border-rose-800 bg-rose-950/50 text-rose-200',
    };
  }
  if (hasApprovedReceipt) {
    return {
      icon: '🏗️',
      text: 'تم فحص واعتماد المواد هندسياً بالموقع بنجاح، والطلب الآن لدى الحسابات لاستكمال الفواتير وصرف الدفعات.',
      bg: 'border-emerald-600 bg-emerald-950/50 text-emerald-100',
    };
  }
  if (hasWarehouseReceipt) {
    return {
      icon: '📦',
      text: 'تم تسجيل استلام المواد بالمخزن بنجاح، وبانتظار اعتماد ومطابقة مهندس الموقع في الميدان.',
      bg: 'border-amber-600 bg-amber-950/50 text-amber-200',
    };
  }
  if (hasIssuedPo) {
    return {
      icon: '📋',
      text: 'تم إصدار أمر الشراء للمورد. الخطوة القادمة هي وصول المواد وتأكيد استلامها بالمخزن والموقع.',
      bg: 'border-cyan-700/50 bg-cyan-950/40 text-cyan-200',
    };
  }
  if (status === 'APPROVED_BY_ACCOUNTING' || status === 'APPROVED_BY_PROCUREMENT' || status === 'PENDING_PROCUREMENT_APPROVAL') {
    return {
      icon: '💼',
      text: 'تم اعتماد الطلب مالياً بنجاح، وهو الآن لدى مدير المشتريات لإصدار أمر الشراء للمورد.',
      bg: 'border-amber-700/50 bg-amber-950/40 text-amber-200',
    };
  }
  if (status === 'SUBMITTED' || status === 'UNDER_REVIEW') {
    return {
      icon: '⏳',
      text: `الطلب الآن بانتظار مراجعة واعتماد رئيس القسم (${request.target_department?.name || request.department?.name || 'قسمك'}). لا يتطلب منك أي إجراء حالياً.`,
      bg: 'border-cyan-700/50 bg-cyan-950/40 text-cyan-200',
    };
  }
  if (status === 'PENDING_EXECUTIVE_APPROVAL') {
    return {
      icon: '👔',
      text: 'تم اعتماد الطلب من رئيس القسم، وهو الآن بانتظار قرار المدير العام/التنفيذي.',
      bg: 'border-violet-700/50 bg-violet-950/40 text-violet-200',
    };
  }
  if (status === 'COMPLETED') {
    return {
      icon: '🎉',
      text: 'اكتملت دورة الشراء بالكامل وتم استلام المواد بنجاح ومطابقتها وتسجيلها في الحسابات.',
      bg: 'border-emerald-600 bg-emerald-950/60 text-emerald-100',
    };
  }
  return {
    icon: 'ℹ️',
    text: 'الطلب جارٍ متابعته في دورة المشتريات.',
    bg: 'border-slate-700 bg-slate-900/60 text-slate-300',
  };
};

const PurchaseRequestTimeline: React.FC<PurchaseRequestTimelineProps> = ({ request, compact = false }) => {
  const isDirect = request.procurement_route === 'DIRECT';
  const steps = isDirect ? DIRECT_STEPS : STANDARD_STEPS;
  const currentIndex = isDirect ? currentDirectIndex(request) : currentStandardIndex(request);
  const rejected = request.status === 'REJECTED';
  const guidance = getActionGuidance(request);

  return (
    <section className={compact ? 'space-y-2.5' : 'space-y-3.5'} dir="rtl" aria-label="شريط تقدم طلب الشراء">
      {/* Smart Plain Arabic Guidance Banner */}
      <div className={`flex items-center gap-3 rounded-xl border p-3 text-xs font-semibold shadow-inner ${guidance.bg}`}>
        <span className="text-xl shrink-0">{guidance.icon}</span>
        <div className="flex-1 leading-5">
          <strong className="block text-[11px] font-black opacity-80 uppercase tracking-wider mb-0.5">
            الوضع الحالي للطلب:
          </strong>
          {guidance.text}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-cyan-200">مراحل سير الطلب</h3>
          <p className="mt-0.5 text-[11px] text-slate-400">{rejected ? 'تم إيقاف الطلب بسبب الرفض.' : PR_STATUS_LABELS[request.status] || request.status}</p>
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
