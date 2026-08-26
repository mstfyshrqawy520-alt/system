import React from 'react';
import { useAuth } from '../context/AuthContext';

export const ProtectedPage: React.FC = () => {
  const { user, hasRole, hasPermission } = useAuth();

  const renderRolesList = () => {
    if (!user || !user.roles) return 'None';
    return user.roles
      .map((r) => (typeof r === 'string' ? r : r.name))
      .join(', ');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-100">المنطقة المحمية / المنطقة المحمية</h1>
        <p className="text-xs text-slate-400 mt-1">
          مرحباً بك في نظام مشتريات شركة اشبيلية. تم تسجيل دخولك بنجاح.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* User التفاصيل */}
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800/80">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-3 border-b border-slate-850 pb-2">
            Authenticated الملف الشخصي
          </h2>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-slate-400">الاسم:</dt>
              <dd className="font-semibold text-slate-200">{user?.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Email:</dt>
              <dd className="font-mono text-slate-200">{user?.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">القسم:</dt>
              <dd className="font-semibold text-slate-200">{user?.department?.name || 'N/A'}</dd>
            </div>
          </dl>
        </div>

        {/* Roles & الصلاحيات */}
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800/80">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-3 border-b border-slate-850 pb-2">
            Assigned Authorization
          </h2>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <dt className="text-slate-400">Roles:</dt>
              <dd className="font-semibold text-cyan-400 bg-slate-950 px-2 py-0.5 rounded text-[10px]">
                {renderRolesList()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400 mt-2">الصلاحيات Count:</dt>
              <dd className="font-semibold text-slate-200 mt-2">{user?.permissions?.length || 0}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Authorization Helper Verification */}
      <div className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-xl text-xs space-y-3">
        <h3 className="font-semibold text-cyan-300 mb-2 border-b border-slate-850 pb-2">Frontend Authorization Helper Evaluation</h3>
        <ul className="space-y-2.5 text-slate-350">
          <li className="flex justify-between items-center bg-slate-950/40 p-2 rounded border border-slate-850">
            <span>• <code className="font-mono text-cyan-400 bg-slate-950 px-1.5 py-0.5 rounded">hasRole('employee')</code></span>
            <strong className={hasRole('employee') ? 'text-emerald-400' : 'text-slate-500'}>
              {hasRole('employee') ? 'TRUE' : 'FALSE'}
            </strong>
          </li>
          <li className="flex justify-between items-center bg-slate-950/40 p-2 rounded border border-slate-850">
            <span>• <code className="font-mono text-cyan-400 bg-slate-950 px-1.5 py-0.5 rounded">hasRole('reviewer')</code></span>
            <strong className={hasRole('reviewer') ? 'text-emerald-400' : 'text-slate-500'}>
              {hasRole('reviewer') ? 'TRUE' : 'FALSE'}
            </strong>
          </li>
          <li className="flex justify-between items-center bg-slate-950/40 p-2 rounded border border-slate-850">
            <span>• <code className="font-mono text-cyan-400 bg-slate-950 px-1.5 py-0.5 rounded">hasRole('procurement_manager')</code></span>
            <strong className={hasRole('procurement_manager') ? 'text-emerald-400' : 'text-slate-500'}>
              {hasRole('procurement_manager') ? 'TRUE' : 'FALSE'}
            </strong>
          </li>
          <li className="flex justify-between items-center bg-slate-950/40 p-2 rounded border border-slate-850">
            <span>• <code className="font-mono text-cyan-400 bg-slate-950 px-1.5 py-0.5 rounded">hasPermission('purchase_request.create')</code></span>
            <strong className={hasPermission('purchase_request.create') ? 'text-emerald-400' : 'text-slate-500'}>
              {hasPermission('purchase_request.create') ? 'TRUE' : 'FALSE'}
            </strong>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ProtectedPage;
