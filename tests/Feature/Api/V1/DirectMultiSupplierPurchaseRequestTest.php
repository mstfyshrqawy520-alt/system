<?php

namespace Tests\Feature\Api\V1;

use App\Models\Category;
use App\Models\Department;
use App\Models\Item;
use App\Models\LandParcel;
use App\Models\PurchaseRequest;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DirectMultiSupplierPurchaseRequestTest extends TestCase
{
    use RefreshDatabase;

    private Department $department;
    private User $employee;
    private User $procurementManager;
    private User $accountant;
    private Supplier $supplierA;
    private Supplier $supplierB;
    private Item $catalogItem1;
    private Item $catalogItem2;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->department = Department::create([
            'code' => 'OPS-DEPT',
            'name' => 'Operations Department',
            'is_active' => true,
        ]);

        $roleEmployee = Role::where('slug', 'employee')->first();
        $roleProcurement = Role::where('slug', 'procurement_manager')->first();
        $roleAccountant = Role::where('slug', 'accountant')->first();

        $this->employee = User::create([
            'name' => 'Kareem Requester',
            'email' => 'kareem@ashbiliya.com',
            'password' => bcrypt('Password123!'),
            'department_id' => $this->department->id,
            'is_active' => true,
        ]);
        $this->employee->roles()->attach($roleEmployee);

        $this->procurementManager = User::create([
            'name' => 'Faisal Procurement Mgr',
            'email' => 'faisal-direct@ashbiliya.com',
            'password' => bcrypt('Password123!'),
            'department_id' => $this->department->id,
            'is_active' => true,
        ]);
        $this->procurementManager->roles()->attach($roleProcurement);

        $this->accountant = User::create([
            'name' => 'Huda Accountant',
            'email' => 'huda@ashbiliya.com',
            'password' => bcrypt('Password123!'),
            'department_id' => $this->department->id,
            'is_active' => true,
        ]);
        $this->accountant->roles()->attach($roleAccountant);

        $category = Category::create([
            'code' => 'CAT-BUILD',
            'name' => 'Building Materials',
            'is_active' => true,
        ]);

        $this->catalogItem1 = Item::create([
            'category_id' => $category->id,
            'sku' => 'SKU-CEM-01',
            'name' => 'أسمنت مقاوم 50 كجم',
            'uom' => 'BAG',
            'is_active' => true,
        ]);

        $this->catalogItem2 = Item::create([
            'category_id' => $category->id,
            'sku' => 'SKU-STL-01',
            'name' => 'حديد تسليح 12 مم',
            'uom' => 'TON',
            'is_active' => true,
        ]);

        // Clean any pre-existing suppliers from migrations
        Supplier::query()->delete();

        $this->supplierA = Supplier::create([
            'code' => 'SUP-CEM-CO',
            'company_name' => 'شركة الأسمنت المتحد',
            'contact_person' => 'م. حازم',
            'is_active' => true,
        ]);

        $this->supplierB = Supplier::create([
            'code' => 'SUP-STL-CO',
            'company_name' => 'شركة الحديد والصلب المصرية',
            'contact_person' => 'أ. سامح',
            'is_active' => true,
        ]);

        LandParcel::create([
            'parcel_reference' => 'PARCEL-101',
            'region' => 'منطقة الأمل',
            'is_active' => true,
        ]);

        LandParcel::create([
            'parcel_reference' => 'PARCEL-102',
            'region' => 'منطقة النور',
            'is_active' => true,
        ]);
    }

    public function test_procurement_can_route_direct_pr_with_multiple_suppliers_and_accounting_can_approve(): void
    {
        // 1. Create a purchase request in PENDING_PROCUREMENT_APPROVAL state
        $pr = PurchaseRequest::create([
            'request_number' => 'PR-MULTI-SUP-' . uniqid(),
            'user_id' => $this->employee->id,
            'department_id' => $this->department->id,
            'target_department_id' => $this->department->id,
            'priority' => 'HIGH',
            'status' => 'PENDING_PROCUREMENT_APPROVAL',
            'procurement_route' => 'UNDECIDED',
            'date_needed' => now()->addDays(7)->toDateString(),
        ]);

        $item1 = $pr->items()->create([
            'item_id' => $this->catalogItem1->id,
            'item_description' => $this->catalogItem1->name,
            'item_reference' => 'PARCEL-101',
            'region' => 'منطقة الأمل',
            'quantity' => 100,
            'uom' => 'BAG',
            'estimated_unit_price' => 150.00,
            'estimated_line_total' => 15000.00,
        ]);

        $item2 = $pr->items()->create([
            'item_id' => $this->catalogItem2->id,
            'item_description' => $this->catalogItem2->name,
            'item_reference' => 'PARCEL-102',
            'region' => 'منطقة النور',
            'quantity' => 10,
            'uom' => 'TON',
            'estimated_unit_price' => 25000.00,
            'estimated_line_total' => 250000.00,
        ]);

        // 2. Procurement Manager routes as direct purchase with Item 1 -> Supplier A, Item 2 -> Supplier B
        $routeResponse = $this->actingAs($this->procurementManager, 'sanctum')
            ->postJson("/api/v1/procurement/purchase-requests/{$pr->id}/approve", [
                'use_quotes' => false,
                'financial_data' => [
                    'items' => [
                        [
                            'pr_item_id' => $item1->id,
                            'supplier_id' => $this->supplierA->id,
                            'quantity' => 100,
                            'unit_price' => 140.00,
                        ],
                        [
                            'pr_item_id' => $item2->id,
                            'supplier_id' => $this->supplierB->id,
                            'quantity' => 10,
                            'unit_price' => 24500.00,
                        ],
                    ],
                    'notes' => 'شراء مباشر معتمد من الموردين المعتمدين لكل مادة.',
                ],
                'comment' => 'تم تحديد الموردين والأسعار بناء على الاتفاقيات المباشرة.',
            ]);

        $routeResponse->assertStatus(200)
            ->assertJsonPath('data.status', 'PENDING_ACCOUNTING_APPROVAL')
            ->assertJsonPath('data.procurement_route', 'DIRECT')
            ->assertJsonPath('data.total_estimated_cost', '259000.00');

        $this->assertDatabaseHas('purchase_request_items', [
            'id' => $item1->id,
            'supplier_id' => $this->supplierA->id,
            'estimated_unit_price' => 140.00,
            'estimated_line_total' => 14000.00,
        ]);

        $this->assertDatabaseHas('purchase_request_items', [
            'id' => $item2->id,
            'supplier_id' => $this->supplierB->id,
            'estimated_unit_price' => 24500.00,
            'estimated_line_total' => 245000.00,
        ]);

        // 3. Accounting reviews and approves with per-item suppliers
        $accountingApproveResponse = $this->actingAs($this->accountant, 'sanctum')
            ->postJson("/api/v1/accounting/purchase-requests/{$pr->id}/direct-approve", [
                'financial_data' => [
                    'items' => [
                        [
                            'pr_item_id' => $item1->id,
                            'supplier_id' => $this->supplierA->id,
                            'quantity' => 100,
                            'unit_price' => 140.00,
                        ],
                        [
                            'pr_item_id' => $item2->id,
                            'supplier_id' => $this->supplierB->id,
                            'quantity' => 10,
                            'unit_price' => 24500.00,
                        ],
                    ],
                    'notes' => 'تمت المراجعة المالية والاعتماد بنجاح.',
                ],
                'comment' => 'معتمد مالياً.',
            ]);

        $accountingApproveResponse->assertStatus(200)
            ->assertJsonPath('data.status', 'APPROVED_BY_ACCOUNTING');

        // 4. Procurement Manager creates PO-1 for Supplier A (Cement)
        $po1Response = $this->actingAs($this->procurementManager, 'sanctum')
            ->postJson('/api/v1/procurement/purchase-orders', [
                'purchase_request_id' => $pr->id,
                'supplier_id' => $this->supplierA->id,
                'payment_terms' => 'دفع عند الاستلام',
                'delivery_date' => now()->addDays(3)->toDateString(),
            ]);

        $po1Response->assertStatus(201)
            ->assertJsonPath('data.supplier.id', $this->supplierA->id)
            ->assertJsonPath('data.grand_total', '14000.00');

        // PO-1 must only contain Item 1 (Cement)
        $po1Items = $po1Response->json('data.items');
        $this->assertCount(1, $po1Items);
        $this->assertEquals($item1->id, $po1Items[0]['pr_item_id']);
        $this->assertEquals('140.00', $po1Items[0]['unit_price']);

        // 5. Procurement Manager creates PO-2 for Supplier B (Steel)
        $po2Response = $this->actingAs($this->procurementManager, 'sanctum')
            ->postJson('/api/v1/procurement/purchase-orders', [
                'purchase_request_id' => $pr->id,
                'supplier_id' => $this->supplierB->id,
                'payment_terms' => 'آجل 30 يوم',
                'delivery_date' => now()->addDays(5)->toDateString(),
            ]);

        $po2Response->assertStatus(201)
            ->assertJsonPath('data.supplier.id', $this->supplierB->id)
            ->assertJsonPath('data.grand_total', '245000.00');

        // PO-2 must only contain Item 2 (Steel)
        $po2Items = $po2Response->json('data.items');
        $this->assertCount(1, $po2Items);
        $this->assertEquals($item2->id, $po2Items[0]['pr_item_id']);
        $this->assertEquals(24500.00, $po2Items[0]['unit_price']);

        // 6. Verify that trying to create a PO for a supplier not assigned to any item fails
        $unassignedSupplier = Supplier::create([
            'code' => 'SUP-UNASSIGNED',
            'company_name' => 'مورد آخر غير معني',
            'is_active' => true,
        ]);

        $invalidPoResponse = $this->actingAs($this->procurementManager, 'sanctum')
            ->postJson('/api/v1/procurement/purchase-orders', [
                'purchase_request_id' => $pr->id,
                'supplier_id' => $unassignedSupplier->id,
            ]);

        $invalidPoResponse->assertStatus(409);
    }

    public function test_cannot_assign_inactive_supplier_in_direct_route(): void
    {
        $inactiveSupplier = Supplier::create([
            'code' => 'SUP-INACTIVE',
            'company_name' => 'مورد معطل أو مغلق',
            'is_active' => false,
        ]);

        $pr = PurchaseRequest::create([
            'request_number' => 'PR-INACTIVE-TEST-' . uniqid(),
            'user_id' => $this->employee->id,
            'department_id' => $this->department->id,
            'target_department_id' => $this->department->id,
            'priority' => 'NORMAL',
            'status' => 'PENDING_PROCUREMENT_APPROVAL',
            'procurement_route' => 'UNDECIDED',
            'date_needed' => now()->addDays(7)->toDateString(),
        ]);

        $item = $pr->items()->create([
            'item_id' => $this->catalogItem1->id,
            'item_description' => $this->catalogItem1->name,
            'item_reference' => 'PARCEL-101',
            'region' => 'منطقة الأمل',
            'quantity' => 10,
            'uom' => 'BAG',
            'estimated_unit_price' => 150.00,
            'estimated_line_total' => 1500.00,
        ]);

        $response = $this->actingAs($this->procurementManager, 'sanctum')
            ->postJson("/api/v1/procurement/purchase-requests/{$pr->id}/approve", [
                'use_quotes' => false,
                'financial_data' => [
                    'items' => [
                        [
                            'pr_item_id' => $item->id,
                            'supplier_id' => $inactiveSupplier->id,
                            'quantity' => 10,
                            'unit_price' => 150.00,
                        ],
                    ],
                ],
            ]);

        $response->assertStatus(422);
    }

    public function test_legacy_single_supplier_payload_is_fully_supported(): void
    {
        $pr = PurchaseRequest::create([
            'request_number' => 'PR-LEGACY-TEST-' . uniqid(),
            'user_id' => $this->employee->id,
            'department_id' => $this->department->id,
            'target_department_id' => $this->department->id,
            'priority' => 'NORMAL',
            'status' => 'PENDING_PROCUREMENT_APPROVAL',
            'procurement_route' => 'UNDECIDED',
            'date_needed' => now()->addDays(7)->toDateString(),
        ]);

        $item = $pr->items()->create([
            'item_id' => $this->catalogItem1->id,
            'item_description' => $this->catalogItem1->name,
            'item_reference' => 'PARCEL-101',
            'region' => 'منطقة الأمل',
            'quantity' => 20,
            'uom' => 'BAG',
            'estimated_unit_price' => 150.00,
            'estimated_line_total' => 3000.00,
        ]);

        // Legacy format passes top-level supplier_id and items without supplier_id
        $response = $this->actingAs($this->procurementManager, 'sanctum')
            ->postJson("/api/v1/procurement/purchase-requests/{$pr->id}/approve", [
                'use_quotes' => false,
                'financial_data' => [
                    'supplier_id' => $this->supplierA->id,
                    'items' => [
                        [
                            'pr_item_id' => $item->id,
                            'quantity' => 20,
                            'unit_price' => 145.00,
                        ],
                    ],
                ],
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'PENDING_ACCOUNTING_APPROVAL')
            ->assertJsonPath('data.direct_supplier_id', $this->supplierA->id);

        $this->assertDatabaseHas('purchase_request_items', [
            'id' => $item->id,
            'supplier_id' => $this->supplierA->id,
            'estimated_unit_price' => 145.00,
        ]);
    }
}
