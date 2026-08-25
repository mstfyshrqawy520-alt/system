import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  title = 'المهام والإجراءات العاجلة المطلوبة منك الآن',
  description = 'هذه الطلبات والمعاملات تقف حالياً على خطوتك، يمكنك اتخاذ الإجراء أو معاينتها بنقرة واحدة.',
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
    const peekType: PeekType = item.type === 'PO' ? 'PO' : 'PR';
    setPeekState({
      isOpen: true,
      type: peekType,
      id: item.rawId,
    });
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-cyan-800/40 bg-slate-900/90 p-5 shadow-xl animate-pulse" dir="rtl">
        <div className="h-6 w-64 bg-slate-800 rounded mb-2"></div>
        <div className="h-4 w-96 bg-slate-800/60 rounded mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="h-28 bg-slate-800/40 rounded-xl"></div>
          <div className="h-28 bg-slate-800/40 rounded-xl"></div>
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
            ? 'border-cyan-500/50 bg-gradient-to-r from-slate-900 via-slate-900/95 to-cyan-950/20'
            : 'border-slate-800 bg-slate-900/60'
        }`}
        dir="rtl"
      >
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-black shadow-inner ${
                hasItems
                  ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {hasItems ? '⚡' : '✅'}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-slate-100">{title}</h2>
                {hasItems ? (
                  <span className="rounded-full bg-rose-500 text-white px-2.5 py-0.5 text-xs font-black shadow-md shadow-rose-600/30">
                    {items.length} {items.length === 1 ? 'مهمة بانتظارك' : 'مهام بانتظارك'}
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-bold">
                    لا توجد معلقات
                  </span>
                )}
                {roleName && (
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 hidden sm:inline-block">
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

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`rounded-xl border p-4 flex flex-col justify-between gap-3 transition-all hover:shadow-lg ${
                    isUrgent
                      ? 'border-amber-500/60 bg-slate-950/90 shadow-amber-950/20'
                      : 'border-slate-800 bg-slate-950/80 hover:border-cyan-500/60'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Top Row: Code & Reason Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-black text-cyan-300 bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 rounded">
                          {item.code}
                        </span>
                        {isUrgent && (
                          <span className="text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded">
                            🔥 عاجل
                          </span>
                        )}
                      </div>
                      {item.timeAgo && (
                        <span className="text-[10px] font-mono text-slate-500">{item.timeAgo}</span>
                      )}
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-100 line-clamp-1">{item.title}</h3>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{item.subtitle}</p>
                      )}
                    </div>

                    {/* Meta info tags */}
                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-400 pt-1">
                      {item.department && (
                        <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          🏢 {item.department}
                        </span>
                      )}
                      {item.requester && (
                        <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          👤 {item.requester}
                        </span>
                      )}
                      {item.supplier && (
                        <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          🏭 {item.supplier}
                        </span>
                      )}
                      {item.amount !== undefined && (
                        <span className="font-mono font-bold text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/50">
                          💰 {Number(item.amount).toLocaleString('ar-EG')} ج.م
                        </span>
                      )}
                    </div>

                    {/* Required Action Highlight */}
                    <div className="rounded-lg bg-cyan-950/30 border border-cyan-800/40 p-2 text-xs text-cyan-200 font-medium">
                      <span className="text-cyan-400 font-bold block text-[10px]">الإجراء المطلوب:</span>
                      <span>{item.reason}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-900">
                    <button
                      type="button"
                      onClick={() => handleOpenPeek(item)}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      title="معاينة سريعة للطلب دون مغادرة الصفحة"
                    >
                      <span>👁️</span> معاينة
                    </button>
                    <Link to={item.actionUrl} className="flex-1">
                      <Button
                        size="sm"
                        variant="primary"
                        className="w-full text-xs font-bold flex items-center justify-center gap-1 bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-950"
                      >
                        <span>{item.actionLabel}</span>
                        <span>←</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/15 p-4 text-center space-y-1">
            <div className="text-sm font-bold text-emerald-300 flex items-center justify-center gap-2">
              <span>🎉</span> كل المهام والمعاملات تحت السيطرة!
            </div>
            <p className="text-xs text-slate-400">
              لا توجد طلبات أو إجراءات معلقة بانتظار قرارك في هذا الوقت. ستصلك إشعارات فورية عند وجود طلب جديد.
            </p>
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
