import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ErrorPageProps {
  code: string;
  title: string;
  description: string;
  primaryLabel: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({
  code,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel = 'العودة للصفحة السابقة',
}) => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-[#0b1220] px-4 py-10 text-right text-slate-100" dir="rtl">
      <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
        <section className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center shadow-2xl shadow-cyan-950/20 sm:p-10">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border border-cyan-800/70 bg-cyan-950/40 text-3xl font-black tracking-tight text-cyan-300">
            {code}
          </div>
          <p className="mt-7 text-xs font-black tracking-[0.25em] text-cyan-400">نظام مشتريات الإشبيليّة</p>
          <h1 className="mt-3 text-2xl font-black text-slate-100 sm:text-3xl">{title}</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-400">{description}</p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onPrimary ?? (() => navigate('/'))}
              className="rounded-lg bg-cyan-600 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              {primaryLabel}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-bold text-slate-300 transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              {secondaryLabel}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
};

export const NotFoundPage: React.FC = () => (
  <ErrorPage
    code="404"
    title="الصفحة غير موجودة"
    description="الرابط الذي فتحته غير موجود أو تم نقله. يمكنك العودة للوحة التحكم أو الرجوع إلى الصفحة السابقة."
    primaryLabel="العودة للوحة التحكم"
  />
);

export const ForbiddenPage: React.FC = () => (
  <ErrorPage
    code="403"
    title="لا تملك صلاحية الوصول"
    description="هذه الصفحة متاحة لدور أو صلاحية مختلفة. بيانات طلبات الأقسام الأخرى تظل محمية، ويمكنك العودة إلى الصفحة الرئيسية الخاصة بدورك."
    primaryLabel="العودة إلى صفحتي الرئيسية"
  />
);

export const ServerErrorPage: React.FC = () => (
  <ErrorPage
    code="500"
    title="حدث خطأ مؤقت"
    description="حدثت مشكلة أثناء عرض الصفحة. لم يتم تغيير بيانات الطلبات تلقائيًا. أعد المحاولة، وإذا استمر الخطأ تواصل مع مسؤول النظام."
    primaryLabel="إعادة تحميل الصفحة"
    onPrimary={() => window.location.reload()}
    secondaryLabel="العودة للصفحة السابقة"
  />
);

export default ErrorPage;
