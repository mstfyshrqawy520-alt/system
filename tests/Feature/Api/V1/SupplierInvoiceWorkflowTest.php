<?php

namespace Tests\Feature\Api\V1;

use App\Models\Department;
use App\Models\LandParcel;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequest;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\User;
use App\Services\PurchaseReceiptService;
use App\Services\SupplierInvoiceService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class SupplierInvoiceWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $warehouse;
    private User $siteEngineer;
    private User $accountant;
    private Department $department;
    private Supplier $supplier;
    private LandParcel $parcel;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $this->department = Department::create(['name' => 'التنفيذ', 'code' => 'EXECUTION', 'is_active' => true]);
        $this->warehouse = $this->makeUser('warehouse-invoice@test', 'أمين المخزن', 'warehouse_keeper');
        $this->siteEngineer = $this->makeUser('site-invoice@test', 'مهندس الموقع', 'site_engineer');
        $this->accountant = $this->makeUser('accountant-invoice@test', 'الحسابات', 'accountant');
        $this->supplier = Supplier::create(['code' => 'FIN-SUP-001', 'company_name' => 'مورد مالي', 'is_active' => true]);
        $this->parcel = LandParcel::create([
            'parcel_reference' => 'FIN-PARCEL-001',
            'region' => 'المنطقة السابعة والعشرون',
            'opening_balance' => 10000,
            'funded_total' => 0,
            'expense_total' => 0,
            'balance' => 10000,
            'is_active' => true,
        ]);
    }

    public function test_accountant_creates_invoice_matches_and_records_partial_payment(): void
    {
        $order = $this->makeOrder('PO-FIN-001', 1000, '2026-08-01', $this->supplier);
        $receipt = $this->approveReceipt($order, 10);
        $service = app(SupplierInvoiceService::class);

        $invoice = $service->createInvoice($this->accountant, $order, $receipt, 1000, 'INV-FIN-001', '2026-08-03', null, $this->invoiceAllocations(1000));
        $matched = $service->matchThreeWay($this->accountant, $invoice);
        $result = $service->recordPayment($this->accountant, $matched, 400, '2026-08-04');

        $this->assertSame('MATCHED', $matched->fresh()->matching_status);
        $this->assertSame('PARTIALLY_PAID', $matched->fresh()->status);
        $this->assertSame('400.00', $matched->fresh()->paid_amount);
        $this->assertSame('600.00', $matched->fresh()->outstanding_amount);
        $this->assertFalse($result['overpayment_warning']);
        $this->assertSame(600.0, $result['supplier_balance']['balance']);
        $this->assertDatabaseHas('supplier_payment_allocations', ['supplier_invoice_id' => $matched->id, 'amount' => 400]);
    }

    public function test_payment_exceeding_supplier_balance_is_recorded_with_warning(): void
    {
        $order = $this->makeOrder('PO-FIN-002', 1000, '2026-08-02', $this->supplier);
        $receipt = $this->approveReceipt($order, 10);
        $service = app(SupplierInvoiceService::class);
        $invoice = $service->matchThreeWay($this->accountant, $service->createInvoice($this->accountant, $order, $receipt, 1000, 'INV-FIN-002', null, null, $this->invoiceAllocations(1000)));

        $result = $service->recordPayment($this->accountant, $invoice, 1500, '2026-08-05');

        $this->assertTrue($result['overpayment_warning']);
        $this->assertSame('500.00', $result['payment']->fresh()->overpayment_amount);
        $this->assertSame(-500.0, $result['supplier_balance']['balance']);
        $this->assertSame('PAID', $invoice->fresh()->status);
    }

    public function test_payment_distributes_to_oldest_debt_first(): void
    {
        $service = app(SupplierInvoiceService::class);
        $oldOrder = $this->makeOrder('PO-FIN-003', 1000, '2026-08-01', $this->supplier);
        $newOrder = $this->makeOrder('PO-FIN-004', 500, '2026-08-10', $this->supplier);
        $oldInvoice = $service->matchThreeWay($this->accountant, $service->createInvoice($this->accountant, $oldOrder, $this->approveReceipt($oldOrder, 10), 1000, 'INV-FIN-003', '2026-08-01', null, $this->invoiceAllocations(1000)));
        $newInvoice = $service->matchThreeWay($this->accountant, $service->createInvoice($this->accountant, $newOrder, $this->approveReceipt($newOrder, 5), 500, 'INV-FIN-004', '2026-08-10', null, $this->invoiceAllocations(500)));

        $service->recordPayment($this->accountant, $newInvoice, 1200, '2026-08-11');

        $this->assertSame('PAID', $oldInvoice->fresh()->status);
        $this->assertSame('1000.00', $oldInvoice->fresh()->paid_amount);
        $this->assertSame('PARTIALLY_PAID', $newInvoice->fresh()->status);
        $this->assertSame('200.00', $newInvoice->fresh()->paid_amount);
        $this->assertDatabaseHas('supplier_payment_allocations', ['supplier_invoice_id' => $oldInvoice->id, 'amount' => 1000]);
        $this->assertDatabaseHas('supplier_payment_allocations', ['supplier_invoice_id' => $newInvoice->id, 'amount' => 200]);
    }

    public function test_accountant_can_create_parcel_and_record_customer_funding(): void
    {
        $createResponse = $this->actingAs($this->accountant, 'sanctum')
            ->postJson('/api/v1/accounting/land-parcels', [
                'parcel_reference' => 'FIN-PARCEL-API',
                'region' => 'المنطقة التاسعة',
                'opening_balance' => 2500,
                'transaction_date' => '2026-08-15',
                'reference_number' => 'CLIENT-OPEN-001',
            ]);

        $createResponse->assertStatus(201)
            ->assertJsonPath('data.parcel_reference', 'FIN-PARCEL-API')
            ->assertJsonPath('data.balance', '2500.00');
        $parcelId = $createResponse->json('data.id');

        $fundResponse = $this->actingAs($this->accountant, 'sanctum')
            ->postJson("/api/v1/accounting/land-parcels/{$parcelId}/fund", [
                'amount' => 750,
                'transaction_date' => '2026-08-16',
                'reference_number' => 'CLIENT-FUND-001',
            ]);

        $fundResponse->assertStatus(201)
            ->assertJsonPath('data.balance', '3250.00')
            ->assertJsonPath('message', 'تم تسجيل تمويل العميل وإضافة المبلغ إلى رصيد قطعة الأرض.');
        $this->assertDatabaseHas('land_parcel_transactions', [
            'land_parcel_id' => $parcelId,
            'transaction_type' => 'CUSTOMER_FUNDING',
            'amount' => 750,
            'balance_after' => 3250,
        ]);
    }

    public function test_manual_invoice_allocation_can_make_parcel_balance_negative(): void
    {
        $lowBalanceParcel = LandParcel::create([
            'parcel_reference' => 'FIN-PARCEL-LOW',
            'region' => 'المنطقة الثامنة',
            'opening_balance' => 100,
            'funded_total' => 0,
            'expense_total' => 0,
            'balance' => 100,
            'is_active' => true,
        ]);
        $order = $this->makeOrder('PO-FIN-NEGATIVE', 1000, '2026-08-12', $this->supplier);
        $receipt = $this->approveReceipt($order, 10);
        $invoice = app(SupplierInvoiceService::class)->createInvoice(
            $this->accountant,
            $order,
            $receipt,
            1000,
            'INV-FIN-NEGATIVE',
            null,
            null,
            [['land_parcel_id' => $lowBalanceParcel->id, 'amount' => 1000]],
        );

        $this->assertSame('OPEN', $invoice->fresh()->status);
        $this->assertSame('-900.00', $lowBalanceParcel->fresh()->balance);
        $this->assertDatabaseHas('supplier_invoice_land_allocations', [
            'supplier_invoice_id' => $invoice->id,
            'land_parcel_id' => $lowBalanceParcel->id,
            'amount' => 1000,
        ]);
        $this->assertDatabaseHas('land_parcel_transactions', [
            'land_parcel_id' => $lowBalanceParcel->id,
            'transaction_type' => 'INVOICE_EXPENSE',
            'amount' => -1000,
            'balance_after' => -900,
        ]);
    }

    public function test_invoice_allows_dynamic_manual_land_allocation(): void
    {
        $order = $this->makeOrder('PO-FIN-ALLOC-VALIDATION', 1000, '2026-08-13', $this->supplier);
        $receipt = $this->approveReceipt($order, 10);

        $invoice = app(SupplierInvoiceService::class)->createInvoice(
            $this->accountant,
            $order,
            $receipt,
            1000,
            'INV-FIN-ALLOC-VALIDATION',
            null,
            null,
            [['land_parcel_id' => $this->parcel->id, 'amount' => 999]],
        );

        $this->assertDatabaseHas('supplier_invoices', ['invoice_number' => 'INV-FIN-ALLOC-VALIDATION']);
        $this->assertEquals(999, (float) $invoice->landAllocations()->sum('amount'));
    }

    public function test_supplier_accounts_are_separate_by_supplier(): void
    {
        $secondSupplier = Supplier::create(['code' => 'FIN-SUP-002', 'company_name' => 'مورد آخر', 'is_active' => true]);
        $service = app(SupplierInvoiceService::class);
        $firstOrder = $this->makeOrder('PO-FIN-005', 700, '2026-08-01', $this->supplier);
        $secondOrder = $this->makeOrder('PO-FIN-006', 300, '2026-08-02', $secondSupplier);
        $firstInvoice = $service->matchThreeWay($this->accountant, $service->createInvoice($this->accountant, $firstOrder, $this->approveReceipt($firstOrder, 7), 700, 'INV-FIN-005', null, null, $this->invoiceAllocations(700)));
        $secondInvoice = $service->matchThreeWay($this->accountant, $service->createInvoice($this->accountant, $secondOrder, $this->approveReceipt($secondOrder, 3), 300, 'INV-FIN-006', null, null, $this->invoiceAllocations(300)));

        $service->recordPayment($this->accountant, $firstInvoice, 200);
        $firstBalance = $service->getSupplierBalance($this->supplier->id);
        $secondBalance = $service->getSupplierBalance($secondSupplier->id);

        $this->assertSame(500.0, $firstBalance['balance']);
        $this->assertSame(300.0, $secondBalance['balance']);
    }

    private function invoiceAllocations(float $amount): array
    {
        return [['land_parcel_id' => $this->parcel->id, 'amount' => $amount]];
    }

    private function makeOrder(string $poNumber, float $total, string $date, Supplier $supplier): PurchaseOrder
    {
        $employee = $this->makeUser('employee-' . strtolower($poNumber) . '@test', 'موظف الطلب ' . $poNumber, 'employee');
        $request = PurchaseRequest::create([
            'request_number' => 'PR-' . $poNumber,
            'user_id' => $employee->id,
            'department_id' => $this->department->id,
            'site_engineer_user_id' => $this->siteEngineer->id,
            'priority' => 'NORMAL',
            'status' => 'APPROVED_BY_PROCUREMENT',
            'total_estimated_cost' => $total,
            'date_needed' => $date,
        ]);
        $order = PurchaseOrder::create([
            'po_number' => $poNumber,
            'purchase_request_id' => $request->id,
            'supplier_id' => $supplier->id,
            'created_by_user_id' => $employee->id,
            'status' => 'ISSUED',
            'subtotal' => $total,
            'grand_total' => $total,
            'delivery_status' => 'NOT_STARTED',
            'created_at' => $date,
            'updated_at' => $date,
        ]);
        $order->items()->create([
            'item_description' => 'مادة بناء',
            'item_reference' => 'FIN-' . $poNumber,
            'region' => 'المنطقة السابعة والعشرون',
            'quantity' => $total / 100,
            'uom' => 'PCS',
            'unit_price' => 100,
            'line_total' => $total,
        ]);

        return $order->fresh();
    }

    private function approveReceipt(PurchaseOrder $order, float $quantity)
    {
        $item = $order->items()->first();
        $receipt = app(PurchaseReceiptService::class)->createByWarehouse(
            $this->warehouse,
            $order,
            [['purchase_order_item_id' => $item->id, 'received_quantity' => $quantity]],
        );

        return app(PurchaseReceiptService::class)->approveBySiteEngineer($this->siteEngineer, $receipt);
    }

    private function makeUser(string $email, string $name, string $roleSlug): User
    {
        $user = User::create([
            'department_id' => $this->department?->id,
            'name' => $name,
            'email' => $email,
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);
        $user->roles()->attach(Role::where('slug', $roleSlug)->firstOrFail()->id);
        return $user;
    }
}
