<?php

namespace Tests\Feature\Api\V1;

use App\Models\Department;
use App\Models\LandParcel;
use App\Models\Permission;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\PurchaseReceipt;
use App\Models\PurchaseReceiptItem;
use App\Models\PurchaseRequest;
use App\Models\PurchaseRequestItem;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\SupplierInvoice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PurchasesReportTest extends TestCase
{
    use RefreshDatabase;

    private User $accountant;
    private User $siteEngineer;
    private User $generalManager;
    private Department $executionDept;
    private Supplier $supplier;

    protected function setUp(): void
    {
        parent::setUp();

        $this->executionDept = Department::create([
            'name' => 'التنفيذ',
            'code' => 'EXECUTION',
            'is_active' => true,
        ]);

        $accountantRole = Role::firstOrCreate(['slug' => 'accountant'], ['name' => 'Accountant']);
        $gmRole = Role::firstOrCreate(['slug' => 'general_manager'], ['name' => 'General Manager']);
        $siteRole = Role::firstOrCreate(['slug' => 'site_engineer'], ['name' => 'Site Engineer']);

        $viewPerm = Permission::firstOrCreate(['slug' => 'purchase_order.view_accounting'], ['name' => 'عرض أوامر الشراء']);
        $gmViewPerm = Permission::firstOrCreate(['slug' => 'purchase_order.view_gm'], ['name' => 'عرض كمدير عام']);
        $accountantRole->permissions()->syncWithoutDetaching([$viewPerm->id]);
        $gmRole->permissions()->syncWithoutDetaching([$gmViewPerm->id]);

        $this->accountant = User::create([
            'department_id' => $this->executionDept->id,
            'name' => 'Accountant User',
            'email' => 'accountant@test.com',
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);
        $this->accountant->roles()->attach($accountantRole->id);

        $this->generalManager = User::create([
            'department_id' => $this->executionDept->id,
            'name' => 'GM User',
            'email' => 'gm@test.com',
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);
        $this->generalManager->roles()->attach($gmRole->id);

        $this->siteEngineer = User::create([
            'department_id' => $this->executionDept->id,
            'name' => 'Site Eng User',
            'email' => 'site@test.com',
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);
        $this->siteEngineer->roles()->attach($siteRole->id);

        $this->supplier = Supplier::create([
            'name' => 'معاذ',
            'company_name' => 'مورد معاذ لمواد البناء',
            'tax_number' => '123456789',
            'is_active' => true,
        ]);
    }

    public function test_unauthorized_user_is_forbidden_from_accessing_purchases_report(): void
    {
        Sanctum::actingAs($this->siteEngineer);

        $response = $this->getJson('/api/v1/reports/purchases');

        $response->assertStatus(403);
    }

    public function test_accountant_can_access_and_sees_only_accounting_registered_transactions(): void
    {
        Sanctum::actingAs($this->accountant);

        // 1. Create a PO with 5 tons of steel @ 25,000 EGP
        $pr = PurchaseRequest::create([
            'request_number' => 'PR-2026-001',
            'request_type' => 'PROJECT_MATERIALS',
            'department_id' => $this->executionDept->id,
            'user_id' => $this->accountant->id,
            'status' => 'APPROVED_BY_GENERAL_MANAGER',
            'parcel_reference' => '30',
            'region' => 'الروضة',
        ]);

        $prItem = PurchaseRequestItem::create([
            'purchase_request_id' => $pr->id,
            'item_description' => 'حديد',
            'quantity' => 5,
            'uom' => 'طن',
            'estimated_unit_price' => 25000,
            'estimated_line_total' => 125000,
            'specifications' => 'أعمدة الرابع',
            'item_reference' => '30',
            'region' => 'الروضة',
        ]);

        $po = PurchaseOrder::create([
            'po_number' => 'PO-2026-00008',
            'purchase_request_id' => $pr->id,
            'supplier_id' => $this->supplier->id,
            'created_by_user_id' => $this->accountant->id,
            'status' => 'APPROVED_BY_ACCOUNTING',
            'subtotal' => 125000,
            'grand_total' => 125000,
        ]);

        $poItem = PurchaseOrderItem::create([
            'purchase_order_id' => $po->id,
            'pr_item_id' => $prItem->id,
            'item_description' => 'حديد',
            'quantity' => 5,
            'uom' => 'طن',
            'unit_price' => 25000,
            'line_total' => 125000,
            'specifications' => 'أعمدة الرابع',
            'item_reference' => '30',
            'region' => 'الروضة',
        ]);

        // 2. Receipt created with actual received quantity = 4 tons
        $receipt = PurchaseReceipt::create([
            'purchase_order_id' => $po->id,
            'purchase_request_id' => $pr->id,
            'receiver_user_id' => $this->siteEngineer->id,
            'receipt_number' => 'REC-2026-0001',
            'receipt_type' => 'SITE_DIRECT',
            'status' => 'APPROVED',
            'received_at' => '2026-06-29',
        ]);

        $receiptItem = PurchaseReceiptItem::create([
            'purchase_receipt_id' => $receipt->id,
            'purchase_order_item_id' => $poItem->id,
            'ordered_quantity' => 5,
            'received_quantity' => 4, // Actual received: 4 tons!
        ]);

        // Prior to accounting registering the invoice: verified-only filter has 0 rows
        $responseBeforeInvoice = $this->getJson('/api/v1/reports/purchases?month=2026-06&accounting_filter=VERIFIED_ONLY');
        $responseBeforeInvoice->assertStatus(200);
        $this->assertCount(0, $responseBeforeInvoice->json('rows'));

        // 3. Accounting records the invoice: 4 tons * 25,000 = 100,000
        SupplierInvoice::create([
            'supplier_id' => $this->supplier->id,
            'purchase_order_id' => $po->id,
            'purchase_receipt_id' => $receipt->id,
            'created_by_user_id' => $this->accountant->id,
            'invoice_number' => 'INV-2026-99',
            'amount' => 100000,
            'invoice_date' => '2026-06-29',
            'status' => 'OPEN',
            'matching_status' => 'MATCHED',
        ]);

        // Now report must show the accounting verified line with 4 tons and 100,000
        $responseAfterInvoice = $this->getJson('/api/v1/reports/purchases?filter_type=monthly&month=2026-06');
        $responseAfterInvoice->assertStatus(200);
        $rows = $responseAfterInvoice->json('rows');

        $this->assertCount(1, $rows);
        $row = $rows[0];

        $this->assertEquals('حديد', $row['item_name']);
        $this->assertEquals('طن', $row['uom']);
        $this->assertEquals(4.0, (float) $row['quantity']);
        $this->assertEquals(25000.0, (float) $row['unit_price']);
        $this->assertEquals(100000.0, (float) $row['total_price']);
        $this->assertEquals('30', $row['parcel_reference']);
        $this->assertEquals('الروضة', $row['region']);
        $this->assertEquals('التنفيذ', $row['department_name']);
        $this->assertEquals('أعمدة الرابع', $row['works']);
        $this->assertStringContainsString('معاذ', $row['supplier_name']);
        $this->assertEquals('2026-06-29', $row['delivery_date']);

        // Check metrics
        $this->assertEquals(100000.0, (float) $responseAfterInvoice->json('metrics.total_amount'));
        $this->assertEquals(4.0, (float) $responseAfterInvoice->json('metrics.total_quantity'));

        // 4. Test filtering by department
        $responseFilteredDept = $this->getJson('/api/v1/reports/purchases?month=2026-06&department_id=' . $this->executionDept->id);
        $responseFilteredDept->assertStatus(200);
        $this->assertCount(1, $responseFilteredDept->json('rows'));

        $otherDept = Department::create(['name' => 'المباني', 'code' => 'BUILDINGS', 'is_active' => true]);
        $responseOtherDept = $this->getJson('/api/v1/reports/purchases?month=2026-06&department_id=' . $otherDept->id);
        $responseOtherDept->assertStatus(200);
        $this->assertCount(0, $responseOtherDept->json('rows'));

        // 5. Test daily filter
        $responseDaily = $this->getJson('/api/v1/reports/purchases?filter_type=daily&date=2026-06-29');
        $responseDaily->assertStatus(200);
        $this->assertCount(1, $responseDaily->json('rows'));

        $responseDifferentDay = $this->getJson('/api/v1/reports/purchases?filter_type=daily&date=2026-06-01');
        $responseDifferentDay->assertStatus(200);
        $this->assertCount(0, $responseDifferentDay->json('rows'));
    }

    public function test_site_accountant_can_access_purchases_report_scoped_to_allowed_departments(): void
    {
        $siteAccountantRole = Role::firstOrCreate(['slug' => 'site_accountant'], ['name' => 'Site Accountant']);
        $viewPerm = Permission::firstOrCreate(['slug' => 'purchase_order.view_accounting'], ['name' => 'عرض أوامر الشراء']);
        $siteAccountantRole->permissions()->syncWithoutDetaching([$viewPerm->id]);

        $siteAccountant = User::create([
            'department_id' => $this->executionDept->id,
            'name' => 'Habiba Site Accountant',
            'email' => 'habiba.test@example.com',
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);
        $siteAccountant->roles()->attach($siteAccountantRole->id);

        // 1. Order in EXECUTION department (allowed)
        $prExecution = PurchaseRequest::create([
            'request_number' => 'PR-EXEC-001',
            'request_type' => 'PROJECT_MATERIALS',
            'department_id' => $this->executionDept->id,
            'user_id' => $siteAccountant->id,
            'status' => 'APPROVED_BY_GENERAL_MANAGER',
        ]);
        $poExecution = PurchaseOrder::create([
            'po_number' => 'PO-EXEC-001',
            'purchase_request_id' => $prExecution->id,
            'supplier_id' => $this->supplier->id,
            'created_by_user_id' => $siteAccountant->id,
            'status' => 'APPROVED_BY_ACCOUNTING',
            'subtotal' => 50000,
            'grand_total' => 50000,
            'actual_delivery_date' => '2026-06-15',
        ]);
        PurchaseOrderItem::create([
            'purchase_order_id' => $poExecution->id,
            'item_description' => 'أسمنت تنفيذ',
            'quantity' => 10,
            'uom' => 'طن',
            'unit_price' => 5000,
            'line_total' => 50000,
        ]);

        // 2. Order in disallowed department (e.g. BUFFET)
        $disallowedDept = Department::create(['name' => 'البوفيه', 'code' => 'BUFFET', 'is_active' => true]);
        $prBuffet = PurchaseRequest::create([
            'request_number' => 'PR-BUF-001',
            'request_type' => 'OFFICE_SUPPLIES',
            'department_id' => $disallowedDept->id,
            'user_id' => $siteAccountant->id,
            'status' => 'APPROVED_BY_GENERAL_MANAGER',
        ]);
        $poBuffet = PurchaseOrder::create([
            'po_number' => 'PO-BUF-001',
            'purchase_request_id' => $prBuffet->id,
            'supplier_id' => $this->supplier->id,
            'created_by_user_id' => $siteAccountant->id,
            'status' => 'APPROVED_BY_ACCOUNTING',
            'subtotal' => 3000,
            'grand_total' => 3000,
            'actual_delivery_date' => '2026-06-15',
        ]);
        PurchaseOrderItem::create([
            'purchase_order_id' => $poBuffet->id,
            'item_description' => 'شاي وسكر',
            'quantity' => 20,
            'uom' => 'عبوة',
            'unit_price' => 150,
            'line_total' => 3000,
        ]);

        Sanctum::actingAs($siteAccountant);

        $response = $this->getJson('/api/v1/reports/purchases?month=2026-06');
        $response->assertStatus(200);

        $rows = $response->json('rows');
        $this->assertCount(1, $rows);
        $this->assertEquals('أسمنت تنفيذ', $rows[0]['item_name']);
        $this->assertEquals('التنفيذ', $rows[0]['department_name']);
    }

    public function test_purchases_report_pagination_supports_page_and_per_page(): void
    {
        Sanctum::actingAs($this->accountant);

        $pr = PurchaseRequest::create([
            'request_number' => 'PR-2026-PAG',
            'request_type' => 'PROJECT_MATERIALS',
            'department_id' => $this->executionDept->id,
            'user_id' => $this->accountant->id,
            'status' => 'APPROVED_BY_GENERAL_MANAGER',
            'parcel_reference' => '55',
            'region' => 'حي الأندلس',
        ]);

        $po = PurchaseOrder::create([
            'po_number' => 'PO-2026-PAG-01',
            'purchase_request_id' => $pr->id,
            'supplier_id' => $this->supplier->id,
            'created_by_user_id' => $this->accountant->id,
            'status' => 'APPROVED_BY_ACCOUNTING',
            'subtotal' => 10000,
            'grand_total' => 10000,
            'actual_delivery_date' => '2026-07-10',
        ]);

        for ($i = 1; $i <= 5; $i++) {
            PurchaseOrderItem::create([
                'purchase_order_id' => $po->id,
                'item_description' => "صنف ترقيم {$i}",
                'quantity' => 10,
                'uom' => 'متر',
                'unit_price' => 200,
                'line_total' => 2000,
            ]);
        }

        // Test page 1 with per_page = 2
        $response1 = $this->getJson('/api/v1/reports/purchases?month=2026-07&per_page=2&page=1');
        $response1->assertStatus(200);
        $response1->assertJsonPath('pagination.current_page', 1);
        $response1->assertJsonPath('pagination.per_page', 2);
        $response1->assertJsonPath('pagination.total', 5);
        $response1->assertJsonPath('pagination.last_page', 3);
        $this->assertCount(2, $response1->json('rows'));

        // Test page 3 with per_page = 2 (remaining 1 item)
        $response3 = $this->getJson('/api/v1/reports/purchases?month=2026-07&per_page=2&page=3');
        $response3->assertStatus(200);
        $response3->assertJsonPath('pagination.current_page', 3);
        $this->assertCount(1, $response3->json('rows'));

        // Test per_page = ALL returns all 5 items
        $responseAll = $this->getJson('/api/v1/reports/purchases?month=2026-07&per_page=ALL');
        $responseAll->assertStatus(200);
        $this->assertCount(5, $responseAll->json('rows'));
    }
}
