<?php

$ch = curl_init('https://system-production-7ba9.up.railway.app/api/v1/auth/login');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['email' => 'mostafa@gmail.com', 'password' => '123456']));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'Accept: application/json']);
$loginRes = curl_exec($ch);
curl_close($ch);
$d = json_decode($loginRes, true);
$t = $d['token'] ?? null;

$ch2 = curl_init('https://system-production-7ba9.up.railway.app/api/v1/reviewer/purchase-requests');
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch2, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch2, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'Accept: application/json', "Authorization: Bearer $t"]);
$res = curl_exec($ch2);
$code = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
curl_close($ch2);

echo "HTTP CODE: $code\n";
echo "RESPONSE:\n$res\n";
