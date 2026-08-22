<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$counts = [
    'departments' => App\Models\Department::where('is_active', true)->count(),
    'complete_departments' => App\Models\Department::where('is_active', true)->whereNotNull('manager_user_id')->whereNotNull('site_engineer_user_id')->count(),
    'suppliers' => App\Models\Supplier::where('is_active', true)->count(),
    'items' => App\Models\Item::where('is_active', true)->count(),
    'users' => App\Models\User::where('is_active', true)->count(),
];
foreach ($counts as $key => $value) {
    echo $key . '=' . $value . PHP_EOL;
}
foreach (['employee','reviewer','accountant','procurement_manager','warehouse_keeper','site_engineer','general_manager','admin'] as $role) {
    $count = App\Models\User::whereHas('roles', fn ($query) => $query->where('slug', $role))->where('is_active', true)->count();
    echo 'role_' . $role . '=' . $count . PHP_EOL;
}
