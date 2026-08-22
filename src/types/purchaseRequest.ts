export interface ReviewerOption {
  id: number;
  name: string;
  email?: string;
  is_department_manager?: boolean;
  department_id?: number;
  department_name?: string;
}

export type PurchaseRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'PENDING_EXECUTIVE_APPROVAL'
  | 'PENDING_PROCUREMENT_APPROVAL'
  | 'PENDING_ACCOUNTING_APPROVAL'
  | 'APPROVED_BY_ACCOUNTING'
  | 'PENDING_QUOTE_RECOMMENDATIONS'
  | 'PENDING_EXECUTIVE_QUOTE_DECISION'
  | 'APPROVED_BY_REVIEWER'
  | 'APPROVED_BY_PROCUREMENT'
  | 'REJECTED';

export type PurchaseRequestPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

/** Human-readable Arabic+English status labels */
export const PR_STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  DRAFT: 'مسودة',
  SUBMITTED: 'تم الإرسال',
  UNDER_REVIEW: 'قيد المراجعة',
  PENDING_EXECUTIVE_APPROVAL: 'بانتظار قرار المدير التنفيذي',
  PENDING_PROCUREMENT_APPROVAL: 'بانتظار اعتماد المشتريات',
  PENDING_ACCOUNTING_APPROVAL: 'بانتظار الموافقة المالية',
  APPROVED_BY_ACCOUNTING: 'معتمد ماليًا — جاهز للمشتريات',
  PENDING_QUOTE_RECOMMENDATIONS: 'بانتظار إعداد عروض الأسعار',
  PENDING_EXECUTIVE_QUOTE_DECISION: 'بانتظار قرار العروض',
  APPROVED_BY_REVIEWER: 'معتمد من المراجع',
  APPROVED_BY_PROCUREMENT: 'معتمد من المشتريات',
  REJECTED: 'مرفوض',
};

/** Human-readable Arabic+English approval action labels */
export const PR_ACTION_LABELS: Record<string, string> = {
  CREATED: 'تم إنشاء الطلب',
  SUBMITTED: 'تم إرسال الطلب للمراجعة',
  REVIEW_STARTED: 'بدأ المراجع المراجعة',
  HEADER_UPDATED: 'تم تعديل بيانات الطلب',
  ITEM_UPDATED: 'تم تعديل بند',
  ITEM_ADDED: 'تم إضافة بند',
  ITEM_REMOVED: 'تم حذف بند',
  APPROVED_BY_REVIEWER: 'تم اعتماد المراجع وإرساله للمدير التنفيذي',
  APPROVED_BY_EXECUTIVE: 'تم اعتماد المدير التنفيذي وإرساله للمشتريات',
  THREE_QUOTES_REQUIRED: 'بدأ تجهيز عروض الأسعار',
  THREE_QUOTES_SUBMITTED: 'تم إرسال عروض الأسعار للترشيح',
  EXECUTIVE_SELECTED_QUOTE: 'اختار المدير التنفيذي العرض',
  EXECUTIVE_REJECTED_QUOTES: 'رفض المدير التنفيذي العروض',
  DIRECT_PURCHASE_REQUEST_CREATED: 'تم إنشاء طلب شراء مباشر وإرساله للحسابات',
  ACCOUNTING_APPROVED_DIRECT: 'اعتماد الحسابات وإعادة الطلب للمشتريات',
  REJECTED: 'تم رفض الطلب',
};

export const PR_PRIORITY_LABELS: Record<PurchaseRequestPriority, string> = {
  LOW: 'منخفض',
  NORMAL: 'عادي',
  HIGH: 'عالي',
  URGENT: 'عاجل',
};

export interface CatalogItem {
  id: number;
  sku: string;
  name: string;
  uom: string;
  description?: string | null;
  category?: {
    id: number;
    name: string;
  } | null;
}

export interface PurchaseRequestItem {
  id: number;
  item_id?: number | null;
  item?: {
    id: number;
    name: string;
    sku: string;
  } | null;
  item_description: string;
  item_reference?: string | null;
  region?: string | null;
  quantity: string;
  uom?: string | null;
  estimated_unit_price?: string | number | null;
  estimated_line_total?: string | number | null;
  specifications?: string | null;
  notes?: string | null;
}

export interface Attachment {
  id: number;
  file_name: string;
  mime_type: string;
  file_size: number;
  uploaded_by?: string | null;
  created_at?: string | null;
}

export interface PurchaseRequestQuoteRecommendation {
  id: number;
  user_id: number;
  role_type: 'ACCOUNTING' | 'DEPARTMENT';
  decision: 'RECOMMEND' | 'REJECT';
  comment?: string | null;
  user?: { id: number; name: string } | null;
}

export interface PurchaseRequestQuote {
  id: number;
  supplier_id: number;
  supplier?: { id: number; company_name: string } | null;
  unit_price: string;
  total_amount: string;
  currency: string;
  notes?: string | null;
  status: string;
  recommendations?: PurchaseRequestQuoteRecommendation[];
}

export interface DepartmentOption {
  id: number;
  name: string;
  code?: string;
  manager?: { id: number; name: string } | null;
  site_engineer?: { id: number; name: string } | null;
  users_count?: number;
}

export interface PurchaseRequest {
  id: number;
  request_number: string;
  justification?: string | null;
  status: PurchaseRequestStatus;
  procurement_route?: 'UNDECIDED' | 'DIRECT' | 'QUOTES' | string;
  direct_supplier_id?: number | null;
  target_department_id?: number | null;
  direct_supplier?: { id: number; company_name: string; code?: string | null } | null;
  total_estimated_cost?: string | number | null;
  purchase_order_issued?: boolean;
  priority: PurchaseRequestPriority;
  date_needed?: string | null;

  notes?: string | null;
  rejection_reason?: string | null;
  submitted_at?: string | null;
  created_at: string;
  updated_at: string;
  requester?: {
    id: number;
    name: string;
    email?: string;
    role?: string | null;
  };
  requester_role?: string | null;
  is_general_manager_requester?: boolean;
  department?: {
    id: number;
    name: string;
    code?: string;
  };
  target_department?: DepartmentOption | null;
  assigned_reviewer?: {
    id: number;
    name: string;
    email?: string;
    department_id?: number | null;
  } | null;
  site_engineer?: {
    id: number;
    name: string;
    email?: string;
    department_id?: number | null;
  } | null;
  items?: PurchaseRequestItem[];
  approval_history?: ApprovalHistoryEntry[];
  attachments?: Attachment[];
  quotes?: PurchaseRequestQuote[];
  selected_quote?: PurchaseRequestQuote | null;
}

export interface ApprovalHistoryEntry {
  action: string;
  from_state?: string | null;
  to_state?: string | null;
  comments?: string | null;
  created_at?: string | null;
  actor?: { name: string } | null;
}

export interface PurchaseRequestItemFormInput {
  item_id?: number | null;
  item_description: string;
  item_reference?: string;
  region?: string;
  quantity: number | string;
  uom?: string;
  specifications?: string;
  notes?: string;
}

export interface CreatePurchaseRequestPayload {
  target_department_id?: number;
  // Legacy fields are retained for old drafts and API compatibility; new UI resolves them from the department.
  reviewer_user_id?: number;
  site_engineer_user_id?: number;
  priority?: PurchaseRequestPriority;
  date_needed?: string;

  notes?: string;
  items: PurchaseRequestItemFormInput[];
}

export interface UpdatePurchaseRequestPayload {
  target_department_id?: number;
  priority?: PurchaseRequestPriority;
  date_needed?: string;

  notes?: string;
  items?: PurchaseRequestItemFormInput[];
}

