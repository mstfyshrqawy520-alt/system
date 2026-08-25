import apiClient from './client';
import { PurchaseRequest, PurchaseRequestQuote } from '../types/purchaseRequest';

export const getPendingQuoteRequestsApi = async (): Promise<PurchaseRequest[]> =>
  (await apiClient.get<{ data: PurchaseRequest[] }>('/procurement/purchase-requests/quotes')).data.data;

export const recommendPurchaseQuoteApi = async (
  quoteId: number,
  decision: 'RECOMMEND' | 'REJECT',
  comment?: string,
): Promise<PurchaseRequest> =>
  (await apiClient.post<{ data: PurchaseRequest }>(`/purchase-quotes/${quoteId}/recommend`, { decision, comment })).data.data;

export const decidePurchaseQuoteApi = async (
  quoteId: number,
  decision: 'SELECT' | 'REJECT',
  comment?: string,
): Promise<PurchaseRequest> =>
  (await apiClient.post<{ data: PurchaseRequest }>(`/purchase-quotes/${quoteId}/decide`, { decision, comment })).data.data;

export const getPurchaseRequestQuotesApi = async (requestId: number): Promise<PurchaseRequest> =>
  (await apiClient.get<{ data: PurchaseRequest }>(`/procurement/purchase-requests/${requestId}/quotes`)).data.data;

export const getSupplierQuoteArchiveApi = async (supplierId: number): Promise<PurchaseRequestQuote[]> =>
  (await apiClient.get<{ data: PurchaseRequestQuote[] }>(`/purchase-quotes/suppliers/${supplierId}/archive`)).data.data;

export type { PurchaseRequestQuote };
