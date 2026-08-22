<?php

declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '1');

echo "BOOTSTRAP_START" . PHP_EOL;
require dirname(__DIR__) . '/vendor/autoload.php';
$app = require dirname(__DIR__) . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
echo "BOOTSTRAP_READY" . PHP_EOL;

$users = App\Models\User::with(['roles:id,name,slug', 'department:id,name,code'])
    ->orderBy('id')
    ->get(['id', 'name', 'email', 'is_active', 'department_id']);

echo "USER_COUNT=" . $users->count() . PHP_EOL;
echo "PURCHASE_REQUESTS=" . App\Models\PurchaseRequest::count() . PHP_EOL;
echo "PURCHASE_ORDERS=" . App\Models\PurchaseOrder::count() . PHP_EOL;
echo "PURCHASE_RECEIPTS=" . App\Models\PurchaseReceipt::count() . PHP_EOL;
foreach ($users as $user) {
    $roles = $user->roles->map(fn ($role) => $role->slug ?: $role->name)->implode(',');
    $department = $user->department?->name ?: 'بدون قسم';
    $departmentCode = $user->department?->code ?: '-';
    printf(
        "id=%d | email=%s | name=%s | active=%s | roles=%s | department=%s (%s)%s",
        $user->id,
        $user->email,
        $user->name,
        $user->is_active ? 'yes' : 'no',
        $roles ?: 'بدون دور',
        $department,
        $departmentCode,
        PHP_EOL
    );
}
