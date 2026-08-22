import apiClient from './client';
import { PurchaseRequest } from '../types/purchaseRequest';
import type { DirectAccountingFinancialData } from './procurement';

export type AccountingReviewFinancialData = DirectAccountingFinancialData;

export const getDirectAccountingPurchaseRequestsApi = async (): Promise<PurchaseRequest[]> => {
  const response = await apiClient.get<{ data: PurchaseRequest[] }>('/accounting/purchase-requests/direct-approval');
  return response.data.data;
};

export const getAccountingActiveSuppliersApi = async (): Promise<Array<{
  id: number;
  code?: string | null;
  company_name: string;
  is_active: boolean;
}>> => {
  const response = await apiClient.get<{ data: Array<{ id: number; code?: string | null; company_name: string; is_active: boolean }> }>('/accounting/purchase-requests/direct-suppliers');
  return response.data.data;
};

export const approveDirectAccountingPurchaseRequestApi = async (
  id: number,
  financialData: AccountingReviewFinancialData,
  comment?: string,
): Promise<PurchaseRequest> => {
  const response = await apiClient.post<{ data: PurchaseRequest }>(
    `/accounting/purchase-requests/${id}/direct-approve`,
    { financial_data: financialData, comment },
  );
  return response.data.data;
};

export const rejectDirectAccountingPurchaseRequestApi = async (
  id: number,
  comment: string,
): Promise<PurchaseRequest> => {
  const response = await apiClient.post<{ data: PurchaseRequest }>(
    `/accounting/purchase-requests/${id}/direct-reject`,
    { comment },
  );
  return response.data.data;
};
