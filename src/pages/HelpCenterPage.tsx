import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPrimaryRoleSlug } from '../routes/roleRouting';

const helpSections = [
  {
    category: 'الاستخدام اليومي',
    icon: '🚀',
    items: [
      ['كيف أبدأ؟', 'استخدم القائمة الجانبية للوصول إلى لوحة دورك، ثم اختر الوحدة التي تحتاجها. يمكنك الرجوع إلى هذه الصفحة في أي وقت من رابط مركز المساعدة.'],
      ['كيف أجد طلباً بسرعة؟', 'استخدم حقول البحث والفلترة المتاحة في صفحات الطلبات، مثل رقم الطلب، مقدم الطلب، المشروع، الحالة، الأولوية، والتاريخ.'],
      ['كيف أطبع مستنداً؟', 'افتح تفاصيل الطلب أو أمر الشراء، ثم اختر زر الطباعة. سيستخدم النظام البيانات المحفوظة داخل قالب المستند مباشرة.'],
    ],
  },
  {
    category: 'الأمان والبيانات',
    icon: '🛡️',
    items: [
      ['لماذا لا أرى بعض الطلبات؟', 'الصلاحيات وعزل الأقسام يحددان البيانات التي يمكنك رؤيتها. المراجع يرى طلبات قسمه فقط، بينما الحسابات والمدير العام للعرض والطباعة.'],
      ['ما الذي يجب ألا أشاركه؟', 'لا تشارك كلمة المرور أو روابط المستندات أو بيانات الموردين خارج القنوات المعتمدة. استخدم تسجيل الخروج بعد الانتهاء من جهاز مشترك.'],
      ['كيف أبلغ عن مشكلة؟', 'أرسل رقم الشاشة أو رقم الطلب ورسالة الخطأ إلى مدير النظام مع وصف مختصر للخطوات التي سببت المشكلة.'],
    ],
  },
  {
    category: 'التقارير والمتابعة',
    icon: '📊',
    items: [
      ['كيف أتابع الإشعارات؟', 'افتح الإشعارات من الجرس في أعلى الشاشة أو من رابط الإشعارات في القائمة الجانبية، ويمكنك تحديد الإشعارات كمقروءة.'],
      ['كيف أراجع حالة أمر الشراء؟', 'افتح صفحة أوامر الشراء أو لوحة الحسابات حسب دورك، ثم استخدم رقم أمر الشراء أو تفاصيل الطلب لمراجعة الحالة والتاريخ.'],
      ['هل يمكن تنزيل القوالب؟', 'قوالب طلب الشراء وأمر الشراء محفوظة ضمن ملفات المشروع ويمكن استخدامها كمرجع للتنسيق والطباعة.'],
    ],
  },
];

const roleGuides: Record<string, { title: string; text: string; link: string; linkLabel: string }> = {
  employee: { title: 'الموظف', text: 'أنشئ طلباتك في صفحة واحدة، راجع حالتها، وتابع الملاحظات والإشعارات.', link: '/employee/requests', linkLabel: 'طلبات الشراء' },
  reviewer: { title: 'المراجع', text: 'راجع طلبات قسمك فقط، استخدم الفلاتر، وسجل قرار الاعتماد أو الرفض، وعدّل البيانات قبل الاعتماد عند الحاجة.', link: '/reviewer/requests', linkLabel: 'طلبات المراجعة' },
  procurement_manager: { title: 'مدير المشتريات', text: 'حوّل الطلبات المعتمدة إلى أوامر شراء، أدخل الأسعار والمورد، ثم اطبع المستند.', link: '/procurement/purchase-orders', linkLabel: 'أوامر الشراء' },
  accountant: { title: 'الحسابات', text: 'راجع أوامر الشراء والإجماليات واسم الصنف والمستند المطبوع دون إجراءات اعتماد.', link: '/accounting/purchase-orders', linkLabel: 'أوامر الشراء' },
  general_manager: { title: 'المدير العام', text: 'تابع العرض التنفيذي والإشعارات وأوامر الشراء للعرض والطباعة فقط.', link: '/general-manager', linkLabel: 'لوحة المدير العام' },
  admin: { title: 'مدير النظام', text: 'أدر المستخدمين والأدوار والصلاحيات والأقسام والكتالوج والموردين.', link: '/admin', linkLabel: 'لوحة الإدارة' },
};

export const HelpCenterPage: React.FC = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const roleSlug = getPrimaryRoleSlug(user) || 'employee';
  const roleGuide = roleGuides[roleSlug] || roleGuides.employee;
  const normalizedSearch = search.trim().toLowerCase();
  const filteredSections = useMemo(() => helpSections.map((section) => ({
    ...section,
    items: section.items.filter(([question, answer]) => (question + ' ' + answer).toLowerCase().includes(normalizedSearch)),
  })).filter((section) => section.items.length > 0), [normalizedSearch]);

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧭</span>
            <div>
              <h1 className="text-2xl font-black text-slate-100">مركز المساعدة</h1>
              <p className="text-sm text-slate-400 mt-1">دليل سريع لاستخدام نظام إدارة المشتريات</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-cyan-800/60 bg-cyan-950/30 px-4 py-3 text-right">
          <p className="text-[11px] text-cyan-300">دليل دورك الحالي</p>
          <p className="text-sm font-bold text-slate-100 mt-1">{roleGuide.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['🔎', 'بحث سريع', 'ابحث داخل الأسئلة الشائعة'],
          ['📌', 'إرشادات مختصرة', 'خطوات عملية لكل دور'],
          ['🔔', 'الإشعارات', 'تابع المستجدات المهمة'],
          ['🖨️', 'الطباعة', 'استخدم البيانات المحفوظة'],
        ].map(([icon, title, description]) => (
          <div key={title} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xl">{icon}</div>
            <h2 className="text-sm font-bold text-slate-100 mt-2">{title}</h2>
            <p className="text-[11px] text-slate-400 mt-1">{description}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <label className="block text-sm font-bold text-slate-100 mb-2" htmlFor="help-search">ابحث في مركز المساعدة</label>
        <div className="flex gap-2">
          <input id="help-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اكتب كلمة مثل: طباعة، إشعارات، صلاحيات..." className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-500" />
          {search && <button type="button" onClick={() => setSearch('')} className="rounded-lg border border-slate-700 px-4 text-xs font-bold text-slate-300 hover:bg-slate-800">مسح</button>}
        </div>
      </div>

      <section className="rounded-xl border border-cyan-800/50 bg-cyan-950/20 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-cyan-300">توجيه مخصص للمستخدم</p>
            <h2 className="text-lg font-black text-slate-100 mt-1">أنت تستخدم النظام بصلاحية: {roleGuide.title}</h2>
            <p className="text-sm text-slate-300 mt-2 max-w-3xl">{roleGuide.text}</p>
          </div>
          <Link to={roleGuide.link} className="shrink-0 rounded-lg bg-cyan-600 px-4 py-3 text-center text-xs font-bold text-white hover:bg-cyan-500">{roleGuide.linkLabel} ←</Link>
        </div>
      </section>

      {filteredSections.length === 0 ? (
        <div className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-8 text-center text-sm text-amber-200">لا توجد إجابات مطابقة للبحث. جرّب كلمة أخرى أو امسح البحث.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {filteredSections.map((section) => (
            <section key={section.category} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <h2 className="flex items-center gap-2 text-sm font-black text-slate-100 border-b border-slate-800 pb-3"><span>{section.icon}</span>{section.category}</h2>
              <div className="space-y-2 mt-3">
                {section.items.map(([question, answer]) => (
                  <details key={question} className="group rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                    <summary className="cursor-pointer list-none text-xs font-bold text-slate-200 flex items-center justify-between gap-2"><span>{question}</span><span className="text-cyan-400 group-open:rotate-45">＋</span></summary>
                    <p className="text-[11px] leading-6 text-slate-400 mt-3 border-t border-slate-800 pt-3">{answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="text-sm font-black text-slate-100">اختصارات مفيدة</h2>
          <div className="mt-3 space-y-2 text-xs text-slate-400">
            <div className="flex justify-between gap-3"><span>إغلاق النوافذ المنبثقة</span><kbd className="rounded bg-slate-800 px-2 py-1 text-cyan-300">Esc</kbd></div>
            <div className="flex justify-between gap-3"><span>التنقل في القائمة</span><kbd className="rounded bg-slate-800 px-2 py-1 text-cyan-300">القائمة الجانبية</kbd></div>
            <div className="flex justify-between gap-3"><span>البحث في الصفحة الحالية</span><kbd className="rounded bg-slate-800 px-2 py-1 text-cyan-300">Ctrl + F</kbd></div>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-5">
          <h2 className="text-sm font-black text-slate-100">تواصل مع مدير النظام</h2>
          <p className="text-xs leading-6 text-slate-400 mt-2">عند وجود مشكلة في الصلاحيات أو البيانات، أرفق رقم الطلب واسم الصفحة وصورة الخطأ. هذا يجعل معالجة المشكلة أسرع وأكثر دقة.</p>
          <Link to="/notifications" className="inline-block mt-3 text-xs font-bold text-emerald-300 hover:text-emerald-200">فتح مركز الإشعارات ←</Link>
        </div>
      </div>
    </div>
  );
};

export default HelpCenterPage;
