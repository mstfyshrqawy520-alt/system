<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\PurchaseOrder;
use App\Models\PurchaseRequest;
use App\Models\PurchaseRequestQuote;
use App\Models\PurchaseReceipt;
use App\Models\SupplierInvoice;
use App\Models\SupplierPayment;
use App\Models\SupplierPaymentAllocation;

$marker = 'TEST-540-SCENARIOS';
$requests = PurchaseRequest::where('notes', 'like', $marker . '%')->get();
$requestIds = $requests->pluck('id');
$orders = PurchaseOrder::where('notes', 'like', $marker . '%')->get();
$orderIds = $orders->pluck('id');
$quotes = PurchaseRequestQuote::where('notes', 'like', $marker . '%')->get();
$receipts = PurchaseReceipt::where('receipt_number', 'like', 'TEST-GRN-%')->get();
$receiptIds = $receipts->pluck('id');
$invoices = SupplierInvoice::where('invoice_number', 'like', 'TEST-INV-%')->get();
$payments = SupplierPayment::where('payment_number', 'like', 'TEST-PAY-%')->get();
$paymentIds = $payments->pluck('id');
$allocations = SupplierPaymentAllocation::whereIn('supplier_payment_id', $paymentIds)->get();

$nonEmptyPrItems = $requests->flatMap(fn ($request) => $request->items)->filter(fn ($item) => trim((string) $item->item_reference) === '' || trim((string) $item->region) === '')->count();
$nonEmptyPoItems = $orders->flatMap(fn ($order) => $order->items)->filter(fn ($item) => trim((string) $item->item_reference) === '' || trim((string) $item->region) === '')->count();
$invalidQuotes = $quotes->filter(fn ($quote) => $quote->currency !== 'EGP' || (float) $quote->unit_price <= 0 || (float) $quote->total_amount <= 0)->count();
$duplicateQuoteSuppliers = $quotes->groupBy('purchase_request_id')->filter(function ($group) {
    return $group->pluck('supplier_id')->unique()->count() !== $group->count();
})->count();
$invalidInvoices = $invoices->filter(function ($invoice) {
    return (int) $invoice->purchase_order_id === 0
        || (int) $invoice->purchase_receipt_id === 0
        || (int) $invoice->supplier_id === 0;
})->count();
$invalidAllocations = $allocations->filter(fn ($allocation) => (float) $allocation->amount <= 0)->count();
$paymentTotalsMismatch = $payments->filter(function ($payment) use ($allocations) {
    $sum = (float) $allocations->where('supplier_payment_id', $payment->id)->sum('amount');
    return abs($sum - (float) $payment->allocated_amount) > 0.01;
})->count();

$groupCounts = [];
foreach ($requests as $request) {
    if (preg_match('/TEST-PR-G(\d{2})-(\d{2})$/', $request->request_number, $matches)) {
        $groupCounts[(int) $matches[1]] = ($groupCounts[(int) $matches[1]] ?? 0) + 1;
    }
}
ksort($groupCounts);

$result = [
    'marker' => $marker,
    'main_scenario_requests' => collect($groupCounts)->sum(),
    'all_seeded_requests_including_supporting_debts' => $requests->count(),
    'expected_main_scenarios' => 540,
    'group_counts' => $groupCounts,
    'seeded_orders' => $orders->count(),
    'seeded_quotes' => $quotes->count(),
    'seeded_receipts' => $receipts->count(),
    'seeded_invoices' => $invoices->count(),
    'seeded_payments' => $payments->count(),
    'seeded_payment_allocations' => $allocations->count(),
    'active_suppliers' => App\Models\Supplier::where('is_active', true)->count(),
    'active_items' => App\Models\Item::where('is_active', true)->count(),
    'validation' => [
        'pr_items_missing_reference_or_region' => $nonEmptyPrItems,
        'po_items_missing_reference_or_region' => $nonEmptyPoItems,
        'invalid_quotes' => $invalidQuotes,
        'requests_with_duplicate_quote_supplier' => $duplicateQuoteSuppliers,
        'invalid_invoices' => $invalidInvoices,
        'invalid_payment_allocations' => $invalidAllocations,
        'payment_allocation_totals_mismatch' => $paymentTotalsMismatch,
    ],
    'report_files' => [
        'markdown' => is_file(base_path('TEST_SCENARIOS_540_REPORT_AR.md')),
        'json' => is_file(storage_path('app/TEST_SCENARIOS_540_REPORT.json')),
    ],
];

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
