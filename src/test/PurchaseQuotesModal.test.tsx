import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PurchaseQuotesModal from '../components/procurement/PurchaseQuotesModal';
import { PurchaseRequest } from '../types/purchaseRequest';
import { المورد } from '../types/purchaseOrder';

const request = {
  id: 501,
  request_number: 'TEST-QUOTE-501',
  date_needed: '2026-08-30',
  items: [
    {
      id: 1,
      item_description: 'خامة اختبار',
      item_reference: 'TEST-PARCEL-501',
      region: 'منطقة الاختبار',
      quantity: 4,
      uom: 'PCS',
    },
  ],
  requester: { id: 1, name: 'موظف الاختبار' },
  department: { id: 1, name: 'التنفيذ' },
  assigned_reviewer: { id: 2, name: 'مراجع الاختبار' },
  site_engineer: { id: 3, name: 'مهندس الاختبار' },
} as unknown as PurchaseRequest;

const suppliers = [
  { id: 1, company_name: 'مورد الاختبار الأول', is_active: true },
  { id: 2, company_name: 'مورد الاختبار الثاني', is_active: true },
  { id: 3, company_name: 'مورد الاختبار الثالث', is_active: true },
] as unknown as المورد[];

describe('PurchaseQuotesModal regression', () => {
  it('opens and closes repeatedly without changing hook order or rendering 500', () => {
    const { rerender } = render(
      <PurchaseQuotesModal
        isOpen={false}
        request={null}
        suppliers={suppliers}
        onClose={() => undefined}
        onSuccess={() => undefined}
      />,
    );

    rerender(
      <PurchaseQuotesModal
        isOpen
        request={request}
        suppliers={suppliers}
        onClose={() => undefined}
        onSuccess={() => undefined}
      />,
    );
    expect(screen.getByRole('dialog', { name: 'تجهيز عروض الأسعار' })).toBeInTheDocument();
    expect(screen.getByText('تجهيز عروض الأسعار — TEST-QUOTE-501')).toBeInTheDocument();

    rerender(
      <PurchaseQuotesModal
        isOpen={false}
        request={null}
        suppliers={suppliers}
        onClose={() => undefined}
        onSuccess={() => undefined}
      />,
    );
    expect(screen.queryByRole('dialog', { name: 'تجهيز عروض الأسعار' })).not.toBeInTheDocument();

    rerender(
      <PurchaseQuotesModal
        isOpen
        request={request}
        suppliers={suppliers}
        onClose={() => undefined}
        onSuccess={() => undefined}
      />,
    );
    expect(screen.getByRole('dialog', { name: 'تجهيز عروض الأسعار' })).toBeInTheDocument();
  });
});
