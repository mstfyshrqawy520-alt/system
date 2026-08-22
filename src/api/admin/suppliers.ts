import apiClient from '../client';

export interface SupplierAdmin {
  id: number;
  name: string;
  company_name?: string;
  code?: string;
  contact_name?: string | null;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  opening_balance?: number | string | null;
  opening_balance_notes?: string | null;
  is_active: boolean;
}

export interface SupplierInput {
  name: string;
  company_name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  opening_balance?: number | string;
  opening_balance_notes?: string;
  is_active?: boolean;
}

export const getSuppliersAdminApi = async (): Promise<SupplierAdmin[]> => {
  const response = await apiClient.get<any>('/procurement/suppliers-manage');
  const list = Array.isArray(response.data) ? response.data : (response.data?.data || []);
  return list.map((s: any) => ({
    ...s,
    name: s.company_name || s.name || 'مورد غير مسمى',
    company_name: s.company_name || s.name || 'مورد غير مسمى',
    code: s.code || `SUP-${s.id}`,
    is_active: Boolean(s.is_active),
  }));
};

export const createSupplierAdminApi = async (data: SupplierInput): Promise<SupplierAdmin> => {
  const payload = {
    ...data,
    company_name: data.company_name || data.name,
  };
  const response = await apiClient.post<any>('/procurement/suppliers', payload);
  const s = response.data?.data || response.data;
  return {
    ...s,
    name: s.company_name || s.name,
    company_name: s.company_name || s.name,
  };
};

export const updateSupplierAdminApi = async (id: number, data: SupplierInput): Promise<SupplierAdmin> => {
  const payload = {
    ...data,
    company_name: data.company_name || data.name,
  };
  const response = await apiClient.put<any>(`/procurement/suppliers/${id}`, payload);
  const s = response.data?.data || response.data;
  return {
    ...s,
    name: s.company_name || s.name,
    company_name: s.company_name || s.name,
  };
};

export const deleteSupplierAdminApi = async (id: number): Promise<void> => {
  await apiClient.delete(`/procurement/suppliers/${id}`);
};
