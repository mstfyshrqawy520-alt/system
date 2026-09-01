import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { Notification } from '../types/notification';
import NotificationsPage from '../pages/NotificationsPage';
import NotificationBell from '../components/notifications/NotificationBell';
import * as notificationsApi from '../api/notifications';
import * as authStorage from '../utils/authStorage';
import * as authApi from '../api/auth';

const mockUser = {
  id: 1,
  name: 'Ali Employee',
  email: 'ali@ashbiliya.com',
  is_active: true,
  roles: ['employee'],
  permissions: ['purchase_request.view_own'],
};

const mockUnreadNotification: Notification = {
  id: 101,
  type: 'purchase_request_submitted',
  title: 'New Purchase Request Submitted',
  message: 'Purchase request PR-2026-001 requires review',
  notifiable_type: 'App\\Models\\PurchaseRequest',
  notifiable_id: 5,
  read_at: null,
  created_at: new Date().toISOString(),
};

const mockReadNotification: Notification = {
  id: 102,
  type: 'general_notice',
  title: 'System Maintenance Completed',
  message: 'Scheduled maintenance ended successfully',
  notifiable_type: null,
  notifiable_id: null,
  read_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
};

describe('الإشعارات System Frontend', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authStorage, 'getToken').mockReturnValue('mock_token');
    vi.spyOn(authApi, 'getMeApi').mockResolvedValue(mockUser);
  });

  it('1. الإشعارات page renders title and elements', async () => {
    vi.spyOn(notificationsApi, 'getNotificationsApi').mockResolvedValue([mockUnreadNotification]);
    vi.spyOn(notificationsApi, 'getUnreadNotificationCountApi').mockResolvedValue(1);

    render(
      <MemoryRouter initialEntries={['/notifications']}>
        <AuthProvider>
          <Routes>
            <Route path="/notifications" element={<NotificationsPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });
    expect(screen.getByText(/تحديد الكل كمقروء/i)).toBeInTheDocument();
  });

  it('2. الإشعارات are loaded from API', async () => {
    vi.spyOn(notificationsApi, 'getNotificationsApi').mockResolvedValue([
      mockUnreadNotification,
      mockReadNotification,
    ]);
    vi.spyOn(notificationsApi, 'getUnreadNotificationCountApi').mockResolvedValue(1);

    render(
      <MemoryRouter initialEntries={['/notifications']}>
        <AuthProvider>
          <Routes>
            <Route path="/notifications" element={<NotificationsPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('New Purchase Request Submitted')).toBeInTheDocument();
    });
  });

  it('3. Unread count is displayed correctly', async () => {
    vi.spyOn(notificationsApi, 'getNotificationsApi').mockResolvedValue([mockUnreadNotification]);
    vi.spyOn(notificationsApi, 'getUnreadNotificationCountApi').mockResolvedValue(1);

    render(
      <MemoryRouter initialEntries={['/notifications']}>
        <AuthProvider>
          <Routes>
            <Route path="/notifications" element={<NotificationsPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/تحديد الكل كمقروء \(1\)/i)).toBeInTheDocument();
    });
  });

  it('4. Mark all notifications as read works', async () => {
    vi.spyOn(notificationsApi, 'getNotificationsApi').mockResolvedValue([mockUnreadNotification]);
    vi.spyOn(notificationsApi, 'getUnreadNotificationCountApi').mockResolvedValue(1);
    const markAllSpy = vi
      .spyOn(notificationsApi, 'markAllNotificationsAsReadApi')
      .mockResolvedValue({ success: true, count: 1 });

    render(
      <MemoryRouter initialEntries={['/notifications']}>
        <AuthProvider>
          <Routes>
            <Route path="/notifications" element={<NotificationsPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/تحديد الكل كمقروء/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/تحديد الكل كمقروء/i));

    await waitFor(() => {
      expect(markAllSpy).toHaveBeenCalled();
    });
  });

  it('5. Empty state renders when no notifications exist', async () => {
    vi.spyOn(notificationsApi, 'getNotificationsApi').mockResolvedValue([]);
    vi.spyOn(notificationsApi, 'getUnreadNotificationCountApi').mockResolvedValue(0);

    render(
      <MemoryRouter initialEntries={['/notifications']}>
        <AuthProvider>
          <Routes>
            <Route path="/notifications" element={<NotificationsPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/لا توجد معاملات معلقة|لا توجد إشعارات/i)).toBeInTheDocument();
    });
  });

  it('6. NotificationBell loads unread count and renders bell badge', async () => {
    vi.spyOn(notificationsApi, 'getUnreadNotificationCountApi').mockResolvedValue(5);
    vi.spyOn(notificationsApi, 'getNotificationsApi').mockResolvedValue([mockUnreadNotification]);

    render(
      <MemoryRouter initialEntries={['/employee']}>
        <AuthProvider>
          <Routes>
            <Route path="/employee" element={<NotificationBell />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });
});
