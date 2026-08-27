<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "Default DB Connection: " . config('database.default') . PHP_EOL;

// Try SQLite
try {
    config(['database.default' => 'sqlite']);
    config(['database.connections.sqlite.database' => database_path('database.sqlite')]);
    
    echo "\n--- SQLite Data ---" . PHP_EOL;
    $users = App\Models\User::with('roles', 'department')->get();
    echo "Total Users: " . $users->count() . PHP_EOL;
    foreach ($users as $u) {
        $roleNames = $u->roles->pluck('name')->implode(', ');
        $deptName = $u->department?->name ?? 'None';
        echo sprintf("%2d | %-25s | %-35s | %-15s | Dept: %s\n", $u->id, $u->name, $u->email, $roleNames, $deptName);
    }

    echo "\n--- SQLite Departments ---" . PHP_EOL;
    $depts = App\Models\Department::with('manager', 'siteEngineer')->get();
    echo "Total Departments: " . $depts->count() . PHP_EOL;
    foreach ($depts as $d) {
        $mgr = $d->manager?->name ?? 'None';
        $status = $d->is_active ? 'Active' : 'Inactive';
        echo sprintf("%2d | %-10s | %-20s | Manager: %-20s | Status: %s\n", $d->id, $d->code, $d->name, $mgr, $status);
    }
} catch (\Throwable $e) {
    echo "SQLite Error: " . $e->getMessage() . PHP_EOL;
}
