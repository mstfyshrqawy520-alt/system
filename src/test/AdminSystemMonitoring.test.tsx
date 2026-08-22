import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import AdminSystemMonitoringPage from '../pages/admin/AdminSystemMonitoringPage';
import * as authStorage from '../utils/authStorage';
import * as authApi from '../api/auth';
import * as monitoringApi from '../api/admin/systemMonitoring';
import { User } from '../types/auth';
import { MonitoringSnapshot } from '../api/admin/systemMonitoring';

const adminUser: User = {
  id: 99,
  name: 'System Administrator',
  email: 'admin@ashbiliya.com',
  is_active: true,
  roles: ['admin'],
  permissions: ['system.monitor.view'],
};

const snapshot: MonitoringSnapshot = {
  checked_at: '2026-08-17T12:00:00+03:00',
  application: { status: 'ok', environment: 'testing', version: 'v1', commit: 'abc123' },
  database: { status: 'connected', driver: 'sqlite', latency_ms: 2.4 },
  migrations: { status: 'up_to_date', applied_count: 31, pending_count: 0, pending: [] },
  realtime: {
    status: 'configured',
    endpoint: '/api/v1/notifications/stream',
    last_system_event_at: '2026-08-17T11:59:00+03:00',
    client_connections: null,
  },
  deployment: {
    status: 'configured',
    version: '2026.08.17.1',
    commit: 'abc123',
    deployed_at: '2026-08-17T11:30:00+03:00',
    source: 'environment',
    message: 'بيانات الإصدار متاحة من إعدادات البيئة.',
  },
  counts: {
    users: 11,
    active_users: 11,
    departments: 6,
    categories: 4,
    items: 300,
    active_items: 300,
    suppliers: 20,
    active_suppliers: 20,
    purchase_requests: 200,
    purchase_orders: 200,
    system_events: 1186,
    failed_jobs: 0,
  },
  workflow: {
    purchase_requests_by_status: { SUBMITTED: 10, APPROVED_BY_PROCUREMENT: 190 },
    purchase_orders_by_status: { ISSUED: 200 },
  },
  data_integrity: {
    purchase_request_items_missing_reference: 0,
    purchase_order_items_missing_reference: 0,
    missing_reference_fields: 0,
  },
  alerts: [{ severity: 'info', title: 'النظام سليم', message: 'لا توجد مشاكل.', status: 'resolved' }],
};

describe('Admin system monitoring page', () => {
  it('renders health, deployment and alert sections', async () => {
    vi.spyOn(authStorage, 'getToken').mockReturnValue('mock_token');
    vi.spyOn(authApi, 'getMeApi').mockResolvedValue(adminUser);
    vi.spyOn(monitoringApi, 'getAdminSystemMonitoringApi').mockResolvedValue(snapshot);
    vi.spyOn(monitoringApi, 'getAdminAuditLogApi').mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/admin/system-monitor']}>
        <AuthProvider>
          <Routes>
            <Route path="/admin/system-monitor" element={<AdminSystemMonitoringPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'مركز مراقبة النظام والـDeploy' })).toBeInTheDocument();
    });

    expect(screen.getAllByText('قاعدة البيانات').length).toBeGreaterThan(0);
    expect(screen.getByText('Migrations معلقة')).toBeInTheDocument();
    expect(screen.getByText('بيانات الإصدار متاحة من إعدادات البيئة.')).toBeInTheDocument();
    expect(screen.getByText('النظام سليم')).toBeInTheDocument();
  });
});
