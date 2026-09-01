import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Page from '../pages/accounting/AccountingDashboardPage';
import * as api from '../api/accounting';
import * as authStorage from '../utils/authStorage';
import * as authApi from '../api/auth';
import { AuthProvider } from '../context/AuthContext';

describe('Accounting PO frontend', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authStorage, 'getToken').mockReturnValue('mock_token');
    vi.spyOn(authApi, 'getMeApi').mockResolvedValue({
      id: 2,
      name: 'Hasan Accountant',
      email: 'hasan@ashbiliya.com',
      is_active: true,
      roles: ['accountant'],
      permissions: [],
    });
  });

  it('renders dashboard', async () => {
    vi.spyOn(api, 'getAccountingPurchaseOrdersApi').mockResolvedValue([]);
    render(
      <MemoryRouter>
        <AuthProvider>
          <Page />
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText(/لوحة المحاسبة/i)).toBeInTheDocument());
  });
});
