<?php

namespace Tests\Feature\Api\V1;

use App\Models\Category;
use App\Models\Department;
use App\Models\Item;
use App\Models\LandParcel;
use App\Models\PurchaseRequest;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SingleParcelPurchaseRequestTest extends TestCase
{
    use RefreshDatabase;

    private Department $dept;
    private User $employee;
    private Item $catalogItem1;
    private Item $catalogItem2;
    private LandParcel $landParcel;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->dept = Department::create([
            'name' => 'الهندسة والتنفيذ',
            'code' => 'EXECUTION',
        ]);

        $reviewerRole = Role::where('slug', 'reviewer')->firstOrFail();
        $reviewer = User::create([
            'department_id' => $this->dept->id,
            'name' => 'Reviewer Eng',
            'email' => 'reviewer@ashbiliya.com',
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);
        $reviewer->roles()->attach($reviewerRole->id);
        $this->dept->update(['manager_user_id' => $reviewer->id]);

        $employeeRole = Role::where('slug', 'employee')->firstOrFail();
        $this->employee = User::create([
            'department_id' => $this->dept->id,
            'name' => 'Site Requester',
            'email' => 'site@ashbiliya.com',
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);
        $this->employee->roles()->attach($employeeRole->id);

        $cat = Category::create(['name' => 'مواد بناء', 'code' => 'BUILD']);
        $this->catalogItem1 = Item::create([
            'category_id' => $cat->id,
            'sku' => 'STEEL-01',
            'name' => 'حديد تسليح 16 مم',
            'default_estimated_price' => 45000,
            'is_active' => true,
        ]);
        $this->catalogItem2 = Item::create([
            'category_id' => $cat->id,
            'sku' => 'CEMENT-01',
            'name' => 'أسمنت بورتلاندي',
            'default_estimated_price' => 2500,
            'is_active' => true,
        ]);

        $this->landParcel = LandParcel::create([
            'parcel_reference' => 'قطعة 542 - النرجس',
            'region' => 'التجمع الخامس',
            'opening_balance' => 500000,
            'balance' => 500000,
            'is_active' => true,
        ]);
    }

    public function test_pr_is_created_with_single_header_parcel_and_propagated_to_all_items(): void
    {
        $token = $this->employee->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/purchase-requests', [
                'target_department_id' => $this->dept->id,
                'request_type' => 'PROJECT',
                'parcel_reference' => 'قطعة 542 - النرجس',
                'region' => 'التجمع الخامس',
                'land_parcel_id' => $this->landParcel->id,
                'priority' => 'HIGH',
                'items' => [
                    [
                        'item_id' => $this->catalogItem1->id,
                        'item_description' => 'حديد تسليح 16 مم',
                        'quantity' => 10,
                        'uom' => 'TON',
                    ],
                    [
                        'item_id' => $this->catalogItem2->id,
                        'item_description' => 'أسمنت بورتلاندي عيار 42.5',
                        'quantity' => 50,
                        'uom' => 'BAG',
                    ],
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.parcel_reference', 'قطعة 542 - النرجس')
            ->assertJsonPath('data.region', 'التجمع الخامس')
            ->assertJsonPath('data.land_parcel_id', $this->landParcel->id);

        $pr = PurchaseRequest::with('items')->firstOrFail();
        $this->assertEquals('قطعة 542 - النرجس', $pr->parcel_reference);
        $this->assertEquals('التجمع الخامس', $pr->region);
        $this->assertEquals($this->landParcel->id, $pr->land_parcel_id);

        $this->assertCount(2, $pr->items);
        foreach ($pr->items as $item) {
            $this->assertEquals('قطعة 542 - النرجس', $item->item_reference);
            $this->assertEquals('التجمع الخامس', $item->region);
        }
    }

    public function test_updating_header_parcel_propagates_to_all_items(): void
    {
        $token = $this->employee->createToken('test')->plainTextToken;

        $pr = PurchaseRequest::create([
            'request_number' => 'PR-2026-00001',
            'request_type' => 'PROJECT',
            'parcel_reference' => 'قطعة 100',
            'region' => 'المنطقة الأولى',
            'user_id' => $this->employee->id,
            'department_id' => $this->dept->id,
            'target_department_id' => $this->dept->id,
            'reviewer_user_id' => $this->dept->manager_user_id,
            'status' => 'DRAFT',
            'date_needed' => now()->toDateString(),
        ]);

        $pr->items()->create([
            'item_description' => 'بند 1',
            'item_reference' => 'قطعة 100',
            'region' => 'المنطقة الأولى',
            'quantity' => 5,
            'uom' => 'PCS',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/purchase-requests/' . $pr->id, [
                'parcel_reference' => 'قطعة 200 معدلة',
                'region' => 'المنطقة الثانية',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.parcel_reference', 'قطعة 200 معدلة')
            ->assertJsonPath('data.region', 'المنطقة الثانية');

        $pr->refresh();
        $this->assertEquals('قطعة 200 معدلة', $pr->parcel_reference);
        $this->assertEquals('المنطقة الثانية', $pr->region);
        $this->assertEquals('قطعة 200 معدلة', $pr->items->first()->item_reference);
        $this->assertEquals('المنطقة الثانية', $pr->items->first()->region);
    }

    public function test_office_supplies_pr_defaults_to_headquarters(): void
    {
        $token = $this->employee->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/purchase-requests', [
                'target_department_id' => $this->dept->id,
                'request_type' => 'OFFICE_SUPPLIES',
                'items' => [
                    [
                        'item_description' => 'أوراق تصوير A4',
                        'quantity' => 10,
                        'uom' => 'BOX',
                    ],
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.parcel_reference', 'مقر الشركة')
            ->assertJsonPath('data.region', 'إداري / المقر الرئيسي');

        $pr = PurchaseRequest::with('items')->latest('id')->firstOrFail();
        $this->assertEquals('مقر الشركة', $pr->parcel_reference);
        $this->assertEquals('إداري / المقر الرئيسي', $pr->region);
        $this->assertEquals('مقر الشركة', $pr->items->first()->item_reference);
        $this->assertEquals('إداري / المقر الرئيسي', $pr->items->first()->region);
    }
}
