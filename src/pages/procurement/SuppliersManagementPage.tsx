import React, { useEffect, useState } from 'react';
import { getSuppliersApi, deleteSupplierApi } from '../../api/suppliers';
import { المورد } from '../../types/purchaseOrder';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import SupplierModal from '../../components/procurement/SupplierModal';
import { parseApiError } from '../../utils/apiError';
import { useAuth } from '../../context/AuthContext';

export const SuppliersManagementPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<المورد[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSupplier, setSelectedSupplier] = useState<المورد | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const { hasPermission } = useAuth();

  const loadSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSuppliersApi();
      setSuppliers(data);
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`هل أنت متأكد من إلغاء تفعيل/حذف المورد "${name}"؟`)) return;
    try {
      await deleteSupplierApi(id);
      loadSuppliers();
    } catch (err) {
      const parsed = parseApiError(err);
      alert(parsed.message);
    }
  };

  if (!hasPermission('supplier.view') && !hasPermission('purchase_order.create')) {
    return (
      <div className="p-6 text-center text-rose-400 bg-rose-950/40 rounded-lg border border-rose-800" dir="rtl">
        عفواً، لا تملك الصلاحية اللازمة للوصول لإدارة الموردين.
      </div>
    );
  }

  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch =
      s.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.phone && s.phone.includes(searchTerm));

    if (statusFilter === 'active') return matchesSearch && s.is_active;
    if (statusFilter === 'inactive') return matchesSearch && !s.is_active;
    return matchesSearch;
  });

  return (
    <div className="procurement-reference-page space-y-6" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <h1 className="text-xl font-bold text-slate-100">إدارة الموردين والشركاء</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            سجل الموردين المعتمدين، بيانات الاتصال، وحالة الاعتماد بالنظام
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedSupplier(null);
            setIsModalOpen(true);
          }}
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-cyan-600/20"
        >
          <span className="text-base font-bold">+</span>
          إضافة مورد جديد
        </button>
      </div>

      {error && <ErrorMessage error={error} />}

      {/* تصفية and بحث Section */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full md:w-80">
          <input
            type="text"
            placeholder="بحث باسم الشركة، الكود، الهاتف، البريد..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center space-x-2 space-x-reverse bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'all' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            الكل ({suppliers.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            النشطين ({suppliers.filter(s => s.is_active).length})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'inactive' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            غير النشطين ({suppliers.filter(s => !s.is_active).length})
          </button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <LoadingSpinner message="جاري تحميل سجل الموردين من قاعدة البيانات..." />
      ) : filteredSuppliers.length === 0 ? (
        <div className="bg-slate-950 p-12 text-center rounded-xl border border-slate-800 text-slate-500 text-xs">
          لا يوجد موردون يطابقون نتائج البحث المحددة.
        </div>
      ) : (
        <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900/90 text-slate-400 font-bold uppercase border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">الكود</th>
                  <th className="px-4 py-3">اسم الشركة / المورد</th>
                  <th className="px-4 py-3">الهاتف</th>
                  <th className="px-4 py-3">البريد الإلكتروني</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSuppliers.map(s => (
                  <tr key={s.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-cyan-400">{s.code || `SUP-${s.id}`}</td>
                    <td className="px-4 py-3 font-semibold text-slate-200">{s.company_name}</td>
                    <td className="px-4 py-3 text-slate-300">{s.phone || 'غير مدخل'}</td>
                    <td className="px-4 py-3 text-slate-300 font-mono">{s.email || 'غير مدخل'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {s.is_active ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center space-x-2 space-x-reverse">
                        <button
                          onClick={() => {
                            setSelectedSupplier(s);
                            setIsModalOpen(true);
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] px-2.5 py-1 rounded font-medium transition-colors"
                        >
                          تعديل
                        </button>
                        {s.is_active && (
                          <button
                            onClick={() => handleDelete(s.id, s.company_name)}
                            className="bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 text-[11px] px-2.5 py-1 rounded font-medium border border-rose-900/40 transition-colors"
                          >
                            حذف
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* المورد Modal */}
      <SupplierModal
        supplier={selectedSupplier}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadSuppliers}
      />
    </div>
  );
};

export default SuppliersManagementPage;
