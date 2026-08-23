<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Authenticate user and issue API access token.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $email = strtolower(trim($request->email));
        $user = User::where('email', $email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'بيانات الدخول غير صحيحة.',
            ], 401);
        }

        if (! $user->is_active) {
            return response()->json([
                'message' => 'حساب المستخدم غير نشط.',
            ], 401);
        }

        $token = $user->createToken('api_token')->plainTextToken;

        $user->load(['department', 'roles.permissions']);

        $roles = $user->roles ? $user->roles->map(fn ($r) => [
            'id' => $r->id,
            'slug' => $r->slug,
            'name' => $r->name,
        ])->values() : [];

        $permissions = $user->roles ? $user->roles->flatMap(fn ($r) => $r->permissions ? $r->permissions->pluck('slug') : [])->unique()->values() : [];

        return response()->json([
            'message' => 'تم تسجيل الدخول بنجاح.',
            'token_type' => 'Bearer',
            'token' => $token,
            'access_token' => $token,
            'user' => $this->formatUserData($user),
        ], 200);
    }

    /**
     * Return active demo accounts for the local/UAT quick-login panel.
     * This endpoint is intentionally disabled unless explicitly enabled by env.
     */
    public function demoAccounts(): JsonResponse
    {
        abort_unless(app()->environment(['local', 'testing', 'staging']) && config('app.demo_login_panel'), 404);

        $users = User::query()
            ->where('is_active', true)
            ->with(['department', 'roles'])
            ->orderBy('name')
            ->get()
            ->map(static function (User $user): array {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'department' => $user->department ? [
                        'id' => $user->department->id,
                        'name' => $user->department->name,
                        'code' => $user->department->code,
                    ] : null,
                    'roles' => $user->roles->map(static fn ($role): array => [
                        'slug' => $role->slug,
                        'name' => $role->name,
                    ])->values(),
                ];
            })
            ->values();

        return response()->json(['users' => $users]);
    }

    /**
     * Get authenticated user profile.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->formatUserData($request->user()),
        ], 200);
    }

    private function formatUserData(User $user): array
    {
        $user->loadMissing(['department', 'roles']);

        $roles = $user->roles->map(fn ($r) => [
            'id' => $r->id,
            'slug' => $r->slug,
            'name' => $r->name,
        ])->values();

        $roleIds = $user->roles->pluck('id')->toArray();
        $permissions = empty($roleIds) ? [] : \Illuminate\Support\Facades\DB::table('permission_role')
            ->join('permissions', 'permissions.id', '=', 'permission_role.permission_id')
            ->whereIn('permission_role.role_id', $roleIds)
            ->pluck('permissions.slug')
            ->unique()
            ->values();

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'is_active' => $user->is_active,
            'department' => $user->department ? [
                'id' => $user->department->id,
                'name' => $user->department->name,
                'code' => $user->department->code,
            ] : null,
            'roles' => $roles,
            'permissions' => $permissions,
            'created_at' => $user->created_at ? $user->created_at->toIso8601String() : null,
        ];
    }

    /**
     * Change the authenticated user's password.
     */
    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $user = $request->user();

        if (! Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'message' => 'كلمة المرور الحالية غير صحيحة.',
                'errors' => [
                    'current_password' => ['كلمة المرور الحالية غير صحيحة.'],
                ],
            ], 422);
        }

        $user->password = $validated['new_password'];
        $user->save();

        return response()->json([
            'message' => 'تم تغيير كلمة المرور بنجاح.',
        ], 200);
    }

    /**
     * Revoke current API token and logout.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'تم تسجيل الخروج بنجاح.',
        ], 200);
    }
}
