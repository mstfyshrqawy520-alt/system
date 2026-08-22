import React from 'react';
import { useState } from 'react';
import { changePasswordApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FormField, Input } from '../components/ui/FormField';
import { parseApiError } from '../utils/apiError';

export const ProfilePage: React.FC = () => {
  const { user, isLoading, logout } = useAuth();
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  if (isLoading) {
    return <LoadingSpinner fullScreen message="جاري تحميل الملف الشخصي..." />;
  }

  if (!user) {
    return (
      <div className="p-6">
        <ErrorMessage error="تعذر تحميل بيانات المستخدم. يرجى تسجيل الدخول مجدداً." />
      </div>
    );
  }

  const getInitials = (name: string): string => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getRoleName = (role: any): string => {
    if (typeof role === 'string') return role;
    return role?.name || role?.slug || 'User';
  };

  const getPermissionName = (perm: any): string => {
    if (typeof perm === 'string') return perm;
    return perm?.name || perm?.slug || '';
  };

  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return 'غير متوفر';
    try {
      return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  const primaryRole = user.roles && user.roles.length > 0 ? getRoleName(user.roles[0]) : 'مستخدم النظام';

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.new_password.length < 6) {
      setPasswordError('كلمة المرور الجديدة يجب أن تكون 6 أحرف أو أرقام على الأقل.');
      return;
    }

    if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
      setPasswordError('تأكيد كلمة المرور الجديدة غير متطابق.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await changePasswordApi(passwordForm);
      setPasswordSuccess(response.message || 'تم تغيير كلمة المرور بنجاح.');
      setPasswordForm({ current_password: '', new_password: '', new_password_confirmation: '' });
    } catch (error) {
      setPasswordError(parseApiError(error).message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl shadow-slate-950/40 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-4 space-x-reverse">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-cyan-950/90 border-2 border-cyan-500/50 flex items-center justify-center text-cyan-400 font-black text-xl shadow-inner shrink-0">
              {getInitials(user.name)}
            </div>

            <div>
              <div className="flex items-center space-x-3 space-x-reverse">
                <h1 className="text-2xl font-black tracking-tight text-slate-100">{user.name}</h1>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    user.is_active
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                      : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                  }`}
                >
                  {user.is_active ? 'حساب نشط' : 'حساب غير نشط'}
                </span>
              </div>
              <p className="mt-1 text-xs text-cyan-400 font-bold capitalize">{primaryRole}</p>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">{user.email}</p>
            </div>
          </div>

          <div>
            <Button
              variant="danger"
              size="md"
              onClick={() => logout()}
              className="shadow-lg shadow-rose-950/50"
            >
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </div>

      {/* Main التفاصيل Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <Card className="space-y-4">
          <h2 className="text-sm font-bold text-slate-100 pb-3 border-b border-slate-800 flex items-center gap-2">
            <span>👤</span>
            <span>المعلومات الشخصية</span>
          </h2>

          <div className="space-y-3">
            <div>
              <span className="block text-[11px] font-semibold text-slate-400">الاسم الكامل</span>
              <span className="text-xs font-bold text-slate-200">{user.name || 'غير متوفر'}</span>
            </div>

            <div>
              <span className="block text-[11px] font-semibold text-slate-400">البريد الإلكتروني</span>
              <span className="text-xs font-bold text-slate-200 font-mono">{user.email || 'غير متوفر'}</span>
            </div>

            {user.phone && (
              <div>
                <span className="block text-[11px] font-semibold text-slate-400">رقم الهاتف</span>
                <span className="text-xs font-bold text-slate-200 font-mono" dir="ltr">
                  {user.phone}
                </span>
              </div>
            )}

            <div>
              <span className="block text-[11px] font-semibold text-slate-400">القسم / الإدارة</span>
              <span className="text-xs font-bold text-slate-200">
                {user.department
                  ? `${user.department.name} (${user.department.code})`
                  : 'غير معين'}
              </span>
            </div>
          </div>
        </Card>

        {/* Account Info */}
        <Card className="space-y-4">
          <h2 className="text-sm font-bold text-slate-100 pb-3 border-b border-slate-800 flex items-center gap-2">
            <span>🛡️</span>
            <span>معلومات الحساب</span>
          </h2>

          <div className="space-y-3">
            <div>
              <span className="block text-[11px] font-semibold text-slate-400">حالة الحساب</span>
              <span
                className={`inline-block mt-1 px-2.5 py-1 rounded text-xs font-bold ${
                  user.is_active
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                    : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                }`}
              >
                {user.is_active ? 'نشط' : 'غير نشط'}
              </span>
            </div>

            {user.created_at && (
              <div>
                <span className="block text-[11px] font-semibold text-slate-400">تاريخ إنشاء الحساب</span>
                <span className="text-xs font-bold text-slate-200">
                  {formatDate(user.created_at)}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Change Password */}
        <Card className="space-y-4 md:col-span-2">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>🔒</span>
              <span>تغيير كلمة المرور</span>
            </h2>
            <span className="text-[11px] text-slate-500">لحماية حسابك</span>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="كلمة المرور الحالية" required>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={passwordForm.current_password}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, current_password: event.target.value }))}
                  required
                  disabled={isChangingPassword}
                  placeholder="أدخل كلمة المرور الحالية"
                />
              </FormField>
              <FormField label="كلمة المرور الجديدة" required helperText="6 أحرف أو أرقام على الأقل">
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.new_password}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, new_password: event.target.value }))}
                  required
                  minLength={6}
                  disabled={isChangingPassword}
                  placeholder="أدخل كلمة المرور الجديدة"
                />
              </FormField>
              <FormField label="تأكيد كلمة المرور الجديدة" required>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.new_password_confirmation}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, new_password_confirmation: event.target.value }))}
                  required
                  minLength={6}
                  disabled={isChangingPassword}
                  placeholder="أعد كتابة كلمة المرور الجديدة"
                />
              </FormField>
            </div>

            {passwordError && <p className="text-xs font-semibold text-rose-400">{passwordError}</p>}
            {passwordSuccess && <p className="text-xs font-semibold text-emerald-400">{passwordSuccess}</p>}

            <div className="flex justify-start">
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? 'جاري الحفظ...' : 'حفظ كلمة المرور الجديدة'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Roles Section */}
        <Card className="space-y-4">
          <h2 className="text-sm font-bold text-slate-100 pb-3 border-b border-slate-800 flex items-center gap-2">
            <span>🎗️</span>
            <span>أدوار المستخدم</span>
          </h2>

          {user.roles && user.roles.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {user.roles.map((role, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 rounded-lg text-xs font-bold capitalize"
                >
                  {getRoleName(role)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">لا توجد أدوار مسندة</p>
          )}
        </Card>

        {/* الصلاحيات Section */}
        <Card className="space-y-4">
          <h2 className="text-sm font-bold text-slate-100 pb-3 border-b border-slate-800 flex items-center gap-2">
            <span>🔑</span>
            <span>الصلاحيات</span>
          </h2>

          {user.permissions && user.permissions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1">
              {user.permissions.map((perm, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-slate-300 rounded-md text-xs font-mono"
                >
                  {getPermissionName(perm)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">لا توجد صلاحيات معلنة</p>
          )}
        </Card>
      </div>

      {/* Read-Only Notice Banner */}
      <div className="p-4 bg-amber-950/30 border border-amber-800/50 rounded-xl flex items-center space-x-3 space-x-reverse text-amber-300 text-xs">
        <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          بيانات الملف الشخصي الأساسية للقراءة فقط. يمكنك تغيير كلمة المرور بنفسك من القسم المخصص أعلاه.
        </span>
      </div>
    </div>
  );
};

export default ProfilePage;
