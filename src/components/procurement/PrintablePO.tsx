import React from 'react';
import { PurchaseOrder } from '../../types/purchaseOrder';
import { PurchaseOrderPrintModal } from './PurchaseOrderPrintModal';

interface PrintablePOProps {
  po: PurchaseOrder;
  onClose: () => void;
}

export const PrintablePO: React.FC<PrintablePOProps> = ({ po, onClose }) => {
  return <PurchaseOrderPrintModal po={po} isOpen={true} onClose={onClose} />;
};

export default PrintablePO;
