<?php

namespace Tests\Feature\Api\V1;

use App\Models\Department;
use App\Models\PurchaseRequest;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PerformanceBenchmarkTest extends TestCase
{
    use RefreshDatabase;

    public function test_composite_index_is_used_for_department_and_status_queries(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $dept = Department::create(['name' => 'Dept Test', 'code' => 'TEST']);
        $user = User::create([
            'name' => 'Test User',
            'email' => 'test@ashbiliya.com',
            'password' => Hash::make('Secret123!'),
            'department_id' => $dept->id,
            'is_active' => true,
        ]);

        // Run EXPLAIN QUERY PLAN in SQLite test environment
        $explain = DB::select(
            "EXPLAIN QUERY PLAN SELECT * FROM purchase_requests WHERE department_id = ? AND status = ? ORDER BY created_at DESC",
            [$dept->id, 'SUBMITTED']
        );

        $this->assertNotEmpty($explain);
        $detail = json_encode($explain, JSON_UNESCAPED_UNICODE);
        
        // Assert that index is scanned (SEARCH purchase_requests USING INDEX idx_pr_dept_status_created)
        $this->assertStringContainsString('idx_pr_dept_status_created', $detail, 'Query must utilize idx_pr_dept_status_created composite index');
    }

    public function test_high_volume_1000_records_performance_benchmark(): void
    {
        $this->seed(RolePermissionSeeder::class);

        $dept = Department::create(['name' => 'Dept Perf', 'code' => 'PERF']);
        $user = User::create([
            'name' => 'Perf User',
            'email' => 'perf@ashbiliya.com',
            'password' => Hash::make('Secret123!'),
            'department_id' => $dept->id,
            'is_active' => true,
        ]);

        $now = now();
        $batch = [];
        for ($i = 1; $i <= 1000; $i++) {
            $batch[] = [
                'request_number' => "PR-PERF-{$i}",
                'user_id' => $user->id,
                'department_id' => $dept->id,
                'target_department_id' => $dept->id,
                'priority' => 'HIGH',
                'procurement_route' => 'COMMERCIAL',
                'status' => ($i % 3 === 0) ? 'SUBMITTED' : (($i % 3 === 1) ? 'UNDER_REVIEW' : 'COMPLETED'),
                'total_estimated_cost' => 1000,
                'date_needed' => $now->toDateString(),
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        // Insert 1,000 records in 2 batches of 500
        foreach (array_chunk($batch, 500) as $chunk) {
            PurchaseRequest::insert($chunk);
        }

        $this->assertEquals(1000, PurchaseRequest::count());

        // Measure query time on 1,000 records with composite index
        $start = microtime(true);
        $results = PurchaseRequest::where('department_id', $dept->id)
            ->where('status', 'SUBMITTED')
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();
        $duration = (microtime(true) - $start) * 1000; // in milliseconds

        $this->assertCount(50, $results);
        // Query must complete in less than 50 milliseconds with the composite index
        $this->assertLessThan(50, $duration, "Query on 1000 indexed records took {$duration}ms, must be < 50ms");
    }
}
