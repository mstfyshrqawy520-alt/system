<?php

namespace Tests\Feature\Api\V1;

use App\Models\Role;
use App\Models\User;
use App\Models\PurchaseRequest;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminRequestTrackerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    private function makeUser(string $roleSlug, string $email): User
    {
        $user = User::create([
            'name' => ucfirst($roleSlug) . ' Test User',
            'email' => $email,
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);

        $role = Role::where('slug', $roleSlug)->firstOrFail();
        $user->roles()->attach($role->id);

        return $user;
    }

    public function test_admin_can_access_request_tracker_index(): void
    {
        $admin = $this->makeUser('admin', 'admin-tracker-test@ashbiliya.com');

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/request-tracker');

        $response->assertOk();
    }

    public function test_admin_can_access_request_tracker_stats(): void
    {
        $admin = $this->makeUser('admin', 'admin-tracker-test-2@ashbiliya.com');

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/request-tracker/stats');

        $response->assertOk();
    }

    public function test_admin_can_access_request_tracker_index_with_data(): void
    {
        $admin = $this->makeUser('admin', 'admin-tracker-test-3@ashbiliya.com');
        $dept = \App\Models\Department::create(['name' => 'IT', 'code' => 'IT']);
        $parcel = \App\Models\LandParcel::create([
            'parcel_reference' => 'PARCEL-101',
            'region' => 'Riyadh',
        ]);

        $pr = PurchaseRequest::create([
            'request_number' => 'PR-2026-99999',
            'user_id' => $admin->id,
            'department_id' => $dept->id,
            'status' => 'PENDING_PROCUREMENT_APPROVAL',
            'priority' => 'HIGH',
            'total_estimated_cost' => 1500,
            'land_parcel_id' => $parcel->id,
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/request-tracker');

        $response->assertOk();

        $detailResponse = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/v1/admin/request-tracker/{$pr->id}");

        $detailResponse->assertOk();
    }
}

