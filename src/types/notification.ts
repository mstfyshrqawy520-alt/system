export type NotificationCategory = 'ACTION_REQUIRED' | 'INFORMATIONAL' | 'ARCHIVE';
export type NotificationActionExecutionStatus = 'idle' | 'executing' | 'success' | 'failed' | 'resolved';

export interface NotificationData {
  id?: number;
  purchase_request_id?: number;
  purchase_order_id?: number;
  purchase_receipt_id?: number;
  supplier_id?: number;
  invoice_id?: number;
  quote_id?: number;
  land_parcel_id?: number;
  parcel_id?: number;
  pr_number?: string;
  po_number?: string;
  status?: string;
  amount?: number | string;
  department_name?: string;
  requester_name?: string;
  supplier_name?: string;
  reason?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  action_type?: string;
  target_url?: string;
  [key: string]: any;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  notifiable_type?: string | null;
  notifiable_id?: number | null;
  data?: NotificationData;
  read_at: string | null;
  created_at: string | null;
  resolved_at?: string | null;
}
