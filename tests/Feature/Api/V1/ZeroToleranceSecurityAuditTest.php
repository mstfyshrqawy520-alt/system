<?php

namespace Tests\Feature\Api\V1;

use App\Models\Category;
use App\Models\Department;
use App\Models\Item;
use App\Models\Notification;
use App\Models\PurchaseOrder;
use App\Models\PurchaseReceipt;
use App\Models\PurchaseRequest;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\SupplierInvoice;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\PurchaseOrderService;
use App\Services\PurchaseReceiptService;
use App\Services\PurchaseRequestService;
use App\Services\ReviewerPurchaseRequestService;
use App\Services\SupplierInvoiceService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ZeroToleranceSecurityAuditTest extends TestCase
{
    use RefreshDatabase;

    private Department $deptA;
    private Department $deptB;
    private User $employeeA;
    private User $employeeB;
    private User $reviewerA;
    private User $reviewerB;
    private User $siteEngineer;
    private User $warehouseKeeper;
    private User $procurementManager;
    private User $financialDirector;
    private User $siteAccountant;
    private User $licensesAccountant;
    private User $gmUser;
    private Supplier $supplierA;
    private Item $item1;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->deptA = Department::create(['name' => 'Department Execution', 'code' => 'EXECUTION']);
        $this->deptB = Department::create(['name' => 'Department Buildings', 'code' => 'BUILDINGS']);

        $this->employeeA = $this->createUser('empA@ashbiliya.com', 'Employee A', 'employee', $this->deptA->id);
        $this->employeeB = $this->createUser('empB@ashbiliya.com', 'Employee B', 'employee', $this->deptB->id);

        $this->reviewerA = $this->createUser('ayman@gmail.com', 'Reviewer Ayman', 'reviewer', $this->deptA->id);
        $this->deptA->update(['manager_user_id' => $this->reviewerA->id]);

        $this->reviewerB = $this->createUser('hatem@gmail.com', 'Reviewer Hatem', 'reviewer', $this->deptB->id);
        $this->deptB->update(['manager_user_id' => $this->reviewerB->id]);

        $this->siteEngineer = $this->createUser('eng@ashbiliya.com', 'Engineer Hani', 'site_engineer', $this->deptA->id);
        $this->deptA->update(['site_engineer_user_id' => $this->siteEngineer->id]);

        $this->warehouseKeeper = $this->createUser('wh@ashbiliya.com', 'Warehouse Keeper', 'warehouse_keeper', $this->deptA->id);
        $this->procurementManager = $this->createUser('proc@ashbiliya.com', 'Procurement Tariq', 'procurement_manager', $this->deptA->id);
        $this->financialDirector = $this->createUser('hasan@gmail.com', 'Financial Director Hasan', 'accountant', $this->deptA->id);
        $this->siteAccountant = $this->createUser('siteacc@ashbiliya.com', 'Site Accountant', 'site_accountant', $this->deptA->id);
        $this->licensesAccountant = $this->createUser('licacc@ashbiliya.com', 'Licenses Accountant', 'licenses_accountant', $this->deptB->id);
        $this->gmUser = $this->createUser('gm@ashbiliya.com', 'General Manager Mohamed', 'general_manager', $this->deptA->id);

        $this->supplierA = Supplier::create(['code' => 'SUP-AUD-1', 'company_name' => 'Supplier One', 'email' => 'sup1@audit.com', 'is_active' => true]);

        $category = Category::create(['name' => 'مواد البناء', 'code' => 'BUILDING', 'is_active' => true]);
        $this->item1 = Item::create([
            'sku' => 'ITEM-AUD-01',
            'name' => 'حديد تسليح 16 مم',
            'category_id' => $category->id,
            'uom' => 'TON',
            'is_active' => true,
        ]);
    }

    private function createUser(string $email, string $name, string $roleSlug, int $deptId): User
    {
        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make('Secret123!'),
            'department_id' => $deptId,
            'is_active' => true,
        ]);
        $role = Role::where('slug', $roleSlug)->firstOrFail();
        $user->roles()->attach($role->id);
        return $user;
    }

    private function createPR(User $creator, Department $dept, string $status = 'DRAFT'): PurchaseRequest
    {
        $request = PurchaseRequest::create([
            'request_number' => 'PR-SEC-' . uniqid(),
            'user_id' => $creator->id,
            'department_id' => $dept->id,
            'target_department_id' => $dept->id,
            'reviewer_user_id' => $dept->manager_user_id,
            'site_engineer_user_id' => $dept->site_engineer_user_id,
            'priority' => 'HIGH',
            'procurement_route' => 'COMMERCIAL',
            'status' => $status,
            'total_estimated_cost' => 5000,
            'date_needed' => now()->addDays(7)->toDateString(),
        ]);
        $request->items()->create([
            'item_id' => $this->item1->id,
            'item_description' => 'حديد تسليح 16 مم للمشروع',
            'item_reference' => 'PARCEL-101',
            'region' => 'منطقة الموقع الأولى',
            'quantity' => 10,
            'uom' => 'TON',
            'estimated_unit_price' => 500,
            'estimated_line_total' => 5000,
        ]);
        return $request->fresh(['items.item', 'department', 'targetDepartment', 'requester']);
    }

    /**
     * Pillar 7: Negative Action Test (Double Submit / Double Approval Replay Attack)
     */
    public function test_double_approval_replay_attack_rejected(): void
    {
        $pr = $this->createPR($this->employeeA, $this->deptA, 'DRAFT');
        app(PurchaseRequestService::class)->submitRequest($this->employeeA, $pr, $this->siteEngineer->id);

        $revService = app(ReviewerPurchaseRequestService::class);
        $prUnderReview = $revService->startReview($this->reviewerA, $pr->fresh());

        // First approval succeeds -> PENDING_EXECUTIVE_APPROVAL
        $approved = $revService->approveRequest($this->reviewerA, $prUnderReview, 'Initial review', $this->siteEngineer->id);
        $this->assertEquals('PENDING_EXECUTIVE_APPROVAL', $approved->status);

        // Immediate replay of approval on already approved request must throw RuntimeException
        $this->expectException(\RuntimeException::class);
        $revService->approveRequest($this->reviewerA, $approved->fresh(), 'Replay approval', $this->siteEngineer->id);
    }

    /**
     * Security Scan: Public Asset Streaming without auth (BOLA detection)
     */
    /**
     * Security Scan: Asset streaming is strictly authenticated (401) and departmental scoped (403)
     */
    public function test_public_unauthenticated_file_access_is_flagged(): void
    {
        // 1. Unauthenticated access must return 401 Unauthorized
        $resQuote = $this->getJson('/api/v1/purchase-quotes/999/file');
        $resQuote->assertStatus(401);

        $resReceipt = $this->getJson('/api/v1/purchase-receipts/999/photo');
        $resReceipt->assertStatus(401);

        // 2. Cross-department access: Reviewer B (Dept B) cannot view Dept A quote
        $prA = $this->createPR($this->employeeA, $this->deptA, 'PENDING_QUOTE_RECOMMENDATIONS');
        $quoteA = \App\Models\PurchaseRequestQuote::create([
            'purchase_request_id' => $prA->id,
            'supplier_id' => $this->supplierA->id,
            'created_by_user_id' => $this->procurementManager->id,
            'unit_price' => 500,
            'quantity' => 10,
            'total_price' => 5000,
            'file_path' => 'quotes/sample.pdf',
            'status' => 'SUBMITTED',
        ]);

        \Laravel\Sanctum\Sanctum::actingAs($this->reviewerB);
        $resForbiddenQuote = $this->getJson("/api/v1/purchase-quotes/{$quoteA->id}/file");
        $resForbiddenQuote->assertStatus(403);

        // 3. Cross-department access: Licenses Accountant cannot view Execution receipt photo
        $poA = PurchaseOrder::create([
            'po_number' => 'PO-AUD-SEC-PHOTO',
            'purchase_request_id' => $prA->id,
            'supplier_id' => $this->supplierA->id,
            'created_by_user_id' => $this->procurementManager->id,
            'status' => 'ISSUED',
            'subtotal' => 5000,
            'grand_total' => 5000,
        ]);
        $receiptA = PurchaseReceipt::create([
            'receipt_number' => 'GRN-AUD-PHOTO',
            'purchase_order_id' => $poA->id,
            'purchase_request_id' => $prA->id,
            'warehouse_keeper_user_id' => $this->warehouseKeeper->id,
            'status' => 'PENDING_SITE_ENGINEER',
            'photo_path' => 'receipts/photo.jpg',
        ]);

        \Laravel\Sanctum\Sanctum::actingAs($this->licensesAccountant);
        $resForbiddenReceipt = $this->getJson("/api/v1/purchase-receipts/{$receiptA->id}/photo");
        $resForbiddenReceipt->assertStatus(403);

        // 4. Authorized user: Procurement Manager can access Dept A quote without 401 or 403
        \Laravel\Sanctum\Sanctum::actingAs($this->procurementManager);
        $resAllowedQuote = $this->getJson("/api/v1/purchase-quotes/{$quoteA->id}/file");
        $this->assertNotEquals(401, $resAllowedQuote->status());
        $this->assertNotEquals(403, $resAllowedQuote->status());
    }

    /**
     * Resubmission Cycle Bug: Reject -> Resubmit -> Reject
     */
    public function test_resubmission_cycle_reactivates_notification_with_fresh_timestamp(): void
    {
        $notifService = app(NotificationService::class);
        $pr = $this->createPR($this->employeeA, $this->deptA, 'DRAFT');

        // 1. Initial submit
        $notifService->queueNotification($this->employeeA->id, 'purchase_request_rejected', 'تم رفض الطلب', 'سبب أول', $pr);
        $notif1 = Notification::where('user_id', $this->employeeA->id)->where('notifiable_id', $pr->id)->first();
        $this->assertNotNull($notif1);

        // 2. User reads the notification
        $notif1->update(['read_at' => now()->subHour()]);
        $this->assertNotNull($notif1->fresh()->read_at);

        // 3. Reject again on same entity (Resubmission cycle)
        $notifService->queueNotification($this->employeeA->id, 'purchase_request_rejected', 'تم رفض الطلب مجدداً', 'سبب ثان', $pr);
        $notif2 = Notification::where('user_id', $this->employeeA->id)->where('notifiable_id', $pr->id)->first();

        // Must be unread (read_at = null) so it floats up in user inbox
        $this->assertNull($notif2->read_at, 'Resubmitted notification must have read_at = null');
        $this->assertEquals('تم رفض الطلب مجدداً', $notif2->title);
    }

    /**
     * Multi-Tenancy & Accountant Department Code Isolation
     */
    public function test_accountant_department_isolation_blocks_cross_department_invoicing(): void
    {
        $invoiceService = app(SupplierInvoiceService::class);

        // Build a mock approved receipt for Department A (EXECUTION)
        $pr = $this->createPR($this->employeeA, $this->deptA, 'APPROVED_BY_PROCUREMENT');
        $po = PurchaseOrder::create([
            'po_number' => 'PO-AUD-SEC-01',
            'purchase_request_id' => $pr->id,
            'supplier_id' => $this->supplierA->id,
            'created_by_user_id' => $this->procurementManager->id,
            'status' => 'ISSUED',
            'subtotal' => 5000,
            'grand_total' => 5000,
        ]);
        $poItem = $po->items()->create([
            'pr_item_id' => $pr->items->first()->id,
            'item_id' => $this->item1->id,
            'item_description' => 'حديد تسليح',
            'quantity' => 10,
            'unit_price' => 500,
            'line_total' => 5000,
            'uom' => 'TON',
        ]);
        $receipt = PurchaseReceipt::create([
            'receipt_number' => 'GRN-AUD-SEC-01',
            'purchase_order_id' => $po->id,
            'purchase_request_id' => $pr->id,
            'warehouse_keeper_user_id' => $this->warehouseKeeper->id,
            'site_engineer_user_id' => $this->siteEngineer->id,
            'status' => 'APPROVED',
            'received_at' => now()->toDateString(),
        ]);
        $receipt->items()->create([
            'purchase_order_item_id' => $poItem->id,
            'ordered_quantity' => 10,
            'received_quantity' => 10,
        ]);

        // Licenses Accountant (LICENSES only) must be blocked from invoicing an EXECUTION receipt
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('غير مصرح لك بتسجيل فواتير لهذا القسم.');
        $invoiceService->createInvoice(
            $this->licensesAccountant,
            $po,
            $receipt,
            5000,
            'INV-CROSS-DEPT-FAIL'
        );
    }
}
