import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { clearSessionExpired, getToken, markSessionExpired, setToken, removeToken } from '../utils/authStorage';
import { hasRole, hasPermission } from '../utils/permissions';
import { parseApiError } from '../utils/apiError';
import { User } from '../types/auth';
import { AuthProvider } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import LoginPage from '../pages/LoginPage';
import ProtectedPage from '../pages/ProtectedPage';

describe('AuthStorage Utility', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('stores and retrieves Sanctum Bearer token under al_ashbiliya_auth_token key', () => {
    expect(getToken()).toBeNull();
    setToken('test_token_123');
    expect(getToken()).toBe('test_token_123');
    removeToken();
    expect(getToken()).toBeNull();
  });
});

describe('Permission & Role Helpers', () => {
  const mockUser: User = {
    id: 1,
    name: 'Ali Employee',
    email: 'ali@ashbiliya.com',
    is_active: true,
    roles: ['employee'],
    permissions: ['purchase_request.create', 'purchase_request.view_own'],
  };

  it('correctly evaluates hasRole', () => {
    expect(hasRole(mockUser, 'employee')).toBe(true);
    expect(hasRole(mockUser, 'procurement_manager')).toBe(false);
  });

  it('correctly evaluates hasPermission including admin override', () => {
    expect(hasPermission(mockUser, 'purchase_request.create')).toBe(true);
    expect(hasPermission(mockUser, 'purchase_order.create')).toBe(false);

    const adminUser: User = {
      ...mockUser,
      roles: ['admin'],
      permissions: [],
    };
    expect(hasPermission(adminUser, 'purchase_order.create')).toBe(true);
  });
});

describe('API Error Parser Utility', () => {
  it('parses 401 unauthenticated errors', () => {
    const error = {
      isAxiosError: true,
      response: { status: 401, data: { message: 'Unauthenticated.' } },
    };
    const parsed = parseApiError(error);
    expect(parsed.status).toBe(401);
    expect(parsed.message).toContain('انتهت جلسة الدخول');
  });

  it('explains invalid login credentials without exposing technical details', () => {
    const error = {
      isAxiosError: true,
      config: { url: '/auth/login' },
      response: { status: 401, data: { message: 'بيانات الدخول غير صحيحة.' } },
    };
    const parsed = parseApiError(error);
    expect(parsed.status).toBe(401);
    expect(parsed.message).toContain('البريد الإلكتروني أو كلمة المرور غير صحيحين');
  });

  it('parses 403 forbidden errors without logging out user', () => {
    const error = {
      isAxiosError: true,
      response: { status: 403, data: { message: 'غير مصرح بهذا الإجراء.' } },
    };
    const parsed = parseApiError(error);
    expect(parsed.status).toBe(403);
    expect(parsed.message).toContain('غير مصرح');
  });

  it('parses 422 validation errors with field errors', () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          message: 'The given data was invalid.',
          errors: { email: ['The email field is required.'] },
        },
      },
    };
    const parsed = parseApiError(error);
    expect(parsed.status).toBe(422);
    expect(parsed.errors?.email).toEqual(['يرجى مراجعة هذا الحقل.']);
  });
});

describe('UI Components', () => {
  it('renders LoadingSpinner with custom message', () => {
    render(<LoadingSpinner message="Loading application..." />);
    expect(screen.getByText('Loading application...')).toBeInTheDocument();
  });

  it('renders ErrorMessage component', () => {
    render(<ErrorMessage error="Invalid login credentials" />);
    expect(screen.getByText('Invalid login credentials')).toBeInTheDocument();
  });
});

describe('LoginPage Component', () => {
  it('renders email and password inputs and sign-in button', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByPlaceholderText('user@ashbiliya.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /تسجيل الدخول/i })).toBeInTheDocument();
  });

  it('shows a clear Arabic message when the previous session expired', () => {
    markSessionExpired();

    render(
      <BrowserRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('انتهت جلسة الدخول. سجّل الدخول مرة أخرى للمتابعة.')).toBeInTheDocument();
    clearSessionExpired();
  });
});
