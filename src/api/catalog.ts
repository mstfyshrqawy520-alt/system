import apiClient from './client';
import { CatalogItem } from '../types/purchaseRequest';

export const getCatalogItemsApi = async (): Promise<CatalogItem[]> => {
  const response = await apiClient.get<{ data: CatalogItem[] }>('/catalog-items');
  return response.data.data;
};
