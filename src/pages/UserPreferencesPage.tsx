import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'ashbiliya-user-preferences';

type OptionalNotificationKey = 'requestUpdates' | 'purchaseOrderUpdates' | 'reportUpdates';

type UserPreferences = {
  compactMode: boolean;
  reduceMotion: boolean;
  confirmSensitiveActions: boolean;
  mandatoryNotifications: {
    approvalTasks: true;
    securityAndSession: true;
    workflowUpdates: true;
  };
  optionalNotifications: Record<OptionalNotificationKey, boolean>;
};

const defaults: UserPreferences = {
  compactMode: false,
  reduceMotion: false,
  confirmSensitiveActions: true,
  mandatoryNotifications: {
    approvalTasks: true,
    securityAndSession: true,
    workflowUpdates: true,
  },
  optionalNotifications: {
    requestUpdates: true,
    purchaseOrderUpdates: true,
    reportUpdates: false,
  },
};

const loadPreferences = (): UserPreferences => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Partial<UserPreferences>;
    return {
      ...defaults,
      ...saved,
      mandatoryNotifications: defaults.mandatoryNotifications,
      optionalNotifications: {
        ...defaults.optionalNotifications,
        ...(saved.optionalNotifications || {}),
      },
    };
  } catch {
    return {
      ...defaults,
      mandatoryNotifications: { ...defaults.mandatoryNotifications },
      optionalNotifications: { ...defaults.optionalNotifications },
    };
  }
};

const getDefaultPreferences = (): UserPreferences => ({
  ...defaults,
  mandatoryNotifications: { ...defaults.mandatoryNotifications },
  optionalNotifications: { ...defaults.optionalNotifications },
});

const applyPreferences = (preferences: UserPreferences) => {
  document.documentElement.classList.toggle('reduce-motion', preferences.reduceMotion);
  document.documentElement.dataset.density = preferences.compactMode ? 'compact' : 'comfortable';
};

export const UserPreferencesPage: React.FC = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(loadPreferences);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    applyPreferences(preferences);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    setSaved(true);
    const timer = window.setTimeout(() => setSaved(false), 1800);
    return () => window.clearTimeout(timer);
  }, [preferences]);

  const update = (key: 'compactMode' | 'reduceMotion' | 'confirmSensitiveActions', value: boolean) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  const options: Array<{ key: 'compactMode' | 'reduceMotion' | 'confirmSensitiveActions'; title: string; description: string; icon: string }> = [
    { key: 'compactMode', title: 'وضع العرض المضغوط', description: 'يقلل المسافات بين العناصر ليسمح بعرض بيانات أكثر في الشاشة الواحدة.', icon: '▦' },
    { key: 'reduceMotion', title: 'تقليل الحركة', description: 'يوقف الحركات الانتقالية البصرية للمستخدمين الذين يفضلون واجهة ثابتة.', icon: '⏸' },
    { key: 'confirmSensitiveActions', title: 'تأكيد الإجراءات الحساسة', description: 'يعرض تأكيداً قبل إجراءات مثل الحذف أو الإرسال النهائي عندما تدعم الصفحة ذلك.', icon: '✓' },
  ];

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <span className="text-3xl">⚙️</span>
          <div>
            <h1 className="text-2xl font-black text-slate-100">تفضيلات المستخدم</h1>
            <p className="text-sm text-slate-400 mt-1">تحكم في طريقة عرض النظام على جهازك. التفضيلات محفوظة محلياً لهذا المتصفح.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-cyan-800/60 bg-cyan-950/20 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-100">إعدادات العرض وتجربة الاستخدام</h2>
            <p className="text-xs text-slate-400 mt-1">يمكنك تغيير الإعدادات في أي وقت دون التأثير على بيانات الطلبات أو صلاحيات المستخدم.</p>
          </div>
          {saved && <span className="text-xs font-bold text-emerald-300">تم حفظ التفضيلات</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {options.map((option) => (
            <label key={option.key} className="flex flex-col justify-between gap-6 rounded-xl border border-slate-800 bg-slate-900/60 p-5 cursor-pointer hover:border-cyan-700/70">
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-950/60 text-lg text-cyan-300">{option.icon}</span>
                <input type="checkbox" checked={preferences[option.key]} onChange={(event) => update(option.key, event.target.checked)} className="h-5 w-5 accent-cyan-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-100 mt-4">{option.title}</h3>
              <p className="text-xs leading-6 text-slate-400 mt-2">{option.description}</p>
            </div>
            <span className={preferences[option.key] ? 'text-xs font-bold text-emerald-300' : 'text-xs font-bold text-slate-500'}>{preferences[option.key] ? 'مفعل' : 'غير مفعل'}</span>
          </label>
        ))}
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-black text-slate-100">إعدادات الإشعارات</h2>
          <p className="mt-1 text-xs leading-6 text-slate-400">إشعارات المهام الأساسية تظل مفعلة، بينما يمكنك التحكم في التنبيهات المعلوماتية الاختيارية.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-amber-800/60 bg-amber-950/15 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-amber-100">إشعارات إلزامية</h3>
                <p className="mt-1 text-xs leading-6 text-amber-200/70">تبقى مفعلة لأنها مرتبطة بالأمان أو بمهمة تتطلب إجراءً.</p>
              </div>
              <span className="rounded-md border border-amber-700/60 px-2 py-1 text-[11px] font-bold text-amber-200">محمية</span>
            </div>
            <div className="mt-5 space-y-3">
              {['تعيين طلب شراء للمراجعة أو طلب توضيح', 'تحديثات أمر الشراء التي تتطلب متابعة', 'تنبيه انتهاء جلسة الدخول أو مشكلة النظام'].map((title) => (
                <label key={title} className="flex items-center justify-between gap-3 rounded-lg border border-amber-800/40 bg-slate-950/30 p-3 text-xs text-slate-200">
                  <span>{title}</span>
                  <input type="checkbox" checked disabled className="h-5 w-5 accent-amber-500" />
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div>
              <h3 className="text-sm font-black text-slate-100">إشعارات اختيارية</h3>
              <p className="mt-1 text-xs leading-6 text-slate-400">يمكنك إيقافها من هذا الجهاز دون التأثير على سير الطلبات أو الصلاحيات.</p>
            </div>
            <div className="mt-5 space-y-3">
              {[
                { key: 'requestUpdates' as OptionalNotificationKey, title: 'تحديثات عامة على الطلبات', description: 'إشعارات معلوماتية عن تغيّر حالة طلباتك.' },
                { key: 'purchaseOrderUpdates' as OptionalNotificationKey, title: 'ملخصات أوامر الشراء', description: 'تنبيهات معلوماتية عند إصدار أمر شراء مرتبط بطلبك.' },
                { key: 'reportUpdates' as OptionalNotificationKey, title: 'تحديثات التقارير', description: 'تنبيه عند توفر تقرير أو ملخص جديد للعرض.' },
              ].map((option) => (
                <label key={option.key} className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950/30 p-3 hover:border-cyan-800/60">
                  <span>
                    <span className="block text-xs font-bold text-slate-200">{option.title}</span>
                    <span className="mt-1 block text-[11px] leading-5 text-slate-500">{option.description}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences.optionalNotifications[option.key]}
                    onChange={(event) => setPreferences((current) => ({
                      ...current,
                      optionalNotifications: {
                        ...current.optionalNotifications,
                        [option.key]: event.target.checked,
                      },
                    }))}
                    className="mt-1 h-5 w-5 accent-cyan-500"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <button type="button" onClick={() => setPreferences(getDefaultPreferences())} className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">إعادة الإعدادات الافتراضية</button>
        <p className="text-xs text-slate-500">الإشعارات الإلزامية تظل مفعلة دائمًا ولا تتأثر بهذا القسم.</p>
      </div>
    </div>
  );
};

export default UserPreferencesPage;
