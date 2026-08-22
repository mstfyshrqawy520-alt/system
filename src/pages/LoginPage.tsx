import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../types/api';
import { DemoAccount, getDemoAccountsApi } from '../api/auth';
import { parseApiError } from '../utils/apiError';
import { hasSessionExpired } from '../utils/authStorage';
import { getPrimaryRoleSlug, getRoleHomePath } from '../routes/roleRouting';

interface FieldErrors {
  email?: string;
  password?: string;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEMO_PASSWORD = '123456';
const ROLE_LABELS: Record<string, string> = {
  employee: 'موظف',
  reviewer: 'مدير قسم / مراجع',
  general_manager: 'المدير العام',
  procurement_manager: 'مدير المشتريات',
  accountant: 'الحسابات',
  warehouse_keeper: 'أمين المخزن',
  site_engineer: 'مهندس الموقع',
  admin: 'مدير النظام',
};

const getDemoRoleLabels = (account: DemoAccount): string[] =>
  account.roles.map((role) => ROLE_LABELS[role.slug] || role.name || role.slug);

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
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const demoPanelEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_PANEL === 'true';

  useEffect(() => {
    if (!demoPanelEnabled) return;
    let cancelled = false;
    setDemoLoading(true);
    getDemoAccountsApi()
      .then((accounts) => {
        if (!cancelled) setDemoAccounts(accounts);
      })
      .catch(() => {
        if (!cancelled) setDemoError('تعذر تحميل حسابات التجربة. تأكد من تشغيل Laravel Backend.');
      })
      .finally(() => {
        if (!cancelled) setDemoLoading(false);
      });
    return () => { cancelled = true; };
  }, [demoPanelEnabled]);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getRoleHomePath(getPrimaryRoleSlug(user)), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
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

  const handleDemoLogin = async (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
    setFieldErrors({});
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ email: account.email, password: DEMO_PASSWORD });
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
      className="relative min-h-[100dvh] overflow-y-auto bg-[#080b14] px-3 py-4 text-right text-slate-100 sm:px-6 sm:py-8 lg:px-8 lg:py-12"
      dir="rtl"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(199,164,91,0.12),transparent_28%),radial-gradient(circle_at_85%_82%,rgba(31,78,121,0.14),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(135deg,#fff_1px,transparent_1px),linear-gradient(45deg,#fff_1px,transparent_1px)] [background-size:34px_34px]" />

      <div className="relative mx-auto flex min-h-0 w-full max-w-7xl items-start justify-center py-2 sm:py-4 lg:min-h-[calc(100dvh-6rem)] lg:items-center lg:py-0">
        <div className="grid w-full min-w-0 grid-cols-1 items-start gap-5 sm:gap-7 lg:grid-cols-[minmax(240px,0.8fr)_minmax(360px,440px)_minmax(280px,0.95fr)] lg:items-center lg:gap-10 xl:gap-12">
          <section className="order-1 flex min-w-0 flex-col items-center px-1 text-center lg:order-2 lg:items-start lg:px-0 lg:text-right">
            <div className="flex h-20 w-20 items-center justify-center rounded-[1.35rem] border border-[#b89552]/70 bg-[#12110f] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.35)] sm:h-24 sm:w-24 sm:p-3.5">
              <img src="/eshbelia-logo.png" alt="شعار شركة الإشبيليّة" className="h-full w-full object-contain" />
            </div>
            <p className="mt-4 text-[10px] font-black tracking-[0.34em] text-[#d4b36a] sm:text-xs">ISHBILIA</p>
            <h1 className="mt-3 max-w-[22rem] text-xl font-black leading-[1.4] tracking-tight text-white sm:max-w-xl sm:text-3xl lg:text-4xl">
              شركة الإشبيليّة للمقاولات والتطوير العقاري
            </h1>
            <p className="mt-3 text-sm font-black text-[#d4b36a] sm:text-base">منظومة المشتريات التشغيلية</p>
            <p className="mt-5 max-w-md text-sm leading-7 text-slate-300 sm:text-base">
              أهلاً بك في منظومة المشتريات التشغيلية، منصة موحدة لمتابعة طلبات الشراء واعتماداتها داخل الشركة.
            </p>
            <div className="mt-6 hidden items-center gap-3 text-xs text-slate-400 lg:flex">
              <span className="h-px w-12 bg-gradient-to-l from-[#c7a45b] to-transparent" />
              <span className="inline-flex items-center gap-2"><span className="text-[#d4b36a]" aria-hidden="true">✓</span> وصول آمن حسب الدور والصلاحية</span>
              <span className="h-px w-12 bg-gradient-to-r from-[#c7a45b] to-transparent" />
            </div>
          </section>

          <section className="order-2 min-w-0 w-full lg:order-1">
            <div className="rounded-2xl border border-[#8b6a35]/55 bg-[#111827]/95 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.42)] backdrop-blur-sm sm:p-7 lg:p-8">
              <div className="border-r-2 border-[#c7a45b] pr-4">
                <p className="text-lg font-black text-white sm:text-xl">تسجيل الدخول إلى نظام المشتريات</p>
                <p className="mt-2 text-xs leading-6 text-slate-400 sm:text-sm">استخدم بيانات حساب الشركة للوصول إلى المهام المسموح بها لدورك.</p>
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

              <p className="mt-5 text-center text-[11px] leading-5 text-slate-500">جميع الحقول المعلّمة بنجمة مطلوبة.</p>
            </div>
          </section>
          {demoPanelEnabled && (
            <section className="order-3 min-w-0 w-full lg:col-span-2 xl:col-span-1 xl:order-3">
              <div className="rounded-2xl border border-cyan-900/70 bg-[#0e1724]/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur-sm sm:p-6">
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <p className="text-lg font-black text-white">تجربة سريعة لكل الأدوار</p>
                    <p className="mt-1 text-xs leading-6 text-slate-400">اختر أي حساب للدخول مباشرة وتجربة الصلاحيات والمسار الخاص به.</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-cyan-700/60 bg-cyan-950/60 px-2 py-1 text-[10px] font-black text-cyan-200">DEMO</span>
                </div>

                <div className="mt-4 rounded-xl border border-amber-800/50 bg-amber-950/20 px-3 py-2 text-[11px] leading-5 text-amber-100">
                  كلمة المرور الموحدة للحسابات التجريبية: <strong className="font-mono text-amber-300">{DEMO_PASSWORD}</strong>
                </div>

                {demoLoading && <p className="mt-5 text-center text-xs text-slate-400">جاري تحميل المستخدمين الحاليين...</p>}
                {demoError && <p className="mt-5 rounded-xl border border-rose-800/60 bg-rose-950/30 px-3 py-3 text-xs font-semibold leading-5 text-rose-200" role="alert">{demoError}</p>}
                {!demoLoading && !demoError && demoAccounts.length === 0 && (
                  <p className="mt-5 text-center text-xs text-slate-500">لا توجد حسابات نشطة للعرض حاليًا.</p>
                )}

                <div className="mt-4 max-h-[36rem] space-y-2 overflow-y-auto pl-1">
                  {demoAccounts.map((account) => (
                    <article key={account.id} className="rounded-xl border border-slate-800 bg-[#0a111d] p-3 transition-colors hover:border-cyan-800/80">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-100">{account.name}</p>
                          <p className="mt-1 text-[10px] font-bold leading-5 text-cyan-300">{getDemoRoleLabels(account).join(' · ')}</p>
                        </div>
                        <span className="shrink-0 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-400">#{account.id}</span>
                      </div>
                      <p className="mt-2 truncate text-left text-[11px] text-slate-400" dir="ltr" title={account.email}>{account.email}</p>
                      <p className="mt-1 truncate text-[10px] text-slate-500">القسم: {account.department?.name || 'غير محدد'}</p>
                      <button
                        type="button"
                        onClick={() => void handleDemoLogin(account)}
                        disabled={isSubmitting}
                        className="mt-3 min-h-10 w-full rounded-lg border border-cyan-700/70 bg-cyan-950/70 px-3 py-2 text-xs font-black text-cyan-100 transition-colors hover:bg-cyan-900/80 focus:outline-none focus:ring-2 focus:ring-cyan-400/70 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSubmitting ? 'جارٍ فتح الحساب...' : 'دخول سريع بهذا الحساب'}
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
};

export default LoginPage;
