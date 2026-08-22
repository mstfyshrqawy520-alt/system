<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

class HealthController extends Controller
{
    /**
     * Return application health status and database connectivity check.
     */
    public function index(): JsonResponse
    {
        $dbConnected = false;

        try {
            DB::connection()->getPdo();
            $dbConnected = true;
        } catch (Throwable $e) {
            $dbConnected = false;
        }

        $httpStatus = $dbConnected ? 200 : 503;

        return response()->json([
            'status' => $dbConnected ? 'ok' : 'degraded',
            'system' => 'Al-Ashbiliya Procurement Management System API',
            'version' => 'v1',
            'timestamp' => now()->toIso8601String(),
            'database' => [
                'status' => $dbConnected ? 'connected' : 'disconnected',
            ],
        ], $httpStatus);
    }
}
