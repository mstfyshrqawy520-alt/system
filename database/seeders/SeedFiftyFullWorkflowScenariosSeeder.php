<?php

namespace Database\Seeders;

use App\Models\ApprovalHistory;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Item;
use App\Models\Notification;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\PurchaseReceipt;
use App\Models\PurchaseReceiptItem;
use App\Models\PurchaseRequest;
use App\Models\PurchaseRequestItem;
use App\Models\PurchaseRequestQuote;
use App\Models\PurchaseRequestQuoteRecommendation;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\SupplierInvoice;
use App\Models\SupplierPayment;
use App\Models\SupplierPaymentAllocation;
use App\Models\SystemEvent;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class SeedFiftyFullWorkflowScenariosSeeder extends Seeder
{
    private const MARKER = 'SEED-50-FULL-WORKFLOW';
    private const NOTIFICATION_TYPE = 'DEMO_50_FULL_WORKFLOW';
    private const COUNT = 50;

    public function run(): void
    {
        DB::transaction(function (): void {
            $this->removePreviousScenarios();

            $departments = Department::where('is_active', true)->orderBy('id')->get()->values();
            $suppliers = Supplier::where('is_active', true)->orderBy('id')->get()->values();
            $items = Item::where('is_active', true)->orderBy('id')->get()->values();

            if ($departments->isEmpty() || $suppliers->count() < 5 || $items->count() < 10) {
                throw new \RuntimeException('بيانات الأقسام أو الموردين أو الأصناف غير كافية لتوليد السيناريوهات التجريبية.');
            }

            $employees = $this->ensureDemoUsers('employee', 'demo.employee', 'موظف تجريبي', 10, $departments);
            $reviewers = $this->ensureDemoUsers('reviewer', 'demo.reviewer', 'مراجع تجريبي', 10, $departments);
            $procurementManager = User::whereHas('roles', fn ($query) => $query->where('slug', 'procurement_manager'))->where('is_active', true)->firstOrFail();
            $accountants = User::whereHas('roles', fn ($query) => $query->where('slug', 'accountant'))->where('is_active', true)->orderBy('id')->get()->values();
            $generalManagers = User::whereHas('roles', fn ($query) => $query->where('slug', 'general_manager'))->where('is_active', true)->orderBy('id')->get()->values();
            $warehouseKeeper = User::whereHas('roles', fn ($query) => $query->where('slug', 'warehouse_keeper'))->where('is_active', true)->first();
            $siteEngineers = User::whereHas('roles', fn ($query) => $query->where('slug', 'site_engineer'))->where('is_active', true)->orderBy('id')->get()->values();

            if ($accountants->isEmpty() || $generalManagers->isEmpty() || ! $warehouseKeeper || $siteEngineers->isEmpty()) {
                throw new \RuntimeException('حسابات الحسابات أو المدير التنفيذي أو المخزن أو مهندس الموقع غير مكتملة.');
            }

            $year = now()->year;
            $paymentTerms = ['دفع عند الاستلام', 'دفع بعد التوريد', 'تحويل بنكي بعد المطابقة', 'دفعة مرحلية حسب الاستلام'];
            $poStatuses = ['ISSUED', 'PENDING_ACCOUNTING_REVIEW', 'APPROVED_BY_ACCOUNTING', 'RETURNED_TO_PROCUREMENT', 'PO_DRAFT'];
            $requestStatuses = ['PENDING_PROCUREMENT_APPROVAL', 'PENDING_QUOTE_RECOMMENDATIONS', 'PENDING_EXECUTIVE_QUOTE_DECISION', 'APPROVED_BY_PROCUREMENT', 'REJECTED', 'UNDER_REVIEW', 'SUBMITTED', 'DRAFT'];

            for ($scenario = 0; $scenario < self::COUNT; $scenario++) {
                $employee = $employees[$scenario % $employees->count()];
                $department = $departments[$scenario % $departments->count()];
                $reviewer = $reviewers[($scenario * 3) % $reviewers->count()];
                $accountant = $accountants[$scenario % $accountants->count()];
                $generalManager = $generalManagers[$scenario % $generalManagers->count()];
                $siteEngineer = $siteEngineers[$scenario % $siteEngineers->count()];
                $supplier = $suppliers[($scenario * 7 + 2) % $suppliers->count()];
                $createdAt = Carbon::now()->subDays(60 - ($scenario % 60))->subHours($scenario % 12);
                $status = $requestStatuses[$scenario % count($requestStatuses)];
                $hasQuotes = $scenario < 24;
                $hasPurchaseOrder = $scenario < 35;
                $requestItems = [];
                $itemCount = 1 + ($scenario % 3);
                $estimatedTotal = 0.0;

                for ($line = 0; $line < $itemCount; $line++) {
                    $item = $items[($scenario * 11 + $line * 17) % $items->count()];
                    $quantity = 2 + (($scenario * 5 + $line * 7) % 25);
                    $estimatedUnitPrice = round(180 + (($scenario * 97 + $line * 41) % 3800), 2);
                    $estimatedTotal += $quantity * $estimatedUnitPrice;
                    $requestItems[] = compact('item', 'quantity', 'estimatedUnitPrice');
                }

                // Scenarios 0-9 are full quote flows; 20-34 are direct/PO flows.
                if ($scenario < 10) {
                    $status = 'APPROVED_BY_PROCUREMENT';
                } elseif ($scenario < 15) {
                    $status = 'PENDING_EXECUTIVE_QUOTE_DECISION';
                } elseif ($scenario < 20) {
                    $status = 'PENDING_QUOTE_RECOMMENDATIONS';
                } elseif ($scenario < 25) {
                    $status = 'APPROVED_BY_PROCUREMENT';
                }

                $pr = PurchaseRequest::create([
                    'request_number' => sprintf('PR-%s-D50-%03d', $year, $scenario + 1),
                    'user_id' => $employee->id,
                    'department_id' => $department->id,
                    'reviewer_user_id' => $reviewer->id,
                    'site_engineer_user_id' => $siteEngineer->id,
                    'priority' => ['LOW', 'NORMAL', 'HIGH', 'URGENT'][$scenario % 4],
                    'status' => $status,
                    'total_estimated_cost' => round($estimatedTotal, 2),
                    'date_needed' => $createdAt->copy()->addDays(5 + ($scenario % 20))->toDateString(),
                    'notes' => sprintf('%s | سيناريو %d من 50', self::MARKER, $scenario + 1),
                    'submitted_at' => $createdAt->copy()->addHours(2),
                ]);
                $pr->created_at = $createdAt;
                $pr->updated_at = $createdAt->copy()->addHours(2 + ($scenario % 15));
                $pr->saveQuietly();

                foreach ($requestItems as $requestItemIndex => &$requestItem) {
                    $prItem = PurchaseRequestItem::create([
                        'purchase_request_id' => $pr->id,
                        'item_id' => $requestItem['item']->id,
                        'item_description' => $requestItem['item']->name,
                        'item_reference' => sprintf('PLT-%02d-%03d', ($scenario % 20) + 1, $requestItem['item']->id),
                        'region' => 'المنطقة ' . (($scenario + $requestItem['item']->id) % 12 + 1),
                        'quantity' => $requestItem['quantity'],
                        'uom' => $requestItem['item']->uom,
                        'estimated_unit_price' => $requestItem['estimatedUnitPrice'],
                        'estimated_line_total' => round($requestItem['quantity'] * $requestItem['estimatedUnitPrice'], 2),
                        'specifications' => 'بيانات تجريبية لتغطية دورة المشتريات.',
                        'notes' => self::MARKER,
                    ]);
                    $requestItem['prItem'] = $prItem;
                }
                unset($requestItem);

                $this->addRequestHistory($pr, $employee, 'CREATED', null, 'DRAFT', 'أنشأ الموظف طلب الشراء.');
                if ($status !== 'DRAFT') {
                    $this->addRequestHistory($pr, $employee, 'SUBMITTED', 'DRAFT', 'SUBMITTED', 'أرسل الموظف طلب الشراء للمراجعة.');
                }
                if (! in_array($status, ['DRAFT', 'SUBMITTED'], true)) {
                    $this->addRequestHistory($pr, $reviewer, 'REVIEW_STARTED', 'SUBMITTED', 'UNDER_REVIEW', 'بدأ المراجع مراجعة الطلب.');
                    $this->addRequestHistory($pr, $reviewer, 'APPROVED_BY_REVIEWER', 'UNDER_REVIEW', 'PENDING_EXECUTIVE_APPROVAL', 'اعتمد المراجع الطلب وأرسله للمدير التنفيذي.');
                }
                if (in_array($status, ['APPROVED_BY_PROCUREMENT', 'PENDING_QUOTE_RECOMMENDATIONS', 'PENDING_EXECUTIVE_QUOTE_DECISION'], true)) {
                    $this->addRequestHistory($pr, $procurementManager, 'APPROVED_BY_PROCUREMENT', 'PENDING_PROCUREMENT_APPROVAL', $status, 'نفذ مدير المشتريات قرار مسار الطلب.');
                }
                if ($status === 'REJECTED') {
                    $pr->rejection_reason = 'رفض تجريبي لتغطية سيناريو الرفض المالي أو الإداري.';
                    $pr->saveQuietly();
                    $this->addRequestHistory($pr, $generalManager, 'REJECTED_BY_EXECUTIVE', 'PENDING_EXECUTIVE_APPROVAL', 'REJECTED', 'رفض المدير التنفيذي الطلب في سيناريو تجريبي.');
                }

                $selectedQuote = null;
                if ($hasQuotes) {
                    $quoteCount = 2 + ($scenario % 3);
                    for ($quoteIndex = 0; $quoteIndex < $quoteCount; $quoteIndex++) {
                        $quoteSupplier = $suppliers[($scenario * 5 + $quoteIndex + 1) % $suppliers->count()];
                        $unitPrice = round(160 + (($scenario * 73 + $quoteIndex * 211) % 4200), 2);
                        $quoteTotal = round($unitPrice * collect($requestItems)->sum('quantity'), 2);
                        $quoteStatus = 'SUBMITTED';
                        if ($scenario < 10) {
                            $quoteStatus = $quoteIndex === ($scenario % $quoteCount) ? 'SELECTED' : 'REJECTED';
                        }
                        $quote = PurchaseRequestQuote::create([
                            'purchase_request_id' => $pr->id,
                            'supplier_id' => $quoteSupplier->id,
                            'created_by_user_id' => $procurementManager->id,
                            'unit_price' => $unitPrice,
                            'total_amount' => $quoteTotal,
                            'currency' => 'EGP',
                            'notes' => self::MARKER . ' | عرض تجريبي من مورد مختلف',
                            'status' => $quoteStatus,
                            'selected_at' => $quoteStatus === 'SELECTED' ? $createdAt->copy()->addDays(4) : null,
                        ]);
                        if ($quoteStatus === 'SELECTED') {
                            $selectedQuote = $quote;
                        }
                        if ($scenario >= 10 && $scenario < 20) {
                            PurchaseRequestQuoteRecommendation::create([
                                'purchase_request_quote_id' => $quote->id,
                                'user_id' => $accountant->id,
                                'role_type' => 'ACCOUNTING',
                                'decision' => $quoteIndex % 2 === 0 ? 'RECOMMEND' : 'REJECT',
                                'comment' => 'ترشيح حسابات تجريبي للمقارنة المالية.',
                            ]);
                            PurchaseRequestQuoteRecommendation::create([
                                'purchase_request_quote_id' => $quote->id,
                                'user_id' => $department->manager?->id ?: $reviewer->id,
                                'role_type' => 'DEPARTMENT',
                                'decision' => $quoteIndex % 2 === 1 ? 'RECOMMEND' : 'REJECT',
                                'comment' => 'ترشيح القسم تجريبي حسب احتياج الموقع.',
                            ]);
                        }
                    }
                    if ($selectedQuote) {
                        $pr->selected_quote_id = $selectedQuote->id;
                        $pr->saveQuietly();
                        $this->addRequestHistory($pr, $generalManager, 'EXECUTIVE_SELECTED_QUOTE', 'PENDING_EXECUTIVE_QUOTE_DECISION', 'APPROVED_BY_PROCUREMENT', 'اختار المدير التنفيذي العرض في سيناريو تجريبي.');
                    }
                }

                $po = null;
                if ($hasPurchaseOrder) {
                    $poStatus = $poStatuses[$scenario % count($poStatuses)];
                    if ($scenario < 10) $poStatus = 'APPROVED_BY_ACCOUNTING';
                    $po = PurchaseOrder::create([
                        'po_number' => sprintf('PO-%s-D50-%03d', $year, $scenario + 1),
                        'purchase_request_id' => $pr->id,
                        'selected_quote_id' => $selectedQuote?->id,
                        'supplier_id' => $selectedQuote?->supplier_id ?: $supplier->id,
                        'created_by_user_id' => $procurementManager->id,
                        'status' => $poStatus,
                        'payment_terms' => $paymentTerms[$scenario % count($paymentTerms)],
                        'delivery_terms' => 'التوريد إلى موقع المشروع المحدد في الطلب.',
                        'delivery_date' => $createdAt->copy()->addDays(10 + ($scenario % 20))->toDateString(),
                        'delivery_status' => $scenario < 10 ? 'DELIVERED' : ($scenario % 3 === 0 ? 'PARTIAL' : 'NOT_STARTED'),
                        'actual_delivery_date' => $scenario < 10 ? $createdAt->copy()->addDays(12)->toDateString() : null,
                        'budget_code' => sprintf('EGP-D50-%03d', $scenario + 1),
                        'financial_notes' => 'جنيه مصري EGP بدون VAT أو ضريبة أو خصم.',
                        'notes' => sprintf('%s | PO للسيناريو %d', self::MARKER, $scenario + 1),
                    ]);
                    $po->created_at = $createdAt->copy()->addHours(8);
                    $po->updated_at = $createdAt->copy()->addDays(1);
                    $po->saveQuietly();

                    $subtotal = 0.0;
                    foreach ($requestItems as $requestItem) {
                        $unitPrice = $selectedQuote ? (float) $selectedQuote->unit_price : round(220 + (($scenario * 83) % 3500), 2);
                        $lineTotal = round($requestItem['quantity'] * $unitPrice, 2);
                        $subtotal += $lineTotal;
                        $po->items()->create([
                            'pr_item_id' => $requestItem['prItem']->id,
                            'item_id' => $requestItem['item']->id,
                            'item_description' => $requestItem['item']->name,
                            'item_reference' => $requestItem['prItem']->item_reference,
                            'region' => $requestItem['prItem']->region,
                            'quantity' => $requestItem['quantity'],
                            'uom' => $requestItem['item']->uom,
                            'unit_price' => $unitPrice,
                            'line_total' => $lineTotal,
                            'specifications' => 'بند تجريبي مرتبط بالطلب ورقم قطعة الأرض.',
                        ]);
                    }
                    $po->subtotal = round($subtotal, 2);
                    $po->grand_total = round($subtotal, 2);
                    $po->saveQuietly();
                    $this->addOrderHistory($po, $procurementManager, 'PO_CREATED', 'APPROVED_BY_PROCUREMENT', 'PO_DRAFT', 'أنشأ مدير المشتريات أمر الشراء.');
                    $this->addOrderHistory($po, $procurementManager, 'PO_ISSUED', 'PO_DRAFT', 'ISSUED', 'أصدر مدير المشتريات أمر الشراء للحسابات.');
                    if (in_array($poStatus, ['APPROVED_BY_ACCOUNTING', 'RETURNED_TO_PROCUREMENT'], true)) {
                        $this->addOrderHistory($po, $accountant, $poStatus === 'APPROVED_BY_ACCOUNTING' ? 'ACCOUNTING_APPROVED' : 'ACCOUNTING_RETURNED', 'ISSUED', $poStatus, $poStatus === 'APPROVED_BY_ACCOUNTING' ? 'اعتمدت الحسابات أمر الشراء.' : 'أعادت الحسابات أمر الشراء للتعديل.');
                    }
                    $this->addNotification($accountant, $po, 'أمر شراء تجريبي جاهز للحسابات', "أمر الشراء {$po->po_number} جاهز للمراجعة المالية.");

                    if ($scenario < 20 || ($scenario >= 20 && $scenario < 25)) {
                        $receipt = $this->createReceipt($pr, $po, $warehouseKeeper, $siteEngineer, $requestItems, $scenario, $createdAt);
                        if ($receipt->status === 'APPROVED' && $scenario < 10) {
                            $paidAmount = $scenario % 3 === 0
                                ? round((float) $po->grand_total, 2)
                                : ($scenario % 3 === 1 ? round((float) $po->grand_total * 0.5, 2) : 0.0);
                            $invoice = SupplierInvoice::create([
                                'supplier_id' => $po->supplier_id,
                                'purchase_order_id' => $po->id,
                                'purchase_receipt_id' => $receipt->id,
                                'created_by_user_id' => $accountant->id,
                                'invoice_number' => sprintf('INV-%s-D50-%03d', $year, $scenario + 1),
                                'amount' => $po->grand_total,
                                'invoice_date' => $createdAt->copy()->addDays(15)->toDateString(),
                                'due_date' => $createdAt->copy()->addDays(45)->toDateString(),
                                'status' => $scenario % 2 === 0 ? 'MATCHED' : 'DRAFT',
                                'matching_status' => $scenario % 2 === 0 ? 'MATCHED' : 'PENDING',
                                'matched_at' => $scenario % 2 === 0 ? $createdAt->copy()->addDays(16) : null,
                                'matched_by_user_id' => $scenario % 2 === 0 ? $accountant->id : null,
                                'paid_amount' => $paidAmount,
                                'outstanding_amount' => round((float) $po->grand_total - $paidAmount, 2),
                                'matching_notes' => self::MARKER . ' | مطابقة PO وGRN تجريبية.',
                                'notes' => 'فاتورة مورد تجريبية مرتبطة بأمر الشراء وإذن الاستلام.',
                            ]);
                            $this->addInvoiceHistory($invoice, $accountant, 'SUPPLIER_INVOICE_CREATED', 'أنشأت الحسابات فاتورة المورد.');
                            if ($invoice->paid_amount > 0) {
                                $payment = SupplierPayment::create([
                                    'supplier_id' => $po->supplier_id,
                                    'accountant_user_id' => $accountant->id,
                                    'payment_number' => sprintf('PAY-%s-D50-%03d', $year, $scenario + 1),
                                    'amount' => $invoice->paid_amount,
                                    'payment_date' => $createdAt->copy()->addDays(20)->toDateString(),
                                    'payment_method' => $scenario % 2 === 0 ? 'تحويل بنكي' : 'شيك',
                                    'reference_number' => sprintf('REF-D50-%03d', $scenario + 1),
                                    'allocated_amount' => $invoice->paid_amount,
                                    'overpayment_amount' => 0,
                                    'notes' => self::MARKER . ' | دفعة تجريبية.',
                                ]);
                                SupplierPaymentAllocation::create(['supplier_payment_id' => $payment->id, 'supplier_invoice_id' => $invoice->id, 'amount' => $invoice->paid_amount]);
                                $this->addInvoiceHistory($invoice, $accountant, 'SUPPLIER_PAYMENT_CREATED', 'سجلت الحسابات دفعة للمورد وربطتها بالفاتورة.');
                            }
                        }
                    }
                }

                $this->addScenarioEvent($pr, $employee, 'scenario.created', 'إنشاء الطلب التجريبي.');
                $this->addScenarioEvent($pr, $reviewer, 'scenario.reviewed', 'مراجعة الطلب التجريبي.');
                $this->addScenarioEvent($pr, $procurementManager, 'scenario.procurement_action', 'إجراء مدير المشتريات في السيناريو التجريبي.');
                $this->addScenarioEvent($pr, $accountant, 'scenario.accounting_action', 'إجراء الحسابات في السيناريو التجريبي.');
                $this->addScenarioEvent($pr, $generalManager, 'scenario.executive_action', 'إجراء المدير التنفيذي في السيناريو التجريبي.');
                $this->addScenarioEvent($pr, $warehouseKeeper, 'scenario.warehouse_action', 'متابعة أمين المخزن للسيناريو التجريبي.');
                $this->addScenarioEvent($pr, $siteEngineer, 'scenario.site_engineer_action', 'متابعة مهندس الموقع للسيناريو التجريبي.');
            }
        });

        $this->command?->info('تم إنشاء 50 سيناريو تجريبي متنوع لدورة المشتريات.');
    }

    private function ensureDemoUsers(string $role, string $emailPrefix, string $namePrefix, int $count, $departments)
    {
        $users = User::whereHas('roles', fn ($query) => $query->where('slug', $role))->where('is_active', true)->orderBy('id')->get()->values();
        for ($index = $users->count(); $index < $count; $index++) {
            $user = User::updateOrCreate(
                ['email' => sprintf('%s.%02d@ashbiliya.com', $emailPrefix, $index + 1)],
                [
                    'name' => sprintf('%s %02d', $namePrefix, $index + 1),
                    'password' => Hash::make('123456'),
                    'department_id' => $departments[$index % $departments->count()]->id,
                    'is_active' => true,
                ]
            );
            $roleModel = Role::where('slug', $role)->firstOrFail();
            $user->roles()->sync([$roleModel->id]);
            $users->push($user);
        }
        return $users;
    }

    private function createReceipt(PurchaseRequest $pr, PurchaseOrder $po, User $warehouseKeeper, User $siteEngineer, array $requestItems, int $scenario, Carbon $createdAt): PurchaseReceipt
    {
        $receiptStatus = $scenario % 5 === 0 ? 'PENDING_WAREHOUSE' : ($scenario % 5 === 1 ? 'PENDING_SITE_ENGINEER' : 'APPROVED');
        $receipt = PurchaseReceipt::create([
            'purchase_order_id' => $po->id,
            'purchase_request_id' => $pr->id,
            'warehouse_keeper_user_id' => $warehouseKeeper->id,
            'site_engineer_user_id' => $siteEngineer->id,
            'receipt_number' => sprintf('GRN-%s-D50-%03d', $createdAt->year, $scenario + 1),
            'status' => $receiptStatus,
            'received_at' => $createdAt->copy()->addDays(13)->toDateString(),
            'warehouse_submitted_at' => $createdAt->copy()->addDays(14),
            'site_engineer_approved_at' => $receiptStatus === 'APPROVED' ? $createdAt->copy()->addDays(15) : null,
            'warehouse_notes' => 'استلام مخزني تجريبي ومراجعة الكميات.',
            'site_engineer_notes' => $receiptStatus === 'APPROVED' ? 'اعتماد مهندس الموقع تجريبي.' : null,
        ]);
        foreach ($po->items as $poItem) {
            PurchaseReceiptItem::create([
                'purchase_receipt_id' => $receipt->id,
                'purchase_order_item_id' => $poItem->id,
                'ordered_quantity' => $poItem->quantity,
                'received_quantity' => $receiptStatus === 'APPROVED' ? $poItem->quantity : max(1, (float) $poItem->quantity - 1),
                'notes' => self::MARKER,
            ]);
        }
        $this->addReceiptHistory($receipt, $warehouseKeeper, 'RECEIPT_CREATED', 'أنشأ أمين المخزن إذن الاستلام.');
        $this->addReceiptHistory($receipt, $warehouseKeeper, 'WAREHOUSE_SUBMITTED', 'اعتمد أمين المخزن الاستلام وأرسله لمهندس الموقع.');
        if ($receiptStatus === 'APPROVED') {
            $this->addReceiptHistory($receipt, $siteEngineer, 'SITE_ENGINEER_RECEIPT_APPROVED', 'اعتمد مهندس الموقع إذن الاستلام.');
        }
        return $receipt;
    }

    private function addRequestHistory(PurchaseRequest $request, User $actor, string $action, ?string $from, string $to, string $comments): void
    {
        ApprovalHistory::create(['target_type' => PurchaseRequest::class, 'target_id' => $request->id, 'actor_user_id' => $actor->id, 'action' => $action, 'from_state' => $from, 'to_state' => $to, 'comments' => self::MARKER . ' | ' . $comments]);
        $this->addAudit($actor, PurchaseRequest::class, $request->id, $action, $from, $to);
    }

    private function addOrderHistory(PurchaseOrder $order, User $actor, string $action, string $from, string $to, string $comments): void
    {
        ApprovalHistory::create(['target_type' => PurchaseOrder::class, 'target_id' => $order->id, 'actor_user_id' => $actor->id, 'action' => $action, 'from_state' => $from, 'to_state' => $to, 'comments' => self::MARKER . ' | ' . $comments]);
        $this->addAudit($actor, PurchaseOrder::class, $order->id, $action, $from, $to);
    }

    private function addReceiptHistory(PurchaseReceipt $receipt, User $actor, string $action, string $comments): void
    {
        ApprovalHistory::create(['target_type' => PurchaseReceipt::class, 'target_id' => $receipt->id, 'actor_user_id' => $actor->id, 'action' => $action, 'from_state' => null, 'to_state' => $receipt->status, 'comments' => self::MARKER . ' | ' . $comments]);
        $this->addAudit($actor, PurchaseReceipt::class, $receipt->id, $action, null, $receipt->status);
    }

    private function addInvoiceHistory(SupplierInvoice $invoice, User $actor, string $action, string $comments): void
    {
        $this->addAudit($actor, SupplierInvoice::class, $invoice->id, $action, null, $comments);
    }

    private function addAudit(User $actor, string $entityType, int $entityId, string $action, ?string $oldValue, ?string $newValue): void
    {
        AuditLog::create(['user_id' => $actor->id, 'entity_type' => $entityType, 'entity_id' => $entityId, 'action' => $action, 'field_name' => 'status', 'old_value' => $oldValue, 'new_value' => self::MARKER . ' | ' . ($newValue ?? '')]);
    }

    private function addScenarioEvent(Model $entity, User $actor, string $eventType, string $description): void
    {
        SystemEvent::create(['actor_user_id' => $actor->id, 'event_type' => $eventType, 'action' => strtoupper($eventType), 'entity_type' => get_class($entity), 'entity_id' => $entity->id, 'entity_label' => $entity->getKey(), 'from_state' => null, 'to_state' => null, 'description' => self::MARKER . ' | ' . $description, 'metadata' => ['scenario_seed' => self::MARKER], 'occurred_at' => now()]);
    }

    private function addNotification(User $recipient, PurchaseOrder $order, string $title, string $message): void
    {
        Notification::create(['user_id' => $recipient->id, 'type' => self::NOTIFICATION_TYPE, 'title' => $title, 'message' => self::MARKER . ' | ' . $message, 'notifiable_type' => PurchaseOrder::class, 'notifiable_id' => $order->id, 'read_at' => null]);
    }

    private function removePreviousScenarios(): void
    {
        $requestIds = PurchaseRequest::withTrashed()->where('notes', 'like', self::MARKER . '%')->pluck('id');
        $orderIds = PurchaseOrder::withTrashed()
            ->where(function ($query) use ($requestIds) {
                $query->where('notes', 'like', self::MARKER . '%')->orWhereIn('purchase_request_id', $requestIds);
            })
            ->pluck('id');
        $receiptIds = PurchaseReceipt::whereIn('purchase_order_id', $orderIds)->pluck('id');
        $invoiceIds = SupplierInvoice::whereIn('purchase_order_id', $orderIds)->pluck('id');
        $paymentIds = SupplierPayment::where('notes', 'like', self::MARKER . '%')->pluck('id');

        SupplierPaymentAllocation::whereIn('supplier_payment_id', $paymentIds)->delete();
        SupplierPaymentAllocation::whereIn('supplier_invoice_id', $invoiceIds)->delete();
        SupplierPayment::whereIn('id', $paymentIds)->delete();
        SupplierInvoice::whereIn('id', $invoiceIds)->delete();
        PurchaseReceiptItem::whereIn('purchase_receipt_id', $receiptIds)->delete();
        ApprovalHistory::where('target_type', PurchaseReceipt::class)->whereIn('target_id', $receiptIds)->delete();
        AuditLog::where('entity_type', PurchaseReceipt::class)->whereIn('entity_id', $receiptIds)->delete();
        PurchaseReceipt::whereIn('id', $receiptIds)->delete();
        PurchaseRequestQuoteRecommendation::whereIn('purchase_request_quote_id', PurchaseRequestQuote::whereIn('purchase_request_id', $requestIds)->pluck('id'))->delete();
        PurchaseRequestQuote::whereIn('purchase_request_id', $requestIds)->delete();
        Notification::where('type', self::NOTIFICATION_TYPE)->delete();
        ApprovalHistory::whereIn('target_type', [PurchaseRequest::class, PurchaseOrder::class])->whereIn('target_id', $requestIds->merge($orderIds))->delete();
        AuditLog::whereIn('entity_type', [PurchaseRequest::class, PurchaseOrder::class])->whereIn('entity_id', $requestIds->merge($orderIds))->delete();
        SystemEvent::where('description', 'like', '%' . self::MARKER . '%')->delete();
        PurchaseOrderItem::whereIn('purchase_order_id', $orderIds)->delete();
        PurchaseOrder::withTrashed()->whereIn('id', $orderIds)->forceDelete();
        PurchaseRequestItem::whereIn('purchase_request_id', $requestIds)->delete();
        PurchaseRequest::withTrashed()->whereIn('id', $requestIds)->forceDelete();
    }
}
