import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProcurementDashboardPage from '../pages/procurement/ProcurementDashboardPage';
import * as procurement from '../api/procurement';
import * as orders from '../api/purchaseOrders';
import * as authStorage from '../utils/authStorage';
import * as authApi from '../api/auth';
import { AuthProvider } from '../context/AuthContext';

describe('Procurement purchase order frontend', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authStorage, 'getToken').mockReturnValue('mock_token');
    vi.spyOn(authApi, 'getMeApi').mockResolvedValue({
      id: 1,
      name: 'Ahmed Procurement',
      email: 'ahmed@ashbiliya.com',
      is_active: true,
      roles: ['procurement_manager'],
      permissions: [],
    });
  });

  it('renders the procurement dashboard from API data', async () => {
    vi.spyOn(procurement, 'getApprovedPurchaseRequestsApi').mockResolvedValue([]);
    vi.spyOn(procurement, 'getProcurementAnalyticsApi').mockResolvedValue({
      total_pos: 0,
      total_spend: 0,
      open_prs: 0,
      active_suppliers: 0,
      pos_by_status: {},
      spend_by_supplier: [],
      monthly_trend: [],
      metrics: {
        total_value: 0,
        total_pos: 0,
        pending_prs: 0,
        active_suppliers: 0,
      },
    } as any);
    vi.spyOn(orders, 'getPurchaseOrdersApi').mockResolvedValue({
      data: [],
      meta: { current_page: 1, from: null, last_page: 1, per_page: 15, to: null, total: 0 },
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <ProcurementDashboardPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument());
  });
});
