<?php

namespace App\Services;

use App\Services\LandParcelService;
use App\Models\PurchaseOrder;
use App\Models\PurchaseReceipt;
use App\Models\Supplier;
use App\Models\SupplierBalance;
use App\Models\SupplierInvoice;
use App\Models\SupplierPayment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SupplierInvoiceService
{
    public function approvedReceipts(int $limit = 100)
    {
        return PurchaseReceipt::with([
            'purchaseOrder.supplier',
            'purchaseOrder.createdBy',
            'purchaseOrder.accountingReviewer',
            'purchaseOrder.purchaseRequest.department',
            'purchaseOrder.purchaseRequest.requester',
            'purchaseOrder.purchaseRequest.assignedReviewer',
            'purchaseOrder.purchaseRequest.siteEngineer',
            'purchaseOrder.purchaseRequest.approvalHistory.actor',
            'purchaseOrder.items.item',
            'purchaseOrder.items.prItem',
            'purchaseOrder.approvalHistory.actor',
            'warehouseKeeper',
            'siteEngineer',
            'items.purchaseOrderItem.item',
            'items.purchaseOrderItem.prItem',
        ])
            ->where('status', 'APPROVED')
            ->whereDoesntHave('supplierInvoices', function ($query) {
                $query->whereIn('status', ['DRAFT', 'OPEN', 'PARTIALLY_PAID', 'PAID']);
            })
            ->orderByDesc('site_engineer_approved_at')
            ->limit($limit)
            ->get();
    }

    public function invoices(?int $supplierId = null, int $limit = 200)
    {
        return SupplierInvoice::with([
            'supplier',
            'purchaseOrder',
            'purchaseReceipt',
            'paymentAllocations.payment',
            'landAllocations.parcel',
        ])
            ->when($supplierId, fn ($query) => $query->where('supplier_id', $supplierId))
            ->orderByDesc('invoice_date')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    public function createInvoice(
        User $accountant,
        PurchaseOrder $purchaseOrder,
        PurchaseReceipt $receipt,
        float $amount,
        string $invoiceNumber,
        ?string $invoiceDate = null,
        ?string $dueDate = null,
        array $landAllocations = [],
        ?string $notes = null,
    ): SupplierInvoice {
        $receipt->loadMissing(['purchaseOrder', 'items.purchaseOrderItem']);
        $purchaseOrder->loadMissing('supplier');

        if ($receipt->purchase_order_id !== $purchaseOrder->id) {
            throw new \RuntimeException('إذن الاستلام غير مرتبط بأمر الشراء المحدد.');
        }
        if ($receipt->status !== 'APPROVED') {
            throw new \RuntimeException('لا يمكن تسجيل فاتورة قبل اعتماد إذن الاستلام من مهندس الموقع.');
        }
        if ($amount <= 0) {
            throw ValidationException::withMessages(['amount' => ['قيمة الفاتورة يجب أن تكون أكبر من صفر.']]);
        }
        if (SupplierInvoice::where('purchase_receipt_id', $receipt->id)->exists()) {
            throw new \RuntimeException('تم تسجيل فاتورة لهذا إذن الاستلام بالفعل.');
        }

        $normalizedInvoiceNumber = trim($invoiceNumber);
        if ($normalizedInvoiceNumber === '') {
            throw ValidationException::withMessages(['invoice_number' => ['رقم الفاتورة مطلوب.']]);
        }
        if (SupplierInvoice::where('invoice_number', $normalizedInvoiceNumber)->exists()) {
            throw ValidationException::withMessages(['invoice_number' => ['رقم الفاتورة مستخدم من قبل. أدخل رقمًا مختلفًا أو راجع أرشيف فواتير المورد.']]);
        }

        $receivedValue = $this->calculateReceiptValue($receipt);
        if (abs($amount - $receivedValue) > 0.01) {
            throw ValidationException::withMessages([
                'amount' => [sprintf('قيمة الفاتورة يجب أن تساوي قيمة الكميات المستلمة: %.2f ج.م.', $receivedValue)],
            ]);
        }

        return DB::transaction(function () use ($accountant, $purchaseOrder, $receipt, $amount, $normalizedInvoiceNumber, $invoiceDate, $dueDate, $landAllocations, $notes): SupplierInvoice {
            $invoice = SupplierInvoice::create([
                'supplier_id' => $purchaseOrder->supplier_id,
                'purchase_order_id' => $purchaseOrder->id,
                'purchase_receipt_id' => $receipt->id,
                'created_by_user_id' => $accountant->id,
                'invoice_number' => $normalizedInvoiceNumber,
                'amount' => round($amount, 2),
                'invoice_date' => $invoiceDate ?: now()->toDateString(),
                'due_date' => $dueDate,
                'status' => 'OPEN',
                'matching_status' => 'PENDING',
                'paid_amount' => 0,
                'outstanding_amount' => round($amount, 2),
                'notes' => $notes,
            ]);

            app(LandParcelService::class)->recordInvoiceAllocations($accountant, $invoice, $landAllocations);
            $this->refreshSupplierBalance($invoice->supplier_id);

            return $invoice->fresh(['supplier', 'purchaseOrder', 'purchaseReceipt', 'landAllocations.parcel']);
        });
    }

    public function matchThreeWay(User $accountant, SupplierInvoice $invoice): SupplierInvoice
    {
        $invoice->loadMissing([
            'purchaseOrder.supplier',
            'purchaseOrder.items',
            'purchaseReceipt.items.purchaseOrderItem',
        ]);

        if ($invoice->matching_status === 'MATCHED') {
            return $invoice;
        }
        if ($invoice->purchaseReceipt->status !== 'APPROVED') {
            throw new \RuntimeException('لا يمكن المطابقة قبل اعتماد إذن الاستلام.');
        }
        if ($invoice->purchaseReceipt->purchase_order_id !== $invoice->purchase_order_id) {
            throw new \RuntimeException('المستندات الثلاثة غير مرتبطة بنفس أمر الشراء.');
        }
        if ($invoice->supplier_id !== $invoice->purchaseOrder->supplier_id) {
            throw new \RuntimeException('المورد في الفاتورة لا يطابق المورد في أمر الشراء.');
        }

        $receivedValue = $this->calculateReceiptValue($invoice->purchaseReceipt);
        if (abs((float) $invoice->amount - $receivedValue) > 0.01) {
            throw ValidationException::withMessages([
                'matching' => [sprintf('فشل التحقق: مبلغ الفاتورة %.2f لا يساوي قيمة الاستلام %.2f ج.م.', $invoice->amount, $receivedValue)],
            ]);
        }

        $invoice->update([
            'matching_status' => 'MATCHED',
            'status' => ((float) $invoice->paid_amount > 0 && (float) $invoice->outstanding_amount <= 0) ? 'PAID' : 'OPEN',
            'matched_at' => now(),
            'matched_by_user_id' => $accountant->id,
            'matching_notes' => 'تمت مطابقة أمر الشراء وإذن الاستلام وفاتورة المورد.',
            'outstanding_amount' => max(0, round((float) $invoice->amount - (float) $invoice->paid_amount, 2)),
        ]);

        $this->refreshSupplierBalance($invoice->supplier_id);

        return $invoice->fresh([
            'supplier',
            'purchaseOrder',
            'purchaseReceipt',
            'paymentAllocations.payment',
            'landAllocations.parcel',
        ]);
    }

    public function recordPayment(
        User $accountant,
        SupplierInvoice $invoice,
        float $amount,
        ?string $paymentDate = null,
        string $paymentMethod = 'BANK_TRANSFER',
        ?string $referenceNumber = null,
        ?string $notes = null,
    ): array {
        if ($invoice->matching_status !== 'MATCHED') {
            throw new \RuntimeException('لا يمكن تسجيل الدفع قبل إتمام المطابقة الثلاثية.');
        }

        return $this->recordSupplierPayment(
            $accountant,
            Supplier::findOrFail($invoice->supplier_id),
            $amount,
            $paymentDate,
            $paymentMethod,
            $referenceNumber,
            $notes,
        );
    }

    /**
     * Record a supplier-level payment and allocate it oldest-first across all matched debts.
     */
    public function recordSupplierPayment(
        User $accountant,
        Supplier $supplier,
        float $amount,
        ?string $paymentDate = null,
        string $paymentMethod = 'BANK_TRANSFER',
        ?string $referenceNumber = null,
        ?string $notes = null,
    ): array {
        if ($amount <= 0) {
            throw ValidationException::withMessages(['amount' => ['قيمة الدفعة يجب أن تكون أكبر من صفر.']]);
        }

        return DB::transaction(function () use ($accountant, $supplier, $amount, $paymentDate, $paymentMethod, $referenceNumber, $notes): array {
            $supplierId = $supplier->id;
            $remaining = round($amount, 2);

            $payment = SupplierPayment::create([
                'supplier_id' => $supplierId,
                'accountant_user_id' => $accountant->id,
                'payment_number' => 'PAY-' . now()->format('YmdHisv'),
                'amount' => round($amount, 2),
                'payment_date' => $paymentDate ?: now()->toDateString(),
                'payment_method' => $paymentMethod,
                'reference_number' => $referenceNumber,
                'allocated_amount' => 0,
                'overpayment_amount' => 0,
                'notes' => $notes,
            ]);

            $debts = SupplierInvoice::where('supplier_id', $supplierId)
                ->where('matching_status', 'MATCHED')
                ->where('outstanding_amount', '>', 0)
                ->orderBy('invoice_date')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            foreach ($debts as $debt) {
                if ($remaining <= 0) {
                    break;
                }
                $allocation = round(min($remaining, (float) $debt->outstanding_amount), 2);
                if ($allocation <= 0) {
                    continue;
                }

                $payment->allocations()->create([
                    'supplier_invoice_id' => $debt->id,
                    'amount' => $allocation,
                ]);

                $paidAmount = round((float) $debt->paid_amount + $allocation, 2);
                $outstanding = max(0, round((float) $debt->amount - $paidAmount, 2));
                $debt->update([
                    'paid_amount' => $paidAmount,
                    'outstanding_amount' => $outstanding,
                    'status' => $outstanding <= 0 ? 'PAID' : 'PARTIALLY_PAID',
                ]);

                $remaining = round($remaining - $allocation, 2);
            }

            $allocated = round($amount - $remaining, 2);
            $payment->update([
                'allocated_amount' => $allocated,
                'overpayment_amount' => max(0, $remaining),
            ]);

            $this->refreshSupplierBalance($supplierId);

            return [
                'payment' => $payment->fresh(['supplier', 'accountant', 'allocations.invoice.purchaseOrder']),
                'supplier_balance' => $this->getSupplierBalance($supplierId),
                'overpayment_warning' => $remaining > 0,
                'message' => $remaining > 0
                    ? sprintf('تم تسجيل الدفعة مع تحذير: %.2f ج.م تجاوزت إجمالي المديونية الحالية.', $remaining)
                    : 'تم تسجيل الدفعة على حساب المورد وتوزيعها على أقدم مديونية أولًا.',
            ];
        });
    }

    public function supplierAccounts(int $limit = 200): array
    {
        return Supplier::query()
            ->where('is_active', true)
            ->orderBy('company_name')
            ->limit($limit)
            ->get()
            ->map(fn (Supplier $supplier) => $this->supplierSummary($supplier))
            ->values()
            ->all();
    }

    public function supplierAccount(Supplier $supplier): array
    {
        $supplier->load([
            'purchaseOrders' => fn ($query) => $query->orderByDesc('created_at'),
            'invoices.purchaseOrder',
            'invoices.purchaseReceipt',
            'invoices.paymentAllocations.payment',
            'invoices.landAllocations.parcel',
            'balanceAccount',
        ]);

        return [
            'supplier' => $supplier,
            'summary' => $this->supplierSummary($supplier),
            'invoices' => $supplier->invoices->sortByDesc('invoice_date')->values(),
            'payments' => $supplier->payments->sortByDesc('payment_date')->values(),
        ];
    }

    public function getSupplierBalance(int $supplierId): array
    {
        $balance = SupplierBalance::firstOrCreate(
            ['supplier_id' => $supplierId],
            ['total_invoiced' => 0, 'total_paid' => 0, 'balance' => 0]
        );

        return [
            'total_invoiced' => (float) $balance->total_invoiced,
            'total_paid' => (float) $balance->total_paid,
            'balance' => (float) $balance->balance,
            'is_overpaid' => (float) $balance->balance < 0,
            'last_activity_at' => $balance->last_activity_at,
        ];
    }

    private function supplierSummary(Supplier $supplier): array
    {
        $totalInvoiced = (float) SupplierInvoice::where('supplier_id', $supplier->id)
            ->where('status', '!=', 'DRAFT')
            ->sum('amount');
        $totalPaid = (float) SupplierPayment::where('supplier_id', $supplier->id)->sum('amount');
        $balance = round($totalInvoiced - $totalPaid, 2);

        return [
            'supplier_id' => $supplier->id,
            'company_name' => $supplier->company_name,
            'code' => $supplier->code ?? null,
            'email' => $supplier->email,
            'phone' => $supplier->phone,
            'total_invoiced' => $totalInvoiced,
            'total_paid' => $totalPaid,
            'balance' => $balance,
            'is_overpaid' => $balance < 0,
            'open_invoices_count' => SupplierInvoice::where('supplier_id', $supplier->id)
                ->whereIn('status', ['OPEN', 'PARTIALLY_PAID'])
                ->count(),
            'invoices_count' => SupplierInvoice::where('supplier_id', $supplier->id)
                ->where('status', '!=', 'DRAFT')
                ->count(),
            'payments_count' => SupplierPayment::where('supplier_id', $supplier->id)->count(),
        ];
    }

    private function refreshSupplierBalance(int $supplierId): SupplierBalance
    {
        $totalInvoiced = (float) SupplierInvoice::where('supplier_id', $supplierId)
            ->where('status', '!=', 'DRAFT')
            ->sum('amount');
        $totalPaid = (float) SupplierPayment::where('supplier_id', $supplierId)->sum('amount');
        $balance = round($totalInvoiced - $totalPaid, 2);

        return SupplierBalance::updateOrCreate(
            ['supplier_id' => $supplierId],
            [
                'total_invoiced' => $totalInvoiced,
                'total_paid' => $totalPaid,
                'balance' => $balance,
                'last_activity_at' => now(),
            ]
        );
    }

    private function calculateReceiptValue(PurchaseReceipt $receipt): float
    {
        return round($receipt->items->sum(function ($receiptItem): float {
            return (float) $receiptItem->received_quantity * (float) ($receiptItem->purchaseOrderItem?->unit_price ?? 0);
        }), 2);
    }
}
