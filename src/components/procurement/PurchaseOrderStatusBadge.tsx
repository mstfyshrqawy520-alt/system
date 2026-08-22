import React from 'react';
import { PurchaseOrderStatus } from '../../types/purchaseOrder';
import { StatusBadge } from '../ui/StatusBadge';

interface Props {
  status: PurchaseOrderStatus | string;
  showEnglish?: boolean;
  className?: string;
}

export const PurchaseOrderStatusBadge: React.FC<Props> = ({ status, showEnglish = false, className }) => {
  return <StatusBadge status={status} showEnglish={showEnglish} className={className} />;
};

export default PurchaseOrderStatusBadge;
