import client from '../client';

export interface AdminPermission {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

export const getPermissionsAdminApi = async (): Promise<AdminPermission[]> => {
  const res = await client.get<{ data: AdminPermission[] }>('/admin/permissions');
  return res.data.data;
};
