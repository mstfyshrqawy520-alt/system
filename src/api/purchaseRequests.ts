import apiClient from './client';
import {
  CreatePurchaseRequestPayload,
  PurchaseRequest,
  DepartmentOption,
  ReviewerOption,
  SiteEngineerOptionsResponse,
  SiteEngineerReceiverOption,
  UpdatePurchaseRequestPayload,
} from '../types/purchaseRequest';

export const getPurchaseRequestReviewerOptionsApi = async (): Promise<ReviewerOption[]> => {
  const response = await apiClient.get<{ data: ReviewerOption[] }>('/purchase-requests/reviewer-options');
  return response.data.data;
};

export const getPurchaseRequestSiteEngineerOptionsApi = async (): Promise<SiteEngineerReceiverOption[]> => {
  const response = await apiClient.get<{ data: SiteEngineerReceiverOption[] }>('/purchase-requests/site-engineer-options');
  return response.data.data;
};

export const getSiteEngineerReceiverOptionsApi = async (): Promise<SiteEngineerOptionsResponse> => {
  const response = await apiClient.get<SiteEngineerOptionsResponse>('/purchase-requests/site-engineer-options');
  return response.data;
};

export const getPurchaseRequestDepartmentOptionsApi = async (): Promise<DepartmentOption[]> => {
  const response = await apiClient.get<{ data: DepartmentOption[] }>('/purchase-requests/department-options');
  return response.data.data;
};

export const getOwnPurchaseRequestsApi = async (): Promise<PurchaseRequest[]> => {
  const response = await apiClient.get<{ data: PurchaseRequest[] }>('/purchase-requests');
  return response.data.data;
};

export const getPurchaseRequestApi = async (id: number): Promise<PurchaseRequest> => {
  const response = await apiClient.get<{ data: PurchaseRequest }>(`/purchase-requests/${id}`);
  return response.data.data;
};

export const createPurchaseRequestApi = async (
  payload: CreatePurchaseRequestPayload
): Promise<PurchaseRequest> => {
  const response = await apiClient.post<{ data: PurchaseRequest }>('/purchase-requests', payload);
  return response.data.data;
};

export const updatePurchaseRequestApi = async (
  id: number,
  payload: UpdatePurchaseRequestPayload
): Promise<PurchaseRequest> => {
  const response = await apiClient.put<{ data: PurchaseRequest }>(`/purchase-requests/${id}`, payload);
  return response.data.data;
};

export const deletePurchaseRequestApi = async (id: number): Promise<void> => {
  await apiClient.delete(`/purchase-requests/${id}`);
};

export const submitPurchaseRequestApi = async (id: number): Promise<PurchaseRequest> => {
  const response = await apiClient.post<{ message: string; data: PurchaseRequest }>(
    `/purchase-requests/${id}/submit`
  );
  return response.data.data;
};

