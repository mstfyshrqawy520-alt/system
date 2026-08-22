export interface القسم {
  id: number;
  name: string;
  code: string;
}

export interface Role {
  id: number;
  slug: string;
  name: string;
}

export interface Permission {
  id: number;
  slug: string;
  name: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  department_id?: number | null;
  department?: القسم | null;
  is_active: boolean;
  roles: (string | Role)[];
  permissions: (string | Permission)[];
  created_at?: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  token_type: string;
  user: User;
}
