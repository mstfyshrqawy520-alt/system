import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createSupplierApi, updateSupplierApi, SupplierPayload } from '../../api/suppliers';
import { المورد } from '../../types/purchaseOrder';
import { parseApiError } from '../../utils/apiError';

interface SupplierModalProps {
  supplier: المورد | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (supplier?: المورد) => void;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({ supplier, isOpen, onClose, onSuccess }) => {
  const [companyName, setCompanyName] = useState('');
  const [code, setCode] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (supplier) {
      setCompanyName(supplier.company_name || '');
      setCode(supplier.code || '');
      setContactName(supplier.contact_name || '');
      setPhone(supplier.phone || '');
      setEmail(supplier.email || '');
      setAddress(supplier.address || '');
      setIsActive(supplier.is_active ?? true);
    } else {
      setCompanyName('');
      setCode('');
      setContactName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setIsActive(true);
    }
  }, [supplier, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: SupplierPayload = {
      company_name: companyName,
      code: code || undefined,
      contact_name: contactName || undefined,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      is_active: isActive,
    };

    try {
      const savedSupplier = supplier
        ? await updateSupplierApi(supplier.id, payload)
        : await createSupplierApi(payload);
      onSuccess(savedSupplier);
      onClose();
    } catch (err) {
      const parsed = parseApiError(err);
      setError(parsed.message);
    } finally {
      setLoading(false);
    }
  };

  return createPortal((
    <div className="modal-top-viewport fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm sm:p-6" dir="rtl">
      <div className="flex min-h-0 max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
        
        <div className="bg-slate-800/90 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">
            {supplier ? `تعديل بيانيات المورد - ${supplier.company_name}` : 'إضافة مورد جديد للنظام'}
          </h2>
          <button type="button" onClick={onClose} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-600 bg-slate-900/60 text-2xl font-black leading-none text-slate-300 hover:border-cyan-400 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/70" aria-label="إغلاق النافذة" title="إغلاق النافذة">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">اسم الشركة / المورد *</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">كود المورد</label>
              <input
                type="text"
                placeholder="تلقائي إن ترك فارغاً"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">رقم الهاتف</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">العنوان</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center space-x-2 space-x-reverse pt-2">
            <input
              type="checkbox"
              id="is_active"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <label htmlFor="is_active" className="text-xs text-slate-300 font-semibold cursor-pointer">
              مورد نشط ومتاح لإصدار أوامر الشراء
            </label>
          </div>

          <div className="flex items-center justify-end space-x-3 space-x-reverse pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-lg font-medium"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-5 py-2 rounded-lg font-bold shadow-lg shadow-cyan-600/20"
            >
              {loading ? 'جاري الحفظ...' : supplier ? 'تحديث البيانات' : 'إضافة المورد'}
            </button>
          </div>
        </form>

      </div>
    </div>
  ), document.body);
};

export default SupplierModal;
