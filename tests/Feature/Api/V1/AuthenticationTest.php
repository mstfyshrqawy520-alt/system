<?php

namespace Tests\Feature\Api\V1;

use App\Models\Department;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    private User $activeUser;
    private Department $department;

    protected function setUp(): void
    {
        parent::setUp();

        $this->department = Department::create([
            'name' => 'Information Technology',
            'code' => 'DEPT-IT',
            'is_active' => true,
        ]);

        $this->activeUser = User::create([
            'department_id' => $this->department->id,
            'name' => 'Ahmed Employee',
            'email' => 'ahmed@ashbiliya.com',
            'password' => Hash::make('Secret123!'),
            'phone' => '+966500000000',
            'is_active' => true,
        ]);
    }

    public function test_valid_login_succeeds_and_returns_token_and_user_profile(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'ahmed@ashbiliya.com',
            'password' => 'Secret123!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'تم تسجيل الدخول بنجاح.',
                'token_type' => 'Bearer',
                'user' => [
                    'id' => $this->activeUser->id,
                    'name' => 'Ahmed Employee',
                    'email' => 'ahmed@ashbiliya.com',
                    'phone' => '+966500000000',
                    'is_active' => true,
                    'department' => [
                        'id' => $this->department->id,
                        'name' => 'Information Technology',
                        'code' => 'DEPT-IT',
                    ],
                ],
            ])
            ->assertJsonStructure([
                'message',
                'token_type',
                'access_token',
                'user' => [
                    'id',
                    'name',
                    'email',
                    'phone',
                    'is_active',
                    'department',
                ],
            ]);

        $this->assertNotNull($response->json('access_token'));

        // Verify sensitive fields are NOT present
        $response->assertJsonMissing(['password']);
        $response->assertJsonMissing(['remember_token']);
    }

    public function test_login_fails_with_invalid_password(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'ahmed@ashbiliya.com',
            'password' => 'WrongPassword',
        ]);

        $response->assertStatus(401)
            ->assertJson(['message' => 'بيانات الدخول غير صحيحة.']);
    }

    public function test_login_fails_with_unknown_email(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'unknown@ashbiliya.com',
            'password' => 'Secret123!',
        ]);

        $response->assertStatus(401)
            ->assertJson(['message' => 'بيانات الدخول غير صحيحة.']);
    }

    public function test_login_fails_for_inactive_user(): void
    {
        $inactiveUser = User::create([
            'department_id' => $this->department->id,
            'name' => 'Inactive User',
            'email' => 'inactive@ashbiliya.com',
            'password' => Hash::make('Secret123!'),
            'is_active' => false,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'inactive@ashbiliya.com',
            'password' => 'Secret123!',
        ]);

        $response->assertStatus(401)
            ->assertJson(['message' => 'حساب المستخدم غير نشط.']);
    }

    public function test_login_validation_fails_when_fields_are_missing(): void
    {
        $response = $this->postJson('/api/v1/auth/login', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_local_demo_accounts_endpoint_returns_active_users_and_roles(): void
    {
        config()->set('app.demo_login_panel', true);

        $inactiveUser = User::create([
            'department_id' => $this->department->id,
            'name' => 'Inactive Demo User',
            'email' => 'inactive-demo@ashbiliya.com',
            'password' => Hash::make('Secret123!'),
            'is_active' => false,
        ]);

        $response = $this->getJson('/api/v1/auth/demo-accounts');

        $response->assertStatus(200)
            ->assertJsonPath('users.0.email', $this->activeUser->email)
            ->assertJsonStructure([
                'users' => [[
                    'id',
                    'name',
                    'email',
                    'department',
                    'roles',
                ]],
            ]);

        $this->assertNotContains($inactiveUser->email, collect($response->json('users'))->pluck('email')->all());
        $response->assertJsonMissing(['password']);
    }

    public function test_demo_accounts_endpoint_is_disabled_without_local_flag(): void
    {
        config()->set('app.demo_login_panel', false);

        $this->getJson('/api/v1/auth/demo-accounts')->assertStatus(404);
    }

    public function test_authenticated_user_can_access_me_endpoint(): void
    {
        $token = $this->activeUser->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJson([
                'user' => [
                    'id' => $this->activeUser->id,
                    'name' => 'Ahmed Employee',
                    'email' => 'ahmed@ashbiliya.com',
                    'department' => [
                        'id' => $this->department->id,
                        'name' => 'Information Technology',
                    ],
                ],
            ])
            ->assertJsonStructure([
                'user' => [
                    'id',
                    'name',
                    'email',
                    'phone',
                    'is_active',
                    'department',
                    'roles',
                    'permissions',
                ],
            ]);

        $response->assertJsonMissing(['password']);
        $response->assertJsonMissing(['remember_token']);
    }

    public function test_unauthenticated_user_cannot_access_me_endpoint(): void
    {
        $response = $this->getJson('/api/v1/auth/me');

        $response->assertStatus(401);
    }

    public function test_api_without_accept_header_returns_json_401_instead_of_web_redirect(): void
    {
        $response = $this->get('/api/v1/auth/me', [
            'Accept' => 'text/html',
        ]);

        $response->assertStatus(401);
        $this->assertStringContainsString('application/json', (string) $response->headers->get('Content-Type'));
        $response->assertJson(['message' => 'انتهت جلسة الدخول. سجّل الدخول مرة أخرى للمتابعة.']);
    }

    public function test_authenticated_user_can_change_own_password(): void
    {
        $token = $this->activeUser->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/auth/password', [
                'current_password' => 'Secret123!',
                'new_password' => 'NewSecret456!',
                'new_password_confirmation' => 'NewSecret456!',
            ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'تم تغيير كلمة المرور بنجاح.']);

        $this->assertTrue(Hash::check('NewSecret456!', $this->activeUser->fresh()->password));
    }

    public function test_password_change_rejects_incorrect_current_password(): void
    {
        $token = $this->activeUser->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/auth/password', [
                'current_password' => 'WrongPassword',
                'new_password' => 'NewSecret456!',
                'new_password_confirmation' => 'NewSecret456!',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['current_password']);
    }

    public function test_password_change_requires_matching_confirmation(): void
    {
        $token = $this->activeUser->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/api/v1/auth/password', [
                'current_password' => 'Secret123!',
                'new_password' => 'NewSecret456!',
                'new_password_confirmation' => 'DifferentSecret456!',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['new_password']);
    }

    public function test_unauthenticated_user_cannot_change_password(): void
    {
        $response = $this->putJson('/api/v1/auth/password', [
            'current_password' => 'Secret123!',
            'new_password' => 'NewSecret456!',
            'new_password_confirmation' => 'NewSecret456!',
        ]);

        $response->assertStatus(401);
    }

    public function test_authenticated_user_can_logout(): void
    {
        $token = $this->activeUser->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/auth/logout');

        $response->assertStatus(200)
            ->assertJson(['message' => 'تم تسجيل الخروج بنجاح.']);

        auth()->forgetGuards();

        // Verify token is revoked and subsequent requests fail
        $subsequentResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/auth/me');

        $subsequentResponse->assertStatus(401);
    }

    public function test_unauthenticated_user_cannot_logout(): void
    {
        $response = $this->postJson('/api/v1/auth/logout');

        $response->assertStatus(401);
    }
}
