<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\PurchaseRequest;
use Illuminate\Support\Carbon;

$rows = PurchaseRequest::query()
    ->where('notes', 'like', '%TEST-540-SCENARIOS%')
    ->get();
$actionable = $rows->filter(static fn (PurchaseRequest $request): bool => preg_match('/TEST-PR-G(0[1-9]|1[0-9]|2[0-6])-/', $request->request_number) === 1);
$old = $actionable->filter(static fn (PurchaseRequest $request): bool => $request->date_needed && $request->date_needed->lt(Carbon::today()))->count();
$gm = PurchaseRequest::with('requester.roles')
    ->whereIn('request_number', ['TEST-PR-G13-01', 'TEST-PR-G14-01', 'TEST-PR-G15-01', 'TEST-PR-G16-01'])
    ->get()
    ->map(static fn (PurchaseRequest $request): array => [
        'request_number' => $request->request_number,
        'requester' => $request->requester?->email,
        'reviewer_user_id' => $request->reviewer_user_id,
        'status' => $request->status,
        'date_needed' => $request->date_needed?->toDateString(),
        'roles' => $request->requester?->roles->pluck('slug')->values()->all(),
    ])
    ->values()
    ->all();

echo json_encode([
    'tagged_requests' => $rows->count(),
    'actionable_old_dates' => $old,
    'general_manager_samples' => $gm,
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), PHP_EOL;
