import React, { useState } from 'react';
import { PurchaseRequest, ApprovalHistoryEntry } from '../../types/purchaseRequest';
import { PurchaseOrder } from '../../types/purchaseOrder';
import { Card } from '../ui/Card';
import { getUnitLabel } from '../../utils/units';

export interface UnifiedNotesCardProps {
  request?: PurchaseRequest | null;
  purchaseOrder?: PurchaseOrder | null;
  title?: string;
  className?: string;
  defaultOpen?: boolean;
  compact?: boolean;
}

interface ExtractedNote {
  id: string;
  category: 'requester' | 'reviewer' | 'executive' | 'procurement' | 'accounting' | 'quotes' | 'receipt';
  categoryLabel: string;
  authorName?: string;
  authorRole?: string;
  badgeLabel: string;
  badgeColor: string;
  date?: string | null;
  title: string;
  content: string;
  extraMeta?: Array<{ label: string; value: string }>;
}

const ACTION_MAPPING: Record<string, { label: string; category: ExtractedNote['category']; color: string }> = {
  CREATED: { label: 'إنشاء الطلب', category: 'requester', color: 'bg-slate-800 text-slate-200 border-slate-700' },
  SUBMITTED: { label: 'إرسال للمراجعة', category: 'requester', color: 'bg-cyan-950 text-cyan-300 border-cyan-800' },
  REVIEW_STARTED: { label: 'بدء مراجعة القسم', category: 'reviewer', color: 'bg-indigo-950 text-indigo-300 border-indigo-800' },
  HEADER_UPDATED: { label: 'تعديل بيانات الطلب', category: 'reviewer', color: 'bg-indigo-950 text-indigo-300 border-indigo-800' },
  ITEM_UPDATED: { label: 'تعديل بند', category: 'reviewer', color: 'bg-indigo-950 text-indigo-300 border-indigo-800' },
  ITEM_ADDED: { label: 'إضافة بند', category: 'reviewer', color: 'bg-indigo-950 text-indigo-300 border-indigo-800' },
  ITEM_REMOVED: { label: 'حذف بند', category: 'reviewer', color: 'bg-indigo-950 text-indigo-300 border-indigo-800' },
  APPROVED_BY_REVIEWER: { label: 'اعتماد رئيس القسم', category: 'reviewer', color: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  REJECTED_BY_REVIEWER: { label: 'رفض رئيس القسم', category: 'reviewer', color: 'bg-rose-950 text-rose-300 border-rose-800' },
  APPROVED_BY_EXECUTIVE: { label: 'اعتماد المدير العام', category: 'executive', color: 'bg-amber-950 text-amber-300 border-amber-800' },
  EXECUTIVE_REJECTED: { label: 'رفض المدير العام', category: 'executive', color: 'bg-rose-950 text-rose-300 border-rose-800' },
  EDITED_BY_EXECUTIVE: { label: 'تعديل وتوجيه المدير العام', category: 'executive', color: 'bg-amber-950 text-amber-300 border-amber-800' },
  EXECUTIVE_SELECTED_QUOTE: { label: 'قرار اختيار عرض السعر', category: 'executive', color: 'bg-amber-950 text-amber-300 border-amber-800' },
  EXECUTIVE_REJECTED_QUOTES: { label: 'رفض عروض الأسعار', category: 'executive', color: 'bg-rose-950 text-rose-300 border-rose-800' },
  THREE_QUOTES_REQUIRED: { label: 'طلب عروض أسعار', category: 'procurement', color: 'bg-cyan-950 text-cyan-300 border-cyan-800' },
  THREE_QUOTES_SUBMITTED: { label: 'تقديم عروض الأسعار', category: 'procurement', color: 'bg-cyan-950 text-cyan-300 border-cyan-800' },
  DIRECT_PURCHASE_REQUEST_CREATED: { label: 'إنشاء مسار شراء مباشر', category: 'procurement', color: 'bg-cyan-950 text-cyan-300 border-cyan-800' },
  PO_CREATED: { label: 'إنشاء أمر شراء', category: 'procurement', color: 'bg-cyan-950 text-cyan-300 border-cyan-800' },
  PO_ISSUED: { label: 'إصدار أمر الشراء للمورد', category: 'procurement', color: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  ACCOUNTING_APPROVED_DIRECT: { label: 'اعتماد الحسابات المالي', category: 'accounting', color: 'bg-blue-950 text-blue-300 border-blue-800' },
  APPROVED_BY_ACCOUNTING: { label: 'اعتماد الحسابات', category: 'accounting', color: 'bg-blue-950 text-blue-300 border-blue-800' },
  REJECTED: { label: 'رفض الطلب', category: 'reviewer', color: 'bg-rose-950 text-rose-300 border-rose-800' },
  WAREHOUSE_RECEIPT_APPROVED: { label: 'اعتماد محضر استلام المخزن', category: 'receipt', color: 'bg-teal-950 text-teal-300 border-teal-800' },
  SITE_ENGINEER_APPROVED: { label: 'اعتماد مهندس الموقع', category: 'receipt', color: 'bg-teal-950 text-teal-300 border-teal-800' },
};

const CATEGORY_AVATARS: Record<ExtractedNote['category'], { icon: string; label: string }> = {
  requester: { icon: '👤', label: 'مقدم الطلب' },
  reviewer: { icon: '🔍', label: 'رئيس القسم / المراجع' },
  executive: { icon: '👑', label: 'المدير العام / التنفيذي' },
  procurement: { icon: '💼', label: 'إدارة المشتريات' },
  accounting: { icon: '📊', label: 'الإدارة المالية والحسابات' },
  quotes: { icon: '🏷️', label: 'عروض الأسعار والترشيحات' },
  receipt: { icon: '🏢', label: 'الاستلام ومحاضر الفحص' },
};

export const UnifiedNotesCard: React.FC<UnifiedNotesCardProps> = ({
  request,
  purchaseOrder,
  title = 'سجل الملاحظات والقرارات لكافة الأدوار والمراحل',
  className = '',
  compact = false,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');

  // Extract all notes from PR & PO
  const notesList: ExtractedNote[] = [];

  const pr = request || (purchaseOrder?.purchase_request as PurchaseRequest | undefined);
  const po = purchaseOrder;

  // 1. Requester Header Notes & Justification
  if (pr?.notes && pr.notes.trim()) {
    notesList.push({
      id: 'pr-notes',
      category: 'requester',
      categoryLabel: 'مقدم الطلب',
      authorName: pr.requester?.name || 'مقدم الطلب',
      authorRole: 'صاحب الطلب',
      badgeLabel: 'ملاحظات الطلب الأساسية',
      badgeColor: 'bg-slate-800 text-slate-200 border-slate-700',
      date: pr.created_at,
      title: 'ملاحظات مقدم الطلب على طلب الشراء',
      content: pr.notes,
    });
  }

  if (pr?.justification && pr.justification.trim() && pr.justification.trim() !== pr.notes?.trim()) {
    notesList.push({
      id: 'pr-justification',
      category: 'requester',
      categoryLabel: 'مقدم الطلب',
      authorName: pr.requester?.name || 'مقدم الطلب',
      authorRole: 'صاحب الطلب',
      badgeLabel: 'مبررات الاحتياج',
      badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-800',
      date: pr.created_at,
      title: 'مبررات الشروع في طلب الشراء وحاجة العمل',
      content: pr.justification,
    });
  }

  // 2. Item-Specific Notes & Technical Specs
  const items = pr?.items || po?.items || [];
  items.forEach((item, idx) => {
    const itemNum = idx + 1;
    const hasSpec = Boolean(item.specifications && item.specifications.trim());
    const hasItemNotes = Boolean('notes' in item && item.notes && (item.notes as string).trim());

    if (hasSpec || hasItemNotes) {
      const parts: string[] = [];
      if (hasSpec) parts.push(`📌 المواصفات الفنية: ${item.specifications}`);
      if (hasItemNotes) parts.push(`📝 ملاحظات الصنف: ${(item as any).notes}`);

      notesList.push({
        id: `pr-item-${item.id || idx}`,
        category: 'requester',
        categoryLabel: 'مقدم الطلب والبنود',
        authorName: pr?.requester?.name || 'مقدم الطلب',
        authorRole: 'مواصفات الأصناف',
        badgeLabel: `مواصفات بند #${itemNum}`,
        badgeColor: 'bg-indigo-950 text-indigo-300 border-indigo-800',
        date: pr?.created_at,
        title: `مواصفات وملاحظات البند: ${item.item_description}`,
        content: parts.join('\n'),
        extraMeta: [
          { label: 'رقم القطعة', value: item.item_reference || 'غير محدد' },
          { label: 'المنطقة', value: item.region || 'غير محددة' },
          { label: 'الكمية', value: `${item.quantity} ${getUnitLabel(item.uom)}` },
        ],
      });
    }
  });

  // 3. Approval History Decisions & Comments
  const history: ApprovalHistoryEntry[] = pr?.approval_history || (po?.approval_history as any) || [];
  history.forEach((entry, idx) => {
    if (entry.comments && entry.comments.trim()) {
      const mapping = ACTION_MAPPING[entry.action] || {
        label: entry.action,
        category: 'reviewer' as const,
        color: 'bg-slate-800 text-slate-200 border-slate-700',
      };

      notesList.push({
        id: `history-${idx}`,
        category: mapping.category,
        categoryLabel: CATEGORY_AVATARS[mapping.category]?.label || 'سجل المراجعة',
        authorName: entry.actor?.name || 'المسؤول',
        authorRole: (entry.actor as any)?.role || undefined,
        badgeLabel: mapping.label,
        badgeColor: mapping.color,
        date: entry.created_at,
        title: `قرار / تعليق: ${mapping.label}`,
        content: entry.comments,
        extraMeta: entry.from_state || entry.to_state ? [
          { label: 'الحالة السابقة', value: entry.from_state || '-' },
          { label: 'الحالة الجديدة', value: entry.to_state || '-' },
        ] : undefined,
      });
    }
  });

  // 4. Rejection or Return Reason if not duplicated
  if (pr?.rejection_reason && pr.rejection_reason.trim() && !notesList.some(n => n.content.includes(pr.rejection_reason!))) {
    notesList.push({
      id: 'pr-rejection-reason',
      category: 'reviewer',
      categoryLabel: 'قرار الرفض',
      authorName: pr.assigned_reviewer?.name || 'المراجع / الإدارة',
      authorRole: 'سبب الرفض الرسمي',
      badgeLabel: 'سبب الرفض',
      badgeColor: 'bg-rose-950 text-rose-300 border-rose-800',
      date: pr.updated_at,
      title: 'سبب رفض طلب الشراء',
      content: pr.rejection_reason,
    });
  }

  // 5. Quotation Notes and Recommendations
  const quotes = pr?.quotes || [];
  quotes.forEach((quote, qIdx) => {
    const supplierName = quote.supplier?.company_name || `مورد #${quote.supplier_id || qIdx + 1}`;

    if (quote.notes && quote.notes.trim()) {
      notesList.push({
        id: `quote-notes-${quote.id || qIdx}`,
        category: 'quotes',
        categoryLabel: 'عروض الأسعار',
        authorName: supplierName,
        authorRole: 'عرض المورد',
        badgeLabel: `شروط عرض: ${supplierName}`,
        badgeColor: 'bg-amber-950 text-amber-300 border-amber-800',
        date: quote.created_at,
        title: `ملاحظات وشروط عرض المورد (${supplierName})`,
        content: quote.notes,
        extraMeta: [
          { label: 'إجمالي العرض', value: `${parseFloat(quote.total_amount || '0').toLocaleString()} ${quote.currency || 'EGP'}` },
          { label: 'سعر الوحدة', value: `${parseFloat(quote.unit_price || '0').toLocaleString()} ${quote.currency || 'EGP'}` },
        ],
      });
    }

    // Accounting & Department Recommendations
    if (quote.recommendations && quote.recommendations.length > 0) {
      quote.recommendations.forEach((rec, rIdx) => {
        if (rec.comment && rec.comment.trim()) {
          const isAcc = rec.role_type === 'ACCOUNTING';
          const recRole = isAcc ? 'الحسابات' : 'مدير القسم الفني';
          const recDecision = rec.decision === 'RECOMMEND' ? 'مرشح للموافقة ✅' : 'متحفظ عليه / مرفوض ⚠️';

          notesList.push({
            id: `quote-rec-${quote.id}-${rec.id || rIdx}`,
            category: isAcc ? 'accounting' : 'reviewer',
            categoryLabel: isAcc ? 'ترشيح الحسابات' : 'ترشيح مدير القسم',
            authorName: rec.user?.name || (isAcc ? 'مسؤول الحسابات' : 'مدير القسم'),
            authorRole: recRole,
            badgeLabel: `ترشيح ${recRole} (${recDecision})`,
            badgeColor: isAcc ? 'bg-blue-950 text-blue-300 border-blue-800' : 'bg-indigo-950 text-indigo-300 border-indigo-800',
            title: `تعليق ${recRole} على عرض (${supplierName})`,
            content: rec.comment,
            extraMeta: [
              { label: 'المورد المعني', value: supplierName },
              { label: 'القرار', value: recDecision },
            ],
          });
        }
      });
    }
  });

  // 6. Purchase Order Notes & Delivery Terms
  if (po) {
    if (po.notes && po.notes.trim()) {
      notesList.push({
        id: 'po-notes',
        category: 'procurement',
        categoryLabel: 'أمر الشراء',
        authorName: po.created_by?.name || 'مسؤول المشتريات',
        authorRole: 'إدارة المشتريات',
        badgeLabel: 'ملاحظات أمر الشراء',
        badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-800',
        date: po.created_at,
        title: 'ملاحظات وتوجيهات أمر الشراء للمورد',
        content: po.notes,
      });
    }

    if (po.delivery_notes && po.delivery_notes.trim()) {
      notesList.push({
        id: 'po-delivery-notes',
        category: 'procurement',
        categoryLabel: 'التسليم والتوريد',
        authorName: po.created_by?.name || 'مسؤول المشتريات',
        authorRole: 'تعليمات التوريد',
        badgeLabel: 'تعليمات التسليم والشحن',
        badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800',
        date: po.created_at,
        title: 'تعليمات التوريد والتسليم للموقع',
        content: po.delivery_notes,
      });
    }

    if (po.financial_notes && po.financial_notes.trim()) {
      notesList.push({
        id: 'po-financial-notes',
        category: 'accounting',
        categoryLabel: 'الحسابات',
        authorName: po.accounting_reviewer?.name || 'مراجعة الحسابات',
        authorRole: 'الإدارة المالية',
        badgeLabel: 'ملاحظات مالية وموازنة',
        badgeColor: 'bg-blue-950 text-blue-300 border-blue-800',
        date: po.updated_at,
        title: 'الملاحظات المالية ومطابقة الموازنة',
        content: po.financial_notes,
      });
    }

    if (po.payment_terms && po.payment_terms.trim()) {
      notesList.push({
        id: 'po-payment-terms',
        category: 'procurement',
        categoryLabel: 'شروط السداد',
        authorName: po.created_by?.name || 'مسؤول المشتريات',
        authorRole: 'شروط الدفع',
        badgeLabel: 'شروط السداد والاعتماد',
        badgeColor: 'bg-slate-800 text-slate-200 border-slate-700',
        date: po.created_at,
        title: 'شروط السداد والدفعات المتفق عليها',
        content: po.payment_terms,
      });
    }
  }

  // 7. Receipts & Inspection Notes
  if (pr?.purchase_orders) {
    pr.purchase_orders.forEach((poItem) => {
      poItem.receipts?.forEach((receipt, rIdx) => {
        if (receipt.receiver_notes && receipt.receiver_notes.trim()) {
          notesList.push({
            id: `receipt-notes-${receipt.id || rIdx}`,
            category: 'receipt',
            categoryLabel: 'الاستلام والفحص',
            authorName: 'مسؤول الاستلام بالموقع',
            authorRole: receipt.receipt_type === 'SITE' ? 'مهندس الموقع' : 'أمين المخزن',
            badgeLabel: `محضر استلام #${receipt.receipt_number}`,
            badgeColor: 'bg-teal-950 text-teal-300 border-teal-800',
            date: receipt.received_at,
            title: `ملاحظات الاستلام والفحص (${receipt.receipt_number})`,
            content: receipt.receiver_notes,
          });
        }
      });
    });
  }

  // Filter items
  const filteredNotes = selectedFilter === 'ALL'
    ? notesList
    : notesList.filter(n => n.category === selectedFilter);

  const filterOptions = [
    { key: 'ALL', label: `الكل (${notesList.length})`, icon: '📋' },
    { key: 'requester', label: `مقدم الطلب (${notesList.filter(n => n.category === 'requester').length})`, icon: '👤' },
    { key: 'reviewer', label: `رئيس القسم (${notesList.filter(n => n.category === 'reviewer').length})`, icon: '🔍' },
    { key: 'executive', label: `المدير العام (${notesList.filter(n => n.category === 'executive').length})`, icon: '👑' },
    { key: 'quotes', label: `عروض الأسعار (${notesList.filter(n => n.category === 'quotes').length})`, icon: '🏷️' },
    { key: 'procurement', label: `المشتريات (${notesList.filter(n => n.category === 'procurement').length})`, icon: '💼' },
    { key: 'accounting', label: `الحسابات (${notesList.filter(n => n.category === 'accounting').length})`, icon: '📊' },
    { key: 'receipt', label: `الاستلام (${notesList.filter(n => n.category === 'receipt').length})`, icon: '🏢' },
  ].filter(opt => opt.key === 'ALL' || notesList.some(n => n.category === opt.key));

  return (
    <Card className={`border border-cyan-800/50 bg-slate-950/70 p-4 sm:p-5 space-y-4 shadow-xl text-right ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-lg shrink-0">
            💬
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-slate-100">{title}</h3>
              <span className="rounded-full bg-cyan-500/20 border border-cyan-500/40 px-2.5 py-0.5 text-xs font-bold text-cyan-300 font-mono">
                {notesList.length} ملاحظة مسجلة
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              عرض موحد وشامل لجميع الملاحظات والتوجيهات والقرارات لكافة الأدوار المشاركة في دورة الشراء.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs if multiple categories exist */}
      {filterOptions.length > 2 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSelectedFilter(opt.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedFilter === opt.key
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Notes List */}
      {filteredNotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-center text-xs text-slate-500">
          لا توجد ملاحظات مسجلة ضمن هذا التصنيف حتى الآن.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotes.map((note) => {
            const avatar = CATEGORY_AVATARS[note.category] || { icon: '📝', label: 'ملاحظة' };

            return (
              <article
                key={note.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5 sm:p-4 hover:border-slate-700 transition-all shadow-md space-y-2.5"
              >
                {/* Note Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-sm border border-slate-700 shrink-0">
                      {avatar.icon}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-100">
                          {note.authorName}
                        </span>
                        {note.authorRole && (
                          <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60">
                            {note.authorRole}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${note.badgeColor}`}>
                      {note.badgeLabel}
                    </span>
                    {note.date && (
                      <time className="text-[10px] font-mono text-slate-500">
                        {new Date(note.date).toLocaleString('ar-EG', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    )}
                  </div>
                </div>

                {/* Note Title & Content */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
                    <span>💬</span>
                    <span>{note.title}</span>
                  </h4>
                  <div className="rounded-xl border border-slate-800/90 bg-slate-950/70 p-3 text-xs leading-relaxed text-slate-200 whitespace-pre-wrap font-sans selection:bg-cyan-500 selection:text-slate-950">
                    {note.content}
                  </div>
                </div>

                {/* Extra Metadata (e.g. Parcel, Region, Quantity, Total Amount) */}
                {note.extraMeta && note.extraMeta.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {note.extraMeta.map((meta, mIdx) => (
                      <div key={mIdx} className="rounded-lg bg-slate-950/40 border border-slate-800/70 p-2 text-[11px]">
                        <span className="text-slate-500 block text-[10px]">{meta.label}:</span>
                        <strong className="text-slate-300 font-mono mt-0.5 block">{meta.value}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default UnifiedNotesCard;
