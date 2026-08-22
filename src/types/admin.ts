export interface CatalogItemAdmin {
  id: number;
  sku: string;
  name: string;
  uom: string;
  description?: string | null;
  category?: {
    id: number;
    name: string;
    code?: string;
  } | null;
  is_active?: boolean;
}

export interface SupplierAdmin {
  id: number;
  name: string;
  code: string;
  company_name: string;
  contact_person?: string | null;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  is_active: boolean;
}

export interface AdminKpiMetrics {
  totalItems: number;
  totalSuppliers: number;
}
