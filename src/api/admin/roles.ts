import client from '../client';

export interface AdminRole {
  id: number;
  name: string;
  slug: string;
  description?: string;
  permissions: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
}

export const getRolesAdminApi = async (): Promise<AdminRole[]> => {
  const res = await client.get<{ data: AdminRole[] }>('/admin/roles');
  return res.data.data;
};

export const updateRolePermissionsAdminApi = async (id: number, permissionIds: number[]): Promise<AdminRole> => {
  const res = await client.put<{ data: AdminRole }>(`/admin/roles/${id}/permissions`, {
    permission_ids: permissionIds,
  });
  return res.data.data;
};
