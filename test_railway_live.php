<?php

$baseUrl = 'https://system-production-7ba9.up.railway.app/api/v1';

function testEndpoint($token, $path) {
    global $baseUrl;
    $ch = curl_init("$baseUrl$path");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json',
        "Authorization: Bearer $token",
    ]);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    echo "Endpoint: $path => HTTP $code\n";
    if ($code >= 400) {
        echo "Response: $res\n";
    }
}

// 1. Login as mostafa
$ch = curl_init("$baseUrl/auth/login");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['email' => 'mostafa@gmail.com', 'password' => '123456']));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'Accept: application/json']);
$loginRes = curl_exec($ch);
curl_close($ch);
$loginData = json_decode($loginRes, true);
$token = $loginData['data']['token'] ?? $loginData['token'] ?? null;

echo "Token: " . substr($token, 0, 15) . "...\n\n";

testEndpoint($token, '/auth/me');
testEndpoint($token, '/notifications');
testEndpoint($token, '/notifications/unread-count');
testEndpoint($token, '/reviewer/purchase-requests');
testEndpoint($token, '/purchase-requests/department-options');
