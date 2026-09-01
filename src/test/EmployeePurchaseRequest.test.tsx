import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { PurchaseRequest, CatalogItem } from '../types/purchaseRequest';
import PurchaseRequestStatusBadge from '../components/purchase-requests/PurchaseRequestStatusBadge';
import PurchaseRequestTable from '../components/purchase-requests/PurchaseRequestTable';
import DeleteRequestDialog from '../components/purchase-requests/DeleteRequestDialog';
import SubmitRequestDialog from '../components/purchase-requests/SubmitRequestDialog';
import EmployeeDashboardPage from '../pages/employee/EmployeeDashboardPage';
import PurchaseRequestsPage from '../pages/employee/PurchaseRequestsPage';
import CreatePurchaseRequestPage from '../pages/employee/CreatePurchaseRequestPage';
import PurchaseRequestDetailsPage from '../pages/employee/PurchaseRequestDetailsPage';
import * as purchaseRequestsApi from '../api/purchaseRequests';
import * as catalogApi from '../api/catalog';
import * as authStorage from '../utils/authStorage';
import * as authApi from '../api/auth';

const todayInputDate = (() => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
})();

const mockEmployeeUser = {
  id: 1,
  name: 'Ali Employee',
  email: 'ali@ashbiliya.com',
  is_active: true,
  roles: ['employee'],
  permissions: [
    'purchase_request.create',
    'purchase_request.view_own',
    'purchase_request.edit_own',
    'purchase_request.submit',
  ],
  department: {
    id: 1,
    name: 'IT Operations',
    code: 'DEPT-IT',
  },
};

const mockDraftRequest: PurchaseRequest = {
  id: 10,
  request_number: 'PR-2026-00010',
  status: 'DRAFT',
  priority: 'NORMAL',
  date_needed: todayInputDate,
  notes: 'Need urgent setup',
  created_at: '2026-08-11T12:00:00Z',
  updated_at: '2026-08-11T12:00:00Z',
  requester: {
    id: 1,
    name: 'Ali Employee',
    email: 'ali@ashbiliya.com',
  },
  department: {
    id: 1,
    name: 'IT Operations',
    code: 'DEPT-IT',
  },
  items: [
    {
      id: 101,
      item_id: 1,
      item: { id: 1, name: 'Dell Latitude Laptop', sku: 'LAP-001' },
      item_description: 'Dell Latitude Laptop',
      item_reference: 'UI-PART-001',
      region: 'المنطقة السابعة والعشرون',
      quantity: '2.00',
      uom: 'PCS',
    },
  ],
};

const mockSubmittedRequest: PurchaseRequest = {
  ...mockDraftRequest,
  id: 11,
  request_number: 'PR-2026-00011',
  status: 'SUBMITTED',
  submitted_at: '2026-08-11T13:00:00Z',
};

const mockApprovedRequest: PurchaseRequest = {
  ...mockDraftRequest,
  id: 12,
  request_number: 'PR-2026-00012',
  status: 'APPROVED_BY_REVIEWER',
};

const mockCatalogItems: CatalogItem[] = [
  {
    id: 1,
    sku: 'LAP-001',
    name: 'Dell Latitude Laptop',
    uom: 'PCS',
  },
];

describe('PurchaseRequestStatusBadge Component', () => {
  it('renders correct labels for different statuses', () => {
    const { rerender } = render(<PurchaseRequestStatusBadge status="DRAFT" />);
    expect(screen.getByText('مسودة')).toBeInTheDocument();

    rerender(<PurchaseRequestStatusBadge status="SUBMITTED" />);
    expect(screen.getByText('تم الإرسال')).toBeInTheDocument();

    rerender(<PurchaseRequestStatusBadge status="UNDER_REVIEW" />);
    expect(screen.getByText('قيد المراجعة')).toBeInTheDocument();

    rerender(<PurchaseRequestStatusBadge status="APPROVED_BY_REVIEWER" />);
    expect(screen.getByText('معتمد')).toBeInTheDocument();

    rerender(<PurchaseRequestStatusBadge status="REJECTED" />);
    expect(screen.getByText('مرفوض')).toBeInTheDocument();
  });
});

describe('PurchaseRequestTable Component', () => {
  it('renders empty state when no requests exist', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <PurchaseRequestTable
            requests={[]}
            onOpenSubmitModal={() => { }}
            onOpenDeleteModal={() => { }}
          />
        </AuthProvider>
      </BrowserRouter>
    );
    expect(screen.getByText(/لا توجد طلبات شراء حالياً/i)).toBeInTheDocument();
  });

  it('shows edit action for submitted requests before reviewer approval', async () => {
    vi.spyOn(authStorage, 'getToken').mockReturnValue('mock_token');
    vi.spyOn(authApi, 'getMeApi').mockResolvedValue(mockEmployeeUser);

    render(
      <BrowserRouter>
        <AuthProvider>
          <PurchaseRequestTable
            requests={[mockSubmittedRequest]}
            onOpenSubmitModal={() => { }}
            onOpenDeleteModal={() => { }}
          />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.getAllByText('تعديل').length).toBeGreaterThan(0));
  });

  it('hides edit action after reviewer approval', async () => {
    vi.spyOn(authStorage, 'getToken').mockReturnValue('mock_token');
    vi.spyOn(authApi, 'getMeApi').mockResolvedValue(mockEmployeeUser);

    render(
      <BrowserRouter>
        <AuthProvider>
          <PurchaseRequestTable
            requests={[mockApprovedRequest]}
            onOpenSubmitModal={() => { }}
            onOpenDeleteModal={() => { }}
          />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => expect(screen.queryByText('تعديل')).not.toBeInTheDocument());
  });

  it('renders requests and actions correctly', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <PurchaseRequestTable
            requests={[mockDraftRequest, mockSubmittedRequest]}
            onOpenSubmitModal={() => { }}
            onOpenDeleteModal={() => { }}
          />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getAllByText('PR-2026-00010')[0]).toBeInTheDocument();
    expect(screen.getAllByText('PR-2026-00011')[0]).toBeInTheDocument();
  });
});

describe('حذف & إرسال Dialog Modals', () => {
  it('renders إرسال confirmation dialog and handles action', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <SubmitRequestDialog
        isOpen={true}
        requestNumber="PR-2026-00010"
        isSubmitting={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getAllByText(/PR-2026-00010/)[0]).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /تقديم/i }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('renders حذف confirmation dialog and handles action', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <DeleteRequestDialog
        isOpen={true}
        requestNumber="PR-2026-00010"
        isDeleting={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getAllByText(/PR-2026-00010/)[0]).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /حذف/i }));
    expect(onConfirm).toHaveBeenCalled();
  });
});

describe('Employee Pages Integration', () => {
  beforeEach(() => {
    vi.spyOn(authStorage, 'getToken').mockReturnValue('mock_token');
    vi.spyOn(authApi, 'getMeApi').mockResolvedValue(mockEmployeeUser);
    vi.spyOn(catalogApi, 'getCatalogItemsApi').mockResolvedValue(mockCatalogItems);
    vi.spyOn(purchaseRequestsApi, 'getPurchaseRequestDepartmentOptionsApi').mockResolvedValue([
      {
        id: 1,
        name: 'IT Operations',
        code: 'DEPT-IT',
        manager: { id: 2, name: 'Reviewer Demo' },
        site_engineer: { id: 2, name: 'Site Engineer Demo' },
      },
    ]);
  });

  it('renders لوحة الموظف Page with KPI summary', async () => {
    vi.spyOn(purchaseRequestsApi, 'getOwnPurchaseRequestsApi').mockResolvedValue([
      mockDraftRequest,
      mockSubmittedRequest,
    ]);

    render(
      <MemoryRouter initialEntries={['/employee']}>
        <AuthProvider>
          <Routes>
            <Route path="/employee" element={<EmployeeDashboardPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/لوحة الموظف/i)).toBeInTheDocument();
    });
    expect(screen.getAllByText('PR-2026-00010')[0]).toBeInTheDocument();
  });

  it('renders Purchase Requests Page and handles filter selection', async () => {
    vi.spyOn(purchaseRequestsApi, 'getOwnPurchaseRequestsApi').mockResolvedValue([
      mockDraftRequest,
      mockSubmittedRequest,
    ]);

    render(
      <MemoryRouter initialEntries={['/employee/requests']}>
        <AuthProvider>
          <Routes>
            <Route path="/employee/requests" element={<PurchaseRequestsPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('PR-2026-00010')[0]).toBeInTheDocument();
    });
    expect(screen.getByLabelText('إلى تاريخ')).toHaveValue(todayInputDate);

    const draftTab = screen.getByRole('button', { name: /مسودات/i });
    fireEvent.click(draftTab);
    expect(screen.getAllByText('PR-2026-00010')[0]).toBeInTheDocument();
  });

  it('renders إنشاء طلب شراء Form and submits new draft', async () => {
    const createSpy = vi
      .spyOn(purchaseRequestsApi, 'createPurchaseRequestApi')
      .mockResolvedValue(mockDraftRequest);
    const updateSpy = vi
      .spyOn(purchaseRequestsApi, 'updatePurchaseRequestApi')
      .mockResolvedValue(mockDraftRequest);
    const submitSpy = vi
      .spyOn(purchaseRequestsApi, 'submitPurchaseRequestApi')
      .mockResolvedValue(mockSubmittedRequest);

    render(
      <MemoryRouter initialEntries={['/employee/requests/create']}>
        <AuthProvider>
          <Routes>
            <Route path="/employee/requests/create" element={<CreatePurchaseRequestPage />} />
            <Route path="/employee/requests/:id" element={<PurchaseRequestDetailsPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );


    const departmentSelect = () => document.getElementById('pr-target-department') as HTMLSelectElement;
    await waitFor(() => {
      expect(departmentSelect().options).toHaveLength(2);
    });

    fireEvent.change(departmentSelect(), {
      target: { value: '1' },
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/مثال: حديد تسليح/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/مثال: حديد تسليح/i), {
      target: { value: 'Test Computer Monitor' },
    });
    fireEvent.change(screen.getByPlaceholderText(/مثال: 256 أو A-14/i), {
      target: { value: 'UI-PART-002' },
    });
    fireEvent.change(screen.getByPlaceholderText(/مثال: المنطقة السابعة/i), {
      target: { value: 'المنطقة السابعة والعشرون' },
    });

    fireEvent.click(screen.getByRole('button', { name: /إرسال طلب الشراء فوراً/i }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
        target_department_id: 1,
      }));
      expect(submitSpy).toHaveBeenCalledWith(mockDraftRequest.id);
    });
  });

  it('renders Request التفاصيل Page for a draft and handles إرسال action', async () => {
    vi.spyOn(purchaseRequestsApi, 'getPurchaseRequestApi').mockResolvedValue(mockDraftRequest);
    const submitApiSpy = vi
      .spyOn(purchaseRequestsApi, 'submitPurchaseRequestApi')
      .mockResolvedValue(mockSubmittedRequest);

    render(
      <MemoryRouter initialEntries={['/employee/requests/10']}>
        <AuthProvider>
          <Routes>
            <Route path="/employee/requests/:id" element={<PurchaseRequestDetailsPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('PR-2026-00010')[0]).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /تقديم/i });
    fireEvent.click(submitBtn);

    // Confirm dialog submit - get all إرسال buttons and click the last one (modal confirm button)
    const modalConfirmButtons = await screen.findAllByRole('button', { name: /تقديم/i });
    const modalConfirmBtn = modalConfirmButtons[modalConfirmButtons.length - 1];
    fireEvent.click(modalConfirmBtn);

    await waitFor(() => {
      expect(submitApiSpy).toHaveBeenCalledWith(10);
    });
  });
});
