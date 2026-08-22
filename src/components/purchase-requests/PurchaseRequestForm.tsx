import React, { useEffect, useState } from 'react';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { useNavigate } from 'react-router-dom';
import ErrorMessage from '../ErrorMessage';
import LoadingSpinner from '../LoadingSpinner';
import { getCatalogItemsApi } from '../../api/catalog';
import { getPurchaseRequestDepartmentOptionsApi } from '../../api/purchaseRequests';
import { ApiError } from '../../types/api';
import {
  CatalogItem,
  CreatePurchaseRequestPayload,
  PurchaseRequest,
  PurchaseRequestItemFormInput,
  PurchaseRequestPriority,
  DepartmentOption,
} from '../../types/purchaseRequest';
import { parseApiError } from '../../utils/apiError';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { FormField, Input, Select, Textarea } from '../ui/FormField';
import { getUnitOptions } from '../../utils/units';
import { useAuth } from '../../context/AuthContext';

const UNIT_OPTIONS = getUnitOptions(['PCS', 'KG', 'TON', 'M', 'M2', 'M3', 'L', 'BAG', 'BOX', 'CARTON', 'SET', 'PAIR', 'UNIT', 'HOUR', 'DAY']);

const getTodayDateInputValue = (): string => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
};

interface Props {
  initialData?: PurchaseRequest;
  onSubmit: (payload: CreatePurchaseRequestPayload) => Promise<void>;
  isSubmitting: boolean;
  submitButtonText?: string;
}

export const PurchaseRequestForm: React.FC<Props> = ({
  initialData,
  onSubmit,
  isSubmitting,
  submitButtonText = 'حفظ المسودة',
}) => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isGeneralManager = hasRole('general_manager');
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [departmentOptions, setDepartmentOptions] = useState<DepartmentOption[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState<boolean>(true);

  const [targetDepartmentId, setTargetDepartmentId] = useState<number | ''>(initialData?.target_department_id || initialData?.department?.id || '');
  const [priority, setPriority] = useState<PurchaseRequestPriority>(initialData?.priority || 'NORMAL');
  const [dateNeeded, setDateNeeded] = useState<string>(initialData?.date_needed || getTodayDateInputValue());
  const [notes, setNotes] = useState<string>(initialData?.notes || '');
  const [items, setItems] = useState<PurchaseRequestItemFormInput[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const isDirty = !initialData && Boolean(targetDepartmentId || notes.trim() || items.some((item) => item.item_description.trim() || item.item_reference?.trim() || item.region?.trim() || Number(item.quantity) !== 1));
  useUnsavedChangesWarning(isDirty && !isSubmitting);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const data = await getCatalogItemsApi();
        setCatalogItems(data);
      } catch (err) {
        console.error('Failed to load catalog items', err);
      } finally {
        setIsLoadingCatalog(false);
      }
    };
    fetchCatalog();
  }, []);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const data = await getPurchaseRequestDepartmentOptionsApi();
        setDepartmentOptions(data);
      } catch (err) {
        setError(parseApiError(err));
      } finally {
        setIsLoadingDepartments(false);
      }
    };
    void fetchDepartments();
  }, []);

  useEffect(() => {
    setTargetDepartmentId(initialData?.target_department_id || initialData?.department?.id || '');
  }, [initialData]);

  useEffect(() => {
    if (initialData && initialData.items && initialData.items.length > 0) {
      setItems(
        initialData.items.map((i) => ({
          item_id: i.item_id || null,
          item_description: i.item_description,
          item_reference: i.item_reference || '',
          region: i.region || '',
          quantity: parseFloat(i.quantity),
          uom: i.uom || '',
          specifications: i.specifications || '',
          notes: i.notes || '',
        }))
      );
    } else if (!initialData) {
      setItems([
        {
          item_id: null,
          item_description: '',
          item_reference: '',
          region: '',
          quantity: 1,
          uom: 'PCS',
          specifications: '',
          notes: '',
        },
      ]);
    }
  }, [initialData]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        item_id: null,
        item_description: '',
        quantity: 1,
        uom: 'PCS',
        specifications: '',
        notes: '',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setError({ message: 'يجب تقديم عنصر واحد على الأقل.' });
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof PurchaseRequestItemFormInput,
    value: any
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      const currentItem = { ...updated[index] };

      if (field === 'item_id') {
        const itemId = value ? parseInt(value, 10) : null;
        currentItem.item_id = itemId;
        if (itemId) {
          const selectedCatalog = catalogItems.find((c) => c.id === itemId);
          if (selectedCatalog) {
            currentItem.item_description = selectedCatalog.name;
            currentItem.uom = selectedCatalog.uom;
          }
        }
      } else {
        (currentItem as any)[field] = value;
      }

      updated[index] = currentItem;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const nextFieldErrors: Record<string, string> = {};

    if (!targetDepartmentId) {
      nextFieldErrors.targetDepartment = 'اختر القسم المطلوب منه الشراء قبل حفظ الطلب.';
    }

    const selectedDepartment = departmentOptions.find((department) => department.id === Number(targetDepartmentId));
    if (targetDepartmentId && ((!isGeneralManager && !selectedDepartment?.manager) || !selectedDepartment?.site_engineer)) {
      nextFieldErrors.targetDepartment = !isGeneralManager && !selectedDepartment?.manager
        ? 'القسم المختار غير مكتمل الإعداد؛ يجب تعيين مدير قسم ومهندس موقع من الإدارة.'
        : 'القسم المختار لا يحتوي على مهندس موقع معين من الإدارة.';
    }

    if (!dateNeeded) {
      nextFieldErrors.dateNeeded = 'حدد تاريخ الاحتياج قبل حفظ الطلب.';
    } else if (dateNeeded < getTodayDateInputValue()) {
      nextFieldErrors.dateNeeded = 'تاريخ الاحتياج لا يمكن أن يكون في الماضي. اختر اليوم أو تاريخًا قادمًا.';
    }

    if (items.length === 0) {
      setError({ message: 'يجب إضافة عنصر واحد على الأقل.', status: 422 });
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.item_description.trim()) nextFieldErrors[`item_${i}_description`] = 'اكتب وصف الصنف المطلوب.';
      if (!item.item_reference?.trim()) nextFieldErrors[`item_${i}_reference`] = 'رقم قطعة الأرض مطلوب.';
      if (!item.region?.trim()) nextFieldErrors[`item_${i}_region`] = 'المنطقة مطلوبة.';
      const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity));
      if (!Number.isFinite(qty) || qty <= 0) nextFieldErrors[`item_${i}_quantity`] = 'أدخل كمية أكبر من صفر.';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      const normalizedFieldErrors: Record<string, string[]> = Object.fromEntries(
        Object.entries(nextFieldErrors).map(([field, message]) => [field, [message]]),
      );
      setError({
        message: nextFieldErrors.targetDepartment || Object.values(nextFieldErrors)[0] || 'راجع الحقول المحددة باللون الأحمر ثم أعد المحاولة.',
        status: 422,
        errors: normalizedFieldErrors,
      });
      return;
    }

    try {
      await onSubmit({
        target_department_id: Number(targetDepartmentId),
        priority,
        date_needed: dateNeeded || undefined,
        notes: notes.trim() || undefined,
        items: items.map((item) => ({
          ...item,
          item_description: item.item_description.trim(),
          item_reference: item.item_reference?.trim(),
          region: item.region?.trim(),
          specifications: item.specifications?.trim(),
          notes: item.notes?.trim(),
          quantity: typeof item.quantity === 'string' ? Number(item.quantity) : item.quantity,
        })),
      });
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in" dir="rtl">
      <ErrorMessage error={error} onDismiss={() => setError(null)} />

      {/* Header Fields */}
            <Card className="space-y-4">
          <h3 className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3 text-sm font-bold text-slate-100">

          <span>📝</span> نموذج طلب شراء احترافي (غير مالي)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="القسم المطلوب منه الشراء" required error={fieldErrors.targetDepartment} helperText="سيتم توجيه الطلب تلقائيًا إلى مدير القسم ثم مهندس الموقع التابع له.">
            <Select
              required
              value={targetDepartmentId}
              disabled={isLoadingDepartments}
              onChange={(e) => setTargetDepartmentId(e.target.value ? Number(e.target.value) : '')}
              className="text-ellipsis"
            >
              <option value="">{isLoadingDepartments ? 'جاري تحميل الأقسام...' : 'اختر القسم'}</option>
              {departmentOptions.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name} — مدير القسم: {department.manager?.name || 'غير معين'} — مهندس الموقع: {department.site_engineer?.name || 'غير معين'}
                </option>
              ))}
            </Select>
            {targetDepartmentId && (() => {
              const selectedDepartment = departmentOptions.find((department) => department.id === Number(targetDepartmentId));
              return selectedDepartment ? (
                <p className="mt-1 text-[11px] text-slate-400">المسؤولون: {selectedDepartment.manager?.name || 'مدير غير معين'} / {selectedDepartment.site_engineer?.name || 'مهندس موقع غير معين'}</p>
              ) : null;
            })()}
          </FormField>

          <FormField label="درجة الأولوية">
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as PurchaseRequestPriority)}
            >
              <option value="NORMAL">عادي</option>
              <option value="LOW">منخفض</option>
              <option value="HIGH">عالي</option>
              <option value="URGENT">عاجل جداً</option>
            </Select>
          </FormField>

          <FormField label="تاريخ الحاجة والتوريد" error={fieldErrors.dateNeeded}>
            <Input
              type="date"
              min={getTodayDateInputValue()}
              value={dateNeeded}
              onChange={(e) => setDateNeeded(e.target.value)}
            />
          </FormField>

          <FormField label="ملاحظات عامة">
            <Input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات تشغيلية للمراجع أو قسم المشتريات..."
            />
          </FormField>
        </div>
      </Card>

      {/* Line البنود Table */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span>📦</span> عناصر ومواصفات الطلب({items.length})
          </h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddItem}
            className="w-full sm:w-auto"
          >
            + إضافة عنصر جديد
          </Button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="relative space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 transition-all sm:p-4"
            >
                                <div className="flex flex-wrap items-center justify-between gap-2">

                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60 font-mono">
                  بند #{index + 1}
                </span>
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveItem(index)}
                    className="w-full text-xs text-rose-400 hover:text-rose-300 sm:w-auto"
                  >
                    حذف البند
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FormField label="اختر من الكتالوج">
                  <Select
                    value={item.item_id || ''}
                    onChange={(e) => handleItemChange(index, 'item_id', e.target.value)}
                    disabled={isLoadingCatalog}
                  >
                    <option value="">-- صنف مخصص</option>
                    {catalogItems.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <div className="md:col-span-2">
                  <FormField label="الصنف" required error={fieldErrors[`item_${index}_description`]} >
                    <Input
                      type="text"
                      required
                      error={Boolean(fieldErrors[`item_${index}_description`])}
                      value={item.item_description}
                      onChange={(e) => handleItemChange(index, 'item_description', e.target.value)}
                      placeholder="اسم الصنف أو المادة المطلوبة بالتفصيل"
                    />
                  </FormField>
                </div>

                <FormField label="رقم قطعة الأرض" required error={fieldErrors[`item_${index}_reference`]} >
                  <Input
                    type="text"
                    required
                    error={Boolean(fieldErrors[`item_${index}_reference`])}
                    value={item.item_reference || ''}
                    onChange={(e) => handleItemChange(index, 'item_reference', e.target.value)}
                    placeholder="أدخل رقم قطعة الأرض"
                    dir="ltr"
                  />
                </FormField>

                <FormField label="المنطقة" required error={fieldErrors[`item_${index}_region`]} >
                  <Input
                    type="text"
                    required
                    error={Boolean(fieldErrors[`item_${index}_region`])}
                    value={item.region || ''}
                    onChange={(e) => handleItemChange(index, 'region', e.target.value)}
                    placeholder="أدخل اسم المنطقة"
                  />
                </FormField>

                <FormField label="الكمية المطلوبة" required error={fieldErrors[`item_${index}_quantity`]} >
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    error={Boolean(fieldErrors[`item_${index}_quantity`])}
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                  />
                </FormField>

                <FormField label="الوحدة">
                  <Select
                    value={item.uom || 'PCS'}
                    onChange={(e) => handleItemChange(index, 'uom', e.target.value)}
                  >
                    {UNIT_OPTIONS.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                  </Select>
                </FormField>

                <div className="md:col-span-3">
                  <FormField label="المواصفات الفنية والتشغيلية">
                    <Input
                      type="text"
                      value={item.specifications || ''}
                      onChange={(e) => handleItemChange(index, 'specifications', e.target.value)}
                      placeholder="أدخل الأبعاد، الماركة، القياسات، أو المواصفات الدقيقة المطلوبة..."
                    />
                  </FormField>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Form الإجراءات */}
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() => navigate('/employee/requests')}
          className="w-full sm:w-auto"
        >
          إلغاء
        </Button>

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          className="w-full sm:w-auto"
        >
          {submitButtonText}
        </Button>
      </div>
    </form>
  );
};

export default PurchaseRequestForm;
