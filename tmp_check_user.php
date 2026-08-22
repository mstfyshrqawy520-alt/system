<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$user = App\Models\User::where('email', 'ahmed@gmail.com')->first();
echo json_encode([
    'exists' => (bool) $user,
    'active' => $user?->is_active,
    'hash_prefix' => $user?->password ? substr($user->password, 0, 4) : null,
    'hash_length' => $user?->password ? strlen($user->password) : null,
    'check' => $user ? Illuminate\Support\Facades\Hash::check('123456', $user->password) : false,
], JSON_UNESCAPED_UNICODE) . PHP_EOL;
