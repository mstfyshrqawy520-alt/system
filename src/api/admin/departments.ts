import client from '../client';

export interface AdminDepartment {
  id: number;
  name: string;
  code: string;
  description?: string;
  manager?: {
    id: number;
    name: string;
  } | null;
  site_engineer?: {
    id: number;
    name: string;
  } | null;
  users_count: number;
}

export interface DepartmentInput {
  name: string;
  code: string;
  description?: string;
  manager_user_id?: number | null;
  site_engineer_user_id?: number | null;
}

export const getDepartmentsAdminApi = async (): Promise<AdminDepartment[]> => {
  const res = await client.get<{ data: AdminDepartment[] }>('/admin/departments');
  return res.data.data;
};

export const createDepartmentAdminApi = async (data: DepartmentInput): Promise<AdminDepartment> => {
  const res = await client.post<{ data: AdminDepartment }>('/admin/departments', data);
  return res.data.data;
};

export const updateDepartmentAdminApi = async (id: number, data: DepartmentInput): Promise<AdminDepartment> => {
  const res = await client.put<{ data: AdminDepartment }>(`/admin/departments/${id}`, data);
  return res.data.data;
};

export const deleteDepartmentAdminApi = async (id: number): Promise<void> => {
  await client.delete(`/admin/departments/${id}`);
};
