<?php

namespace Tests\Feature\Api\V1;

use App\Models\Category;
use App\Models\Department;
use App\Models\Item;
use App\Models\PurchaseRequest;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class GeneralManagerPurchaseRequestTest extends TestCase
{
    use RefreshDatabase;

    private Department $department;
    private User $employee;
    private User $reviewer;
    private User $procurementManager;
    private User $generalManager;
    private Item $item;
    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->department = Department::create([
            'name' => 'التنفيذ',
            'code' => 'EXECUTION',
            'is_active' => true,
        ]);

        $this->employee = $this->makeUser('employee@ashbiliya.test', 'موظف الاختبار', 'employee');
        $this->reviewer = $this->makeUser('reviewer@ashbiliya.test', 'رئيس القسم', 'reviewer');
        $this->procurementManager = $this->makeUser('procurement@ashbiliya.test', 'مدير المشتريات', 'procurement_manager');
        $this->generalManager = $this->makeUser('gm@ashbiliya.test', 'المهندس محمد عبدالكريم', 'general_manager');
        $this->department->update(['manager_user_id' => $this->reviewer->id]);

        $this->category = Category::create([
            'name' => 'مواد البناء',
            'code' => 'BUILDING-MATERIALS',
            'is_active' => true,
        ]);

        $this->item = Item::create([
            'sku' => 'CEMENT-001',
            'name' => 'أسمنت',
            'category_id' => $this->category->id,
            'default_estimated_price' => 250.00,
            'is_active' => true,
        ]);
    }

    public function test_executive_can_list_and_approve_pending_request(): void
    {
        $request = $this->makePendingRequest('PR-2026-EXEC-001');

        $response = $this->actingAs($this->generalManager, 'sanctum')
            ->getJson('/api/v1/general-manager/purchase-requests');

        $response->assertOk()
            ->assertJsonPath('data.0.id', $request->id)
            ->assertJsonPath('data.0.status', 'PENDING_EXECUTIVE_APPROVAL');

        $approve = $this->actingAs($this->generalManager, 'sanctum')
            ->postJson("/api/v1/general-manager/purchase-requests/{$request->id}/approve", [
                'comment' => 'تمت المراجعة التنفيذية.',
            ]);

        $approve->assertOk()
            ->assertJsonPath('data.status', 'PENDING_PROCUREMENT_APPROVAL');

        $this->assertDatabaseHas('purchase_requests', [
            'id' => $request->id,
            'status' => 'PENDING_PROCUREMENT_APPROVAL',
        ]);
        $this->assertDatabaseHas('approval_history', [
            'target_id' => $request->id,
            'action' => 'APPROVED_BY_EXECUTIVE',
            'to_state' => 'PENDING_PROCUREMENT_APPROVAL',
        ]);
    }

    public function test_executive_does_not_see_direct_purchase_request_in_pending_queue(): void
    {
        $request = PurchaseRequest::create([
            'request_number' => 'PR-2026-DIRECT-HIDDEN-001',
            'user_id' => $this->employee->id,
            'department_id' => $this->department->id,
            'reviewer_user_id' => $this->reviewer->id,
            'site_engineer_user_id' => $this->reviewer->id,
            'priority' => 'NORMAL',
            'status' => 'PENDING_EXECUTIVE_APPROVAL',
            'procurement_route' => 'DIRECT',
            'total_estimated_cost' => 500.00,
            'date_needed' => now()->toDateString(),
        ]);

        $list = $this->actingAs($this->generalManager, 'sanctum')
            ->getJson('/api/v1/general-manager/purchase-requests');

        $list->assertOk()->assertJsonMissing(['id' => $request->id]);

        $detail = $this->actingAs($this->generalManager, 'sanctum')
            ->getJson("/api/v1/general-manager/purchase-requests/{$request->id}");

        $detail->assertNotFound();
    }

    public function test_executive_edit_goes_directly_to_procurement_without_reviewer_roundtrip(): void
    {
        $request = $this->makePendingRequest('PR-2026-EXEC-002');

        $response = $this->actingAs($this->generalManager, 'sanctum')
            ->putJson("/api/v1/general-manager/purchase-requests/{$request->id}", [
                'notes' => 'تعديل تنفيذي مباشر.',
                'items' => [[
                    'item_id' => $this->item->id,
                    'item_description' => 'أسمنت معدل',
                    'item_reference' => 'EXEC-PART-002',
                    'region' => 'المنطقة السابعة والعشرون',
                    'quantity' => 4,
                    'uom' => 'PCS',
                    'estimated_unit_price' => 300,
                ]],
            ]);

        $response->assertOk()
            ->assertJsonPath('data.status', 'PENDING_PROCUREMENT_APPROVAL')
            ->assertJsonPath('data.notes', 'تعديل تنفيذي مباشر.')
            ->assertJsonPath('data.items.0.item_reference', 'EXEC-PART-002');

        $this->assertDatabaseHas('purchase_requests', [
            'id' => $request->id,
            'status' => 'PENDING_PROCUREMENT_APPROVAL',
        ]);
    }

    public function test_executive_can_reject_pending_request_with_reason(): void
    {
        $request = $this->makePendingRequest('PR-2026-EXEC-003');

        $response = $this->actingAs($this->generalManager, 'sanctum')
            ->postJson("/api/v1/general-manager/purchase-requests/{$request->id}/reject", [
                'comment' => 'غير مناسب للميزانية الحالية.',
            ]);

        $response->assertOk()
            ->assertJsonPath('data.status', 'REJECTED');

        $this->assertDatabaseHas('purchase_requests', [
            'id' => $request->id,
            'status' => 'REJECTED',
            'rejection_reason' => 'غير مناسب للميزانية الحالية.',
        ]);
    }

    private function makePendingRequest(string $number): PurchaseRequest
    {
        $request = PurchaseRequest::create([
            'request_number' => $number,
            'user_id' => $this->employee->id,
            'department_id' => $this->department->id,
            'reviewer_user_id' => $this->reviewer->id,
            'site_engineer_user_id' => $this->reviewer->id,
            'priority' => 'NORMAL',
            'status' => 'PENDING_EXECUTIVE_APPROVAL',
            'total_estimated_cost' => 500.00,
            'date_needed' => now()->toDateString(),
        ]);

        $request->items()->create([
            'item_id' => $this->item->id,
            'item_description' => 'أسمنت',
            'item_reference' => 'EXEC-PART-001',
            'region' => 'المنطقة السابعة والعشرون',
            'quantity' => 2,
            'uom' => 'PCS',
            'estimated_unit_price' => 250,
            'estimated_line_total' => 500,
        ]);

        return $request;
    }

    private function makeUser(string $email, string $name, string $roleSlug): User
    {
        $user = User::create([
            'department_id' => $this->department->id,
            'name' => $name,
            'email' => $email,
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);
        $user->roles()->attach(Role::where('slug', $roleSlug)->firstOrFail()->id);
        return $user;
    }
}
