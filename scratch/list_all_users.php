<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$users = \App\Models\User::all();
echo "Total users in DB: " . $users->count() . "\n";
foreach ($users as $u) {
    echo "ID: {$u->id} | Email: {$u->email} | Name: {$u->name}\n";
}
