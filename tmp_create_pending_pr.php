<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$employee = App\Models\User::where('email', 'amar@gmail.com')->firstOrFail();
$reviewer = App\Models\User::where('email', 'development.manager@ashbiliya.local')->firstOrFail();
$siteEngineer = App\Models\User::where('email', 'site.engineer@ashbiliya.local')->firstOrFail();
$department = App\Models\Department::where('manager_user_id', $reviewer->id)->firstOrFail();
$item = App\Models\Item::query()->where('is_active', true)->firstOrFail();

$request = App\Models\PurchaseRequest::create([
    'request_number' => 'PR-UI-START-QUOTES-' . now()->format('His'),
    'user_id' => $employee->id,
    'department_id' => $department->id,
    'reviewer_user_id' => $reviewer->id,
    'site_engineer_user_id' => $siteEngineer->id,
    'priority' => 'NORMAL',
    'status' => 'PENDING_PROCUREMENT_APPROVAL',
    'total_estimated_cost' => 1500,
    'date_needed' => now()->toDateString(),
    'notes' => 'طلب تجريبي للتحقق من زر بدء عروض الأسعار.',
]);

$request->items()->create([
    'item_id' => $item->id,
    'item_description' => $item->name,
    'item_reference' => 'UI-START-QUOTES-001',
    'region' => 'المنطقة السابعة والعشرون',
    'quantity' => 1,
    'uom' => $item->uom ?: 'PCS',
    'estimated_unit_price' => 1500,
    'estimated_line_total' => 1500,
]);

echo $request->id . '|' . $request->request_number . PHP_EOL;
