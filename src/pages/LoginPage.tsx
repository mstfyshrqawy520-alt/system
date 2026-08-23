import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../types/api';
import { parseApiError } from '../utils/apiError';
import { hasSessionExpired } from '../utils/authStorage';
import { getPrimaryRoleSlug, getRoleHomePath } from '../routes/roleRouting';

interface FieldErrors {
  email?: string;
  password?: string;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateCredentials = (email: string, password: string): FieldErrors => {
  const errors: FieldErrors = {};
  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    errors.email = 'البريد الإلكتروني مطلوب.';
  } else if (!emailPattern.test(normalizedEmail)) {
    errors.email = 'صيغة البريد الإلكتروني غير صحيحة.';
  }

  if (!password) {
    errors.password = 'كلمة المرور مطلوبة.';
  }

  return errors;
};

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<ApiError | null>(() => (
    hasSessionExpired()
      ? { message: 'انتهت جلسة الدخول. سجّل الدخول مرة أخرى للمتابعة.', status: 401 }
      : null
  ));

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getRoleHomePath(getPrimaryRoleSlug(user)), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validateCredentials(email, password);
    setFieldErrors(validationErrors);
    setError(null);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateEmail = (value: string) => {
    setEmail(value);
    setFieldErrors((current) => ({ ...current, email: undefined }));
    setError(null);
  };

  const updatePassword = (value: string) => {
    setPassword(value);
    setFieldErrors((current) => ({ ...current, password: undefined }));
    setError(null);
  };

  return (
    <main
      className="relative min-h-[100dvh] flex items-center justify-center overflow-y-auto bg-[#080b14] px-4 py-8 text-right text-slate-100 sm:px-6 lg:px-8"
      dir="rtl"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(199,164,91,0.14),transparent_32%),radial-gradient(circle_at_80%_80%,rgba(31,78,121,0.16),transparent_36%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(135deg,#fff_1px,transparent_1px),linear-gradient(45deg,#fff_1px,transparent_1px)] [background-size:34px_34px]" />

      <div className="relative mx-auto w-full max-w-5xl">
        <div className="grid w-full min-w-0 grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-14">
          {/* Brand Presentation Section */}
          <section className="flex flex-col items-center text-center lg:items-start lg:text-right">
            <div className="flex h-20 w-20 items-center justify-center rounded-[1.35rem] border border-[#b89552]/70 bg-[#12110f] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.35)] sm:h-24 sm:w-24 sm:p-3.5">
              <img src="/eshbelia-logo.png" alt="شعار شركة الإشبيليّة" className="h-full w-full object-contain" />
            </div>
            <p className="mt-4 text-[10px] font-black tracking-[0.34em] text-[#d4b36a] sm:text-xs">ISHBILIA</p>
            <h1 className="mt-3 text-2xl font-black leading-[1.4] tracking-tight text-white sm:text-3xl lg:text-4xl">
              شركة الإشبيليّة للمقاولات والتطوير العقاري
            </h1>
            <p className="mt-3 text-sm font-black text-[#d4b36a] sm:text-base">منظومة المشتريات التشغيلية</p>
            <p className="mt-5 max-w-md text-sm leading-7 text-slate-300 sm:text-base">
              أهلاً بك في منظومة المشتريات التشغيلية، منصة موحدة لإدارة طلبات الشراء، عروض الأسعار، الفواتير والاعتمادات.
            </p>
            <div className="mt-6 hidden items-center gap-3 text-xs text-slate-400 lg:flex">
              <span className="h-px w-12 bg-gradient-to-l from-[#c7a45b] to-transparent" />
              <span className="inline-flex items-center gap-2">
                <span className="text-[#d4b36a]" aria-hidden="true">✓</span> وصول آمن ومشفر حسب الدور والصلاحيات
              </span>
              <span className="h-px w-12 bg-gradient-to-r from-[#c7a45b] to-transparent" />
            </div>
          </section>

          {/* Login Form Section */}
          <section className="w-full">
            <div className="rounded-3xl border border-[#8b6a35]/55 bg-[#111827]/95 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.42)] backdrop-blur-md sm:p-8 lg:p-10">
              <div className="border-r-2 border-[#c7a45b] pr-4">
                <h2 className="text-xl font-black text-white sm:text-2xl">تسجيل الدخول</h2>
                <p className="mt-1 text-xs leading-6 text-slate-400 sm:text-sm">استخدم بيانات حسابك المؤسسي للمتابعة.</p>
              </div>

              <div className="mt-5" aria-live="polite">
                <ErrorMessage error={error} onDismiss={() => setError(null)} />
              </div>

              <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-bold text-slate-200">
                    البريد الإلكتروني <span className="text-[#e2bd68]" aria-hidden="true">*</span>
                  </label>
                  <div className={`relative flex min-h-12 items-center rounded-xl border bg-[#0a0f1b] transition-colors focus-within:border-[#d0ad63] focus-within:ring-2 focus-within:ring-[#d0ad63]/20 ${fieldErrors.email ? 'border-rose-500/80' : 'border-slate-700'}`}>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      inputMode="email"
                      dir="ltr"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => updateEmail(event.target.value)}
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                      className="h-12 w-full rounded-xl bg-transparent px-4 py-3 text-left text-sm font-medium text-slate-100 outline-none placeholder:text-slate-600"
                      placeholder="user@ashbiliya.com"
                    />
                  </div>
                  {fieldErrors.email && <p id="email-error" className="mt-2 text-xs font-semibold text-rose-300" role="alert">{fieldErrors.email}</p>}
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-bold text-slate-200">
                    كلمة المرور <span className="text-[#e2bd68]" aria-hidden="true">*</span>
                  </label>
                  <div className={`relative flex min-h-12 items-center rounded-xl border bg-[#0a0f1b] transition-colors focus-within:border-[#d0ad63] focus-within:ring-2 focus-within:ring-[#d0ad63]/20 ${fieldErrors.password ? 'border-rose-500/80' : 'border-slate-700'}`}>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      dir="ltr"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => updatePassword(event.target.value)}
                      aria-invalid={Boolean(fieldErrors.password)}
                      aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                      className="h-12 w-full rounded-xl bg-transparent px-4 py-3 pl-12 text-left text-sm font-medium tracking-wider text-slate-100 outline-none placeholder:text-slate-600"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute left-2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-[#e2bd68] focus:outline-none focus:ring-2 focus:ring-[#d0ad63]"
                      aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      {showPassword ? 'إخفاء' : 'إظهار'}
                    </button>
                  </div>
                  {fieldErrors.password && <p id="password-error" className="mt-2 text-xs font-semibold text-rose-300" role="alert">{fieldErrors.password}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex min-h-12 w-full items-center justify-center rounded-xl border border-[#e0bd6d] bg-gradient-to-b from-[#e0bd6d] to-[#c99f4f] px-4 py-3 text-sm font-black text-[#1c160c] shadow-[0_12px_28px_rgba(164,122,44,0.23)] transition-all duration-200 hover:from-[#ebca83] hover:to-[#d8ad5d] active:scale-[0.985] focus:outline-none focus:ring-2 focus:ring-[#f1d28b] focus:ring-offset-2 focus:ring-offset-[#111827] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? <LoadingSpinner size="sm" message="جاري تسجيل الدخول..." /> : 'تسجيل الدخول'}
                </button>
              </form>

              <p className="mt-6 text-center text-[11px] leading-5 text-slate-500">نظام مشتريات شركة الإشبيليّة — محمي ومشفر</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default LoginPage;
