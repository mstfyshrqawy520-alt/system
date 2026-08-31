import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getApprovedPurchaseRequestApi } from '../../api/procurement';
import { PurchaseRequest } from '../../types/purchaseRequest';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { useAuth } from '../../context/AuthContext';
import { parseApiError } from '../../utils/apiError';
import { getUnitLabel } from '../../utils/units';
import { UnifiedNotesCard } from '../../components/common/UnifiedNotesCard';

export const ProcurementPurchaseRequestDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [pr, setPr] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { hasPermission } = useAuth();

  useEffect(() => {
    const loadPr = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getApprovedPurchaseRequestApi(Number(id));
        setPr(data);
      } catch (err) {
        const parsed = parseApiError(err);
        setError(parsed.message);
      } finally {
        setLoading(false);
      }
    };
    loadPr();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="جاري تحميل تفاصيل طلب الشراء..." />;
  }

  if (!pr) {
    return (
      <div className="p-8 text-center bg-slate-950 border border-slate-800 text-slate-400 text-xs rounded-xl" dir="rtl">
        لم يتم العثور على طلب الشراء المعتمد المطلوب.
      </div>
    );
  }

  return (
    <div className="procurement-reference-page space-y-6" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-3 space-x-reverse">
            <h1 className="text-2xl font-extrabold text-slate-100 font-mono">{pr.request_number}</h1>
            <span className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded border border-emerald-500/20">
              معتمد من المراجع APPROVED
            </span>
          </div>
        </div>

        {hasPermission('purchase_order.create') && (
          <Link
            to={`/procurement/purchase-orders/create?pr=${pr.id}`}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors shadow-lg shadow-cyan-600/20"
          >
            + إنشاء أمر شراء لهذا الطلب
          </Link>
        )}
      </div>

      {error && <ErrorMessage error={error} />}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1 text-xs">
          <div className="text-slate-400">القسم الطالب:</div>
          <div className="font-semibold text-slate-200 text-sm">{pr.department?.name || '—'}</div>
        </div>
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1 text-xs">
          <div className="text-slate-400">صاحب الطلب:</div>
          <div className="font-semibold text-slate-200 text-sm">{pr.requester?.name || '—'}</div>
        </div>
        <div className="bg-amber-950/20 p-4 rounded-xl border border-amber-800/60 space-y-1 text-xs">
          <div className="text-amber-400 font-bold">تاريخ الاحتياج ⏳:</div>
          <div className="font-mono font-bold text-amber-200 text-sm">{pr.date_needed || 'غير محدد'}</div>
        </div>
      </div>

      {pr.justification && (
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1 text-xs">
          <span className="font-bold text-slate-300">مبررات الشراء وحاجة العمل:</span>
          <p className="text-slate-300 mt-1">{pr.justification}</p>
        </div>
      )}

      {/* البنود Table */}
      <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3 shadow-xl">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">بنود الطلب المعتمدة</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900 text-slate-400 font-bold uppercase border-b border-slate-800">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">رقم قطعة الأرض</th>
                <th className="p-3">المنطقة</th>
                <th className="p-3">الوصف / المواد</th>
                <th className="p-3">الكمية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {pr.items?.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                  <td className="p-3 font-mono text-slate-300">{item.item_reference || '—'}</td>
                  <td className="p-3 text-slate-300">{item.region || '—'}</td>
                  <td className="p-3 text-slate-200 font-medium">{item.item_description}</td>
                  <td className="p-3 font-mono text-slate-200">{item.quantity} {getUnitLabel(item.uom)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <UnifiedNotesCard request={pr} />
    </div>
  );
};

export default ProcurementPurchaseRequestDetailsPage;
