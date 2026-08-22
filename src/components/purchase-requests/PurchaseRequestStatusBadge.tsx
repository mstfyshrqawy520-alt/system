import React from 'react';
import { PurchaseRequestStatus } from '../../types/purchaseRequest';
import { StatusBadge } from '../ui/StatusBadge';

interface Props {
  status: PurchaseRequestStatus | string;
  showEnglish?: boolean;
  className?: string;
}

export const PurchaseRequestStatusBadge: React.FC<Props> = ({ status, showEnglish = false, className }) => {
  return <StatusBadge status={status} showEnglish={showEnglish} className={className} />;
};

export default PurchaseRequestStatusBadge;
