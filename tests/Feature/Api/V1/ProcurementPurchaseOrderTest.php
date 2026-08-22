<?php

namespace Tests\Feature\Api\V1;

use App\Models\ApprovalHistory;
use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Department;
use App\Models\Item;
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

class ProcurementPurchaseOrderTest extends TestCase
{
    use RefreshDatabase;

    private Department $dept;
    private User $procurementManager;
    private User $employee;
    private Supplier $activeSupplier;
    private Supplier $inactiveSupplier;
    private PurchaseRequest $approvedPr;
    private PurchaseRequest $unapprovedPr;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->dept = Department::create([
            'name' => 'Supply Chain',
            'code' => 'DEPT-SC',
        ]);

        $procRole = Role::where('slug', 'procurement_manager')->first();
        $empRole = Role::where('slug', 'employee')->first();

        // Procurement Manager User
        $this->procurementManager = User::create([
            'department_id' => $this->dept->id,
            'name' => 'Tariq Procurement Officer',
            'email' => 'tariq@ashbiliya.com',
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);
        $this->procurementManager->roles()->attach($procRole->id);

        // Employee User
        $this->employee = User::create([
            'department_id' => $this->dept->id,
            'name' => 'Ali Employee',
            'email' => 'ali@ashbiliya.com',
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);
        $this->employee->roles()->attach($empRole->id);

        // Suppliers
        $this->activeSupplier = Supplier::create([
            'code' => 'SUP-001',
            'company_name' => 'Al-Falak Technology Corp',
            'contact_person' => 'Khaled Commercial Mgr',
            'email' => 'info@alfalak.com',
            'phone' => '+966110000000',
            'is_active' => true,
        ]);

        $this->inactiveSupplier = Supplier::create([
            'code' => 'SUP-OLD',
            'company_name' => 'Defunct Vendor Ltd',
            'email' => 'old@vendor.com',
            'is_active' => false,
        ]);

        // Pending Procurement Approval PR
        $this->pendingProcurementPr = PurchaseRequest::create([
            'request_number' => 'PR-2026-00009',
            'user_id' => $this->employee->id,
            'department_id' => $this->dept->id,
            'title' => 'Pending Procurement Requisition',
            'status' => 'PENDING_PROCUREMENT_APPROVAL',
            'total_estimated_cost' => 5000.00,
        ]);

        // Approved PR (by procurement)
        $this->approvedPr = PurchaseRequest::create([
            'request_number' => 'PR-2026-00010',
            'user_id' => $this->employee->id,
            'department_id' => $this->dept->id,
            'title' => 'Approved Server Requisition',
            'status' => 'APPROVED_BY_PROCUREMENT',
            'total_estimated_cost' => 12000.00,
        ]);

        $this->approvedPr->items()->create([
            'item_description' => 'Rack Server 2U',
            'item_reference' => 'PO-PART-001',
            'region' => 'المنطقة السابعة والعشرون',
            'quantity' => 2,
            'uom' => 'UNIT',
            'estimated_unit_price' => 6000.00,
            'estimated_line_total' => 12000.00,
            'specifications' => '64-Core CPU, 256GB RAM',
        ]);

        // Unapproved PR
        $this->unapprovedPr = PurchaseRequest::create([
            'request_number' => 'PR-2026-00011',
            'user_id' => $this->employee->id,
            'department_id' => $this->dept->id,
            'title' => 'Draft Requisition',
            'status' => 'DRAFT',
            'total_estimated_cost' => 1000.00,
        ]);
    }

    public function test_procurement_manager_can_list_approved_prs(): void
    {
        $token = $this->procurementManager->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/procurement/purchase-requests');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals($this->pendingProcurementPr->id, $response->json('data.0.id'));
    }

    public function test_procurement_manager_can_filter_and_paginate_purchase_orders(): void
    {
        $token = $this->procurementManager->createToken('test_token')->plainTextToken;

        PurchaseOrder::create([
            'po_number' => 'PO-2026-00001',
            'purchase_request_id' => $this->approvedPr->id,
            'supplier_id' => $this->activeSupplier->id,
            'created_by_user_id' => $this->procurementManager->id,
            'status' => 'ISSUED',
            'subtotal' => 12000,
            'grand_total' => 12000,
        ]);

        $secondPr = PurchaseRequest::create([
            'request_number' => 'PR-2026-00012',
            'user_id' => $this->employee->id,
            'department_id' => $this->dept->id,
            'title' => 'Second Requisition',
            'status' => 'APPROVED_BY_PROCUREMENT',
            'total_estimated_cost' => 3000.00,
        ]);

        PurchaseOrder::create([
            'po_number' => 'PO-2026-00002',
            'purchase_request_id' => $secondPr->id,
            'supplier_id' => $this->inactiveSupplier->id,
            'created_by_user_id' => $this->procurementManager->id,
            'status' => 'REJECTED',
            'subtotal' => 3000,
            'grand_total' => 3000,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/procurement/purchase-orders?per_page=1&supplier_id=' . $this->activeSupplier->id . '&search=PR-2026-00010');

        $response->assertStatus(200)
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonPath('data.0.id', fn ($id) => is_int($id));

        $this->assertCount(1, $response->json('data'));
        $this->assertSame('PO-2026-00001', $response->json('data.0.po_number'));
    }

    public function test_procurement_manager_can_list_active_suppliers(): void
    {
        $token = $this->procurementManager->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/procurement/suppliers');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals($this->activeSupplier->id, $response->json('data.0.id'));
    }

    public function test_procurement_manager_can_create_po_from_approved_pr(): void
    {
        $token = $this->procurementManager->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/procurement/purchase-orders', [
                'purchase_request_id' => $this->approvedPr->id,
                'supplier_id' => $this->activeSupplier->id,
                'payment_terms' => 'Net 30 Days',
                'delivery_terms' => 'FOB Destination',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'data' => [
                    'purchase_request_id' => $this->approvedPr->id,
                    'supplier_id' => $this->activeSupplier->id,
                    'status' => 'ISSUED',
                    'payment_terms' => 'Net 30 Days',
                    'created_by' => [
                        'id' => $this->procurementManager->id,
                        'name' => 'Tariq Procurement Officer',
                    ],
                ],
            ]);

        $this->assertDatabaseHas('purchase_orders', [
            'purchase_request_id' => $this->approvedPr->id,
            'supplier_id' => $this->activeSupplier->id,
            'status' => 'ISSUED',
            'created_by_user_id' => $this->procurementManager->id,
        ]);

        $this->assertDatabaseHas('approval_history', [
            'action' => 'PO_CREATED',
            'to_state' => 'PO_DRAFT',
        ]);
    }

    public function test_cannot_create_po_from_unapproved_pr(): void
    {
        $token = $this->procurementManager->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/procurement/purchase-orders', [
                'purchase_request_id' => $this->unapprovedPr->id,
                'supplier_id' => $this->activeSupplier->id,
            ]);

        $response->assertStatus(409)
            ->assertJson(['message' => 'لا يمكن إنشاء أمر الشراء قبل اعتماد الحسابات للطلب المباشر أو اكتمال قرار عروض الأسعار.']);
    }

    public function test_cannot_create_po_with_inactive_supplier(): void
    {
        $token = $this->procurementManager->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/procurement/purchase-orders', [
                'purchase_request_id' => $this->approvedPr->id,
                'supplier_id' => $this->inactiveSupplier->id,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['supplier_id']);
    }

    public function test_procurement_manager_cannot_edit_an_auto_issued_po(): void
    {
        $token = $this->procurementManager->createToken('test_token')->plainTextToken;

        $createRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/procurement/purchase-orders', [
                'purchase_request_id' => $this->approvedPr->id,
                'supplier_id' => $this->activeSupplier->id,
            ]);

        $poId = $createRes->json('data.id');
        $itemId = $createRes->json('data.items.0.id');

        $updateRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/procurement/purchase-orders/' . $poId . '/items/' . $itemId, [
                'item_reference' => 'PO-PART-001',
                'region' => 'المنطقة السابعة والعشرون',
                'unit_price' => 5500.00,
            ]);

        $updateRes->assertStatus(409);
        $this->assertDatabaseMissing('audit_logs', [
            'entity_id' => $itemId,
            'field_name' => 'unit_price',
            'new_value' => '5500',
        ]);
    }

    public function test_procurement_manager_cannot_add_or_remove_items_after_po_issue(): void
    {
        $token = $this->procurementManager->createToken('test_token')->plainTextToken;

        $createRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/procurement/purchase-orders', [
                'purchase_request_id' => $this->approvedPr->id,
                'supplier_id' => $this->activeSupplier->id,
            ]);

        $poId = $createRes->json('data.id');
        $itemId = $createRes->json('data.items.0.id');

        $addRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/procurement/purchase-orders/' . $poId . '/items', [
                'item_description' => 'Extended Warranty 3 Years',
                'item_reference' => 'PO-PART-002',
                'region' => 'المنطقة السابعة والعشرون',
                'quantity' => 1,
                'unit_price' => 1500.00,
            ]);
        $addRes->assertStatus(409);

        $deleteRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->deleteJson('/api/v1/procurement/purchase-orders/' . $poId . '/items/' . $itemId);
        $deleteRes->assertStatus(409);
    }

    public function test_procurement_manager_can_submit_po_to_accounting(): void
    {
        $token = $this->procurementManager->createToken('test_token')->plainTextToken;

        $createRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/procurement/purchase-orders', [
                'purchase_request_id' => $this->approvedPr->id,
                'supplier_id' => $this->activeSupplier->id,
            ]);

        $poId = $createRes->json('data.id');

        $submitRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/procurement/purchase-orders/' . $poId . '/submit');

        $submitRes->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $poId,
                    'status' => 'ISSUED',
                ],
            ]);

        $this->assertDatabaseHas('purchase_orders', [
            'id' => $poId,
            'status' => 'ISSUED',
        ]);

        $this->assertDatabaseHas('approval_history', [
            'target_id' => $poId,
            'action' => 'PO_ISSUED',
            'to_state' => 'ISSUED',
        ]);
    }

    public function test_cannot_edit_submitted_po(): void
    {
        $token = $this->procurementManager->createToken('test_token')->plainTextToken;

        $createRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/procurement/purchase-orders', [
                'purchase_request_id' => $this->approvedPr->id,
                'supplier_id' => $this->activeSupplier->id,
            ]);

        $poId = $createRes->json('data.id');

        // Submit
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/procurement/purchase-orders/' . $poId . '/submit');

        // Attempt edit
        $editRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/procurement/purchase-orders/' . $poId, [
                'payment_terms' => 'Trying to edit submitted PO',
            ]);

        $editRes->assertStatus(409)
            ->assertJson(['message' => 'Only draft or returned purchase orders can be edited.']);
    }

    public function test_employee_cannot_access_procurement_endpoints(): void
    {
        $token = $this->employee->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/procurement/purchase-requests');

        $response->assertStatus(403);
    }
}
