<?php

namespace Tests\Feature\Api\V1;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminSystemMonitoringTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_admin_can_read_system_monitoring_snapshot(): void
    {
        $admin = $this->makeUser('admin', 'monitor-admin@ashbiliya.com');

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/system/monitoring');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'checked_at',
                    'application' => ['status', 'environment', 'version', 'commit'],
                    'database' => ['status', 'driver', 'latency_ms'],
                    'migrations' => ['status', 'applied_count', 'pending_count', 'pending'],
                    'realtime' => ['status', 'endpoint', 'last_system_event_at'],
                    'deployment' => ['status', 'version', 'commit', 'source', 'message'],
                    'counts',
                    'workflow',
                    'data_integrity',
                    'alerts',
                ],
            ])
            ->assertJsonPath('data.database.status', 'connected')
            ->assertJsonPath('data.data_integrity.missing_reference_fields', 0);
    }

    public function test_admin_health_check_returns_healthy_when_database_and_migrations_are_valid(): void
    {
        $admin = $this->makeUser('admin', 'health-admin@ashbiliya.com');

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/system/health');

        $response->assertOk()
            ->assertJsonPath('data.healthy', true)
            ->assertJsonStructure(['data' => ['healthy', 'checked_at', 'checks']]);
    }

    public function test_employee_cannot_read_admin_system_monitoring(): void
    {
        $employee = $this->makeUser('employee', 'monitor-employee@ashbiliya.com');

        $this->actingAs($employee, 'sanctum')
            ->getJson('/api/v1/admin/system/monitoring')
            ->assertForbidden();
    }

    public function test_unauthenticated_user_cannot_read_admin_system_monitoring(): void
    {
        $this->getJson('/api/v1/admin/system/monitoring')->assertUnauthorized();
    }

    private function makeUser(string $roleSlug, string $email): User
    {
        $user = User::create([
            'name' => ucfirst($roleSlug) . ' Monitoring User',
            'email' => $email,
            'password' => Hash::make('Secret123!'),
            'is_active' => true,
        ]);

        $role = Role::where('slug', $roleSlug)->firstOrFail();
        $user->roles()->attach($role->id);

        return $user;
    }
}
