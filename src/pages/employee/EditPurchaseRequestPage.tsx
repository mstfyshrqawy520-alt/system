import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';
import PurchaseRequestForm from '../../components/purchase-requests/PurchaseRequestForm';
import { getPurchaseRequestApi, updatePurchaseRequestApi } from '../../api/purchaseRequests';
import { ApiError } from '../../types/api';
import { CreatePurchaseRequestPayload, PurchaseRequest } from '../../types/purchaseRequest';
import { parseApiError } from '../../utils/apiError';
import { Button } from '../../components/ui/Button';

const REQUESTER_EDITABLE_STATUSES = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'];

export const EditPurchaseRequestPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [requestData, setRequestData] = useState<PurchaseRequest | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    const fetchRequest = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await getPurchaseRequestApi(parseInt(id, 10));
        if (!REQUESTER_EDITABLE_STATUSES.includes(data.status)) {
          setError({
            message: 'تم اعتماد الطلب من المراجع، لذلك تم إغلاق التعديل.',
            status: 409,
          });
        }
        setRequestData(data);
      } catch (err) {
        setError(parseApiError(err));
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequest();
  }, [id]);

  const handleSubmit = async (payload: CreatePurchaseRequestPayload) => {
    if (!id || !requestData) return;
    setIsSubmitting(true);
    try {
      const updatedPr = await updatePurchaseRequestApi(parseInt(id, 10), payload);
      navigate(`/requests/${updatedPr.id}`, {
        state: { message: 'تم تحديث مسودة طلب الشراء بنجاح.' },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="تحميل بيانات طلب الشراء للتعديل..." />;
  }

  if (error && (!requestData || !REQUESTER_EDITABLE_STATUSES.includes(requestData.status))) {
    return (
      <div className="space-y-4" dir="rtl">
        <ErrorMessage error={error} />
        <Link to="/requests">
          <Button variant="secondary" size="sm">
            &rarr; العودة إلى قائمة طلبات الشراء
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
                    <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">

            <span>✏️</span>
            تعديل طلب الشراء ({requestData?.request_number})
          </h1>
        </div>

        <Link to={`/requests/${id}`}>
          <Button variant="secondary" size="sm">
            &rarr; إلغاء والتراجع
          </Button>
        </Link>
      </div>

      <ErrorMessage error={error} onDismiss={() => setError(null)} />

      {requestData && (
        <PurchaseRequestForm
          initialData={requestData}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitButtonText="تحديث وحفظ الطلب"
        />
      )}
    </div>
  );
};

export default EditPurchaseRequestPage;
