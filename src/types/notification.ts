export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  notifiable_type?: string | null;
  notifiable_id?: number | null;
  data?: {
    id?: number;
    purchase_request_id?: number;
    purchase_order_id?: number;
    purchase_receipt_id?: number;
  };
  read_at: string | null;
  created_at: string | null;
}
