<?php

namespace Tests\Feature\Api\V1;

use App\Models\ApprovalHistory;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequest;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AccountingPurchaseOrderTest extends TestCase
{
    use RefreshDatabase;

    private Department $dept;
    private User $accountant;
    private User $procurementManager;
    private User $employee;
    private Supplier $supplier;
    private PurchaseRequest $approvedPr;
    private PurchaseOrder $pendingPo;
    private PurchaseOrder $draftPo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->dept = Department::create([
            'name' => 'Finance & Accounting',
            'code' => 'DEPT-FIN',
        ]);

        $accountantRole = Role::where('slug', 'accountant')->first();
        $procRole = Role::where('slug', 'procurement_manager')->first();
        $empRole = Role::where('slug', 'employee')->first();

        // Accountant User
        $this->accountant = User::create([
            'department_id' => $this->dept->id,
            'name' => 'Fahad Accountant',
            'email' => 'fahad@ashbiliya.com',
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);
        $this->accountant->roles()->attach($accountantRole->id);

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

        // Supplier
        $this->supplier = Supplier::create([
            'code' => 'SUP-001',
            'company_name' => 'Al-Falak Technology Corp',
            'email' => 'info@alfalak.com',
            'is_active' => true,
        ]);

        // Approved PR
        $this->approvedPr = PurchaseRequest::create([
            'request_number' => 'PR-2026-00010',
            'user_id' => $this->employee->id,
            'department_id' => $this->dept->id,
            'title' => 'Approved Laptops Requisition',
            'status' => 'APPROVED_BY_REVIEWER',
            'total_estimated_cost' => 5000.00,
        ]);

        // PO pending accounting review
        $this->pendingPo = PurchaseOrder::create([
            'po_number' => 'PO-2026-00001',
            'purchase_request_id' => $this->approvedPr->id,
            'supplier_id' => $this->supplier->id,
            'created_by_user_id' => $this->procurementManager->id,
            'status' => 'PENDING_ACCOUNTING_REVIEW',
            'subtotal' => 5000.00,
            'discount_amount' => 200.00,
            'tax_amount' => 720.00,
            'grand_total' => 5520.00,
        ]);

        $this->pendingPo->items()->create([
            'item_description' => 'Laptop Core i7',
            'item_reference' => 'PART-001',
            'region' => 'المنطقة السابعة والعشرون',
            'quantity' => 2,
            'uom' => 'UNIT',
            'unit_price' => 2500.00,
            'discount_amount' => 200.00,
            'tax_amount' => 720.00,
            'line_total' => 5520.00,
        ]);

        // Draft PO
        $this->draftPo = PurchaseOrder::create([
            'po_number' => 'PO-2026-00002',
            'purchase_request_id' => $this->approvedPr->id,
            'supplier_id' => $this->supplier->id,
            'created_by_user_id' => $this->procurementManager->id,
            'status' => 'PO_DRAFT',
            'subtotal' => 1000.00,
            'grand_total' => 1000.00,
        ]);
    }

    public function test_accountant_can_list_pos_pending_accounting_review(): void
    {
        $token = $this->accountant->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/accounting/purchase-orders');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals($this->pendingPo->id, $response->json('data.0.id'));
    }

    public function test_accountant_can_view_specific_pending_po_details(): void
    {
        $token = $this->accountant->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/accounting/purchase-orders/' . $this->pendingPo->id);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $this->pendingPo->id,
                    'po_number' => 'PO-2026-00001',
                    'status' => 'PENDING_ACCOUNTING_REVIEW',
                    'subtotal' => '5000.00',
                    'grand_total' => '5520.00',
                ],
            ]);
    }

    /**
     * Phase 1: Accountant is now VIEW-ONLY. Approve endpoint must return 403.
     */
    public function test_accountant_cannot_approve_po_pending_accounting_review(): void
    {
        $token = $this->accountant->createToken('test_token')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/accounting/purchase-orders/' . $this->pendingPo->id . '/approve', [
                'comment' => 'Tax calculation and vendor line details verified.',
            ])
            ->assertStatus(403)
            ->assertJson(['message' => 'Prohibited action: Accountant has read-only access. Approval is not allowed.']);

        // Status must remain unchanged (PO was not approved)
        $this->assertDatabaseHas('purchase_orders', [
            'id'     => $this->pendingPo->id,
            'status' => 'PENDING_ACCOUNTING_REVIEW',
        ]);
    }

    /**
     * Phase 1: Accountant has no approve permission, so this returns 403 rather than 409.
     */
    public function test_cannot_approve_po_without_approve_permission(): void
    {
        $token = $this->accountant->createToken('test_token')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/accounting/purchase-orders/' . $this->draftPo->id . '/approve')
            ->assertStatus(403);
    }

    /**
     * Phase 1: Accountant is VIEW-ONLY. Return endpoint must return 403.
     */
    public function test_accountant_cannot_return_po_to_procurement(): void
    {
        $token = $this->accountant->createToken('test_token')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/accounting/purchase-orders/' . $this->pendingPo->id . '/return', [
                'comment' => 'Discount amount does not match supplier quotation contract terms.',
            ])
            ->assertStatus(403)
            ->assertJson(['message' => 'Prohibited action: Accountant has read-only access. Returning PO is not allowed.']);

        // Status must remain unchanged
        $this->assertDatabaseHas('purchase_orders', [
            'id'     => $this->pendingPo->id,
            'status' => 'PENDING_ACCOUNTING_REVIEW',
        ]);
    }

    /**
     * Phase 1: Accountant cannot reach the return endpoint, so validation never fires.
     * Confirm endpoint returns 403 with empty payload too.
     */
    public function test_return_without_permission_returns_403(): void
    {
        $token = $this->accountant->createToken('test_token')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/accounting/purchase-orders/' . $this->pendingPo->id . '/return', [])
            ->assertStatus(403);
    }

    public function test_procurement_manager_can_edit_and_resubmit_returned_po(): void
    {
        // First return PO
        $this->pendingPo->update([
            'status' => 'RETURNED_TO_PROCUREMENT',
            'financial_notes' => 'Please correct tax rate to 15%.',
        ]);

        $procToken = $this->procurementManager->createToken('proc_token')->plainTextToken;

        // Procurement edits returned PO item
        $editRes = $this->withHeader('Authorization', 'Bearer ' . $procToken)
            ->putJson('/api/v1/procurement/purchase-orders/' . $this->pendingPo->id . '/items/' . $this->pendingPo->items->first()->id, [
                'item_reference' => 'PART-001',
                'region' => 'المنطقة السابعة والعشرون',
                'tax_amount' => 750.00,
            ]);

        $editRes->assertStatus(200);

        // Procurement re-submits to accounting
        $resubmitRes = $this->withHeader('Authorization', 'Bearer ' . $procToken)
            ->postJson('/api/v1/procurement/purchase-orders/' . $this->pendingPo->id . '/submit');

        $resubmitRes->assertStatus(200)
            ->assertJson([
                'data' => [
                    'status' => 'ISSUED',
                ],
            ]);
    }

    public function test_employee_cannot_access_accounting_endpoints(): void
    {
        $token = $this->employee->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/accounting/purchase-orders');

        $response->assertStatus(403);
    }
}
