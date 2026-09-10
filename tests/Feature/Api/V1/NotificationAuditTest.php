<?php

namespace Tests\Feature\Api\V1;

use App\Http\Resources\NotificationResource;
use App\Models\Category;
use App\Models\Department;
use App\Models\Item;
use App\Models\Notification;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequest;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\ProcurementPurchaseRequestService;
use App\Services\PurchaseOrderService;
use App\Services\PurchaseQuoteService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class NotificationAuditTest extends TestCase
{
    use RefreshDatabase;

    private Department $dept;
    private User $employee;
    private User $reviewer;
    private User $procurementManager;
    private User $financialDirector;
    private User $siteAccountant;
    private User $gmUser;
    private Supplier $supplierA;
    private Supplier $supplierB;
    private Supplier $supplierC;
    private Item $item;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->dept = Department::create([
            'name' => 'Site Engineering Operations',
            'code' => 'SITE',
        ]);

        $this->employee = User::create([
            'department_id' => $this->dept->id,
            'name' => 'Site Requester',
            'email' => 'site-req@ashbiliya.com',
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);
        $this->employee->roles()->attach(Role::where('slug', 'employee')->first()->id);

        $this->reviewer = User::create([
            'department_id' => $this->dept->id,
            'name' => 'Department Reviewer',
            'email' => 'dept-reviewer@ashbiliya.com',
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);
        $this->reviewer->roles()->attach(Role::where('slug', 'reviewer')->first()->id);
        $this->dept->update(['manager_user_id' => $this->reviewer->id]);

        $this->procurementManager = User::create([
            'department_id' => $this->dept->id,
            'name' => 'Procurement Officer',
            'email' => 'procurement-officer@ashbiliya.com',
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);
        $this->procurementManager->roles()->attach(Role::where('slug', 'procurement_manager')->first()->id);

        $this->financialDirector = User::create([
            'department_id' => $this->dept->id,
            'name' => 'Hasan Financial Director',
            'email' => 'hasan-fd@ashbiliya.com',
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);
        $this->financialDirector->roles()->attach(Role::where('slug', 'accountant')->first()->id);

        $this->siteAccountant = User::create([
            'department_id' => $this->dept->id,
            'name' => 'Site Department Accountant',
            'email' => 'site-acc@ashbiliya.com',
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);
        $this->siteAccountant->roles()->attach(Role::where('slug', 'site_accountant')->first()->id);

        $this->gmUser = User::create([
            'department_id' => $this->dept->id,
            'name' => 'Mohamed GM',
            'email' => 'mohamed-gm@ashbiliya.com',
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);
        $this->gmUser->roles()->attach(Role::where('slug', 'general_manager')->first()->id);

        $this->supplierA = Supplier::create([
            'code' => 'SUP-AUDIT-A',
            'company_name' => 'Supplier Alpha',
            'email' => 'alpha@audit.com',
            'is_active' => true,
        ]);
        $this->supplierB = Supplier::create([
            'code' => 'SUP-AUDIT-B',
            'company_name' => 'Supplier Beta',
            'email' => 'beta@audit.com',
            'is_active' => true,
        ]);
        $this->supplierC = Supplier::create([
            'code' => 'SUP-AUDIT-C',
            'company_name' => 'Supplier Gamma',
            'email' => 'gamma@audit.com',
            'is_active' => true,
        ]);

        $category = Category::create(['name' => 'مواد البناء', 'code' => 'BUILDING', 'is_active' => true]);
        $this->item = Item::create([
            'sku' => 'ITEM-AUDIT-01',
            'name' => 'Reinforced Steel 16mm',
            'category_id' => $category->id,
            'uom' => 'TON',
            'is_active' => true,
        ]);
    }

    private function makeRequest(string $status = 'PENDING_PROCUREMENT_APPROVAL'): PurchaseRequest
    {
        $request = PurchaseRequest::create([
            'request_number' => 'PR-AUDIT-' . uniqid(),
            'user_id' => $this->employee->id,
            'department_id' => $this->dept->id,
            'reviewer_user_id' => $this->reviewer->id,
            'priority' => 'HIGH',
            'procurement_route' => 'COMMERCIAL',
            'status' => $status,
            'total_estimated_cost' => 1000,
            'date_needed' => now()->toDateString(),
        ]);
        $request->items()->create([
            'item_id' => $this->item->id,
            'item_description' => 'Reinforced Steel 16mm',
            'item_reference' => 'AUDIT-PART-001',
            'region' => 'منطقة الموقع',
            'quantity' => 10,
            'uom' => 'TON',
            'estimated_unit_price' => 100,
            'estimated_line_total' => 1000,
        ]);
        return $request->fresh(['items.item', 'department', 'requester']);
    }

    /**
     * Pillar 1: Exclude Financial Director from PO issuance notifications.
     * Only the scoped Department Accountant gets the informational notice.
     */
    public function test_po_issuance_excludes_financial_director_and_notifies_department_accountant(): void
    {
        $pr = $this->makeRequest('APPROVED_BY_PROCUREMENT');

        $poService = app(PurchaseOrderService::class);
        $po = $poService->createPoFromPr($this->procurementManager, $pr->id, $this->supplierA->id, [
            'payment_terms' => 'NET 30',
        ]);

        $poService->submitToAccounting($this->procurementManager, $po);

        // Site department accountant should receive the awareness notification
        $siteAccNotifs = Notification::where('user_id', $this->siteAccountant->id)
            ->where('type', 'purchase_order_issued_accounting')
            ->get();
        $this->assertCount(1, $siteAccNotifs);

        // Financial Director (accountant) must NOT receive PO issuance notification
        $fdNotifs = Notification::where('user_id', $this->financialDirector->id)
            ->where('type', 'purchase_order_issued_accounting')
            ->get();
        $this->assertCount(0, $fdNotifs, 'Financial Director must be excluded from PO issuance notifications');
    }

    /**
     * Pillar 2: Auto-Resolution (markEntityNotificationsAsRead) on completion of action.
     */
    public function test_auto_resolution_cleans_notifications_on_action_completion(): void
    {
        $pr = $this->makeRequest('PENDING_QUOTE_RECOMMENDATIONS');

        // Simulate procurement notification pending
        app(NotificationService::class)->queueNotification(
            $this->procurementManager,
            'purchase_request_pending_procurement',
            'طلب شراء جديد بانتظار عروض الأسعار',
            'يرجى إدخال عروض الأسعار',
            $pr
        );

        $initialProcNotif = Notification::where('user_id', $this->procurementManager->id)
            ->where('notifiable_id', $pr->id)
            ->whereNull('read_at')
            ->first();
        $this->assertNotNull($initialProcNotif);

        // Step 1: Procurement creates quotes -> auto-resolves procurement's notification
        $quoteService = app(PurchaseQuoteService::class);
        $quoteService->createQuotes($this->procurementManager, $pr, [
            ['supplier_id' => $this->supplierA->id, 'unit_price' => 100, 'total_amount' => 1000],
            ['supplier_id' => $this->supplierB->id, 'unit_price' => 95, 'total_amount' => 950],
            ['supplier_id' => $this->supplierC->id, 'unit_price' => 90, 'total_amount' => 900],
        ]);

        $procNotifAfterQuotes = Notification::where('user_id', $this->procurementManager->id)
            ->where('notifiable_id', $pr->id)
            ->where('type', 'purchase_request_pending_procurement')
            ->first();
        $this->assertNotNull($procNotifAfterQuotes->read_at, 'Procurement notification must be auto-resolved upon quote creation');

        // Step 2: Financial Director recommends -> auto-resolves Financial Director's recommendation notification
        $fdNotif = Notification::where('user_id', $this->financialDirector->id)
            ->where('notifiable_id', $pr->id)
            ->where('type', 'purchase_quote_pending_recommendation')
            ->first();
        $this->assertNotNull($fdNotif);
        $this->assertNull($fdNotif->read_at);

        $pr->refresh();
        $cheapestQuote = $pr->quotes->sortBy('total_price')->first();
        $quoteService->recommend($this->financialDirector, $cheapestQuote, 'RECOMMEND', 'Lowest price verified');

        $fdNotif->refresh();
        $this->assertNotNull($fdNotif->read_at, 'Financial Director recommendation notification must be auto-resolved');
    }

    /**
     * Pillar 3: Resubmission Bug (reactivation of notification with updated timestamp and unread status).
     */
    public function test_resubmission_reactivates_notification_and_updates_timestamp(): void
    {
        $pr = $this->makeRequest();
        $notificationService = app(NotificationService::class);

        // Initial rejection notification
        $notification = $notificationService->createNotification(
            $this->employee,
            'purchase_request_rejected',
            'تم رفض طلب الشراء',
            'تم رفض طلب الشراء لسبب نقص المواصفات.',
            $pr
        );

        $this->assertNotNull($notification);
        $this->assertNull($notification->read_at);

        // User marks notification as read at an earlier time
        $oldTimestamp = now()->subHours(5);
        $notification->update(['read_at' => $oldTimestamp, 'created_at' => $oldTimestamp]);
        $this->assertNotNull($notification->fresh()->read_at);

        // Re-triggering rejection (e.g. after edit & second rejection)
        $reactivated = $notificationService->createNotification(
            $this->employee,
            'purchase_request_rejected',
            'تم رفض طلب الشراء مرة ثانية',
            'تم رفض طلب الشراء مرة ثانية لعدم استيفاء الملاحظات.',
            $pr
        );

        $this->assertEquals($notification->id, $reactivated->id);
        $this->assertNull($reactivated->read_at, 'Notification must be reactivated to unread');
        $this->assertEquals('تم رفض طلب الشراء مرة ثانية', $reactivated->title);
        $this->assertTrue($reactivated->fresh()->created_at->greaterThan($oldTimestamp), 'Notification created_at timestamp must be refreshed');
    }

    /**
     * Pillar 4: Role-Tailored Deep Links (target_url).
     */
    public function test_role_tailored_deep_links(): void
    {
        $pr = PurchaseRequest::create([
            'request_number' => 'PR-AUDIT-URL',
            'department_id' => $this->dept->id,
            'user_id' => $this->employee->id,
            'status' => 'PENDING_QUOTE_RECOMMENDATIONS',
            'procurement_route' => 'COMMERCIAL',
        ]);

        $notification = new Notification([
            'user_id' => $this->financialDirector->id,
            'type' => 'purchase_quote_pending_recommendation',
            'title' => 'عروض أسعار بانتظار التوصية المالية',
            'message' => 'عروض أسعار بانتظار التوصية',
            'notifiable_type' => PurchaseRequest::class,
            'notifiable_id' => $pr->id,
        ]);
        $notification->id = 999;
        $notification->setRelation('user', $this->financialDirector);

        // 1. Accountant -> /accounting/purchase-quotes?open={id}
        $request = Request::create('/');
        $request->setUserResolver(fn () => $this->financialDirector);
        $resource = (new NotificationResource($notification))->toArray($request);
        $this->assertEquals("/accounting/purchase-quotes?open={$pr->id}", $resource['target_url']);

        // 2. Reviewer -> /reviewer/purchase-quotes?open={id}
        $notification->user_id = $this->reviewer->id;
        $notification->setRelation('user', $this->reviewer);
        $request->setUserResolver(fn () => $this->reviewer);
        $resource = (new NotificationResource($notification))->toArray($request);
        $this->assertEquals("/reviewer/purchase-quotes?open={$pr->id}", $resource['target_url']);

        // 3. General Manager -> /general-manager/purchase-quotes?open={id}
        $notification->user_id = $this->gmUser->id;
        $notification->setRelation('user', $this->gmUser);
        $notification->type = 'purchase_quote_recommendations_ready';
        $request->setUserResolver(fn () => $this->gmUser);
        $resource = (new NotificationResource($notification))->toArray($request);
        $this->assertEquals("/general-manager/purchase-quotes?open={$pr->id}", $resource['target_url']);

        // 4. Procurement Manager -> /procurement/purchase-orders/create?pr={id}
        $notification->user_id = $this->procurementManager->id;
        $notification->setRelation('user', $this->procurementManager);
        $notification->type = 'purchase_quote_decision_complete';
        $request->setUserResolver(fn () => $this->procurementManager);
        $resource = (new NotificationResource($notification))->toArray($request);
        $this->assertEquals("/procurement/purchase-orders/create?pr={$pr->id}", $resource['target_url']);
    }

    /**
     * Pillar 5: Sequential Quote Recommendation Workflow:
     * Procurement submits -> Financial Director recommends first -> Reviewer recommends second -> GM decides.
     * Department Reviewer does NOT see or get alerted until Financial Director recommends.
     */
    public function test_sequential_quote_recommendation_workflow(): void
    {
        $pr = $this->makeRequest('PENDING_QUOTE_RECOMMENDATIONS');

        $quoteService = app(PurchaseQuoteService::class);
        $quoteService->createQuotes($this->procurementManager, $pr, [
            ['supplier_id' => $this->supplierA->id, 'unit_price' => 120, 'total_amount' => 1200],
            ['supplier_id' => $this->supplierB->id, 'unit_price' => 110, 'total_amount' => 1100],
            ['supplier_id' => $this->supplierC->id, 'unit_price' => 100, 'total_amount' => 1000],
        ]);

        // Step A: Only Financial Director (Hasan) is notified first
        $fdNotifs = Notification::where('user_id', $this->financialDirector->id)
            ->where('type', 'purchase_quote_pending_recommendation')
            ->get();
        $this->assertCount(1, $fdNotifs);

        $revNotifs = Notification::where('user_id', $this->reviewer->id)
            ->where('type', 'purchase_quote_pending_recommendation')
            ->get();
        $this->assertCount(0, $revNotifs, 'Department Reviewer must NOT be notified before Financial Director recommends');

        // Reviewer must NOT see the PR in their pending quotes list yet
        $procPrService = app(ProcurementPurchaseRequestService::class);
        $revPendingQuotes = $procPrService->getPendingQuoteRequests(15, $this->reviewer);
        $this->assertEquals(0, $revPendingQuotes->total(), 'Reviewer must not see quotes waiting for accounting recommendation');

        // Financial Director DOES see the PR in their pending quotes list
        $fdPendingQuotes = $procPrService->getPendingQuoteRequests(15, $this->financialDirector);
        $this->assertEquals(1, $fdPendingQuotes->total(), 'Financial Director must see the pending quote request');

        // Step B: Financial Director submits recommendation
        $pr->refresh();
        $quoteToRecommend = $pr->quotes->where('supplier_id', $this->supplierC->id)->first();
        $quoteService->recommend($this->financialDirector, $quoteToRecommend, 'RECOMMEND', 'Best price from Supplier Gamma');

        // Now Department Reviewer IS notified
        $revNotifsAfter = Notification::where('user_id', $this->reviewer->id)
            ->where('type', 'purchase_quote_pending_recommendation')
            ->get();
        $this->assertCount(1, $revNotifsAfter, 'Department Reviewer must receive notification after Financial Director recommends');

        // And Reviewer NOW sees the PR in their pending quotes list
        $revPendingAfter = $procPrService->getPendingQuoteRequests(15, $this->reviewer);
        $this->assertEquals(1, $revPendingAfter->total(), 'Reviewer must now see the PR ready for departmental recommendation');

        // Step C: Department Reviewer submits recommendation
        $quoteService->recommend($this->reviewer, $quoteToRecommend, 'RECOMMEND', 'Technical specifications approved');

        // Now General Manager is notified for final executive decision
        $gmNotifs = Notification::where('user_id', $this->gmUser->id)
            ->where('type', 'purchase_quote_recommendations_ready')
            ->get();
        $this->assertCount(1, $gmNotifs, 'General Manager must be notified after both recommendations are submitted');
    }
}
