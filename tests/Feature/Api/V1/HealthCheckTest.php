<?php

namespace Tests\Feature\Api\V1;

use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    /**
     * Test health check endpoint returns 200 OK and valid JSON structure.
     */
    public function test_health_check_endpoint_returns_ok_response(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'ok',
                'system' => 'Al-Ashbiliya Procurement Management System API',
                'version' => 'v1',
            ])
            ->assertJsonStructure([
                'status',
                'system',
                'version',
                'timestamp',
                'database' => [
                    'status',
                ],
            ]);
    }
}
