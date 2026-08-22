<?php

namespace App\Http\Middleware;

use App\Models\AuditLog;
use Closure;
use Illuminate\Http\Request;
use Throwable;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'انتهت جلسة الدخول. يرجى تسجيل الدخول مرة أخرى.',
            ], 401);
        }

        if (! array_filter(explode('|', $permission), fn ($candidate) => $user->hasPermission(trim($candidate)))) {
            try {
                AuditLog::create([
                    'user_id' => $user->id,
                    'entity_type' => 'Permission',
                    'entity_id' => 0,
                    'action' => 'UNAUTHORIZED_ACCESS_ATTEMPT',
                    'field_name' => 'permission',
                    'new_value' => json_encode([
                        'required' => $permission,
                        'path' => $request->path(),
                        'method' => $request->method(),
                    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    'ip_address' => $request->ip(),
                    'user_agent' => substr((string) $request->userAgent(), 0, 255),
                ]);
            } catch (Throwable $auditError) {
                report($auditError);
            }

            return response()->json([
                'message' => 'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
            ], 403);
        }

        return $next($request);
    }
}
