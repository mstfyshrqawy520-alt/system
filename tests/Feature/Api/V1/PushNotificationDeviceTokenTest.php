<?php

namespace Tests\Feature\Api\V1;

use App\Models\User;
use App\Models\UserDeviceToken;
use App\Services\FcmService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PushNotificationDeviceTokenTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);

        $this->user = User::create([
            'name' => 'Mohamed Test User',
            'email' => 'mohamed@ashbiliya.com',
            'password' => Hash::make('Password123!'),
            'is_active' => true,
        ]);
    }

    public function test_user_can_register_fcm_device_token(): void
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/notifications/device-token', [
            'token' => 'fcm-sample-test-token-12345',
            'device_type' => 'mobile_android',
        ]);

        $response->assertStatus(200);
        $response->assertJsonFragment([
            'message' => 'تم تسجيل رمز الجهاز بنجاح للإشعارات الفورية.',
        ]);

        $this->assertDatabaseHas('user_device_tokens', [
            'user_id' => $this->user->id,
            'token' => 'fcm-sample-test-token-12345',
            'device_type' => 'mobile_android',
        ]);
    }

    public function test_user_can_delete_fcm_device_token(): void
    {
        UserDeviceToken::create([
            'user_id' => $this->user->id,
            'token' => 'fcm-token-to-delete',
            'device_type' => 'web',
            'last_used_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->deleteJson('/api/v1/notifications/device-token', [
            'token' => 'fcm-token-to-delete',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseMissing('user_device_tokens', [
            'token' => 'fcm-token-to-delete',
        ]);
    }

    public function test_fcm_service_sends_to_all_user_tokens_without_crashing_when_no_credentials(): void
    {
        UserDeviceToken::create([
            'user_id' => $this->user->id,
            'token' => 'token-phone-1',
            'device_type' => 'mobile',
        ]);
        UserDeviceToken::create([
            'user_id' => $this->user->id,
            'token' => 'token-laptop-2',
            'device_type' => 'web',
        ]);

        $fcm = app(FcmService::class);
        $result = $fcm->sendToUser($this->user, 'طلب شراء جديد', 'تم إنشاء طلب شراء جديد');

        $this->assertIsArray($result);
        $this->assertArrayHasKey('sent', $result);
    }
}
