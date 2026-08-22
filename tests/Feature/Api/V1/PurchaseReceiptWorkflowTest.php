<?php

namespace Tests\Feature\Api\V1;

use App\Models\Department;
use App\Models\Notification;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequest;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\User;
use App\Services\PurchaseReceiptService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PurchaseReceiptWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $warehouse;
    private User $siteEngineer;
    private User $accountant;
    private PurchaseOrder $purchaseOrder;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        $department = Department::create(['name' => 'التنفيذ', 'code' => 'EXECUTION', 'is_active' => true]);
        $this->warehouse = $this->makeUser('warehouse@test', 'أمين المخزن', 'warehouse_keeper', $department->id);
        $this->siteEngineer = $this->makeUser('site@test', 'مهندس الموقع', 'site_engineer', $department->id);
        $this->accountant = $this->makeUser('accounting@test', 'الحسابات', 'accountant', $department->id);
        $employee = $this->makeUser('employee-receipt@test', 'الموظف', 'employee', $department->id);
        $supplier = Supplier::create(['code' => 'RECEIPT-SUP', 'company_name' => 'مورد الاستلام', 'is_active' => true]);

        $purchaseRequest = PurchaseRequest::create([
            'request_number' => 'PR-RECEIPT-001',
            'user_id' => $employee->id,
            'department_id' => $department->id,
            'site_engineer_user_id' => $this->siteEngineer->id,
            'priority' => 'NORMAL',
            'status' => 'APPROVED_BY_PROCUREMENT',
            'total_estimated_cost' => 1000,
            'date_needed' => now()->toDateString(),
        ]);

        $this->purchaseOrder = PurchaseOrder::create([
            'po_number' => 'PO-RECEIPT-001',
            'purchase_request_id' => $purchaseRequest->id,
            'supplier_id' => $supplier->id,
            'created_by_user_id' => $employee->id,
            'status' => 'ISSUED',
            'subtotal' => 1000,
            'grand_total' => 1000,
            'delivery_status' => 'NOT_STARTED',
        ]);
        $this->purchaseOrder->items()->create([
            'item_description' => 'أسمنت',
            'item_reference' => 'RECEIPT-PART-001',
            'region' => 'المنطقة السابعة والعشرون',
            'quantity' => 10,
            'uom' => 'PCS',
            'unit_price' => 100,
            'line_total' => 1000,
        ]);
    }

    public function test_warehouse_submits_then_site_engineer_approves_receipt(): void
    {
        $orderItem = $this->purchaseOrder->items()->first();
        $receipt = app(PurchaseReceiptService::class)->createByWarehouse(
            $this->warehouse,
            $this->purchaseOrder,
            [['purchase_order_item_id' => $orderItem->id, 'received_quantity' => 8, 'notes' => 'تم استلام 8 وحدات']],
        );

        $this->assertSame('PENDING_SITE_ENGINEER', $receipt->status);
        $this->assertSame('IN_RECEIPT', $this->purchaseOrder->fresh()->delivery_status);
        $this->assertDatabaseHas('purchase_receipt_items', ['received_quantity' => 8]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->siteEngineer->id,
            'type' => 'purchase_receipt_pending_site_engineer',
        ]);

        $approved = app(PurchaseReceiptService::class)->approveBySiteEngineer($this->siteEngineer, $receipt, 'تمت مطابقة الاستلام بالموقع.');
        $this->assertSame('APPROVED', $approved->status);
        $this->assertSame('DELIVERED', $this->purchaseOrder->fresh()->delivery_status);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->accountant->id,
            'type' => 'purchase_order_and_receipt_ready_accounting',
        ]);
    }

    public function test_other_site_engineer_cannot_approve_assigned_receipt(): void
    {
        $otherEngineer = $this->makeUser('other-site@test', 'مهندس آخر', 'site_engineer', $this->siteEngineer->department_id);
        $orderItem = $this->purchaseOrder->items()->first();
        $receipt = app(PurchaseReceiptService::class)->createByWarehouse(
            $this->warehouse,
            $this->purchaseOrder,
            [['purchase_order_item_id' => $orderItem->id, 'received_quantity' => 10]],
        );

        $this->expectException(\RuntimeException::class);
        app(PurchaseReceiptService::class)->approveBySiteEngineer($otherEngineer, $receipt);
    }

    private function makeUser(string $email, string $name, string $roleSlug, int $departmentId): User
    {
        $user = User::create([
            'department_id' => $departmentId,
            'name' => $name,
            'email' => $email,
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);
        $user->roles()->attach(Role::where('slug', $roleSlug)->firstOrFail()->id);
        return $user;
    }
}
