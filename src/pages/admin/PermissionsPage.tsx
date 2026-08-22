import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ErrorMessage from '../../components/ErrorMessage';
import { TableSkeleton } from '../../components/ui/StateFeedback';
import { AdminPermission, getPermissionsAdminApi } from '../../api/admin/permissions';
import { parseApiError } from '../../utils/apiError';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import TableFilterBar from '../../components/ui/TableFilterBar';

export const PermissionsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getPermissionsAdminApi();
        setPermissions(data);
      } catch (err: unknown) {
        setError(parseApiError(err).message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (!hasPermission('system.permissions.manage') && !hasPermission('system.roles.manage')) {
    return (
      <div className="p-6 text-center text-rose-400 bg-rose-950/40 border border-rose-800/80 rounded-xl" dir="rtl">
        عفواً، لا تملك الصلاحية اللازمة للوصول لقائمة الصلاحيات.
      </div>
    );
  }

  if (loading) {
    return <TableSkeleton rows={8} columns={3} className="min-h-[280px]" />;
  }

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredPermissions = permissions.filter((permission) => !normalizedSearch || [permission.name, permission.slug, permission.description].filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch));

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-100">الصلاحيات</h1>
          <p className="mt-1 text-xs text-slate-400">دليل ومصفوفة الصلاحيات الدقيقة للوظائف المختلفة بالنظام</p>
        </div>
      </div>

      <ErrorMessage error={error} onDismiss={() => setError(null)} />

      <TableFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="بحث باسم الصلاحية أو الرمز أو الوصف..."
        onClear={() => setSearchTerm('')}
        hasActiveFilters={Boolean(searchTerm)}
        resultCount={filteredPermissions.length}
        totalCount={permissions.length}
        resultLabel="صلاحية"
      />

      <div className="hidden min-w-0 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>معرف الصلاحية</TableHead>
              <TableHead>اسم الصلاحية</TableHead>
              <TableHead>الرمز البرمجي</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPermissions.map((perm) => (
              <TableRow key={perm.id}>
                <TableCell className="font-mono text-cyan-400 font-bold">#{perm.id}</TableCell>
                <TableCell className="font-bold text-slate-200">{perm.name}</TableCell>
                <TableCell className="font-mono text-slate-400">{perm.slug || perm.name}</TableCell>
              </TableRow>
            ))}
            {filteredPermissions.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="p-8 text-center text-slate-400 text-xs">
                  {permissions.length === 0 ? 'لا توجد صلاحيات مسجلة حالياً.' : 'لم نجد صلاحيات مطابقة للبحث الحالي.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {filteredPermissions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 p-8 text-center text-xs text-slate-400">
            {permissions.length === 0 ? 'لا توجد صلاحيات مسجلة حالياً.' : 'لم نجد صلاحيات مطابقة للبحث الحالي.'}
          </div>
        ) : (
          filteredPermissions.map((perm) => (
            <article key={`mobile-perm-${perm.id}`} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex min-w-0 items-start justify-between gap-3 border-b border-slate-800 pb-3">
                <h3 className="break-normal font-bold text-sm text-slate-100">{perm.name}</h3>
                <span className="shrink-0 font-mono text-xs font-bold text-cyan-400">#{perm.id}</span>
              </div>
              <div className="mt-3 text-xs">
                <span className="text-slate-500">الرمز البرمجي: </span>
                <span className="font-mono text-slate-300">{perm.slug || perm.name}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
};

export default PermissionsPage;
