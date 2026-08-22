import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ErrorMessage from '../../components/ErrorMessage';
import { TableSkeleton } from '../../components/ui/StateFeedback';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import {
  AdminDepartment,
  getDepartmentsAdminApi,
  createDepartmentAdminApi,
  updateDepartmentAdminApi,
  deleteDepartmentAdminApi,
  DepartmentInput,
} from '../../api/admin/departments';
import { getUsersAdminApi, AdminUser } from '../../api/admin/users';
import { parseApiError } from '../../utils/apiError';
import { Button } from '../../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import TableFilterBar from '../../components/ui/TableFilterBar';
import { Modal } from '../../components/ui/Modal';
import { FormField, Input, Select, Textarea } from '../../components/ui/FormField';

export const DepartmentsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentToDelete, setDepartmentToDelete] = useState<AdminDepartment | null>(null);
  const [deletingDepartmentId, setDeletingDepartmentId] = useState<number | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingDept, setEditingDept] = useState<AdminDepartment | null>(null);
  const [formData, setFormData] = useState<DepartmentInput>({
    name: '',
    code: '',
    description: '',
    manager_user_id: null,
    site_engineer_user_id: null,
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dData, uData] = await Promise.all([
        getDepartmentsAdminApi(),
        getUsersAdminApi().catch(() => []),
      ]);
      setDepartments(dData || []);
      setUsers(uData || []);
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

  const handleOpenAdd = () => {
    setEditingDept(null);
    setFormData({ name: '', code: '', description: '', manager_user_id: null, site_engineer_user_id: null });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: AdminDepartment) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      manager_user_id: dept.manager?.id || null,
      site_engineer_user_id: dept.site_engineer?.id || null,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedFormData: DepartmentInput = {
      ...formData,
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      description: formData.description?.trim() || '',
    };
    if (!normalizedFormData.name || !normalizedFormData.code) {
      setError('اسم القسم ورمزه مطلوبان. اكتب البيانات ثم أعد المحاولة.');
      return;
    }
    setSubmitting(true);
    try {
      if (editingDept) {
        await updateDepartmentAdminApi(editingDept.id, normalizedFormData);
      } else {
        await createDepartmentAdminApi(normalizedFormData);
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      setError(parseApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  const executeDelete = async (id: number) => {
    setDeletingDepartmentId(id);
    try {
      await deleteDepartmentAdminApi(id);
      setDepartmentToDelete(null);
      await loadData();
    } catch (err: unknown) {
      setError(parseApiError(err).message);
    } finally {
      setDeletingDepartmentId(null);
    }
  };

  const handleDelete = (department: AdminDepartment) => {
    setDepartmentToDelete(department);
  };

  if (!hasPermission('system.departments.manage')) {
    return (
      <div className="p-6 text-center text-rose-400 bg-rose-950/40 border border-rose-800/80 rounded-xl" dir="rtl">
        عفواً، لا تملك الصلاحية اللازمة للوصول لإدارة الأقسام.
      </div>
    );
  }

  if (loading) {
    return <TableSkeleton rows={6} columns={5} message="جارٍ تحميل الأقسام والمسؤولين..." className="min-h-[260px]" />;
  }

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const incompleteDepartmentCount = departments.filter((department) => !department.manager || !department.site_engineer).length;
  const filteredDepartments = departments.filter((department) => {
    if (!normalizedSearch) return true;
    return [department.name, department.code, department.manager?.name, department.site_engineer?.name].filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch);
  });

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-100">الأقسام</h1>
          <p className="mt-1 text-xs text-slate-400">إدارة الأقسام وتعيين مدير القسم ومهندس الموقع المسؤول عن الاستلام — ويمكن لمهندس الموقع خدمة أكثر من قسم</p>
        </div>

        <Button variant="primary" size="md" onClick={handleOpenAdd}>
          + إضافة قسم جديد
        </Button>
      </div>

      <ErrorMessage error={error} onDismiss={() => setError(null)} onRetry={() => void loadData()} />

      {incompleteDepartmentCount > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-700/70 bg-amber-950/25 px-4 py-3 text-xs text-amber-200 sm:flex-row sm:items-center sm:justify-between" role="status">
          <span>تنبيه إداري: يوجد {incompleteDepartmentCount} قسم يحتاج تعيين مدير قسم أو مهندس موقع حتى تظل بيانات التوجيه مكتملة.</span>
          <span className="font-bold text-amber-100">راجع الصفوف التي يظهر بها «غير معين»</span>
        </div>
      )}

      <TableFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="بحث باسم القسم أو الرمز أو مدير القسم أو مهندس الموقع..."
        onClear={() => setSearchTerm('')}
        hasActiveFilters={Boolean(searchTerm)}
        resultCount={filteredDepartments.length}
        totalCount={departments.length}
        resultLabel="قسم"
      />

      {/* الأقسام Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>رمز القسم</TableHead>
            <TableHead>اسم القسم</TableHead>
            <TableHead>مدير القسم</TableHead>
            <TableHead>مهندس الموقع</TableHead>
            <TableHead>عدد الموظفين</TableHead>
            <TableHead className="text-center">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredDepartments.map((dept) => (
            <TableRow key={dept.id}>
              <TableCell className="font-mono font-bold text-cyan-400">{dept.code}</TableCell>
              <TableCell className="font-bold text-slate-100">
                <div>{dept.name}</div>
                <div className="text-[11px] text-slate-400 font-normal">{dept.description}</div>
              </TableCell>
              <TableCell>
                {dept.manager ? (
                  <span className="text-slate-200 font-bold">{dept.manager.name}</span>
                ) : (
                  <span className="text-slate-500 italic">غير معين</span>
                )}
              </TableCell>
              <TableCell>
                {dept.site_engineer ? (
                  <span className="text-slate-200 font-bold">{dept.site_engineer.name}</span>
                ) : (
                  <span className="text-slate-500 italic">غير معين</span>
                )}
              </TableCell>
              <TableCell className="font-mono font-bold text-slate-200">{dept.users_count} موظف</TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenEdit(dept)}
                    className="px-2.5 py-1 text-[11px]"
                  >
                    تعديل
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(dept)}
                    className="px-2.5 py-1 text-[11px]"
                  >
                    حذف
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {filteredDepartments.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                {departments.length === 0 ? 'لا توجد أقسام مسجلة حتى الآن.' : 'لم نجد أقسامًا مطابقة للبحث الحالي.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* إضافة*/}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDept ? 'تعديل بيانات القسم' : 'إضافة قسم جديد'}
        subtitle="أدخل بيانات القسم ثم عيّن مدير القسم ومهندس الموقع المرتبطين به. يمكن اختيار مهندس الموقع من أي قسم، ويمكن تعيين نفس المهندس لأكثر من قسم."
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              isLoading={submitting}
            >
              حفظ البيانات
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="اسم القسم" required>
              <Input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: قسم التنفيذ"
              />
            </FormField>

            <FormField label="رمز القسم البرمجي" required helperText="استخدم رمزاً مختصراً وفريداً باللغة الإنجليزية.">
              <Input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="uppercase font-mono tracking-wider"
                placeholder="EXECUTION"
              />
            </FormField>

            <FormField label="مدير القسم" helperText={editingDept ? 'اختر مدير القسم من مستخدمي القسم. يمكن اختيار أي مستخدم نشط تابع لنفس القسم.' : 'احفظ القسم أولاً، ثم افتحه للتعديل لربط المسؤولين.'}>
              <Select
                value={formData.manager_user_id || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    manager_user_id: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">{editingDept ? 'اختر مدير القسم' : 'سيتم التعيين بعد حفظ القسم'}</option>
                {users.filter(u => Boolean(editingDept) && u.is_active && u.department?.id === editingDept?.id).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.email}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="مهندس الموقع" helperText={editingDept ? 'اختر أي مهندس موقع نشط؛ يمكن لمهندس الموقع نفسه خدمة أكثر من قسم، وسيعتمد إذن الاستلام بعد المخزن.' : 'احفظ القسم أولاً، ثم افتحه للتعديل لربط مهندس الموقع.'}>
              <Select
                value={formData.site_engineer_user_id || ''}
                onChange={(e) => setFormData({ ...formData, site_engineer_user_id: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">{editingDept ? 'اختر مهندس الموقع' : 'سيتم التعيين بعد حفظ القسم'}</option>
                {users.filter(u => Boolean(editingDept) && u.is_active && u.roles.some(r => r.slug === 'site_engineer')).map((u) => (
                  <option key={u.id} value={u.id}>{u.name} — {u.email}</option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField label="وصف القسم" helperText="اكتب وصفاً مختصراً لمسؤوليات القسم أو نطاق عمله.">
            <Textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="مثال: مسؤول عن تنفيذ الأعمال ومتابعة المواقع والمقاولين..."
              className="min-h-[112px] resize-y"
            />
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!departmentToDelete}
        title="تأكيد حذف القسم"
        message={departmentToDelete ? `هل أنت متأكد من حذف قسم «${departmentToDelete.name}»؟ يجب التأكد من عدم ارتباطه ببيانات نشطة قبل المتابعة.` : ''}
        confirmLabel="حذف القسم"
        isLoading={deletingDepartmentId === departmentToDelete?.id}
        onClose={() => setDepartmentToDelete(null)}
        onConfirm={() => {
          if (departmentToDelete) void executeDelete(departmentToDelete.id);
        }}
      />
    </div>
  );
};

export default DepartmentsPage;
