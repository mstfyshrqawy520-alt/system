import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getItemsAdminApi } from '../../api/admin/items';
import { getSuppliersAdminApi } from '../../api/admin/suppliers';
import { getUsersAdminApi } from '../../api/admin/users';
import { getDepartmentsAdminApi } from '../../api/admin/departments';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { parseApiError } from '../../utils/apiError';
import { useAuth } from '../../context/AuthContext';
import { KpiCard, Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DashboardBars } from '../../components/ui/DashboardCharts';

export const AdminDashboardPage: React.FC = () => {
  const [usersCount, setUsersCount] = useState<number | null>(null);
  const [deptsCount, setDeptsCount] = useState<number | null>(null);
  const [itemsCount, setItemsCount] = useState<number | null>(null);
  const [suppliersCount, setSuppliersCount] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { hasPermission } = useAuth();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const promises: Promise<any>[] = [];

      if (hasPermission('system.users.manage')) {
        promises.push(
          getUsersAdminApi()
            .then((res) => setUsersCount(res.length))
            .catch(() => setUsersCount(null))
        );
      }

      if (hasPermission('system.departments.manage')) {
        promises.push(
          getDepartmentsAdminApi()
            .then((res) => setDeptsCount(res.length))
            .catch(() => setDeptsCount(null))
        );
      }

      if (hasPermission('system.items.manage')) {
        promises.push(
          getItemsAdminApi()
            .then((res) => setItemsCount(res.length))
            .catch(() => setItemsCount(null))
        );
      }

      if (hasPermission('system.suppliers.manage') || hasPermission('supplier.view')) {
        promises.push(
          getSuppliersAdminApi()
            .then((res) => setSuppliersCount(res.length))
            .catch(() => setSuppliersCount(null))
        );
      }

      await Promise.all(promises);
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      setError(parsed.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <LoadingSpinner fullScreen message="جاري تحميل لوحة تحكم الإدارة العامة بالنظام..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-100">لوحة تحكم الإدارة</h1>
          <p className="mt-1 text-xs text-slate-400">
            إدارة النظام، الأقسام، الأصناف، الموردين، والمستخدمين والصلاحيات
          </p>
        </div>
      </div>

      {/* ── صندوق العمليات والإدارة السريعة (Admin Quick Actions Hub) ── */}
      <div className="rounded-2xl border-2 border-indigo-500/40 bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5 border-b border-indigo-900/40 pb-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/30 border border-indigo-500/50 text-indigo-300 text-lg font-black shadow-inner">
            ⚡
          </span>
          <div>
            <h2 className="text-base font-black text-slate-100">
              مركز الإجراءات والعمليات الإدارية السريعة
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              إدارة المستخدمين والأقسام والأصناف والموردين ومراقبة أداء النظام.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
          {hasPermission('system.users.manage') && (
            <Link to="/admin/users">
              <Button variant="secondary" size="sm" className="w-full h-auto py-2.5 text-xs flex flex-col gap-1 items-center border-slate-700 bg-slate-950/80 hover:border-cyan-500/60">
                <span className="text-base">👥</span>
                <span className="font-bold text-slate-200">إدارة المستخدمين</span>
              </Button>
            </Link>
          )}

          {hasPermission('system.departments.manage') && (
            <Link to="/admin/departments">
              <Button variant="secondary" size="sm" className="w-full h-auto py-2.5 text-xs flex flex-col gap-1 items-center border-slate-700 bg-slate-950/80 hover:border-indigo-500/60">
                <span className="text-base">🏢</span>
                <span className="font-bold text-slate-200">الأقسام والهيكل</span>
              </Button>
            </Link>
          )}

          {hasPermission('system.items.manage') && (
            <Link to="/admin/items">
              <Button variant="secondary" size="sm" className="w-full h-auto py-2.5 text-xs flex flex-col gap-1 items-center border-slate-700 bg-slate-950/80 hover:border-emerald-500/60">
                <span className="text-base">📦</span>
                <span className="font-bold text-slate-200">كتالوج الأصناف</span>
              </Button>
            </Link>
          )}

          {(hasPermission('system.suppliers.manage') || hasPermission('supplier.view')) && (
            <Link to="/admin/suppliers">
              <Button variant="secondary" size="sm" className="w-full h-auto py-2.5 text-xs flex flex-col gap-1 items-center border-slate-700 bg-slate-950/80 hover:border-amber-500/60">
                <span className="text-base">🏭</span>
                <span className="font-bold text-slate-200">الموردين والأرصدة</span>
              </Button>
            </Link>
          )}

          <Link to="/admin/system-monitor">
            <Button variant="secondary" size="sm" className="w-full h-auto py-2.5 text-xs flex flex-col gap-1 items-center border-cyan-800/60 bg-cyan-950/30 text-cyan-300 hover:border-cyan-400">
              <span className="text-base">🖥️</span>
              <span className="font-bold text-cyan-200">مراقبة صحة النظام</span>
            </Button>
          </Link>
        </div>
      </div>

      {error && <ErrorMessage error={error} />}

      {/* Available Management KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {hasPermission('system.users.manage') && (
          <KpiCard
            title="المستخدمين"
            value={usersCount !== null ? usersCount : '—'}
            accentColor="cyan"
            icon={<span className="text-sm">👥</span>}
          />
        )}

        {hasPermission('system.departments.manage') && (
          <KpiCard
            title="الأقسام والإدارات"
            value={deptsCount !== null ? deptsCount : '—'}
            accentColor="indigo"
            icon={<span className="text-sm">🏢</span>}
          />
        )}

        {hasPermission('system.items.manage') && (
          <KpiCard
            title="الأصناف في الكتالوج"
            value={itemsCount !== null ? itemsCount : '—'}
            accentColor="emerald"
            icon={<span className="text-sm">📦</span>}
          />
        )}

        {(hasPermission('system.suppliers.manage') || hasPermission('supplier.view')) && (
          <KpiCard
            title="سجل الموردين"
            value={suppliersCount !== null ? suppliersCount : '—'}
            accentColor="amber"
            icon={<span className="text-sm">🏭</span>}
          />
        )}
      </div>

      <DashboardBars
        title="حجم وحدات النظام"
        subtitle="عدد السجلات الإدارية المتاحة حسب الوحدة"
        segments={[
          { label: 'المستخدمون', value: usersCount ?? 0, color: '#06b6d4' },
          { label: 'الأقسام والإدارات', value: deptsCount ?? 0, color: '#6366f1' },
          { label: 'الأصناف في الكتالوج', value: itemsCount ?? 0, color: '#22c55e' },
          { label: 'الموردون', value: suppliersCount ?? 0, color: '#f59e0b' },
        ]}
        unit="سجل"
      />

      {/* Module Capabilities & الحالة */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-200">
          حالة وحدات إدارة النظام
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-200 text-xs">👥 إدارة المستخدمين</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                متاح بالكامل
              </span>
            </div>
            <p className="text-xs text-slate-400">
              إضافة المستخدمين، تعيين الأقسام، تفعيل/تعطيل الحسابات وتخصيص الأدوار.
            </p>
            <Link to="/admin/users" className="block pt-2">
              <Button variant="secondary" size="sm" className="w-full">
                إدارة المستخدمين &rarr;
              </Button>
            </Link>
          </Card>

          <Card className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-200 text-xs">🛡️ الأدوار</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                مستعرض الأدوار
              </span>
            </div>
            <p className="text-xs text-slate-400">
              استعراض أدوار النظام الثابتة والصلاحيات المسندة لكل دور بشكل رسمي.
            </p>
            <Link to="/admin/roles" className="block pt-2">
              <Button variant="secondary" size="sm" className="w-full">
                عرض الأدوار &rarr;
              </Button>
            </Link>
          </Card>

          <Card className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-200 text-xs">🔑 الصلاحيات</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                دليل الصلاحيات
              </span>
            </div>
            <p className="text-xs text-slate-400">
              استعراض قائمة الصلاحيات الشاملة ومصفوفة الصلاحيات حسب كل موديول.
            </p>
            <Link to="/admin/permissions" className="block pt-2">
              <Button variant="secondary" size="sm" className="w-full">
                عرض مصفوفة الصلاحيات &rarr;
              </Button>
            </Link>
          </Card>

          <Card className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-200 text-xs">🏢 الأقسام</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                متاح بالكامل
              </span>
            </div>
            <p className="text-xs text-slate-400">
              إضافة وتعديل وحذف الهيكل التنظيمي وأكواد الأقسام في المؤسسة.
            </p>
            <Link to="/admin/departments" className="block pt-2">
              <Button variant="secondary" size="sm" className="w-full">
                إدارة الأقسام &rarr;
              </Button>
            </Link>
          </Card>

          <Card className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-200 text-xs">📁 التصنيفات</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                متاح بالكامل
              </span>
            </div>
            <p className="text-xs text-slate-400">
              إدارة تصنيفات الأصناف والمواد التابعة لكتاب المشتريات.
            </p>
            <Link to="/admin/categories" className="block pt-2">
              <Button variant="secondary" size="sm" className="w-full">
                إدارة التصنيفات &rarr;
              </Button>
            </Link>
          </Card>

          <Card className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-200 text-xs">📦 الأصناف والكتالوج</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                متاح بالكامل
              </span>
            </div>
            <p className="text-xs text-slate-400">
              إضافة وتعديل أصناف ومواد الشركة ووحدات القياس وحالتها.
            </p>
            <Link to="/admin/items" className="block pt-2">
              <Button variant="secondary" size="sm" className="w-full">
                إدارة الكتالوج &rarr;
              </Button>
            </Link>
          </Card>

          <Card className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-200 text-xs">🏭 سجل الموردين</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                متاح بالكامل
              </span>
            </div>
            <p className="text-xs text-slate-400">
              إدارة وتحديث الشركات والموردين وبيانات التواصل.
            </p>
            <Link to="/admin/suppliers" className="block pt-2">
              <Button variant="secondary" size="sm" className="w-full">
                إدارة الموردين &rarr;
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
