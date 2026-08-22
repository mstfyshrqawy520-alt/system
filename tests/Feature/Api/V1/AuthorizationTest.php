<?php

namespace Tests\Feature\Api\V1;

use App\Models\Department;
use App\Models\Permission;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequest;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\User;
use App\Services\GeneralManagerPurchaseRequestService;
use App\Services\ProcurementPurchaseRequestService;
use App\Services\PurchaseOrderService;
use App\Services\PurchaseQuoteService;
use App\Services\PurchaseRequestService;
use App\Services\ReviewerPurchaseRequestService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private Department $dept;
    private User $employee;
    private User $reviewer;
    private User $siteEngineer;
    private User $procurementManager;
    private User $accountant;
    private User $gmUser;
    private Supplier $supplier;
    private Supplier $supplierB;
    private Supplier $supplierC;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->dept = Department::create([
            'name' => 'IT Department',
            'code' => 'DEPT-IT',
        ]);

        $this->employee          = $this->makeUser('emp@t.com',  Role::where('slug','employee')->first());
        $this->reviewer          = $this->makeUser('rev@t.com',  Role::where('slug','reviewer')->first());
        $this->siteEngineer      = $this->makeUser('site@t.com', Role::where('slug','site_engineer')->first());
        $this->procurementManager= $this->makeUser('proc@t.com', Role::where('slug','procurement_manager')->first());
        $this->accountant        = $this->makeUser('acc@t.com',  Role::where('slug','accountant')->first());
        $this->gmUser            = $this->makeUser('gm@t.com',   Role::where('slug','general_manager')->first());
        $this->dept->update([
            'manager_user_id' => $this->reviewer->id,
            'site_engineer_user_id' => $this->siteEngineer->id,
        ]);

        $this->supplier = Supplier::create([
            'code'         => 'SUP-AUT',
            'company_name' => 'Authorization Test Supplier',
            'email'        => 'sup@auth.com',
            'is_active'    => true,
        ]);
        $this->supplierB = Supplier::create([
            'code' => 'SUP-AUT-B',
            'company_name' => 'Authorization Test Supplier B',
            'is_active' => true,
        ]);
        $this->supplierC = Supplier::create([
            'code' => 'SUP-AUT-C',
            'company_name' => 'Authorization Test Supplier C',
            'is_active' => true,
        ]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function makeUser(string $email, Role $role): User
    {
        $u = User::create([
            'department_id' => $this->dept->id,
            'name'  => $email,
            'email' => $email,
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);
        $u->roles()->attach($role->id);
        return $u;
    }

    private function tok(User $user): string
    {
        return $user->createToken('test')->plainTextToken;
    }

    private function makeSubmittedPr(): PurchaseRequest
    {
        $pr = PurchaseRequest::create([
            'request_number'       => 'PR-AUTH-' . uniqid(),
            'user_id'              => $this->employee->id,
            'department_id'        => $this->dept->id,
            'target_department_id' => $this->dept->id,
            'reviewer_user_id'     => $this->reviewer->id,
            'site_engineer_user_id' => $this->siteEngineer->id,
            'title'                => 'Auth Test PR',
            'status'               => 'DRAFT',
            'total_estimated_cost' => 500.00,
        ]);
        $pr->items()->create([
            'item_description'     => 'Test Item',
            'item_reference'      => 'AUTH-PART-001',
            'region'              => 'المنطقة السابعة والعشرون',
            'quantity'             => 1,
            'estimated_unit_price' => 500.00,
            'estimated_line_total' => 500.00,
        ]);
        app(PurchaseRequestService::class)->submitRequest($this->employee, $pr);
        return $pr->fresh();
    }

    private function makeIssuedPo(): PurchaseOrder
    {
        $pr = $this->makeSubmittedPr();
        app(ReviewerPurchaseRequestService::class)->approveRequest($this->reviewer, $pr, 'OK');
        $pr->refresh();
        app(GeneralManagerPurchaseRequestService::class)->approveRequest($this->gmUser, $pr, 'OK');
        $pr->refresh();
        app(ProcurementPurchaseRequestService::class)->approvePurchaseRequest($this->procurementManager, $pr, 'OK');
        $pr->refresh();
        app(PurchaseQuoteService::class)->createThreeQuotes($this->procurementManager, $pr, [
            ['supplier_id' => $this->supplier->id, 'total_amount' => 500],
            ['supplier_id' => $this->supplierB->id, 'total_amount' => 510],
            ['supplier_id' => $this->supplierC->id, 'total_amount' => 520],
        ]);
        $pr->refresh();
        $quotes = $pr->quotes()->get();
        app(PurchaseQuoteService::class)->recommend($this->accountant, $quotes[0], 'RECOMMEND', 'ماليًا مناسب.');
        app(PurchaseQuoteService::class)->recommend($this->reviewer, $quotes[0], 'RECOMMEND', 'فنيًا مناسب.');
        $pr->refresh();
        app(PurchaseQuoteService::class)->decide($this->gmUser, $pr->quotes()->first(), 'SELECT', 'تم الاختيار.');
        $pr->refresh();
        $po = app(PurchaseOrderService::class)->createPoFromPr($this->procurementManager, $pr->id, $this->supplier->id);
        app(PurchaseOrderService::class)->submitToAccounting($this->procurementManager, $po);
        return $po->fresh();
    }

    public function test_seeder_populates_all_business_roles_and_permissions(): void
    {
        $this->assertDatabaseHas('roles', ['slug' => 'employee']);
        $this->assertDatabaseHas('roles', ['slug' => 'reviewer']);
        $this->assertDatabaseHas('roles', ['slug' => 'procurement_manager']);
        $this->assertDatabaseHas('roles', ['slug' => 'accountant']);
        $this->assertDatabaseHas('roles', ['slug' => 'general_manager']);
        $this->assertDatabaseHas('roles', ['slug' => 'admin']);

        $this->assertDatabaseHas('permissions', ['slug' => 'system.users.manage']);
        $this->assertDatabaseHas('permissions', ['slug' => 'purchase_request.create']);
    }

    public function test_user_can_be_assigned_role_and_inherits_permissions(): void
    {
        $user = User::create([
            'department_id' => $this->dept->id,
            'name' => 'John Employee',
            'email' => 'john@ashbiliya.com',
            'password' => Hash::make('password'),
        ]);

        $employeeRole = Role::where('slug', 'employee')->first();
        $user->roles()->attach($employeeRole->id);

        $this->assertTrue($user->hasRole('employee'));
        $this->assertTrue($user->hasPermission('purchase_request.create'));
        $this->assertFalse($user->hasPermission('system.users.manage'));
    }

    public function test_user_can_have_multiple_roles(): void
    {
        $user = User::create([
            'department_id' => $this->dept->id,
            'name' => 'Dual Role User',
            'email' => 'dual@ashbiliya.com',
            'password' => Hash::make('password'),
        ]);

        $employeeRole = Role::where('slug', 'employee')->first();
        $reviewerRole = Role::where('slug', 'reviewer')->first();

        $user->roles()->attach([$employeeRole->id, $reviewerRole->id]);

        $this->assertTrue($user->hasAnyRole(['employee', 'reviewer']));
        $this->assertTrue($user->hasPermission('purchase_request.create'));
        $this->assertTrue($user->hasPermission('purchase_request.approve'));
    }

    public function test_user_with_required_permission_receives_200(): void
    {
        $adminUser = User::create([
            'department_id' => $this->dept->id,
            'name' => 'Admin User',
            'email' => 'admin@ashbiliya.com',
            'password' => Hash::make('password'),
        ]);

        $adminRole = Role::where('slug', 'admin')->first();
        $adminUser->roles()->attach($adminRole->id);

        $token = $adminUser->createToken('admin_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/auth/authorization-test');

        $response->assertStatus(200)
            ->assertJson(['message' => 'Authorization test successful']);
    }

    public function test_admin_can_create_user_through_admin_endpoint(): void
    {
        $adminUser = User::create([
            'department_id' => $this->dept->id,
            'name' => 'Admin Create Test',
            'email' => 'admin-create-test@ashbiliya.com',
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);
        $adminRole = Role::where('slug', 'admin')->firstOrFail();
        $employeeRole = Role::where('slug', 'employee')->firstOrFail();
        $adminUser->roles()->attach($adminRole->id);

        $token = $adminUser->createToken('admin_create_token')->plainTextToken;
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/admin/users', [
                'name' => 'Created User',
                'email' => 'created-user@ashbiliya.com',
                'password' => 'password',
                'department_id' => $this->dept->id,
                'role_ids' => [$employeeRole->id],
                'is_active' => true,
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.email', 'created-user@ashbiliya.com');
        $this->assertDatabaseHas('users', [
            'email' => 'created-user@ashbiliya.com',
            'department_id' => $this->dept->id,
        ]);
    }

    public function test_authenticated_user_without_required_permission_receives_403(): void
    {
        $employeeUser = User::create([
            'department_id' => $this->dept->id,
            'name' => 'Simple Employee',
            'email' => 'emp@ashbiliya.com',
            'password' => Hash::make('password'),
        ]);

        $employeeRole = Role::where('slug', 'employee')->first();
        $employeeUser->roles()->attach($employeeRole->id);

        $token = $employeeUser->createToken('emp_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/auth/authorization-test');

        $response->assertStatus(403)
            ->assertJson(['message' => 'ليس لديك صلاحية لتنفيذ هذا الإجراء.']);
    }

    public function test_unauthenticated_user_receives_401(): void
    {
        $response = $this->getJson('/api/v1/auth/authorization-test');

        $response->assertStatus(401);
    }

    public function test_admin_role_has_admin_permissions(): void
    {
        $adminRole = Role::where('slug', 'admin')->first();
        $this->assertTrue($adminRole->permissions->pluck('slug')->contains('system.users.manage'));
    }

    public function test_employee_role_does_not_have_admin_permissions(): void
    {
        $employeeRole = Role::where('slug', 'employee')->first();
        $this->assertFalse($employeeRole->permissions->pluck('slug')->contains('system.users.manage'));
    }

    public function test_reviewer_role_has_reviewer_permissions(): void
    {
        $reviewerRole = Role::where('slug', 'reviewer')->first();
        $this->assertTrue($reviewerRole->permissions->pluck('slug')->contains('purchase_request.edit_during_review'));
    }

    public function test_procurement_manager_role_has_procurement_permissions(): void
    {
        $procRole = Role::where('slug', 'procurement_manager')->first();
        $this->assertTrue($procRole->permissions->pluck('slug')->contains('purchase_order.create'));
    }

    public function test_accountant_role_has_accounting_permissions(): void
    {
        $accountantRole = Role::where('slug', 'accountant')->first();
        $this->assertTrue($accountantRole->permissions->pluck('slug')->contains('purchase_order.view_accounting'));
    }

    public function test_obsolete_invalid_permissions_do_not_exist(): void
    {
        $obsoleteCount = \App\Models\Permission::whereIn('slug', [
            'purchase_order.review_financial',
            'purchase_order.approve_accounting',
            'purchase_order.return_to_procurement',
        ])->count();
        $this->assertEquals(0, $obsoleteCount);
    }

    public function test_general_manager_role_has_gm_permissions(): void
    {
        $gmRole = Role::where('slug', 'general_manager')->first();
        $this->assertTrue($gmRole->permissions->pluck('slug')->contains('purchase_order.view_gm'));
    }

    // ── Phase 1 Critical Security Tests ──────────────────────────────────────

    // Employee → Procurement API (must be 403)
    public function test_employee_cannot_access_procurement_purchase_requests(): void
    {
        $this->withHeader('Authorization', 'Bearer '.$this->tok($this->employee))
            ->getJson('/api/v1/procurement/purchase-requests')
            ->assertStatus(403);
    }

    public function test_employee_cannot_access_procurement_analytics(): void
    {
        $this->withHeader('Authorization', 'Bearer '.$this->tok($this->employee))
            ->getJson('/api/v1/procurement/analytics')
            ->assertStatus(403);
    }

    public function test_employee_cannot_view_procurement_purchase_orders(): void
    {
        $this->withHeader('Authorization', 'Bearer '.$this->tok($this->employee))
            ->getJson('/api/v1/procurement/purchase-orders')
            ->assertStatus(403);
    }

    public function test_employee_cannot_create_purchase_order(): void
    {
        $this->withHeader('Authorization', 'Bearer '.$this->tok($this->employee))
            ->postJson('/api/v1/procurement/purchase-orders', [])
            ->assertStatus(403);
    }

    public function test_employee_cannot_view_suppliers(): void
    {
        $this->withHeader('Authorization', 'Bearer '.$this->tok($this->employee))
            ->getJson('/api/v1/procurement/suppliers')
            ->assertStatus(403);
    }

    public function test_employee_cannot_access_accounting_purchase_orders(): void
    {
        $this->withHeader('Authorization', 'Bearer '.$this->tok($this->employee))
            ->getJson('/api/v1/accounting/purchase-orders')
            ->assertStatus(403);
    }

    public function test_employee_cannot_access_gm_purchase_orders(): void
    {
        $this->withHeader('Authorization', 'Bearer '.$this->tok($this->employee))
            ->getJson('/api/v1/general-manager/purchase-orders')
            ->assertStatus(403);
    }

    public function test_employee_cannot_access_admin_users(): void
    {
        $this->withHeader('Authorization', 'Bearer '.$this->tok($this->employee))
            ->getJson('/api/v1/admin/users')
            ->assertStatus(403);
    }

    // Reviewer → Procurement PO API (must be 403)
    public function test_reviewer_cannot_create_purchase_order(): void
    {
        $this->withHeader('Authorization', 'Bearer '.$this->tok($this->reviewer))
            ->postJson('/api/v1/procurement/purchase-orders', [])
            ->assertStatus(403);
    }

    public function test_reviewer_cannot_issue_po_to_accounting(): void
    {
        $po = $this->makeIssuedPo();

        $this->withHeader('Authorization', 'Bearer '.$this->tok($this->reviewer))
            ->postJson("/api/v1/procurement/purchase-orders/{$po->id}/submit")
            ->assertStatus(403);
    }

    public function test_reviewer_cannot_access_admin(): void
    {
        $this->withHeader('Authorization', 'Bearer '.$this->tok($this->reviewer))
            ->getJson('/api/v1/admin/users')
            ->assertStatus(403);
    }

    // Accountant — view only (after permission removal)
    public function test_accountant_can_view_issued_po(): void
    {
        $this->makeIssuedPo();
        $this->withHeader('Authorization', 'Bearer '.$this->tok($this->accountant))
            ->getJson('/api/v1/accounting/purchase-orders')
            ->assertStatus(200);
    }

    public function test_accountant_cannot_approve_po(): void
    {
        $po = $this->makeIssuedPo();
        $this->withHeader('Authorization', 'Bearer '.$this->tok($this->accountant))
            ->postJson("/api/v1/accounting/purchase-orders/{$po->id}/approve", ['comment' => 'Approve'])
            ->assertStatus(403);
    }

    public function test_accountant_cannot_return_po_to_procurement(): void
    {
        $po = $this->makeIssuedPo();
        $this->withHeader('Authorization', 'Bearer '.$this->tok($this->accountant))
            ->postJson("/api/v1/accounting/purchase-orders/{$po->id}/return", ['comment' => 'Return'])
            ->assertStatus(403);
    }

    public function test_accountant_cannot_modify_po(): void
    {
        $po = $this->makeIssuedPo();
        $this->withHeader('Authorization', 'Bearer '.$this->tok($this->accountant))
            ->putJson("/api/v1/procurement/purchase-orders/{$po->id}", ['title' => 'Hacked'])
            ->assertStatus(403);
    }

    public function test_accountant_cannot_access_admin(): void
    {
        $this->withHeader('Authorization', 'Bearer '.$this->tok($this->accountant))
            ->getJson('/api/v1/admin/users')
            ->assertStatus(403);
    }

    // GM — view only
    public function test_gm_cannot_approve_po(): void
    {
        $po = $this->makeIssuedPo();
        $this->withHeader('Authorization', 'Bearer '.$this->tok($this->gmUser))
            ->postJson("/api/v1/accounting/purchase-orders/{$po->id}/approve", ['comment' => 'GM approve'])
            ->assertStatus(403);
    }

    public function test_gm_cannot_return_po_to_procurement(): void
    {
        $po = $this->makeIssuedPo();
        $this->withHeader('Authorization', 'Bearer '.$this->tok($this->gmUser))
            ->postJson("/api/v1/accounting/purchase-orders/{$po->id}/return", ['comment' => 'GM return'])
            ->assertStatus(403);
    }

    public function test_gm_cannot_modify_po(): void
    {
        $po = $this->makeIssuedPo();
        $this->withHeader('Authorization', 'Bearer '.$this->tok($this->gmUser))
            ->putJson("/api/v1/procurement/purchase-orders/{$po->id}", ['title' => 'GM Hacked'])
            ->assertStatus(403);
    }

    public function test_gm_cannot_access_procurement_purchase_requests(): void
    {
        $this->withHeader('Authorization', 'Bearer '.$this->tok($this->gmUser))
            ->getJson('/api/v1/procurement/purchase-requests')
            ->assertStatus(403);
    }

    public function test_gm_cannot_access_admin(): void
    {
        $this->withHeader('Authorization', 'Bearer '.$this->tok($this->gmUser))
            ->getJson('/api/v1/admin/users')
            ->assertStatus(403);
    }

    // Procurement Manager CAN access Procurement APIs
    public function test_procurement_manager_can_access_procurement_purchase_requests(): void
    {
        $this->withHeader('Authorization', 'Bearer '.$this->tok($this->procurementManager))
            ->getJson('/api/v1/procurement/purchase-requests')
            ->assertStatus(200);
    }

    public function test_procurement_manager_can_access_analytics(): void
    {
        $this->withHeader('Authorization', 'Bearer '.$this->tok($this->procurementManager))
            ->getJson('/api/v1/procurement/analytics')
            ->assertStatus(200)
            ->assertJsonStructure([
                'metrics' => ['average_po_cycle_days', 'on_time_delivery_count', 'on_time_delivery_rate'],
            ]);
    }

    public function test_procurement_manager_can_access_suppliers(): void
    {
        $this->withHeader('Authorization', 'Bearer '.$this->tok($this->procurementManager))
            ->getJson('/api/v1/procurement/suppliers')
            ->assertStatus(200);
    }

    public function test_procurement_manager_can_manage_suppliers_with_supplier_permissions(): void
    {
        $headers = ['Authorization' => 'Bearer '.$this->tok($this->procurementManager)];
        $response = $this->withHeaders($headers)->postJson('/api/v1/procurement/suppliers', [
            'company_name' => 'Managed Supplier',
            'email' => 'managed@supplier.test',
            'is_active' => true,
        ]);

        $response->assertCreated();
        $supplierId = $response->json('data.id');

        $this->withHeaders($headers)->putJson("/api/v1/procurement/suppliers/{$supplierId}", [
            'company_name' => 'Managed Supplier Updated',
        ])->assertOk();

        $this->withHeaders($headers)->deleteJson("/api/v1/procurement/suppliers/{$supplierId}")
            ->assertOk();
    }

    public function test_procurement_manager_cannot_access_admin(): void
    {
        $this->withHeader('Authorization', 'Bearer '.$this->tok($this->procurementManager))
            ->getJson('/api/v1/admin/users')
            ->assertStatus(403);
    }
}
