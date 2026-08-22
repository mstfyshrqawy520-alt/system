import apiClient from './client';
import { PurchaseOrder, PurchaseOrderItemPayload, PurchaseOrderPayload } from '../types/purchaseOrder';

const base = '/procurement/purchase-orders';

export interface PurchaseOrderQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  supplier_id?: number;
  department_id?: number;
  date_from?: string;
  date_to?: string;
}

export interface PurchaseOrderPaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
}

export interface PurchaseOrderPage {
  data: PurchaseOrder[];
  meta: PurchaseOrderPaginationMeta;
  links?: {
    first?: string | null;
    last?: string | null;
    prev?: string | null;
    next?: string | null;
  };
}

export const getPurchaseOrdersApi = async (params: PurchaseOrderQueryParams = {}): Promise<PurchaseOrderPage> =>
  (await apiClient.get<PurchaseOrderPage>(base, { params })).data;

export const getPurchaseOrderApi = async (id: number) =>
  (await apiClient.get<{ data: PurchaseOrder }>(`${base}/${id}`)).data.data;

export const createPurchaseOrderApi = async (p: PurchaseOrderPayload) =>
  (await apiClient.post<{ data: PurchaseOrder }>(base, p)).data.data;

export const updatePurchaseOrderApi = async (id: number, p: PurchaseOrderPayload) =>
  (await apiClient.put<{ data: PurchaseOrder }>(`${base}/${id}`, p)).data.data;

export const addPurchaseOrderItemApi = async (id: number, p: PurchaseOrderItemPayload) =>
  (await apiClient.post<{ data: PurchaseOrder }>(`${base}/${id}/items`, p)).data.data;

export const updatePurchaseOrderItemApi = async (id: number, itemId: number, p: Partial<PurchaseOrderItemPayload>) =>
  (await apiClient.put<{ data: PurchaseOrder }>(`${base}/${id}/items/${itemId}`, p)).data.data;

export const removePurchaseOrderItemApi = async (id: number, itemId: number) =>
  (await apiClient.delete<{ data: PurchaseOrder }>(`${base}/${id}/items/${itemId}`)).data.data;

export const submitPurchaseOrderApi = async (id: number) =>
  (await apiClient.post<{ data: PurchaseOrder }>(`${base}/${id}/submit`)).data.data;
