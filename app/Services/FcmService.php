<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserDeviceToken;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FcmService
{
    /**
     * Send push notification to all device tokens of a given user.
     *
     * @param User|int $user
     * @param string $title
     * @param string $body
     * @param array<string, mixed> $data
     * @return array{sent: int, failed: int, pruned: int}
     */
    public function sendToUser(User|int $user, string $title, string $body, array $data = []): array
    {
        $userId = $user instanceof User ? $user->id : (int) $user;

        $tokens = UserDeviceToken::where('user_id', $userId)
            ->pluck('token')
            ->filter()
            ->unique()
            ->values()
            ->all();

        if (empty($tokens)) {
            return ['sent' => 0, 'failed' => 0, 'pruned' => 0];
        }

        return $this->sendToTokens($tokens, $title, $body, $data);
    }

    /**
     * Send push notification to all device tokens of multiple users.
     *
     * @param array<int> $userIds
     * @param string $title
     * @param string $body
     * @param array<string, mixed> $data
     * @return array{sent: int, failed: int, pruned: int}
     */
    public function sendToUsers(array $userIds, string $title, string $body, array $data = []): array
    {
        $cleanIds = array_filter(array_unique(array_map('intval', $userIds)));
        if (empty($cleanIds)) {
            return ['sent' => 0, 'failed' => 0, 'pruned' => 0];
        }

        $tokens = UserDeviceToken::whereIn('user_id', $cleanIds)
            ->pluck('token')
            ->filter()
            ->unique()
            ->values()
            ->all();

        if (empty($tokens)) {
            return ['sent' => 0, 'failed' => 0, 'pruned' => 0];
        }

        return $this->sendToTokens($tokens, $title, $body, $data);
    }

    /**
     * Send push notification to a collection of FCM registration tokens.
     *
     * @param array<string> $tokens
     * @param string $title
     * @param string $body
     * @param array<string, mixed> $data
     * @return array{sent: int, failed: int, pruned: int}
     */
    public function sendToTokens(array $tokens, string $title, string $body, array $data = []): array
    {
        $serverKey = config('services.fcm.server_key') ?: env('FCM_SERVER_KEY');
        $projectId = config('services.fcm.project_id') ?: env('FIREBASE_PROJECT_ID');

        // If FCM credentials are not configured, log for debugging and return gracefully
        if (empty($serverKey) && empty($projectId)) {
            Log::debug('FcmService: Push notification skipped because Firebase credentials are not yet configured in .env', [
                'recipient_count' => count($tokens),
                'title' => $title,
            ]);

            return ['sent' => 0, 'failed' => 0, 'pruned' => 0];
        }

        $sentCount = 0;
        $failedCount = 0;
        $prunedCount = 0;

        // Standard stringified data payload for cross-platform PWA compatibility
        $stringData = [];
        foreach ($data as $k => $v) {
            $stringData[(string) $k] = is_scalar($v) ? (string) $v : json_encode($v, JSON_UNESCAPED_UNICODE);
        }

        // Send via Legacy/HTTP API endpoint or HTTP v1
        foreach ($tokens as $token) {
            try {
                $response = Http::withHeaders([
                    'Authorization' => 'key=' . $serverKey,
                    'Content-Type' => 'application/json',
                ])->timeout(8)->post('https://fcm.googleapis.com/fcm/send', [
                    'to' => $token,
                    'notification' => [
                        'title' => $title,
                        'body' => $body,
                        'icon' => '/favicon.svg',
                        'badge' => '/favicon.svg',
                        'sound' => 'default',
                        'click_action' => $data['url'] ?? '/notifications',
                    ],
                    'data' => array_merge($stringData, [
                        'title' => $title,
                        'body' => $body,
                        'url' => $data['url'] ?? '/notifications',
                    ]),
                    'priority' => 'high',
                ]);

                if ($response->successful()) {
                    $json = $response->json();
                    if (($json['success'] ?? 0) === 1) {
                        $sentCount++;
                    } else {
                        $failedCount++;
                        // Check if token expired / unregistered
                        $error = $json['results'][0]['error'] ?? null;
                        if (in_array($error, ['NotRegistered', 'InvalidRegistration', 'MismatchSenderId'], true)) {
                            UserDeviceToken::where('token', $token)->delete();
                            $prunedCount++;
                        }
                    }
                } elseif (in_array($response->status(), [400, 404, 410], true)) {
                    $failedCount++;
                    UserDeviceToken::where('token', $token)->delete();
                    $prunedCount++;
                } else {
                    $failedCount++;
                }
            } catch (\Throwable $e) {
                $failedCount++;
                Log::warning('FcmService: Error sending push to token', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return [
            'sent' => $sentCount,
            'failed' => $failedCount,
            'pruned' => $prunedCount,
        ];
    }
}
