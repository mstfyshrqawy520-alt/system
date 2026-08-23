<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserDeviceToken;
use Illuminate\Support\Facades\Cache;
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
     * Send push notification to a collection of FCM registration tokens
     * using the FCM HTTP v1 API with Service Account OAuth2 authentication.
     *
     * @param array<string> $tokens
     * @param string $title
     * @param string $body
     * @param array<string, mixed> $data
     * @return array{sent: int, failed: int, pruned: int}
     */
    public function sendToTokens(array $tokens, string $title, string $body, array $data = []): array
    {
        $credentials = $this->getServiceAccountCredentials();

        if ($credentials === null) {
            Log::debug('FcmService: Push notification skipped — Firebase Service Account credentials not configured.', [
                'recipient_count' => count($tokens),
                'title' => $title,
            ]);
            return ['sent' => 0, 'failed' => 0, 'pruned' => 0];
        }

        $accessToken = $this->getAccessToken($credentials);
        if ($accessToken === null) {
            Log::warning('FcmService: Could not obtain OAuth2 access token for FCM.');
            return ['sent' => 0, 'failed' => 0, 'pruned' => 0];
        }

        $projectId = $credentials['project_id'] ?? '';
        $endpoint = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";

        // Standard stringified data payload for cross-platform PWA compatibility
        $stringData = [];
        foreach ($data as $k => $v) {
            $stringData[(string) $k] = is_scalar($v) ? (string) $v : json_encode($v, JSON_UNESCAPED_UNICODE);
        }
        $stringData['title'] = $title;
        $stringData['body'] = $body;
        $stringData['url'] = $data['url'] ?? '/notifications';

        $sentCount = 0;
        $failedCount = 0;
        $prunedCount = 0;

        foreach ($tokens as $token) {
            try {
                $message = [
                    'message' => [
                        'token' => $token,
                        'notification' => [
                            'title' => $title,
                            'body' => $body,
                        ],
                        'webpush' => [
                            'notification' => [
                                'icon' => '/favicon.svg',
                                'badge' => '/favicon.svg',
                                'dir' => 'rtl',
                                'lang' => 'ar',
                                'vibrate' => [200, 100, 200],
                            ],
                            'fcm_options' => [
                                'link' => $data['url'] ?? '/notifications',
                            ],
                        ],
                        'data' => $stringData,
                        'android' => [
                            'priority' => 'high',
                        ],
                    ],
                ];

                $response = Http::withHeaders([
                    'Authorization' => 'Bearer ' . $accessToken,
                    'Content-Type' => 'application/json',
                ])->timeout(10)->post($endpoint, $message);

                if ($response->successful()) {
                    $sentCount++;
                } else {
                    $failedCount++;
                    $errorBody = $response->json();
                    $errorStatus = $errorBody['error']['status'] ?? '';
                    $errorCode = $errorBody['error']['details'][0]['errorCode'] ?? '';

                    // Prune invalid/expired tokens
                    if (in_array($errorStatus, ['NOT_FOUND', 'INVALID_ARGUMENT'], true)
                        || in_array($errorCode, ['UNREGISTERED', 'INVALID_ARGUMENT'], true)
                        || $response->status() === 404
                    ) {
                        UserDeviceToken::where('token', $token)->delete();
                        $prunedCount++;
                    }

                    // If access token expired mid-loop, refresh and retry once
                    if ($response->status() === 401) {
                        Cache::forget('fcm_oauth2_access_token');
                        $accessToken = $this->getAccessToken($credentials);
                        if ($accessToken) {
                            $retry = Http::withHeaders([
                                'Authorization' => 'Bearer ' . $accessToken,
                                'Content-Type' => 'application/json',
                            ])->timeout(10)->post($endpoint, $message);
                            if ($retry->successful()) {
                                $sentCount++;
                                $failedCount--; // undo the earlier count
                            }
                        }
                    }

                    Log::debug('FcmService: FCM v1 send failed', [
                        'status' => $response->status(),
                        'error' => $errorBody['error']['message'] ?? 'unknown',
                    ]);
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

    /**
     * Get the Firebase Service Account credentials from environment or file.
     *
     * @return array<string, mixed>|null
     */
    private function getServiceAccountCredentials(): ?array
    {
        // 1. Try environment variable (raw JSON or base64-encoded)
        $envJson = env('FIREBASE_CREDENTIALS_JSON', '');
        if (!empty($envJson)) {
            $decoded = json_decode($envJson, true);
            if (is_array($decoded) && !empty($decoded['private_key'])) {
                return $decoded;
            }
            // Try base64
            $base64Decoded = base64_decode($envJson, true);
            if ($base64Decoded) {
                $decoded = json_decode($base64Decoded, true);
                if (is_array($decoded) && !empty($decoded['private_key'])) {
                    return $decoded;
                }
            }
        }

        // 2. Try file path from environment
        $filePath = env('FIREBASE_CREDENTIALS_FILE', base_path('firebase-service-account.json'));
        if (file_exists($filePath)) {
            $content = file_get_contents($filePath);
            $decoded = json_decode($content, true);
            if (is_array($decoded) && !empty($decoded['private_key'])) {
                return $decoded;
            }
        }

        return null;
    }

    /**
     * Get a cached OAuth2 access token for FCM v1 API.
     * Uses JWT assertion grant with the service account private key.
     *
     * @param array<string, mixed> $credentials
     * @return string|null
     */
    private function getAccessToken(array $credentials): ?string
    {
        return Cache::remember('fcm_oauth2_access_token', 3300, function () use ($credentials) {
            try {
                $now = time();
                $header = $this->base64UrlEncode(json_encode([
                    'alg' => 'RS256',
                    'typ' => 'JWT',
                ]));

                $payload = $this->base64UrlEncode(json_encode([
                    'iss' => $credentials['client_email'],
                    'sub' => $credentials['client_email'],
                    'aud' => $credentials['token_uri'] ?? 'https://oauth2.googleapis.com/token',
                    'iat' => $now,
                    'exp' => $now + 3600,
                    'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
                ]));

                $signatureInput = "{$header}.{$payload}";
                $privateKey = openssl_pkey_get_private($credentials['private_key']);
                if ($privateKey === false) {
                    Log::error('FcmService: Failed to parse service account private key.');
                    return null;
                }

                $signature = '';
                $signed = openssl_sign($signatureInput, $signature, $privateKey, OPENSSL_ALGO_SHA256);
                if (!$signed) {
                    Log::error('FcmService: Failed to sign JWT.');
                    return null;
                }

                $jwt = "{$signatureInput}." . $this->base64UrlEncode($signature);

                // Exchange JWT for access token
                $tokenUri = $credentials['token_uri'] ?? 'https://oauth2.googleapis.com/token';
                $response = Http::asForm()->timeout(10)->post($tokenUri, [
                    'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    'assertion' => $jwt,
                ]);

                if ($response->successful()) {
                    return $response->json('access_token');
                }

                Log::error('FcmService: OAuth2 token exchange failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return null;
            } catch (\Throwable $e) {
                Log::error('FcmService: Error obtaining access token', [
                    'error' => $e->getMessage(),
                ]);
                return null;
            }
        });
    }

    /**
     * Base64 URL-safe encoding (no padding) per RFC 7515.
     */
    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
