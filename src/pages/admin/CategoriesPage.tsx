import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ErrorMessage from '../../components/ErrorMessage';
import { TableSkeleton } from '../../components/ui/StateFeedback';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import {
  AdminCategory,
  getCategoriesAdminApi,
  createCategoryAdminApi,
  updateCategoryAdminApi,
  deleteCategoryAdminApi,
  CategoryInput,
} from '../../api/admin/categories';
import { parseApiError } from '../../utils/apiError';
import { Button } from '../../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import TableFilterBar from '../../components/ui/TableFilterBar';
import TableColumnFilters from '../../components/ui/TableColumnFilters';
import { Modal } from '../../components/ui/Modal';
import { FormField, Input, Textarea } from '../../components/ui/FormField';

export const CategoriesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState({ code: '', name: '', count: '', action: '' });
  const [categoryToDelete, setCategoryToDelete] = useState<AdminCategory | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [formData, setFormData] = useState<CategoryInput>({
    name: '',
    code: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCategoriesAdminApi();
      setCategories(data);
    } catch (err: unknown) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormData({ name: '', code: '', description: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: AdminCategory) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      code: cat.code,
      description: cat.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingCategory) {
        await updateCategoryAdminApi(editingCategory.id, formData);
      } else {
        await createCategoryAdminApi(formData);
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
    setDeletingCategoryId(id);
    try {
      await deleteCategoryAdminApi(id);
      setCategoryToDelete(null);
      await loadData();
    } catch (err: unknown) {
      setError(parseApiError(err).message);
    } finally {
      setDeletingCategoryId(null);
    }
  };

  const handleDelete = (category: AdminCategory) => {
    setCategoryToDelete(category);
  };

  if (!hasPermission('system.categories.manage')) {
    return (
      <div className="p-6 text-center text-rose-400 bg-rose-950/40 border border-rose-800/80 rounded-xl" dir="rtl">
        عفواً، لا تملك الصلاحية اللازمة للوصول لإدارة التصنيفات.
      </div>
    );
  }

  if (loading) {
    return <TableSkeleton rows={6} columns={4} className="min-h-[260px]" />;
  }

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredCategories = categories.filter((category) => {
    const contains = (value: unknown, filter: string) => !filter || String(value ?? '').toLocaleLowerCase('ar-EG').includes(filter.toLocaleLowerCase('ar-EG'));
    return (!normalizedSearch || [category.name, category.code, category.description].filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch)) && contains(category.code, columnFilters.code) && contains(category.name, columnFilters.name) && contains(category.items_count, columnFilters.count) && contains('تعديل حذف', columnFilters.action);
  });

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-100">التصنيفات</h1>
          <p className="mt-1 text-xs text-slate-400">إدارة تصنيفات وتصنيفات الكتالوج والمواد بالنظام</p>
        </div>

        <Button variant="primary" size="md" onClick={handleOpenAdd}>
          + إضافة تصنيف جديد
        </Button>
      </div>

      <ErrorMessage error={error} onDismiss={() => setError(null)} />

      <TableFilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="بحث باسم التصنيف أو الرمز أو الوصف..."
        onClear={() => setSearchTerm('')}
        hasActiveFilters={Boolean(searchTerm)}
        resultCount={filteredCategories.length}
        totalCount={categories.length}
        resultLabel="تصنيف"
      />

      <TableColumnFilters filters={[{ key: 'code', label: 'رمز التصنيف', value: columnFilters.code, onChange: (value) => setColumnFilters(current => ({ ...current, code: value })) }, { key: 'name', label: 'اسم التصنيف', value: columnFilters.name, onChange: (value) => setColumnFilters(current => ({ ...current, name: value })) }, { key: 'count', label: 'عدد الأصناف', type: 'number', value: columnFilters.count, onChange: (value) => setColumnFilters(current => ({ ...current, count: value })) }, { key: 'action', label: 'الإجراءات', value: columnFilters.action, onChange: (value) => setColumnFilters(current => ({ ...current, action: value })) }]} hasActiveFilters={Object.values(columnFilters).some(Boolean)} onClear={() => setColumnFilters({ code: '', name: '', count: '', action: '' })} />

      {/* التصنيفات Table */}
      <div className="hidden min-w-0 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رمز التصنيف</TableHead>
              <TableHead>اسم التصنيف</TableHead>
              <TableHead>عدد الأصناف</TableHead>
              <TableHead className="text-center">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCategories.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell className="font-mono font-bold text-cyan-400">{cat.code}</TableCell>
                <TableCell className="font-bold text-slate-100">
                  <div>{cat.name}</div>
                  <div className="text-[11px] text-slate-400 font-normal">{cat.description}</div>
                </TableCell>
                <TableCell className="font-mono font-bold text-slate-200">{cat.items_count} صنف</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenEdit(cat)}
                      className="px-2.5 py-1 text-[11px]"
                    >
                      تعديل
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(cat)}
                      className="px-2.5 py-1 text-[11px]"
                    >
                      حذف
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredCategories.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="p-8 text-center text-slate-400 text-xs">
                  {categories.length === 0 ? 'لا توجد تصنيفات مسجلة حتى الآن.' : 'لم نجد تصنيفات مطابقة للبحث الحالي.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {filteredCategories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 p-8 text-center text-xs text-slate-400">
            {categories.length === 0 ? 'لا توجد تصنيفات مسجلة حتى الآن.' : 'لم نجد تصنيفات مطابقة للبحث الحالي.'}
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <article key={`mobile-cat-${cat.id}`} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex min-w-0 items-start justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="min-w-0">
                  <h3 className="break-normal font-bold text-sm text-slate-100">{cat.name}</h3>
                  {cat.description && <p className="text-[11px] text-slate-400 mt-0.5">{cat.description}</p>}
                </div>
                <span className="shrink-0 font-mono text-xs font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/60">
                  {cat.code}
                </span>
              </div>
              <div className="mt-3 text-xs">
                <span className="text-slate-500">عدد الأصناف: </span>
                <span className="font-mono font-bold text-slate-200">{cat.items_count} صنف</span>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-slate-800 pt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenEdit(cat)}
                  className="flex-1 min-h-10 text-xs font-bold"
                >
                  تعديل
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(cat)}
                  className="flex-1 min-h-10 text-xs font-bold"
                >
                  حذف
                </Button>
              </div>
            </article>
          ))
        )}
      </div>

      {/* إضافة*/}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}
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
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <FormField label="اسم التصنيف" required>
            <Input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="معدات وأدوات..."
            />
          </FormField>

          <FormField label="رمز التصنيف" required>
            <Input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="uppercase font-mono"
              placeholder="EQUIP"
            />
          </FormField>

          <FormField label="الوصف">
            <Textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="توضيح مختصر للأصناف المندرجة تحت هذا التصنيف..."
            />
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!categoryToDelete}
        title="تأكيد حذف التصنيف"
        message={categoryToDelete ? `هل أنت متأكد من حذف التصنيف «${categoryToDelete.name}»؟` : ''}
        confirmLabel="حذف التصنيف"
        isLoading={deletingCategoryId === categoryToDelete?.id}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={() => {
          if (categoryToDelete) void executeDelete(categoryToDelete.id);
        }}
      />
    </div>
  );
};

export default CategoriesPage;
