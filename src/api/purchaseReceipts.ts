import apiClient from './client';

export interface ReceiptOrderItem {
  id: number;
  item_description: string;
  item_reference?: string | null;
  region?: string | null;
  quantity: string | number;
  uom?: string | null;
  unit_price?: string | number | null;
  item?: { id: number; name: string; sku?: string } | null;
}

export interface ReceiptPurchaseOrder {
  id: number;
  po_number: string;
  created_at?: string | null;
  supplier?: { id: number; company_name: string } | null;
  purchase_request?: { request_number: string; created_at?: string | null; requester?: { name: string } | null; department?: { name: string } | null } | null;
  items?: ReceiptOrderItem[];
}

export interface ReceiptRecord {
  id: number;
  receipt_number: string;
  status: string;
  created_at?: string | null;
  received_at?: string | null;
  warehouse_notes?: string | null;
  site_engineer_notes?: string | null;
  purchase_order?: ReceiptPurchaseOrder | null;
  items?: Array<{ id: number; received_quantity: string | number; ordered_quantity: string | number; purchase_order_item?: ReceiptOrderItem | null }>;
}

export const getWarehouseReceiptQueueApi = async (): Promise<ReceiptPurchaseOrder[]> =>
  (await apiClient.get<{ data: ReceiptPurchaseOrder[] }>('/purchase-receipts/warehouse-queue')).data.data;

export const getAssignedReceiptsApi = async (): Promise<ReceiptRecord[]> =>
  (await apiClient.get<{ data: ReceiptRecord[] }>('/purchase-receipts/assigned')).data.data;

export const getPurchaseReceiptByIdApi = async (receiptId: number): Promise<ReceiptRecord> =>
  (await apiClient.get<{ data: ReceiptRecord }>(`/purchase-receipts/${receiptId}`)).data.data;

export const createPurchaseReceiptApi = async (
  purchaseOrderId: number,
  payload: { received_at?: string; warehouse_notes?: string; items: Array<{ purchase_order_item_id: number; received_quantity: number; notes?: string }> },
): Promise<ReceiptRecord> =>
  (await apiClient.post<{ data: ReceiptRecord }>(`/purchase-receipts/purchase-orders/${purchaseOrderId}`, payload)).data.data;

export const updatePurchaseReceiptApi = async (
  receiptId: number,
  payload: { site_engineer_notes?: string; items: Array<{ id: number; received_quantity: number; notes?: string }> },
): Promise<ReceiptRecord> =>
  (await apiClient.put<{ data: ReceiptRecord }>(`/purchase-receipts/${receiptId}`, payload)).data.data;

export const approvePurchaseReceiptApi = async (receiptId: number, site_engineer_notes?: string): Promise<ReceiptRecord> =>
  (await apiClient.post<{ data: ReceiptRecord }>(`/purchase-receipts/${receiptId}/approve`, { site_engineer_notes })).data.data;
