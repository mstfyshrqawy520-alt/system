import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ErrorMessage from '../../components/ErrorMessage';
import { TableSkeleton } from '../../components/ui/StateFeedback';
import { AdminRole, getRolesAdminApi } from '../../api/admin/roles';
import { parseApiError } from '../../utils/apiError';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import TableFilterBar from '../../components/ui/TableFilterBar';

export const RolesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getRolesAdminApi();
        setRoles(data);
      } catch (err: unknown) {
        setError(parseApiError(err).message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (!hasPermission('system.roles.manage') && !hasPermission('system.permissions.manage')) {
    return (
      <div className="p-6 text-center text-rose-400 bg-rose-950/40 border border-rose-800/80 rounded-xl" dir="rtl">
        عفواً، لا تملك الصلاحية اللازمة للوصول لإدارة الأدوار.
      </div>
    );
  }

  if (loading) {
    return <TableSkeleton rows={7} columns={4} className="min-h-[260px]" />;
  }

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredRoles = roles.filter((role) => !normalizedSearch || [role.name, role.slug, role.description].filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch));

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-100">الأدوار</h1>
          <p className="mt-1 text-xs text-slate-400">استعراض الأدوار الرسمية المسجلة بالنظام ومستويات وصول كل دور</p>
        </div>
      </div>

      <ErrorMessage error={error} onDismiss={() => setError(null)} />

      <TableFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="بحث باسم الدور أو الرمز أو الوصف..."
        onClear={() => setSearchTerm('')}
        hasActiveFilters={Boolean(searchTerm)}
        resultCount={filteredRoles.length}
        totalCount={roles.length}
        resultLabel="دور"
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>معرف الدور</TableHead>
            <TableHead>اسم الدور</TableHead>
            <TableHead>الرمز</TableHead>
            <TableHead>عدد الصلاحيات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRoles.map((role) => (
            <TableRow key={role.id}>
              <TableCell className="font-mono text-cyan-400 font-bold">#{role.id}</TableCell>
              <TableCell className="font-bold text-slate-100">{role.name}</TableCell>
              <TableCell className="font-mono text-slate-400">{role.slug || role.name}</TableCell>
              <TableCell className="font-mono text-slate-200">
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 rounded">
                  {role.permissions?.length ?? 0} صلاحيات
                </span>
              </TableCell>
            </TableRow>
          ))}
          {filteredRoles.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="p-8 text-center text-slate-400 text-xs">
                {roles.length === 0 ? 'لا توجد أدوار مسجلة حالياً.' : 'لم نجد أدوارًا مطابقة للبحث الحالي.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default RolesPage;
