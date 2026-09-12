<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateFromQueryToken
{
    /**
     * Handle an incoming request.
     * Copies ?token=... query parameter to Authorization: Bearer <token>
     * to support direct browser opening of PDFs and images.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->headers->has('Authorization') && $request->filled('token')) {
            $request->headers->set('Authorization', 'Bearer ' . $request->query('token'));
        }

        return $next($request);
    }
}
