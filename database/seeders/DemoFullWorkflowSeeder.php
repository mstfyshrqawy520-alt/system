<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\ApprovalHistory;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Item;
use App\Models\LandParcel;
use App\Models\LandParcelTransaction;
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
use App\Models\SupplierBalance;
use App\Models\SupplierInvoice;
use App\Models\SupplierInvoiceLandAllocation;
use App\Models\SupplierPayment;
use App\Models\SupplierPaymentAllocation;
use App\Models\SystemEvent;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Creates linked, browser-friendly demo records without touching non-demo data.
 *
 * Run explicitly with:
 *   php artisan db:seed --class=DemoFullWorkflowSeeder
 */
class DemoFullWorkflowSeeder extends Seeder
{
    private const MARKER = 'TEST-FULL-WORKFLOW';
    private const REQUEST_PREFIX = 'TEST-FULL-PR-';
    private const PO_PREFIX = 'TEST-FULL-PO-';
    private const RECEIPT_PREFIX = 'TEST-FULL-GRN-';
    private const INVOICE_PREFIX = 'TEST-FULL-INV-';
    private const PAYMENT_PREFIX = 'TEST-FULL-PAY-';
    private const PARCEL_PREFIX = 'TEST-FULL-PARCEL-';
    private const SCENARIO_COUNT = 13;

    public function run(): void
    {
        DB::transaction(function (): void {
            $this->removePreviousScenarios();

            $context = $this->loadContext();
            $parcels = $this->createParcels($context['accountant']);

            for ($number = 1; $number <= self::SCENARIO_COUNT; $number++) {
                $scenario = $this->scenarioDefinition($number);
                $this->createScenario($number, $scenario, $context, $parcels);
            }
        });

        $this->command?->info(sprintf(
            'تم إنشاء %d سيناريو مترابط من TEST-FULL-PR-001 إلى TEST-FULL-PR-%03d.',
            self::SCENARIO_COUNT,
            self::SCENARIO_COUNT,
        ));
        $this->command?->info('نقطة البدء: /requests أو /procurement أو /accounting/purchase-requests حسب حالة السيناريو.');
    }

    /** @return array<string, mixed> */
    private function loadContext(): array
    {
        $departments = Department::query()
            ->where('is_active', true)
            ->with(['manager', 'siteEngineer'])
            ->orderBy('id')
            ->get()
            ->values();
        $suppliers = Supplier::query()->where('is_active', true)->orderBy('id')->get()->values();
        $items = Item::query()->where('is_active', true)->orderBy('id')->get()->values();

        if ($departments->isEmpty() || $suppliers->count() < 3 || $items->count() < 3) {
            throw new \RuntimeException('شغّل DemoUserSeeder أولًا؛ نحتاج قسمًا نشطًا و3 موردين و3 أصناف على الأقل.');
        }

        $userForRole = static function (string $role): User {
            return User::query()
                ->where('is_active', true)
                ->whereHas('roles', fn ($query) => $query->where('slug', $role))
                ->orderBy('id')
                ->firstOrFail();
        };

        $accountant = $userForRole('accountant');
        $context = [
            'departments' => $departments,
            'suppliers' => $suppliers,
            'items' => $items,
            'employee' => $userForRole('employee'),
            'reviewer' => $userForRole('reviewer'),
            'procurement' => $userForRole('procurement_manager'),
            'accountant' => $accountant,
            'general_manager' => $userForRole('general_manager'),
            'warehouse' => $userForRole('warehouse_keeper'),
            'site_engineer' => $userForRole('site_engineer'),
        ];

        return $context;
    }

    /** @return array<int, array<string, mixed>> */
    private function scenarioDefinition(int $number): array
    {
        return [
            1 => ['status' => 'DRAFT', 'route' => 'UNDECIDED', 'label' => 'مسودة موظف'],
            2 => ['status' => 'SUBMITTED', 'route' => 'UNDECIDED', 'label' => 'طلب مرسل للمراجعة'],
            3 => ['status' => 'UNDER_REVIEW', 'route' => 'UNDECIDED', 'label' => 'طلب قيد مراجعة القسم'],
            4 => ['status' => 'PENDING_EXECUTIVE_APPROVAL', 'route' => 'UNDECIDED', 'label' => 'طلب بانتظار المدير التنفيذي'],
            5 => ['status' => 'PENDING_PROCUREMENT_APPROVAL', 'route' => 'QUOTES', 'label' => 'طلب بانتظار المشتريات'],
            6 => ['status' => 'PENDING_QUOTE_RECOMMENDATIONS', 'route' => 'QUOTES', 'label' => 'عروض بانتظار الترشيحات'],
            7 => ['status' => 'PENDING_QUOTE_RECOMMENDATIONS', 'route' => 'QUOTES', 'requester' => 'general_manager', 'label' => 'عروض طلب المدير التنفيذي — الحسابات فقط'],
            8 => ['status' => 'PENDING_EXECUTIVE_QUOTE_DECISION', 'route' => 'QUOTES', 'label' => 'عروض بانتظار قرار المدير التنفيذي'],
            9 => ['status' => 'APPROVED_BY_PROCUREMENT', 'route' => 'QUOTES', 'label' => 'جاهز لإنشاء أمر شراء'],
            10 => ['status' => 'PENDING_ACCOUNTING_APPROVAL', 'route' => 'DIRECT', 'direct' => true, 'label' => 'شراء مباشر بانتظار الحسابات'],
            11 => ['status' => 'APPROVED_BY_ACCOUNTING', 'route' => 'DIRECT', 'direct' => true, 'po' => true, 'label' => 'شراء مباشر معتمد ماليًا مع PO'],
            12 => ['status' => 'ISSUED', 'route' => 'DIRECT', 'direct' => true, 'po' => true, 'receipt' => 'PENDING_SITE_ENGINEER', 'label' => 'PO بانتظار مهندس الموقع'],
            13 => ['status' => 'ISSUED', 'route' => 'QUOTES', 'po' => true, 'receipt' => 'APPROVED', 'invoice' => true, 'payment' => true, 'label' => 'دورة مكتملة حتى فاتورة ودفعة جزئية'],
        ][$number];
    }

    /** @return array<int, LandParcel> */
    private function createParcels(User $accountant): array
    {
        $parcels = [];
        foreach (range(1, 3) as $index) {
            $parcel = LandParcel::updateOrCreate(
                ['parcel_reference' => sprintf('%s%02d', self::PARCEL_PREFIX, $index), 'region' => 'منطقة الاختبار ' . $index],
                [
                    'opening_balance' => 50000,
                    'funded_total' => 0,
                    'expense_total' => 0,
                    'balance' => 50000,
                    'is_active' => true,
                    'notes' => self::MARKER,
                ],
            );
            $parcel->transactions()->create([
                'created_by_user_id' => $accountant->id,
                'transaction_type' => 'OPENING_BALANCE',
                'amount' => 50000,
                'balance_after' => 50000,
                'transaction_date' => now()->toDateString(),
                'reference_number' => self::MARKER,
                'notes' => self::MARKER . ' | رصيد افتتاحي لقطعة الاختبار.',
            ]);
            $parcels[] = $parcel;
        }

        return $parcels;
    }

    /** @param array<string, mixed> $definition @param array<string, mixed> $context @param array<int, LandParcel> $parcels */
    private function createScenario(int $number, array $definition, array $context, array $parcels): void
    {
        $department = $context['departments'][($number - 1) % $context['departments']->count()];
        $requester = $definition['requester'] ?? 'employee';
        $requesterUser = $context[$requester];
        $reviewer = $department->manager ?: $context['reviewer'];
        $siteEngineer = $department->siteEngineer ?: $context['site_engineer'];
        $supplier = $context['suppliers'][($number + 1) % $context['suppliers']->count()];
        $createdAt = Carbon::now()->subDays(2 + ($number % 8))->setTime(9 + ($number % 6), 0);
        $items = $this->createRequestItems($number, $context['items']);
        $estimatedTotal = collect($items)->sum('line_total');
        $isDirect = ($definition['route'] ?? 'UNDECIDED') === 'DIRECT';

        $request = PurchaseRequest::create([
            'request_number' => sprintf('%s%03d', self::REQUEST_PREFIX, $number),
            'user_id' => $requesterUser->id,
            'department_id' => $department->id,
            'target_department_id' => $department->id,
            'reviewer_user_id' => $requesterUser->hasRole('general_manager') ? null : $reviewer->id,
            'site_engineer_user_id' => $siteEngineer->id,
            'priority' => ['LOW', 'NORMAL', 'HIGH', 'URGENT'][($number - 1) % 4],
            'status' => $definition['status'],
            'procurement_route' => $definition['route'],
            'direct_supplier_id' => $isDirect ? $supplier->id : null,
            'total_estimated_cost' => $estimatedTotal,
            'date_needed' => now()->addDays(3 + ($number % 10))->toDateString(),
            'notes' => self::MARKER . sprintf(' | السيناريو %03d — %s', $number, $definition['label']),
            'submitted_at' => $definition['status'] === 'DRAFT' ? null : $createdAt->copy()->addHour(),
        ]);
        $request->created_at = $createdAt;
        $request->updated_at = $createdAt->copy()->addHours(2);
        $request->saveQuietly();

        $requestItems = [];
        foreach ($items as $itemData) {
            $requestItems[] = PurchaseRequestItem::create([
                'purchase_request_id' => $request->id,
                'item_id' => $itemData['item']->id,
                'item_description' => $itemData['item']->name,
                'item_reference' => sprintf('TEST-FULL-PARCEL-%02d-%03d', (($number - 1) % 3) + 1, $number),
                'region' => 'منطقة الاختبار ' . ((($number - 1) % 3) + 1),
                'quantity' => $itemData['quantity'],
                'uom' => $itemData['item']->uom,
                'estimated_unit_price' => $itemData['unit_price'],
                'estimated_line_total' => $itemData['line_total'],
                'specifications' => 'بند تجريبي مرتبط برقم قطعة الأرض والمنطقة.',
                'notes' => self::MARKER,
            ]);
        }

        $this->addRequestLifecycle($request, $definition, $requesterUser, $reviewer, $context['procurement'], $context['accountant'], $context['general_manager']);

        $quotes = collect();
        if (($definition['route'] ?? null) === 'QUOTES' && in_array($number, [6, 7, 8, 9, 13], true)) {
            $quotes = $this->createQuotes($request, $requestItems, $context, $number);
        }

        $selectedQuote = $quotes->firstWhere('status', 'SELECTED');
        if ($selectedQuote) {
            $request->update(['selected_quote_id' => $selectedQuote->id]);
        }

        $po = null;
        if (($definition['po'] ?? false) === true) {
            $po = $this->createPurchaseOrder($request, $requestItems, $selectedQuote, $supplier, $context, $number);
        }

        $receipt = null;
        if ($po && ! empty($definition['receipt'])) {
            $receipt = $this->createReceipt($request, $po, $requestItems, $definition['receipt'], $context, $number);
        }

        if ($receipt && ($definition['invoice'] ?? false) === true) {
            $this->createInvoiceAndPayment($po, $receipt, $parcels[($number - 1) % count($parcels)], $context, $number);
        }

        $this->addScenarioEvents($request, $po, $receipt, $context);
    }

    /** @return array<int, array{item: Item, quantity: int, unit_price: float, line_total: float}> */
    private function createRequestItems(int $number, $catalogItems): array
    {
        $items = [];
        $itemCount = 1 + (($number - 1) % 3);
        for ($line = 0; $line < $itemCount; $line++) {
            $item = $catalogItems[(($number - 1) * 2 + $line) % $catalogItems->count()];
            $quantity = 4 + (($number + $line) % 8);
            $unitPrice = (float) (250 + ($number * 37) + ($line * 55));
            $items[] = [
                'item' => $item,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'line_total' => round($quantity * $unitPrice, 2),
            ];
        }
        return $items;
    }

    private function addRequestLifecycle(PurchaseRequest $request, array $definition, User $requester, User $reviewer, User $procurement, User $accountant, User $generalManager): void
    {
        $this->requestHistory($request, $requester, 'CREATED', null, 'DRAFT', 'أنشأ صاحب الطلب المسودة.');
        $status = $definition['status'];
        if ($status !== 'DRAFT') {
            $this->requestHistory($request, $requester, 'SUBMITTED', 'DRAFT', 'SUBMITTED', 'أرسل الطلب للمراجعة.');
        }
        if (in_array($status, ['UNDER_REVIEW', 'PENDING_EXECUTIVE_APPROVAL', 'PENDING_PROCUREMENT_APPROVAL', 'PENDING_QUOTE_RECOMMENDATIONS', 'PENDING_EXECUTIVE_QUOTE_DECISION', 'APPROVED_BY_PROCUREMENT'], true)) {
            $this->requestHistory($request, $reviewer, 'REVIEW_STARTED', 'SUBMITTED', 'UNDER_REVIEW', 'بدأ المراجع مراجعة الطلب.');
        }
        if (in_array($status, ['PENDING_EXECUTIVE_APPROVAL', 'PENDING_PROCUREMENT_APPROVAL', 'PENDING_QUOTE_RECOMMENDATIONS', 'PENDING_EXECUTIVE_QUOTE_DECISION', 'APPROVED_BY_PROCUREMENT'], true)) {
            $this->requestHistory($request, $reviewer, 'APPROVED_BY_REVIEWER', 'UNDER_REVIEW', 'PENDING_EXECUTIVE_APPROVAL', 'اعتمد المراجع الطلب.');
        }
        if (in_array($status, ['PENDING_PROCUREMENT_APPROVAL', 'PENDING_QUOTE_RECOMMENDATIONS', 'PENDING_EXECUTIVE_QUOTE_DECISION', 'APPROVED_BY_PROCUREMENT'], true)) {
            $this->requestHistory($request, $generalManager, 'APPROVED_BY_EXECUTIVE', 'PENDING_EXECUTIVE_APPROVAL', 'PENDING_PROCUREMENT_APPROVAL', 'اعتمد المدير التنفيذي الطلب وأرسله للمشتريات.');
        }
        if (($definition['route'] ?? null) === 'DIRECT') {
            $this->requestHistory($request, $procurement, 'DIRECT_SENT_ACCOUNTING', 'PENDING_PROCUREMENT_APPROVAL', $status, 'اختارت المشتريات مسار الشراء المباشر وأرسلته للحسابات.');
        } elseif (in_array($status, ['PENDING_QUOTE_RECOMMENDATIONS', 'PENDING_EXECUTIVE_QUOTE_DECISION', 'APPROVED_BY_PROCUREMENT'], true)) {
            $this->requestHistory($request, $procurement, 'THREE_QUOTES_REQUIRED', 'PENDING_PROCUREMENT_APPROVAL', 'PENDING_QUOTE_RECOMMENDATIONS', 'بدأت المشتريات مسار عروض الأسعار.');
        }
        if (($definition['route'] ?? null) === 'DIRECT' && $status === 'APPROVED_BY_ACCOUNTING') {
            $this->requestHistory($request, $accountant, 'ACCOUNTING_APPROVED_DIRECT', 'PENDING_ACCOUNTING_APPROVAL', 'APPROVED_BY_ACCOUNTING', 'راجعت الحسابات البيانات المالية واعتمدت الطلب المباشر.');
        }
    }

    /** @return \Illuminate\Support\Collection<int, PurchaseRequestQuote> */
    private function createQuotes(PurchaseRequest $request, array $requestItems, array $context, int $number)
    {
        $quotes = collect();
        $quoteCount = 3;
        for ($index = 0; $index < $quoteCount; $index++) {
            $supplier = $context['suppliers'][($number + $index + 2) % $context['suppliers']->count()];
            $unitPrice = (float) (420 + ($number * 11) + ($index * 80));
            $status = $number === 9 || $number === 13
                ? ($index === (($number + 1) % $quoteCount) ? 'SELECTED' : 'REJECTED')
                : 'SUBMITTED';
            $quote = PurchaseRequestQuote::create([
                'purchase_request_id' => $request->id,
                'supplier_id' => $supplier->id,
                'created_by_user_id' => $context['procurement']->id,
                'unit_price' => $unitPrice,
                'total_amount' => round($unitPrice * collect($requestItems)->sum('quantity'), 2),
                'currency' => 'EGP',
                'status' => $status,
                'selected_at' => $status === 'SELECTED' ? now()->subDay() : null,
                'notes' => self::MARKER . ' | عرض سعر تجريبي.',
            ]);
            $quotes->push($quote);

            if ($number === 7) {
                PurchaseRequestQuoteRecommendation::create([
                    'purchase_request_quote_id' => $quote->id,
                    'user_id' => $context['accountant']->id,
                    'role_type' => 'ACCOUNTING',
                    'decision' => $index === 1 ? 'RECOMMEND' : 'REJECT',
                    'comment' => self::MARKER . ' | ترشيح حسابات لطلب المدير التنفيذي.',
                ]);
            } elseif (in_array($number, [8, 9, 13], true)) {
                PurchaseRequestQuoteRecommendation::create([
                    'purchase_request_quote_id' => $quote->id,
                    'user_id' => $context['accountant']->id,
                    'role_type' => 'ACCOUNTING',
                    'decision' => $index === 1 ? 'RECOMMEND' : 'REJECT',
                    'comment' => self::MARKER . ' | ترشيح مالي.',
                ]);
                PurchaseRequestQuoteRecommendation::create([
                    'purchase_request_quote_id' => $quote->id,
                    'user_id' => $context['reviewer']->id,
                    'role_type' => 'DEPARTMENT',
                    'decision' => $index === 0 ? 'RECOMMEND' : 'REJECT',
                    'comment' => self::MARKER . ' | ترشيح فني.',
                ]);
            }
        }
        return $quotes;
    }

    private function createPurchaseOrder(PurchaseRequest $request, array $requestItems, ?PurchaseRequestQuote $selectedQuote, Supplier $supplier, array $context, int $number): PurchaseOrder
    {
        $poSupplier = $selectedQuote ? Supplier::findOrFail($selectedQuote->supplier_id) : $supplier;
        $po = PurchaseOrder::create([
            'po_number' => sprintf('%s%03d', self::PO_PREFIX, $number),
            'purchase_request_id' => $request->id,
            'selected_quote_id' => $selectedQuote?->id,
            'supplier_id' => $poSupplier->id,
            'created_by_user_id' => $context['procurement']->id,
            'status' => 'ISSUED',
            'payment_terms' => 'تحويل بنكي بعد المطابقة',
            'delivery_terms' => 'التوريد إلى موقع المشروع المحدد في الطلب.',
            'delivery_date' => now()->addDays(5 + $number)->toDateString(),
            'delivery_status' => 'NOT_STARTED',
            'financial_notes' => 'بيانات تجريبية بالجنيه المصري بدون ضريبة أو خصم.',
            'notes' => self::MARKER . sprintf(' | أمر شراء للسيناريو %03d.', $number),
        ]);

        $subtotal = 0.0;
        foreach ($requestItems as $requestItem) {
            $unitPrice = $selectedQuote ? (float) $selectedQuote->unit_price : (float) $requestItem->estimated_unit_price;
            $lineTotal = round((float) $requestItem->quantity * $unitPrice, 2);
            $subtotal += $lineTotal;
            PurchaseOrderItem::create([
                'purchase_order_id' => $po->id,
                'pr_item_id' => $requestItem->id,
                'item_id' => $requestItem->item_id,
                'item_description' => $requestItem->item_description,
                'item_reference' => $requestItem->item_reference,
                'region' => $requestItem->region,
                'quantity' => $requestItem->quantity,
                'uom' => $requestItem->uom,
                'unit_price' => $unitPrice,
                'line_total' => $lineTotal,
                'specifications' => 'بند PO تجريبي مرتبط بالطلب.',
            ]);
        }
        $po->update(['subtotal' => $subtotal, 'grand_total' => $subtotal]);
        $poFromState = $request->procurement_route === 'DIRECT' ? 'APPROVED_BY_ACCOUNTING' : 'APPROVED_BY_PROCUREMENT';
        $this->orderHistory($po, $context['procurement'], 'PO_CREATED', $poFromState, 'PO_DRAFT', 'أنشأت المشتريات أمر الشراء.');
        $this->orderHistory($po, $context['procurement'], 'PO_ISSUED', 'PO_DRAFT', 'ISSUED', 'أصدرت المشتريات أمر الشراء.');
        $this->notify($context['accountant'], $po, 'أمر شراء تجريبي جاهز للمراجعة', 'أمر الشراء التجريبي جاهز للمراجعة المالية.');

        return $po->fresh('items');
    }

    private function createReceipt(PurchaseRequest $request, PurchaseOrder $po, array $requestItems, string $status, array $context, int $number): PurchaseReceipt
    {
        $receipt = PurchaseReceipt::create([
            'purchase_order_id' => $po->id,
            'purchase_request_id' => $request->id,
            'warehouse_keeper_user_id' => $context['warehouse']->id,
            'site_engineer_user_id' => $context['site_engineer']->id,
            'receipt_number' => sprintf('%s%03d', self::RECEIPT_PREFIX, $number),
            'status' => $status,
            'received_at' => now()->subDay()->toDateString(),
            'warehouse_submitted_at' => now()->subDay(),
            'site_engineer_approved_at' => $status === 'APPROVED' ? now()->subHours(12) : null,
            'warehouse_notes' => self::MARKER . ' | سجل أمين المخزن الكميات المستلمة.',
            'site_engineer_notes' => $status === 'APPROVED' ? self::MARKER . ' | اعتمد مهندس الموقع.' : null,
        ]);

        foreach ($po->items as $poItem) {
            PurchaseReceiptItem::create([
                'purchase_receipt_id' => $receipt->id,
                'purchase_order_item_id' => $poItem->id,
                'ordered_quantity' => $poItem->quantity,
                'received_quantity' => $status === 'APPROVED' ? $poItem->quantity : max(1, (float) $poItem->quantity - 1),
                'notes' => self::MARKER,
            ]);
        }
        $this->receiptHistory($receipt, $context['warehouse'], 'RECEIPT_CREATED', 'أنشأ أمين المخزن إذن الاستلام.');
        $this->receiptHistory($receipt, $context['warehouse'], 'WAREHOUSE_SUBMITTED', 'أرسل أمين المخزن الإذن إلى مهندس الموقع.');
        if ($status === 'APPROVED') {
            $this->receiptHistory($receipt, $context['site_engineer'], 'SITE_ENGINEER_RECEIPT_APPROVED', 'اعتمد مهندس الموقع إذن الاستلام وأرسله للحسابات.');
        }
        $this->notify($context['site_engineer'], $receipt, 'إذن استلام تجريبي بانتظار اعتمادك', 'إذن الاستلام التجريبي بانتظار مراجعة مهندس الموقع.');

        return $receipt->fresh('items');
    }

    private function createInvoiceAndPayment(PurchaseOrder $po, PurchaseReceipt $receipt, LandParcel $parcel, array $context, int $number): void
    {
        $amount = round((float) $po->grand_total, 2);
        $supplierId = (int) $po->supplier_id;
        $paid = round($amount * 0.35, 2);
        $invoice = SupplierInvoice::create([
            'supplier_id' => $supplierId,
            'purchase_order_id' => $po->id,
            'purchase_receipt_id' => $receipt->id,
            'created_by_user_id' => $context['accountant']->id,
            'invoice_number' => sprintf('%s%03d', self::INVOICE_PREFIX, $number),
            'amount' => $amount,
            'invoice_date' => now()->subDay()->toDateString(),
            'due_date' => now()->addDays(30)->toDateString(),
            'status' => 'MATCHED',
            'matching_status' => 'MATCHED',
            'matched_at' => now()->subHours(10),
            'matched_by_user_id' => $context['accountant']->id,
            'paid_amount' => $paid,
            'outstanding_amount' => round($amount - $paid, 2),
            'matching_notes' => self::MARKER . ' | مطابقة ثلاثية تجريبية.',
            'notes' => self::MARKER . ' | فاتورة مرتبطة بـPO وGRN.',
        ]);
        SupplierInvoiceLandAllocation::create([
            'supplier_invoice_id' => $invoice->id,
            'land_parcel_id' => $parcel->id,
            'created_by_user_id' => $context['accountant']->id,
            'amount' => $amount,
            'notes' => self::MARKER . ' | توزيع كامل على قطعة الاختبار.',
        ]);
        $parcel->update([
            'expense_total' => (float) $parcel->expense_total + $amount,
            'balance' => (float) $parcel->balance - $amount,
        ]);
        $parcel->transactions()->create([
            'created_by_user_id' => $context['accountant']->id,
            'transaction_type' => 'INVOICE_EXPENSE',
            'amount' => -$amount,
            'balance_after' => $parcel->balance,
            'transaction_date' => now()->toDateString(),
            'reference_number' => $invoice->invoice_number,
            'source_type' => SupplierInvoice::class,
            'source_id' => $invoice->id,
            'notes' => self::MARKER . ' | مصروف فاتورة تجريبي.',
        ]);

        $payment = SupplierPayment::create([
            'supplier_id' => $supplierId,
            'accountant_user_id' => $context['accountant']->id,
            'payment_number' => sprintf('%s%03d', self::PAYMENT_PREFIX, $number),
            'amount' => $paid,
            'payment_date' => now()->toDateString(),
            'payment_method' => 'BANK_TRANSFER',
            'reference_number' => self::MARKER . sprintf('-%03d', $number),
            'allocated_amount' => $paid,
            'overpayment_amount' => 0,
            'notes' => self::MARKER . ' | دفعة جزئية على حساب المورد.',
        ]);
        SupplierPaymentAllocation::create([
            'supplier_payment_id' => $payment->id,
            'supplier_invoice_id' => $invoice->id,
            'amount' => $paid,
        ]);
        $this->refreshSupplierBalance($supplierId);
        $this->addAudit($context['accountant'], SupplierInvoice::class, $invoice->id, 'SUPPLIER_INVOICE_CREATED', null, 'MATCHED');
        $this->addAudit($context['accountant'], SupplierPayment::class, $payment->id, 'SUPPLIER_PAYMENT_CREATED', null, 'ALLOCATED');
    }

    private function refreshSupplierBalance(int $supplierId): void
    {
        $invoiced = (float) SupplierInvoice::where('supplier_id', $supplierId)->sum('amount');
        $paid = (float) SupplierPayment::where('supplier_id', $supplierId)->sum('amount');
        SupplierBalance::updateOrCreate(
            ['supplier_id' => $supplierId],
            ['total_invoiced' => $invoiced, 'total_paid' => $paid, 'balance' => round($invoiced - $paid, 2), 'last_activity_at' => now()],
        );
    }

    private function addScenarioEvents(PurchaseRequest $request, ?PurchaseOrder $po, ?PurchaseReceipt $receipt, array $context): void
    {
        foreach ([
            [$request, $context['employee'], 'scenario.request'],
            [$request, $context['reviewer'], 'scenario.reviewer'],
            [$request, $context['procurement'], 'scenario.procurement'],
            [$request, $context['accountant'], 'scenario.accounting'],
            [$request, $context['general_manager'], 'scenario.executive'],
            [$request, $context['warehouse'], 'scenario.warehouse'],
            [$request, $context['site_engineer'], 'scenario.site_engineer'],
        ] as [$entity, $actor, $eventType]) {
            $this->event($entity, $actor, $eventType, 'إجراء تجريبي مرتبط بسيناريو كامل.');
        }
        if ($po) {
            $this->event($po, $context['procurement'], 'scenario.purchase_order', 'أمر شراء تجريبي مرتبط بالطلب.');
        }
        if ($receipt) {
            $this->event($receipt, $context['warehouse'], 'scenario.receipt', 'إذن استلام تجريبي مرتبط بأمر الشراء.');
        }
    }

    private function requestHistory(PurchaseRequest $request, User $actor, string $action, ?string $from, string $to, string $comments): void
    {
        ApprovalHistory::create(['target_type' => PurchaseRequest::class, 'target_id' => $request->id, 'actor_user_id' => $actor->id, 'action' => $action, 'from_state' => $from, 'to_state' => $to, 'comments' => self::MARKER . ' | ' . $comments]);
        $this->addAudit($actor, PurchaseRequest::class, $request->id, $action, $from, $to);
    }

    private function orderHistory(PurchaseOrder $po, User $actor, string $action, string $from, string $to, string $comments): void
    {
        ApprovalHistory::create(['target_type' => PurchaseOrder::class, 'target_id' => $po->id, 'actor_user_id' => $actor->id, 'action' => $action, 'from_state' => $from, 'to_state' => $to, 'comments' => self::MARKER . ' | ' . $comments]);
        $this->addAudit($actor, PurchaseOrder::class, $po->id, $action, $from, $to);
    }

    private function receiptHistory(PurchaseReceipt $receipt, User $actor, string $action, string $comments): void
    {
        ApprovalHistory::create(['target_type' => PurchaseReceipt::class, 'target_id' => $receipt->id, 'actor_user_id' => $actor->id, 'action' => $action, 'from_state' => null, 'to_state' => $receipt->status, 'comments' => self::MARKER . ' | ' . $comments]);
        $this->addAudit($actor, PurchaseReceipt::class, $receipt->id, $action, null, $receipt->status);
    }

    private function addAudit(User $actor, string $entityType, int $entityId, string $action, ?string $oldValue, ?string $newValue): void
    {
        AuditLog::create(['user_id' => $actor->id, 'entity_type' => $entityType, 'entity_id' => $entityId, 'action' => $action, 'field_name' => 'status', 'old_value' => $oldValue, 'new_value' => self::MARKER . ' | ' . ($newValue ?? '')]);
    }

    private function event(Model $entity, User $actor, string $eventType, string $description): void
    {
        SystemEvent::create(['actor_user_id' => $actor->id, 'event_type' => $eventType, 'action' => strtoupper(str_replace('.', '_', $eventType)), 'entity_type' => $entity::class, 'entity_id' => $entity->getKey(), 'entity_label' => $entity->getKey(), 'from_state' => null, 'to_state' => null, 'description' => self::MARKER . ' | ' . $description, 'metadata' => ['seed_marker' => self::MARKER], 'occurred_at' => now()]);
    }

    private function notify(User $recipient, Model $entity, string $title, string $message): void
    {
        $data = [
            'user_id' => $recipient->id,
            'type' => self::MARKER,
            'notifiable_type' => $entity::class,
            'notifiable_id' => $entity->getKey(),
            'title' => self::MARKER . ' | ' . $title,
            'message' => self::MARKER . ' | ' . $message,
            'read_at' => null,
        ];
        if ($entity instanceof PurchaseOrder) {
            $data['purchase_order_id'] = $entity->id;
        }
        if ($entity instanceof PurchaseReceipt) {
            $data['purchase_receipt_id'] = $entity->id;
            $data['purchase_order_id'] = $entity->purchase_order_id;
        }
        Notification::create($data);
    }

    private function removePreviousScenarios(): void
    {
        $requestIds = PurchaseRequest::withTrashed()->where('request_number', 'like', self::REQUEST_PREFIX . '%')->pluck('id');
        $orderIds = PurchaseOrder::withTrashed()->where(function ($query) use ($requestIds): void {
            $query->where('po_number', 'like', self::PO_PREFIX . '%')->orWhereIn('purchase_request_id', $requestIds);
        })->pluck('id');
        $receiptIds = PurchaseReceipt::where('receipt_number', 'like', self::RECEIPT_PREFIX . '%')->orWhereIn('purchase_order_id', $orderIds)->pluck('id');
        $invoiceIds = SupplierInvoice::where('invoice_number', 'like', self::INVOICE_PREFIX . '%')->orWhereIn('purchase_order_id', $orderIds)->pluck('id');
        $quoteIds = PurchaseRequestQuote::whereIn('purchase_request_id', $requestIds)->pluck('id');
        $paymentIds = SupplierPayment::where('payment_number', 'like', self::PAYMENT_PREFIX . '%')->pluck('id');

        SupplierPaymentAllocation::whereIn('supplier_payment_id', $paymentIds)->orWhereIn('supplier_invoice_id', $invoiceIds)->delete();
        SupplierInvoiceLandAllocation::whereIn('supplier_invoice_id', $invoiceIds)->delete();
        LandParcelTransaction::where('notes', 'like', '%' . self::MARKER . '%')->delete();
        SupplierPayment::whereIn('id', $paymentIds)->delete();
        SupplierInvoice::whereIn('id', $invoiceIds)->delete();
        PurchaseReceiptItem::whereIn('purchase_receipt_id', $receiptIds)->delete();
        ApprovalHistory::whereIn('target_type', [PurchaseReceipt::class])->whereIn('target_id', $receiptIds)->delete();
        AuditLog::whereIn('entity_type', [PurchaseReceipt::class])->whereIn('entity_id', $receiptIds)->delete();
        PurchaseReceipt::whereIn('id', $receiptIds)->delete();
        PurchaseRequestQuoteRecommendation::whereIn('purchase_request_quote_id', $quoteIds)->delete();
        PurchaseRequestQuote::whereIn('id', $quoteIds)->delete();
        Notification::where('type', self::MARKER)->delete();
        SystemEvent::where('description', 'like', '%' . self::MARKER . '%')->delete();
        ApprovalHistory::whereIn('target_type', [PurchaseRequest::class, PurchaseOrder::class])->whereIn('target_id', $requestIds->merge($orderIds))->delete();
        AuditLog::whereIn('entity_type', [PurchaseRequest::class, PurchaseOrder::class])->whereIn('entity_id', $requestIds->merge($orderIds))->delete();
        PurchaseOrderItem::whereIn('purchase_order_id', $orderIds)->delete();
        PurchaseOrder::withTrashed()->whereIn('id', $orderIds)->forceDelete();
        PurchaseRequestItem::whereIn('purchase_request_id', $requestIds)->delete();
        PurchaseRequest::withTrashed()->whereIn('id', $requestIds)->forceDelete();
        LandParcel::where('parcel_reference', 'like', self::PARCEL_PREFIX . '%')->delete();
    }
}
