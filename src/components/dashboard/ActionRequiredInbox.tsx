import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import QuickPeekDrawer, { PeekType } from '../ui/QuickPeekDrawer';

export interface ActionInboxItem {
  id: string | number;
  rawId: number;
  type: 'PR' | 'PO' | 'QUOTE' | 'INVOICE' | 'RECEIPT';
  code: string;
  title: string;
  subtitle?: string;
  department?: string;
  requester?: string;
  supplier?: string;
  amount?: number | string;
  urgency?: 'CRITICAL' | 'HIGH' | 'NORMAL';
  reason: string;
  actionUrl: string;
  actionLabel: string;
  timeAgo?: string;
}

export interface ActionRequiredInboxProps {
  title?: string;
  description?: string;
  items: ActionInboxItem[];
  loading?: boolean;
  roleName?: string;
}

export const ActionRequiredInbox: React.FC<ActionRequiredInboxProps> = ({
  title = 'مطلوب منك الآن',
  description = 'هذه المعاملات تقف حالياً على خطوتك وقرارك، يمكنك اتخاذ الإجراء بضغطة زر واحدة.',
  items,
  loading = false,
  roleName,
}) => {
  const navigate = useNavigate();
  const [peekState, setPeekState] = useState<{ isOpen: boolean; type: PeekType; id: number | null }>({
    isOpen: false,
    type: 'PR',
    id: null,
  });

  const handleOpenPeek = (item: ActionInboxItem) => {
    if (item.type === 'PR' || item.type === 'PO') {
      setPeekState({
        isOpen: true,
        type: item.type,
        id: item.rawId,
      });
    } else {
      // For QUOTE, INVOICE, RECEIPT, navigate directly to the specialized page
      navigate(item.actionUrl);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-cyan-800/40 bg-slate-900/90 p-5 shadow-xl animate-pulse" dir="rtl">
        <div className="h-6 w-64 bg-slate-800 rounded mb-2"></div>
        <div className="h-4 w-96 bg-slate-800/60 rounded mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="h-32 bg-slate-800/40 rounded-xl"></div>
          <div className="h-32 bg-slate-800/40 rounded-xl"></div>
          <div className="h-32 bg-slate-800/40 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const hasItems = items && items.length > 0;

  return (
    <>
      <div
        className={`rounded-2xl border-2 transition-all p-4 sm:p-5 shadow-xl space-y-4 ${
          hasItems
            ? 'border-cyan-500/60 bg-gradient-to-r from-slate-900 via-slate-900/95 to-cyan-950/25 shadow-cyan-950/40'
            : 'border-slate-800 bg-slate-900/60'
        }`}
        dir="rtl"
      >
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl font-black shadow-inner ${
                hasItems
                  ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {hasItems ? '⚡' : '✅'}
            </span>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-black text-slate-100">{title}</h2>
                {hasItems ? (
                  <span className="rounded-full bg-rose-500 text-white px-3 py-0.5 text-xs font-black shadow-md shadow-rose-600/40 animate-bounce">
                    {items.length} {items.length === 1 ? 'مهمة تنتظر قرارك' : 'مهام تنتظر قرارك'}
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-bold">
                    لا توجد معلقات حالياً
                  </span>
                )}
                {roleName && (
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700 hidden sm:inline-block">
                    {roleName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{description}</p>
            </div>
          </div>
        </div>

        {/* Action Items List */}
        {hasItems ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            {items.map((item) => {
              const isUrgent = item.urgency === 'CRITICAL' || item.urgency === 'HIGH';
              const canPeek = item.type === 'PR' || item.type === 'PO';

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`rounded-2xl border p-4 flex flex-col justify-between gap-3.5 transition-all hover:shadow-xl ${
                    isUrgent
                      ? 'border-amber-500/70 bg-slate-950/90 shadow-amber-950/20'
                      : 'border-slate-800/90 bg-slate-950/80 hover:border-cyan-500/60'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Top Row: Code & Urgency */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-black text-cyan-300 bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 rounded-lg">
                          {item.code}
                        </span>
                        {isUrgent && (
                          <span className="text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-lg">
                            🔥 عاجل
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg">
                          {item.type === 'PR'
                            ? 'طلب شراء'
                            : item.type === 'PO'
                            ? 'أمر شراء'
                            : item.type === 'QUOTE'
                            ? 'عرض سعر'
                            : item.type === 'INVOICE'
                            ? 'فاتورة'
                            : 'استلام'}
                        </span>
                      </div>

                      {item.timeAgo && (
                        <span className="text-[10px] text-slate-500 font-mono shrink-0">
                          {item.timeAgo}
                        </span>
                      )}
                    </div>

                    {/* Title & Info */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-100 leading-snug line-clamp-2">
                        {item.title}
                      </h4>
                      {item.subtitle && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                          {item.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Meta info tags */}
                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
                      {item.amount !== undefined && Number(item.amount) > 0 && (
                        <span className="font-mono font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded-lg">
                          💰 {Number(item.amount).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                        </span>
                      )}
                      {item.requester && (
                        <span className="bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-800">
                          👤 {item.requester}
                        </span>
                      )}
                      {item.department && (
                        <span className="bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-800">
                          🏢 {item.department}
                        </span>
                      )}
                      {item.supplier && item.title !== item.supplier && (
                        <span className="bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-800">
                          🤝 {item.supplier}
                        </span>
                      )}
                    </div>

                    {/* Reason Tag - Explicit operational priority */}
                    <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-2 text-xs font-semibold text-amber-200">
                      <span className="font-bold text-amber-400">السبب: </span>
                      {item.reason}
                    </div>
                  </div>

                  {/* Actions Row: Single Primary Action + Optional Quick Peek */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <Button
                      variant={isUrgent ? 'warning' : 'primary'}
                      size="sm"
                      onClick={() => navigate(item.actionUrl)}
                      className="flex-1 text-xs font-black shadow-md"
                    >
                      <span>{item.actionLabel}</span>
                      <span className="mr-1">←</span>
                    </Button>

                    {canPeek && (
                      <button
                        type="button"
                        onClick={() => handleOpenPeek(item)}
                        className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300 hover:border-cyan-500/60 hover:bg-slate-800 hover:text-cyan-300 transition-colors cursor-pointer shrink-0"
                        title="معاينة سريعة لكافة التفاصيل"
                      >
                        <span>👁️</span>
                        <span className="mr-1 hidden sm:inline">معاينة</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <span className="text-3xl block">🎉</span>
            <p className="text-sm font-bold text-slate-200">أنت على دراية تامة بكل المعاملات!</p>
            <p className="text-xs text-slate-500">لا توجد طلبات أو موافقات معلقة بانتظار قرارك الآن.</p>
          </div>
        )}
      </div>

      {/* Quick Peek Drawer */}
      <QuickPeekDrawer
        isOpen={peekState.isOpen}
        onClose={() => setPeekState((prev) => ({ ...prev, isOpen: false }))}
        type={peekState.type}
        id={peekState.id}
      />
    </>
  );
};

export default ActionRequiredInbox;
