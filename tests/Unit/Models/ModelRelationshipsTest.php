<?php

namespace Tests\Unit\Models;

use App\Models\ApprovalHistory;
use App\Models\Attachment;
use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Department;
use App\Models\Item;
use App\Models\Notification;
use App\Models\Permission;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\PurchaseRequest;
use App\Models\PurchaseRequestItem;
use App\Models\Role;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModelRelationshipsTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_department_and_roles_relationships(): void
    {
        $dept = Department::create([
            'name' => 'Information Technology',
            'code' => 'DEPT-IT',
            'is_active' => true,
        ]);

        $user = User::create([
            'department_id' => $dept->id,
            'name' => 'John Doe',
            'email' => 'john@ashbiliya.com',
            'password' => 'secret123',
            'phone' => '+966500000000',
            'is_active' => true,
        ]);

        $role = Role::create([
            'name' => 'Reviewer',
            'slug' => 'reviewer',
            'description' => 'Departmental reviewer',
        ]);

        $user->roles()->attach($role->id);

        $this->assertEquals('Information Technology', $user->department->name);
        $this->assertTrue($user->department->is_active);
        $this->assertCount(1, $user->roles);
        $this->assertEquals('reviewer', $user->roles->first()->slug);
        $this->assertCount(1, $role->users);
        $this->assertEquals('john@ashbiliya.com', $role->users->first()->email);
    }

    public function test_department_manager_relationship(): void
    {
        $dept = Department::create([
            'name' => 'Procurement Dept',
            'code' => 'DEPT-PROC',
            'is_active' => true,
        ]);

        $manager = User::create([
            'department_id' => $dept->id,
            'name' => 'Jane Manager',
            'email' => 'jane@ashbiliya.com',
            'password' => 'password',
            'is_active' => true,
        ]);

        $dept->update(['manager_user_id' => $manager->id]);

        $this->assertEquals('Jane Manager', $dept->fresh()->manager->name);
        $this->assertCount(1, $dept->users);
    }

    public function test_site_engineer_can_be_assigned_to_multiple_departments(): void
    {
        $firstDepartment = Department::create([
            'name' => 'Execution Department',
            'code' => 'DEPT-EXEC',
            'is_active' => true,
        ]);
        $secondDepartment = Department::create([
            'name' => 'Finishing Department',
            'code' => 'DEPT-FIN',
            'is_active' => true,
        ]);
        $engineer = User::create([
            'name' => 'Shared Site Engineer',
            'email' => 'shared.engineer@ashbiliya.com',
            'password' => 'password',
            'is_active' => true,
        ]);
        $role = Role::create([
            'name' => 'Site Engineer',
            'slug' => 'site_engineer',
        ]);
        $engineer->roles()->attach($role->id);

        $firstDepartment->update(['site_engineer_user_id' => $engineer->id]);
        $secondDepartment->update(['site_engineer_user_id' => $engineer->id]);

        $this->assertCount(2, $engineer->fresh()->siteEngineerDepartments);
        $this->assertSame(
            [$firstDepartment->id, $secondDepartment->id],
            $engineer->fresh()->siteEngineerDepartments->pluck('id')->sort()->values()->all()
        );
    }

    public function test_role_and_permission_pivot_relationship(): void
    {
        $role = Role::create([
            'name' => 'Procurement Manager',
            'slug' => 'procurement_manager',
        ]);

        $perm = Permission::create([
            'name' => 'Create Purchase Order',
            'slug' => 'po.create',
        ]);

        $role->permissions()->attach($perm->id);

        $this->assertCount(1, $role->permissions);
        $this->assertEquals('po.create', $role->permissions->first()->slug);
        $this->assertCount(1, $perm->roles);
        $this->assertEquals('procurement_manager', $perm->roles->first()->slug);
    }

    public function test_category_and_item_relationships_and_casts(): void
    {
        $category = Category::create([
            'name' => 'Hardware',
            'code' => 'CAT-HW',
            'is_active' => true,
        ]);

        $item = Item::create([
            'category_id' => $category->id,
            'sku' => 'SKU-LAPTOP-01',
            'name' => 'Dell Latitude Laptop',
            'uom' => 'PCS',
            'default_estimated_price' => 4500.50,
            'is_active' => true,
        ]);

        $this->assertEquals('Hardware', $item->category->name);
        $this->assertCount(1, $category->items);
        $this->assertEquals('4500.50', (string) $item->default_estimated_price);
        $this->assertTrue($item->is_active);
    }

    public function test_supplier_relationship(): void
    {
        $supplier = Supplier::create([
            'company_name' => 'Al-Ashbiliya Trading Co.',
            'tax_number' => '300000000000003',
            'email' => 'supplier@trading.com',
            'is_active' => true,
        ]);

        $this->assertEquals('Al-Ashbiliya Trading Co.', $supplier->company_name);
        $this->assertTrue($supplier->is_active);
    }

    public function test_purchase_request_and_items_relationships(): void
    {
        $dept = Department::create(['name' => 'Engineering', 'code' => 'ENG']);
        $user = User::create([
            'department_id' => $dept->id,
            'name' => 'Engineer',
            'email' => 'eng@ashbiliya.com',
            'password' => 'password',
        ]);

        $pr = PurchaseRequest::create([
            'request_number' => 'PR-2026-00001',
            'user_id' => $user->id,
            'department_id' => $dept->id,
            'title' => 'Laptops Requisition',
            'priority' => 'HIGH',
            'status' => 'SUBMITTED',
            'total_estimated_cost' => 9000.00,
            'submitted_at' => now(),
        ]);

        $prItem = PurchaseRequestItem::create([
            'purchase_request_id' => $pr->id,
            'item_description' => 'High Performance Laptop',
            'item_reference' => 'MODEL-PR-001',
            'region' => 'المنطقة السابعة والعشرون',
            'quantity' => 2.00,
            'uom' => 'PCS',
            'estimated_unit_price' => 4500.00,
            'estimated_line_total' => 9000.00,
        ]);

        $this->assertEquals('Engineer', $pr->requester->name);
        $this->assertEquals('Engineering', $pr->department->name);
        $this->assertCount(1, $pr->items);
        $this->assertEquals('PR-2026-00001', $prItem->purchaseRequest->request_number);
        $this->assertEquals('9000.00', (string) $pr->total_estimated_cost);
        $this->assertEquals('2.00', (string) $prItem->quantity);
    }

    public function test_purchase_order_and_items_relationships(): void
    {
        $dept = Department::create(['name' => 'Logistics', 'code' => 'LOG']);
        $user = User::create([
            'department_id' => $dept->id,
            'name' => 'Procurement Agent',
            'email' => 'proc@ashbiliya.com',
            'password' => 'password',
        ]);
        $supplier = Supplier::create(['company_name' => 'Tech Corp']);

        $pr = PurchaseRequest::create([
            'request_number' => 'PR-2026-00002',
            'user_id' => $user->id,
            'department_id' => $dept->id,
            'title' => 'Monitors',
        ]);

        $po = PurchaseOrder::create([
            'po_number' => 'PO-2026-00001',
            'purchase_request_id' => $pr->id,
            'supplier_id' => $supplier->id,
            'created_by_user_id' => $user->id,
            'status' => 'PO_DRAFT',
            'subtotal' => 1000.00,
            'discount_amount' => 50.00,
            'tax_amount' => 142.50,
            'grand_total' => 1092.50,
        ]);

        $poItem = PurchaseOrderItem::create([
            'purchase_order_id' => $po->id,
            'item_description' => '4K Display Monitor',
            'item_reference' => 'MODEL-PO-001',
            'region' => 'المنطقة السابعة والعشرون',
            'quantity' => 1.00,
            'unit_price' => 1000.00,
            'discount_amount' => 50.00,
            'tax_amount' => 142.50,
            'line_total' => 1092.50,
        ]);

        $this->assertEquals('Tech Corp', $po->supplier->company_name);
        $this->assertEquals('Procurement Agent', $po->createdBy->name);
        $this->assertEquals('PR-2026-00002', $po->purchaseRequest->request_number);
        $this->assertCount(1, $po->items);
        $this->assertEquals('1092.50', (string) $po->grand_total);
        $this->assertEquals('PO-2026-00001', $poItem->purchaseOrder->po_number);
    }

    public function test_polymorphic_approval_history_and_attachments(): void
    {
        $user = User::create(['name' => 'Reviewer User', 'email' => 'rev@ashbiliya.com', 'password' => 'password']);
        $dept = Department::create(['name' => 'Admin', 'code' => 'ADM']);

        $pr = PurchaseRequest::create([
            'request_number' => 'PR-2026-00003',
            'user_id' => $user->id,
            'department_id' => $dept->id,
            'title' => 'Office Supplies',
        ]);

        $approval = ApprovalHistory::create([
            'target_type' => PurchaseRequest::class,
            'target_id' => $pr->id,
            'actor_user_id' => $user->id,
            'action' => 'APPROVE',
            'from_state' => 'UNDER_REVIEW',
            'to_state' => 'APPROVED_BY_REVIEWER',
            'comments' => 'Direct reviewer approval',
        ]);

        $attachment = Attachment::create([
            'attachable_type' => PurchaseRequest::class,
            'attachable_id' => $pr->id,
            'uploaded_by_user_id' => $user->id,
            'file_name' => 'quotation.pdf',
            'file_path' => 'attachments/quotation.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 1048576,
        ]);

        $this->assertInstanceOf(PurchaseRequest::class, $approval->target);
        $this->assertEquals('PR-2026-00003', $approval->target->request_number);
        $this->assertEquals('Reviewer User', $approval->actor->name);

        $this->assertInstanceOf(PurchaseRequest::class, $attachment->attachable);
        $this->assertEquals('Reviewer User', $attachment->uploadedBy->name);
        $this->assertCount(1, $pr->approvalHistory);
        $this->assertCount(1, $pr->attachments);
    }

    public function test_audit_log_and_notification_relationships(): void
    {
        $user = User::create(['name' => 'Reviewer Audit', 'email' => 'audit@ashbiliya.com', 'password' => 'password']);

        $audit = AuditLog::create([
            'user_id' => $user->id,
            'entity_type' => 'PurchaseRequestItem',
            'entity_id' => 101,
            'action' => 'REVIEWER_DIRECT_MODIFICATION',
            'field_name' => 'quantity',
            'old_value' => '10.00',
            'new_value' => '15.00',
            'ip_address' => '127.0.0.1',
        ]);

        $notification = Notification::create([
            'user_id' => $user->id,
            'type' => 'PR_APPROVED',
            'title' => 'Purchase Request Approved',
            'message' => 'Your purchase request PR-2026-00001 was approved.',
        ]);

        $this->assertEquals('Reviewer Audit', $audit->user->name);
        $this->assertEquals('quantity', $audit->field_name);
        $this->assertEquals('Reviewer Audit', $notification->user->name);
    }

    public function test_soft_deletes_on_supported_models(): void
    {
        $dept = Department::create(['name' => 'Sales', 'code' => 'SALES']);
        $user = User::create(['department_id' => $dept->id, 'name' => 'Sales User', 'email' => 'sales@ashbiliya.com', 'password' => 'password']);

        $dept->delete();
        $user->delete();

        $this->assertSoftDeleted('departments', ['id' => $dept->id]);
        $this->assertSoftDeleted('users', ['id' => $user->id]);
        $this->assertCount(0, Department::all());
        $this->assertCount(1, Department::withTrashed()->get());
    }
}
