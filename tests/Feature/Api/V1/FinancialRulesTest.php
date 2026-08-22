<?php

namespace Tests\Feature\Api\V1;

use App\Models\Department;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\PurchaseRequest;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class FinancialRulesTest extends TestCase
{
    use RefreshDatabase;

    private Department $dept;
    private User $procurementManager;
    private User $employee;
    private User $accountant;
    private User $gm;
    private Supplier $activeSupplier;
    private Supplier $inactiveSupplier;
    private PurchaseRequest $approvedPr;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->dept = Department::create([
            'name' => 'Supply Chain',
            'code' => 'DEPT-SC',
        ]);

        $procRole = Role::where('slug', 'procurement_manager')->first();
        $empRole  = Role::where('slug', 'employee')->first();
        $accRole  = Role::where('slug', 'accountant')->first();
        $gmRole   = Role::where('slug', 'general_manager')->first();

        $this->procurementManager = User::create([
            'department_id' => $this->dept->id,
            'name' => 'Tariq Procurement Officer',
            'email' => 'tariq.fin@ashbiliya.local',
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);
        $this->procurementManager->roles()->attach($procRole->id);

        $this->employee = User::create([
            'department_id' => $this->dept->id,
            'name' => 'Ali Employee',
            'email' => 'ali.fin@ashbiliya.local',
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);
        $this->employee->roles()->attach($empRole->id);

        $this->accountant = User::create([
            'department_id' => $this->dept->id,
            'name' => 'Faisal Accountant',
            'email' => 'faisal.fin@ashbiliya.local',
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);
        $this->accountant->roles()->attach($accRole->id);

        $this->gm = User::create([
            'department_id' => $this->dept->id,
            'name' => 'General Manager',
            'email' => 'gm.fin@ashbiliya.local',
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);
        $this->gm->roles()->attach($gmRole->id);

        $this->activeSupplier = Supplier::create([
            'code' => 'SUP-001',
            'company_name' => 'Al-Falak Corp',
            'is_active' => true,
        ]);

        $this->inactiveSupplier = Supplier::create([
            'code' => 'SUP-INACTIVE',
            'company_name' => 'Defunct Vendor',
            'is_active' => false,
        ]);

        $this->approvedPr = PurchaseRequest::create([
            'request_number' => 'PR-2026-99001',
            'user_id' => $this->employee->id,
            'department_id' => $this->dept->id,
            'title' => 'Office Laptops Request',
            'status' => 'APPROVED_BY_PROCUREMENT',
        ]);
        $this->approvedPr->items()->create([
            'item_description' => 'Dell Latitude Laptop',
            'item_reference' => 'FIN-PART-001',
            'region' => 'المنطقة السابعة والعشرون',
            'quantity' => 5,
            'uom' => 'PCS',
        ]);
    }

    /** 1 & 4 & 5 & 6 & 7: PO creation defaults to EGP, server calculates line_total & grand_total */
    public function test_po_creation_calculates_server_side_totals_in_egp(): void
    {
        $response = $this->actingAs($this->procurementManager, 'sanctum')
            ->postJson('/api/v1/procurement/purchase-orders', [
                'purchase_request_id' => $this->approvedPr->id,
                'supplier_id' => $this->activeSupplier->id,
                'payment_terms' => '30 Days Net',
                'items' => [
                    [
                        'pr_item_id' => $this->approvedPr->items->first()->id,
                        'item_description' => 'Dell Latitude Laptop',
                        'item_reference' => 'FIN-PART-001',
                        'region' => 'المنطقة السابعة والعشرون',
                        'quantity' => 5,
                        'unit_price' => 200.00,
                    ],
                ],
            ]);

        $response->assertStatus(201);

        $data = $response->json('data');
        $this->assertEquals('EGP', $data['currency']);
        $this->assertEquals('1000.00', $data['grand_total']);
        $this->assertEquals('1000.00', $data['items'][0]['line_total']);

        $po = PurchaseOrder::find($data['id']);
        $this->assertEquals(1000.00, (float) $po->grand_total);
        $this->assertEquals(0.00, (float) $po->tax_amount);
        $this->assertEquals(0.00, (float) $po->discount_amount);
    }

    /** 8 & 9: Client-supplied line_total and grand_total cannot override server calculation */
    public function test_client_supplied_totals_ignored_by_server_recalculation(): void
    {
        $response = $this->actingAs($this->procurementManager, 'sanctum')
            ->postJson('/api/v1/procurement/purchase-orders', [
                'purchase_request_id' => $this->approvedPr->id,
                'supplier_id' => $this->activeSupplier->id,
                'line_total' => 1.00,       // spoofed client value
                'grand_total' => 1.00,      // spoofed client value
                'items' => [
                    [
                        'pr_item_id' => $this->approvedPr->items->first()->id,
                        'item_description' => 'Dell Latitude Laptop',
                        'item_reference' => 'FIN-PART-001',
                        'region' => 'المنطقة السابعة والعشرون',
                        'quantity' => 10,
                        'unit_price' => 100.00,
                        'line_total' => 5.00,   // spoofed
                    ],
                ],
            ]);

        $response->assertStatus(201);

        $data = $response->json('data');
        // Server re-calculated: 10 * 100 = 1000.00
        $this->assertEquals('1000.00', $data['grand_total']);
        $this->assertEquals('1000.00', $data['items'][0]['line_total']);
    }

    /** 10, 11, 12: Tax, VAT, and Discount cannot affect PO total */
    public function test_tax_vat_discount_cannot_affect_po_total(): void
    {
        $po = PurchaseOrder::create([
            'po_number' => 'PO-2026-TEST01',
            'purchase_request_id' => $this->approvedPr->id,
            'supplier_id' => $this->activeSupplier->id,
            'created_by_user_id' => $this->procurementManager->id,
            'status' => 'PO_DRAFT',
            'subtotal' => 1000.00,
            'grand_total' => 1000.00,
        ]);
        $item = $po->items()->create([
            'item_description' => 'Server Unit',
            'item_reference' => 'FIN-PART-002',
            'region' => 'المنطقة السابعة والعشرون',
            'quantity' => 2,
            'unit_price' => 500.00,
            'line_total' => 1000.00,
        ]);

        // Attempting to send discount_amount or tax_amount in update item
        $response = $this->actingAs($this->procurementManager, 'sanctum')
            ->putJson("/api/v1/procurement/purchase-orders/{$po->id}/items/{$item->id}", [
                'item_reference' => 'FIN-PART-002',
                'region' => 'المنطقة السابعة والعشرون',
                'quantity' => 2,
                'unit_price' => 500.00,
                'discount_amount' => 100.00,  // should be ignored
                'tax_amount' => 150.00,       // should be ignored
            ]);

        $response->assertStatus(200);

        $po->refresh();
        // Total MUST remain 2 * 500 = 1000.00 (no tax, no discount)
        $this->assertEquals(1000.00, (float) $po->grand_total);
        $this->assertEquals(0.00, (float) $po->discount_amount);
        $this->assertEquals(0.00, (float) $po->tax_amount);
    }

    /** 14: Inactive supplier rejected */
    public function test_inactive_supplier_rejected_on_po_creation(): void
    {
        $response = $this->actingAs($this->procurementManager, 'sanctum')
            ->postJson('/api/v1/procurement/purchase-orders', [
                'purchase_request_id' => $this->approvedPr->id,
                'supplier_id' => $this->inactiveSupplier->id,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['supplier_id']);
    }

    /** 15: Negative quantity rejected */
    public function test_negative_quantity_rejected(): void
    {
        $po = PurchaseOrder::create([
            'po_number' => 'PO-2026-TEST02',
            'purchase_request_id' => $this->approvedPr->id,
            'supplier_id' => $this->activeSupplier->id,
            'created_by_user_id' => $this->procurementManager->id,
            'status' => 'PO_DRAFT',
            'subtotal' => 100.00,
            'grand_total' => 100.00,
        ]);

        $response = $this->actingAs($this->procurementManager, 'sanctum')
            ->postJson("/api/v1/procurement/purchase-orders/{$po->id}/items", [
                'item_description' => 'Test Item',
                'item_reference' => 'FIN-PART-003',
                'region' => 'المنطقة السابعة والعشرون',
                'quantity' => -5,
                'unit_price' => 10.00,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['quantity']);
    }

    /** 16: Negative unit price rejected */
    public function test_negative_price_rejected(): void
    {
        $po = PurchaseOrder::create([
            'po_number' => 'PO-2026-TEST03',
            'purchase_request_id' => $this->approvedPr->id,
            'supplier_id' => $this->activeSupplier->id,
            'created_by_user_id' => $this->procurementManager->id,
            'status' => 'PO_DRAFT',
            'subtotal' => 100.00,
            'grand_total' => 100.00,
        ]);

        $response = $this->actingAs($this->procurementManager, 'sanctum')
            ->postJson("/api/v1/procurement/purchase-orders/{$po->id}/items", [
                'item_description' => 'Test Item',
                'item_reference' => 'FIN-PART-004',
                'region' => 'المنطقة السابعة والعشرون',
                'quantity' => 5,
                'unit_price' => -10.00,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['unit_price']);
    }

    /** 17: Accountant cannot modify PO */
    public function test_accountant_cannot_modify_po(): void
    {
        $po = PurchaseOrder::create([
            'po_number' => 'PO-2026-TEST04',
            'purchase_request_id' => $this->approvedPr->id,
            'supplier_id' => $this->activeSupplier->id,
            'created_by_user_id' => $this->procurementManager->id,
            'status' => 'ISSUED',
            'subtotal' => 100.00,
            'grand_total' => 100.00,
        ]);

        // Attempt edit header
        $res1 = $this->actingAs($this->accountant, 'sanctum')
            ->putJson("/api/v1/procurement/purchase-orders/{$po->id}", [
                'notes' => 'Accountant edit attempt',
            ]);
        $res1->assertStatus(403);

        // Attempt approve
        $res2 = $this->actingAs($this->accountant, 'sanctum')
            ->postJson("/api/v1/accounting/purchase-orders/{$po->id}/approve", [
                'comment' => 'Approve attempt',
            ]);
        $res2->assertStatus(403);
    }

    /** 18: GM cannot modify PO */
    public function test_gm_cannot_modify_po(): void
    {
        $po = PurchaseOrder::create([
            'po_number' => 'PO-2026-TEST05',
            'purchase_request_id' => $this->approvedPr->id,
            'supplier_id' => $this->activeSupplier->id,
            'created_by_user_id' => $this->procurementManager->id,
            'status' => 'ISSUED',
            'subtotal' => 100.00,
            'grand_total' => 100.00,
        ]);

        // Attempt edit header
        $res1 = $this->actingAs($this->gm, 'sanctum')
            ->putJson("/api/v1/procurement/purchase-orders/{$po->id}", [
                'notes' => 'GM edit attempt',
            ]);
        $res1->assertStatus(403);

        // GM has no write access to procurement endpoint (403)
        $res2 = $this->actingAs($this->gm, 'sanctum')
            ->postJson("/api/v1/procurement/purchase-orders", [
                'purchase_request_id' => $this->approvedPr->id,
                'supplier_id' => $this->activeSupplier->id,
            ]);
        $res2->assertStatus(403);
    }
}
