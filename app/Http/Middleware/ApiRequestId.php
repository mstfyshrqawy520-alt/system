<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
class ApiRequestId
{
    public function handle(Request $request, Closure $next)
    {
        $requestId = $request->header('X-Request-ID') ?: (string) Str::uuid();
        $response = $next($request);
        $response->headers->set('X-Request-ID', $requestId);
        return $response;
    }
}
