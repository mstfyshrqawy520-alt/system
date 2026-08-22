import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormField, Textarea } from '../ui/FormField';

interface Props {
  isOpen: boolean;
  requestNumber: string;
  isApproving: boolean;
  onConfirm: (comment?: string) => void;
  onCancel: () => void;
}

export const ApproveRequestDialog: React.FC<Props> = ({
  isOpen,
  requestNumber,
  isApproving,
  onConfirm,
  onCancel,
}) => {
  const [comment, setComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(comment || undefined);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="اعتماد طلب الشراء"
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

        <FormField label="ملاحظات الاعتماد (اختياري)(اختياري)">
          <Textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="ملاحظات اختيارية..."
          />
        </FormField>
      </form>
    </Modal>
  );
};

export default ApproveRequestDialog;
