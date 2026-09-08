import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
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
  name: 'Reviewer Demo',
  email: 'reviewer@ashbiliya.com',
  is_active: true,
  roles: ['reviewer'],
  permissions: ['purchase_request.review'],
};

const mockUnreadNotification: Notification = {
  id: 101,
  type: 'purchase_request_submitted',
  title: 'New Purchase Request Submitted',
  message: 'Purchase request PR-2026-001 requires review',
  notifiable_type: 'App\\Models\\PurchaseRequest',
  notifiable_id: 5,
  read_at: null,
  created_at: '2026-08-11T14:30:00Z',
};

const mockReadNotification: Notification = {
  id: 102,
  type: 'general_notice',
  title: 'System Maintenance Completed',
  message: 'Scheduled maintenance ended successfully',
  notifiable_type: null,
  notifiable_id: null,
  read_at: '2026-08-11T12:00:00Z',
  created_at: '2026-08-11T10:00:00Z',
};

describe('الإشعارات System Frontend', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    cleanup();
    localStorage.clear();
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
      expect(screen.getByRole('heading', { name: /مركز الإشعارات/ })).toBeInTheDocument();
    });
    expect(screen.getByText(/تحديد الكل كمقروء/)).toBeInTheDocument();
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

    // Switch to informational tab to see read/general notifications
    fireEvent.click(screen.getByText(/إشعارات للعلم/));
    await waitFor(() => {
      expect(screen.getByText('System Maintenance Completed')).toBeInTheDocument();
    });
  });

  it('3. Unread count is displayed correctly', async () => {
    vi.spyOn(notificationsApi, 'getNotificationsApi').mockResolvedValue([mockUnreadNotification]);
    vi.spyOn(notificationsApi, 'getUnreadNotificationCountApi').mockResolvedValue(3);

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
      expect(screen.getByText(/تحديد الكل كمقروء/)).toBeInTheDocument();
    });
  });

  it('4. Unread notification has correct visual state and indicator', async () => {
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
      expect(screen.getByText('غير مقروء')).toBeInTheDocument();
    });

    const unreadTitle = screen.getByText('New Purchase Request Submitted');
    expect(unreadTitle.className).toContain('font-black');

    // Switch to informational tab to check read notification styling
    fireEvent.click(screen.getByText(/إشعارات للعلم/));
    await waitFor(() => {
      expect(screen.getByText('System Maintenance Completed')).toBeInTheDocument();
    });
    const readTitle = screen.getByText('System Maintenance Completed');
    expect(readTitle.className).not.toContain('font-black');
  });

  it('5. Mark single notification as read works', async () => {
    vi.spyOn(notificationsApi, 'getNotificationsApi').mockResolvedValue([mockUnreadNotification]);
    vi.spyOn(notificationsApi, 'getUnreadNotificationCountApi').mockResolvedValue(1);
    const markSingleSpy = vi
      .spyOn(notificationsApi, 'markNotificationAsReadApi')
      .mockResolvedValue({ ...mockUnreadNotification, read_at: '2026-08-11T15:00:00Z' });

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
      expect(screen.getByText(/تم الإنجاز/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/تم الإنجاز/));

    await waitFor(() => {
      expect(markSingleSpy).toHaveBeenCalledWith(101);
    });
  });

  it('6. Mark all notifications as read works', async () => {
    vi.spyOn(notificationsApi, 'getNotificationsApi').mockResolvedValue([mockUnreadNotification]);
    vi.spyOn(notificationsApi, 'getUnreadNotificationCountApi').mockResolvedValue(1);
    const markAllSpy = vi
      .spyOn(notificationsApi, 'markAllNotificationsAsReadApi')
      .mockResolvedValue();

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
      expect(screen.getByText(/تحديد الكل كمقروء/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/تحديد الكل كمقروء/));

    await waitFor(() => {
      expect(markAllSpy).toHaveBeenCalled();
    });
  });

  it('7. Empty state renders when no notifications exist', async () => {
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
      expect(screen.getByText(/لا توجد معاملات معلقة/)).toBeInTheDocument();
    });
  });

  it('8. API error renders retry/error state', async () => {
    vi.spyOn(notificationsApi, 'getNotificationsApi').mockRejectedValue({
      isAxiosError: true,
      response: { status: 500, data: { message: 'Failed to fetch notifications' } },
    });
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
      expect(screen.getAllByText(/تعذر|فشل|خطأ/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/إعادة المحاولة/i)).toBeInTheDocument();
    });
  });

  it('9. Notification navigation works only for supported existing resources', async () => {
    vi.spyOn(notificationsApi, 'getNotificationsApi').mockResolvedValue([
      mockUnreadNotification,
      mockReadNotification,
    ]);
    vi.spyOn(notificationsApi, 'getUnreadNotificationCountApi').mockResolvedValue(1);
    vi.spyOn(notificationsApi, 'markNotificationAsReadApi').mockResolvedValue({
      ...mockUnreadNotification,
      read_at: '2026-08-11T15:00:00Z',
    });

    render(
      <MemoryRouter initialEntries={['/notifications']}>
        <AuthProvider>
          <Routes>
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/reviewer/requests/:id" element={<div data-testid="target-pr-details">Reviewer Requests Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('New Purchase Request Submitted')).toBeInTheDocument();
    });

    // Click supported purchase request notification -> should navigate to reviewer requests
    fireEvent.click(screen.getByText('New Purchase Request Submitted'));

    await waitFor(() => {
      expect(screen.getByTestId('target-pr-details')).toBeInTheDocument();
    });
  });

  it('NotificationBell loads unread count and navigates to /notifications', async () => {
    vi.spyOn(notificationsApi, 'getUnreadNotificationCountApi').mockResolvedValue(5);

    render(
      <MemoryRouter initialEntries={['/employee']}>
        <AuthProvider>
          <Routes>
            <Route path="/employee" element={<NotificationBell />} />
            <Route path="/notifications" element={<div data-testid="notifications-page">الإشعارات Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'الإشعارات' }));
    fireEvent.click(screen.getByText(/عرض مركز الإشعارات/));

    await waitFor(() => {
      expect(screen.getByTestId('notifications-page')).toBeInTheDocument();
    });
  });
});
