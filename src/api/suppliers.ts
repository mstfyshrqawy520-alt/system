import apiClient, { cachedGetData, invalidateCachedGet } from './client';
import { المورد } from '../types/purchaseOrder';

export interface SupplierPayload {
  company_name: string;
  code?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  is_active?: boolean;
}

export const getSuppliersApi = async () =>
  (await cachedGetData<{ data: المورد[] }>('/procurement/suppliers-manage')).data;

export const getSupplierApi = async (id: number) =>
  (await apiClient.get<{ data: المورد }>(`/procurement/suppliers-manage/${id}`)).data.data;

export const createSupplierApi = async (payload: SupplierPayload) => {
  const response = await apiClient.post<{ data: المورد }>('/procurement/suppliers', payload);
  invalidateCachedGet('/procurement/suppliers-manage');
  return response.data.data;
};

export const updateSupplierApi = async (id: number, payload: Partial<SupplierPayload>) => {
  const response = await apiClient.put<{ data: المورد }>(`/procurement/suppliers/${id}`, payload);
  invalidateCachedGet('/procurement/suppliers-manage');
  return response.data.data;
};

export const deleteSupplierApi = async (id: number) => {
  const response = await apiClient.delete<{ message: string }>(`/procurement/suppliers/${id}`);
  invalidateCachedGet('/procurement/suppliers-manage');
  return response.data;
};

