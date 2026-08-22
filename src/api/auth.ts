import apiClient from './client';
import { LoginCredentials, LoginResponse, User } from '../types/auth';

export interface DemoAccount {
  id: number;
  name: string;
  email: string;
  department?: { id: number; name: string; code?: string } | null;
  roles: { slug: string; name: string }[];
}

export const loginApi = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
  return response.data;
};

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

export const getDemoAccountsApi = async (): Promise<DemoAccount[]> => {
  const response = await apiClient.get<{ users: DemoAccount[] }>('/auth/demo-accounts');
  return response.data.users;
};

export const getMeApi = async (): Promise<User> => {
  const response = await apiClient.get<{ user: User }>('/auth/me');
  return response.data.user;
};

export const changePasswordApi = async (payload: ChangePasswordPayload): Promise<{ message: string }> => {
  const response = await apiClient.put<{ message: string }>('/auth/password', payload);
  return response.data;
};

export const logoutApi = async (): Promise<void> => {
  await apiClient.post('/auth/logout');
};
