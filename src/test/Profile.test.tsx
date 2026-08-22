import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { User } from '../types/auth';
import ProfilePage from '../pages/ProfilePage';
import ProtectedRoute from '../routes/ProtectedRoute';
import * as authStorage from '../utils/authStorage';
import * as authApi from '../api/auth';

const mockFullUser: User = {
  id: 1,
  name: 'Sultan Al-Otaibi',
  email: 'sultan@ashbiliya.com',
  phone: '+966551234567',
  is_active: true,
  department: {
    id: 10,
    name: 'Information Technology',
    code: 'DEPT-IT',
  },
  roles: [
    { id: 1, slug: 'procurement_manager', name: 'Procurement Manager' },
  ],
  permissions: ['purchase_order.create', 'purchase_order.view'],
  created_at: '2026-01-01T00:00:00Z',
};

const mockMinimalUser: User = {
  id: 2,
  name: 'Bare Minimal User',
  email: 'minimal@ashbiliya.com',
  is_active: false,
  department: null,
  roles: [],
  permissions: [],
};

describe('User الملف الشخصي Feature Frontend', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. الملف الشخصي page renders cleanly', async () => {
    vi.spyOn(authStorage, 'getToken').mockReturnValue('mock_token');
    vi.spyOn(authApi, 'getMeApi').mockResolvedValue(mockFullUser);

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AuthProvider>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Sultan Al-Otaibi').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('تسجيل الخروج')).toBeInTheDocument();
  });

  it('2. Authenticated user name is displayed', async () => {
    vi.spyOn(authStorage, 'getToken').mockReturnValue('mock_token');
    vi.spyOn(authApi, 'getMeApi').mockResolvedValue(mockFullUser);

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AuthProvider>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Sultan Al-Otaibi').length).toBeGreaterThan(0);
    });
  });

  it('3. Email is displayed', async () => {
    vi.spyOn(authStorage, 'getToken').mockReturnValue('mock_token');
    vi.spyOn(authApi, 'getMeApi').mockResolvedValue(mockFullUser);

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AuthProvider>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('sultan@ashbiliya.com').length).toBeGreaterThan(0);
    });
  });

  it('4. القسم is displayed when available', async () => {
    vi.spyOn(authStorage, 'getToken').mockReturnValue('mock_token');
    vi.spyOn(authApi, 'getMeApi').mockResolvedValue(mockFullUser);

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AuthProvider>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Information Technology (DEPT-IT)')).toBeInTheDocument();
    });
  });

  it('5. Roles are displayed', async () => {
    vi.spyOn(authStorage, 'getToken').mockReturnValue('mock_token');
    vi.spyOn(authApi, 'getMeApi').mockResolvedValue(mockFullUser);

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AuthProvider>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Procurement Manager').length).toBeGreaterThan(0);
    });
  });

  it('6. Account status is displayed when available', async () => {
    vi.spyOn(authStorage, 'getToken').mockReturnValue('mock_token');
    vi.spyOn(authApi, 'getMeApi').mockResolvedValue(mockFullUser);

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AuthProvider>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('حساب نشط')).toBeInTheDocument();
      expect(screen.getByText('نشط')).toBeInTheDocument();
    });
  });

  it('7. Missing optional fields do not break the page', async () => {
    vi.spyOn(authStorage, 'getToken').mockReturnValue('mock_token');
    vi.spyOn(authApi, 'getMeApi').mockResolvedValue(mockMinimalUser);

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AuthProvider>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Bare Minimal User').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('غير معين')).toBeInTheDocument();
    expect(screen.getByText('لا توجد أدوار مسندة')).toBeInTheDocument();
    expect(screen.getByText('لا توجد صلاحيات معلنة')).toBeInTheDocument();
  });

  it('8. الصلاحيات are displayed only when available', async () => {
    vi.spyOn(authStorage, 'getToken').mockReturnValue('mock_token');
    vi.spyOn(authApi, 'getMeApi').mockResolvedValue(mockFullUser);

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AuthProvider>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('purchase_order.create')).toBeInTheDocument();
      expect(screen.getByText('purchase_order.view')).toBeInTheDocument();
    });
  });

  it('9. Logout action uses existing logout functionality', async () => {
    vi.spyOn(authStorage, 'getToken').mockReturnValue('mock_token');
    vi.spyOn(authApi, 'getMeApi').mockResolvedValue(mockFullUser);
    const logoutSpy = vi.spyOn(authApi, 'logoutApi').mockResolvedValue();

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AuthProvider>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Sultan Al-Otaibi').length).toBeGreaterThan(0);
    });

    const logoutBtn = screen.getByRole('button', { name: /تسجيل الخروج/i });
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(logoutSpy).toHaveBeenCalled();
    });
  });

  it('10. Unauthenticated users remain protected by existing route guard', async () => {
    vi.spyOn(authStorage, 'getToken').mockReturnValue(null);

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div data-testid="login-screen">Login Screen</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('login-screen')).toBeInTheDocument();
    });
  });
});
