<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Default DB Connection: " . config('database.default') . "\n";
echo "DB Database Path: " . config('database.connections.sqlite.database') . "\n";

$emails = [
    'employee.demo@ashbiliya.local',
    'reviewer.demo@ashbiliya.local',
    'procurement.demo@ashbiliya.local',
    'accountant.demo@ashbiliya.local',
    'gm.demo@ashbiliya.local',
    'admin.demo@ashbiliya.local',
];

foreach ($emails as $email) {
    $user = \App\Models\User::where('email', $email)->first();
    if (! $user) {
        echo "❌ USER NOT FOUND: {$email}\n";
        continue;
    }

    $hashMatch = \Illuminate\Support\Facades\Hash::check('Secret123!', $user->password);
    echo ($hashMatch ? "✅" : "❌") . " User: {$user->email} | ID: {$user->id} | Name: {$user->name} | Active: " . ($user->is_active ? 'YES' : 'NO') . " | Password Match: " . ($hashMatch ? 'TRUE' : 'FALSE') . "\n";
    echo "   Stored Password Hash: " . substr($user->password, 0, 30) . "...\n";
}
