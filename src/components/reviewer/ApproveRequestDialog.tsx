import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormField, Textarea, Select } from '../ui/FormField';
import { getSiteEngineerReceiverOptionsApi } from '../../api/purchaseRequests';
import { SiteEngineerReceiverOption } from '../../types/purchaseRequest';

interface Props {
  isOpen: boolean;
  requestNumber: string;
  initialSiteEngineerId?: number | null;
  isApproving: boolean;
  onConfirm: (comment?: string, siteEngineerUserId?: number | null) => void;
  onCancel: () => void;
}

export const ApproveRequestDialog: React.FC<Props> = ({
  isOpen,
  requestNumber,
  initialSiteEngineerId,
  isApproving,
  onConfirm,
  onCancel,
}) => {
  const [comment, setComment] = useState('');
  const [selectedEngineerId, setSelectedEngineerId] = useState<number | ''>(
    initialSiteEngineerId || ''
  );
  const [siteEngineers, setSiteEngineers] = useState<SiteEngineerReceiverOption[]>([]);
  const [otherUsers, setOtherUsers] = useState<SiteEngineerReceiverOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialSiteEngineerId) {
        setSelectedEngineerId(initialSiteEngineerId);
      }
      setIsLoadingOptions(true);
      getSiteEngineerReceiverOptionsApi()
        .then((res) => {
          setSiteEngineers(res.site_engineers || []);
          setOtherUsers(res.other_users || []);
          // If no initial site engineer was selected, default to the first site engineer if available
          if (!initialSiteEngineerId && res.site_engineers && res.site_engineers.length > 0) {
            setSelectedEngineerId(res.site_engineers[0].id);
          }
        })
        .catch(() => {
          // Fallback if needed
        })
        .finally(() => {
          setIsLoadingOptions(false);
        });
    } else {
      setComment('');
      setSelectionError(null);
    }
  }, [isOpen, initialSiteEngineerId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEngineerId) {
      setSelectionError('يجب تحديد مهندس الموقع / مسؤول الاستلام قبل اعتماد الطلب.');
      return;
    }
    setSelectionError(null);
    onConfirm(comment || undefined, Number(selectedEngineerId));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="اعتماد طلب الشراء وتحديد مسؤول الاستلام"
      subtitle={`طلب رقم ${requestNumber}`}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={isApproving}>
            إلغاء
          </Button>
          <Button
            type="button"
            variant="success"
            size="sm"
            onClick={handleSubmit}
            isLoading={isApproving}
          >
            اعتماد الطلب
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <p className="text-slate-200">
          هل أنت متأكد من اعتماد طلب الشراء <strong className="text-emerald-400 font-mono">{requestNumber}</strong> وتحويله للمدير التنفيذي؟
        </p>

        <FormField
          label="مهندس الموقع / مسؤول استلام المواد بالموقع (مطلوب)"
          error={selectionError || undefined}
        >
          {isLoadingOptions ? (
            <div className="text-slate-400 text-xs py-2">جاري تحميل قائمة المهندسين والمستلمين...</div>
          ) : (
            <Select
              value={selectedEngineerId}
              onChange={(e) => {
                setSelectedEngineerId(e.target.value ? Number(e.target.value) : '');
                setSelectionError(null);
              }}
              required
              className="font-bold text-slate-100 bg-slate-900 border-slate-700"
            >
              <option value="" disabled>-- اختر مهندس الموقع أو مسؤول الاستلام --</option>
              {siteEngineers.length > 0 && (
                <optgroup label="👷 مهندسو الموقع الأساسيون">
                  {siteEngineers.map((eng) => (
                    <option key={`se-${eng.id}`} value={eng.id}>
                      {eng.name} {eng.department_name ? `(${eng.department_name})` : ''}
                    </option>
                  ))}
                </optgroup>
              )}
              {otherUsers.length > 0 && (
                <optgroup label="👥 مستخدمو النظام الآخرون (تفويض أي دور آخر)">
                  {otherUsers.map((u) => (
                    <option key={`other-${u.id}`} value={u.id}>
                      {u.name} — {u.role_name || 'مستخدم'} {u.department_name ? `(${u.department_name})` : ''}
                    </option>
                  ))}
                </optgroup>
              )}
            </Select>
          )}
          <p className="mt-1 text-[11px] text-slate-400">
            الشخص المختار سيتولى مراجعة إذن الاستلام واعتماده بالموقع فور توريد الأصناف من المورد.
          </p>
        </FormField>

        <FormField label="ملاحظات الاعتماد (اختياري)">
          <Textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="ملاحظات اختيارية للمدير التنفيذي..."
          />
        </FormField>
      </form>
    </Modal>
  );
};

export default ApproveRequestDialog;
