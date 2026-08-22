import client from '../client';

export interface AdminCategory {
  id: number;
  name: string;
  code: string;
  description?: string;
  items_count: number;
}

export interface CategoryInput {
  name: string;
  code: string;
  description?: string;
}

export const getCategoriesAdminApi = async (): Promise<AdminCategory[]> => {
  const res = await client.get<{ data: AdminCategory[] }>('/admin/categories');
  return res.data.data;
};

export const createCategoryAdminApi = async (data: CategoryInput): Promise<AdminCategory> => {
  const res = await client.post<{ data: AdminCategory }>('/admin/categories', data);
  return res.data.data;
};

export const updateCategoryAdminApi = async (id: number, data: CategoryInput): Promise<AdminCategory> => {
  const res = await client.put<{ data: AdminCategory }>(`/admin/categories/${id}`, data);
  return res.data.data;
};

export const deleteCategoryAdminApi = async (id: number): Promise<void> => {
  await client.delete(`/admin/categories/${id}`);
};
