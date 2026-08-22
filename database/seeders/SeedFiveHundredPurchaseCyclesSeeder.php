<?php

namespace Database\Seeders;

use App\Models\ApprovalHistory;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Item;
use App\Models\Notification;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequest;
use App\Models\PurchaseRequestItem;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class SeedFiveHundredPurchaseCyclesSeeder extends Seeder
{
    private const MARKER = 'SEED-500-PURCHASE-CYCLES';
    private const OPERATIONS_COUNT = 500;

    public function run(): void
    {
        DB::transaction(function (): void {
            $this->removePreviousSeededCycles();

            $employees = User::whereHas('roles', fn ($query) => $query->where('slug', 'employee'))
                ->where('is_active', true)
                ->orderBy('id')
                ->get()
                ->values();

            $reviewers = User::whereHas('roles', fn ($query) => $query->where('slug', 'reviewer'))
                ->where('is_active', true)
                ->orderBy('id')
                ->get()
                ->values();

            $procurementManager = User::whereHas('roles', fn ($query) => $query->where('slug', 'procurement_manager'))
                ->where('is_active', true)
                ->orderBy('id')
                ->firstOrFail();

            $accountants = User::whereHas('roles', fn ($query) => $query->where('slug', 'accountant'))
                ->where('is_active', true)
                ->orderBy('id')
                ->get();

            $generalManagers = User::whereHas('roles', fn ($query) => $query->where('slug', 'general_manager'))
                ->where('is_active', true)
                ->orderBy('id')
                ->get();

            $departments = Department::where('is_active', true)
                ->whereIn('code', ['DEVELOPMENT', 'EXECUTION', 'LICENSES', 'SALES'])
                ->with('manager')
                ->orderBy('id')
                ->get()
                ->values();

            $suppliers = Supplier::where('is_active', true)->orderBy('id')->get()->values();
            $items = Item::where('is_active', true)->orderBy('id')->get()->values();

            if ($employees->count() < 2 || $reviewers->count() < 2 || $departments->count() < 2 || $suppliers->count() < 10 || $items->count() < 50) {
                throw new \RuntimeException('Reference data is insufficient for the 500 purchase cycles seed.');
            }

            $year = now()->year;
            $prSequence = PurchaseRequest::withTrashed()->whereYear('created_at', $year)->count() + 1;
            $poSequence = PurchaseOrder::withTrashed()->whereYear('created_at', $year)->count() + 1;
            $deliveryStatuses = ['COMPLETE', 'PARTIAL', 'NOT_STARTED', 'LATE'];
            $priorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
            $paymentTerms = ['دفع بعد التوريد', 'دفع خلال 30 يومًا', 'دفعة مقدمة حسب الاتفاق', 'تحويل بنكي بعد الاستلام'];

            for ($operation = 0; $operation < self::OPERATIONS_COUNT; $operation++) {
                $employee = $employees[$operation % $employees->count()];
                $department = $departments[$operation % $departments->count()];
                $reviewer = $department->manager ?: $reviewers[($operation * 3) % $reviewers->count()];
                $supplier = $suppliers[($operation * 17 + 5) % $suppliers->count()];
                $itemCount = 1 + ($operation % 4);
                $createdAt = Carbon::now()->subDays(89 - ($operation % 90))->subHours($operation % 18);
                $priority = $priorities[$operation % count($priorities)];
                $requestTotal = 0.0;
                $requestItems = [];

                for ($line = 0; $line < $itemCount; $line++) {
                    $item = $items[(($operation * 29) + ($line * 37)) % $items->count()];
                    $quantity = 5 + (($operation * 19 + $line * 11) % 1496);
                    $unitPrice = round(25 + (($operation * 43 + $line * 67) % 4976), 2);
                    $estimatedUnitPrice = round($unitPrice * (0.88 + (($operation + $line) % 8) / 100), 2);
                    $estimatedLineTotal = round($quantity * $estimatedUnitPrice, 2);
                    $lineTotal = round($quantity * $unitPrice, 2);
                    $requestTotal += $estimatedLineTotal;
                    $regionNumber = (($operation * 3 + $line) % 27) + 1;

                    $requestItems[] = [
                        'item' => $item,
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'estimated_unit_price' => $estimatedUnitPrice,
                        'estimated_line_total' => $estimatedLineTotal,
                        'line_total' => $lineTotal,
                        'region' => "المنطقة {$regionNumber}",
                    ];
                }

                $pr = PurchaseRequest::create([
                    'request_number' => sprintf('PR-%s-%05d', $year, $prSequence++),
                    'user_id' => $employee->id,
                    'department_id' => $department->id,
                    'reviewer_user_id' => $reviewer->id,
                    'priority' => $priority,
                    'status' => 'APPROVED_BY_PROCUREMENT',
                    'total_estimated_cost' => round($requestTotal, 2),
                    'date_needed' => $createdAt->copy()->addDays(5 + ($operation % 30))->toDateString(),
                    'notes' => self::MARKER . ' | دورة كاملة موظف-مراجع-مشتريات-حسابات',
                    'submitted_at' => $createdAt->copy()->addHours(2),
                ]);
                $pr->created_at = $createdAt;
                $pr->updated_at = $createdAt->copy()->addHours(7);
                $pr->saveQuietly();

                foreach ($requestItems as $requestItemIndex => $requestItem) {
                    $item = $requestItem['item'];
                    $prItem = PurchaseRequestItem::create([
                        'purchase_request_id' => $pr->id,
                        'item_id' => $item->id,
                        'item_description' => $item->name,
                        'item_reference' => $item->sku,
                        'region' => $requestItem['region'],
                        'quantity' => $requestItem['quantity'],
                        'uom' => $item->uom,
                        'estimated_unit_price' => $requestItem['estimated_unit_price'],
                        'estimated_line_total' => $requestItem['estimated_line_total'],
                        'specifications' => 'توريد مواد بناء للمشروع حسب الاحتياج التشغيلي.',
                        'notes' => self::MARKER,
                    ]);
                    $requestItems[$requestItemIndex]['pr_item'] = $prItem;
                }

                $poSubtotal = collect($requestItems)->sum('line_total');
                $deliveryStatus = $deliveryStatuses[$operation % count($deliveryStatuses)];
                $deliveryDate = $createdAt->copy()->addDays(12 + ($operation % 28));
                $actualDeliveryDate = in_array($deliveryStatus, ['COMPLETE', 'LATE'], true)
                    ? $deliveryDate->copy()->subDays($deliveryStatus === 'LATE' ? 3 : 1)
                    : null;

                $po = PurchaseOrder::create([
                    'po_number' => sprintf('PO-%s-%05d', $year, $poSequence++),
                    'purchase_request_id' => $pr->id,
                    'supplier_id' => $supplier->id,
                    'created_by_user_id' => $procurementManager->id,
                    'status' => 'ISSUED',
                    'subtotal' => round($poSubtotal, 2),
                    'grand_total' => round($poSubtotal, 2),
                    'payment_terms' => $paymentTerms[$operation % count($paymentTerms)],
                    'delivery_terms' => 'التوريد إلى موقع المشروع المحدد في الطلب.',
                    'delivery_date' => $deliveryDate->toDateString(),
                    'delivery_status' => $deliveryStatus,
                    'actual_delivery_date' => $actualDeliveryDate?->toDateString(),
                    'delivery_notes' => $deliveryStatus === 'COMPLETE' ? 'تم استلام التوريد بالكامل.' : ($deliveryStatus === 'PARTIAL' ? 'تم استلام جزء من التوريد.' : null),
                    'budget_code' => sprintf('EGP-PROJ-%03d', (($operation % 40) + 1)),
                    'financial_notes' => 'القيمة بالجنيه المصري EGP بدون ضرائب أو خصومات.',
                    'notes' => self::MARKER . ' | دورة كاملة حتى الإصدار للحسابات',
                ]);
                $po->created_at = $createdAt->copy()->addHours(8);
                $po->updated_at = $createdAt->copy()->addDays(1);
                $po->saveQuietly();

                foreach ($requestItems as $requestItem) {
                    $item = $requestItem['item'];
                    PurchaseOrder::withoutEvents(function () use ($po, $requestItem, $item): void {
                        $po->items()->create([
                            'pr_item_id' => $requestItem['pr_item']->id,
                            'item_id' => $item->id,
                            'item_description' => $item->name,
                            'item_reference' => $item->sku,
                            'region' => $requestItem['region'],
                            'quantity' => $requestItem['quantity'],
                            'uom' => $item->uom,
                            'unit_price' => $requestItem['unit_price'],
                            'line_total' => $requestItem['line_total'],
                            'specifications' => 'توريد مواد بناء للمشروع حسب الاحتياج التشغيلي.',
                        ]);
                    });
                }

                $this->addRequestHistory($pr, $employee, 'CREATED', null, 'DRAFT', 'أنشأ الموظف طلب الشراء.');
                $this->addRequestHistory($pr, $employee, 'SUBMITTED', 'DRAFT', 'SUBMITTED', 'أرسل الموظف طلب الشراء إلى المراجع.');
                $this->addRequestHistory($pr, $reviewer, 'REVIEW_STARTED', 'SUBMITTED', 'UNDER_REVIEW', 'بدأ المراجع مراجعة الطلب.');
                $this->addRequestHistory($pr, $reviewer, 'APPROVED_BY_REVIEWER', 'UNDER_REVIEW', 'PENDING_PROCUREMENT_APPROVAL', 'اعتمد رئيس القسم الطلب وأرسله إلى مدير المشتريات.');
                $this->addRequestHistory($pr, $procurementManager, 'APPROVED_BY_PROCUREMENT', 'PENDING_PROCUREMENT_APPROVAL', 'APPROVED_BY_PROCUREMENT', 'اعتمد مدير المشتريات الطلب.');
                $this->addOrderHistory($po, $procurementManager, 'PO_CREATED', 'APPROVED_BY_PROCUREMENT', 'PO_DRAFT', 'أنشأ مدير المشتريات أمر الشراء.');
                $this->addOrderHistory($po, $procurementManager, 'PO_ISSUED', 'PO_DRAFT', 'ISSUED', 'أصدر مدير المشتريات أمر الشراء وأرسله للحسابات.');

                $this->addNotification($accountants->first(), $po, 'تم إصدار أمر شراء جديد', "أمر الشراء {$po->po_number} من المورد {$supplier->company_name} جاهز للمراجعة المالية.");
                $this->addNotification($generalManagers->first(), $po, 'إشعار أمر شراء جديد', "تم إصدار أمر الشراء {$po->po_number} للقسم {$department->name} بقيمة {$po->grand_total} جنيه مصري.");

                if (($operation + 1) % 100 === 0) {
                    $this->command?->info(sprintf('Completed %d/%d purchase cycles.', $operation + 1, self::OPERATIONS_COUNT));
                }
            }
        });

        $this->command?->info('Created 500 complete purchase cycles successfully.');
    }

    private function removePreviousSeededCycles(): void
    {
        $purchaseOrders = PurchaseOrder::withTrashed()->where('notes', 'like', self::MARKER . '%')->get();
        foreach ($purchaseOrders as $po) {
            Notification::where('notifiable_type', PurchaseOrder::class)->where('notifiable_id', $po->id)->delete();
            ApprovalHistory::where('target_type', PurchaseOrder::class)->where('target_id', $po->id)->delete();
            AuditLog::where('entity_type', PurchaseOrder::class)->where('entity_id', $po->id)->delete();
            $po->items()->delete();
            $po->forceDelete();
        }

        $purchaseRequests = PurchaseRequest::withTrashed()->where('notes', 'like', self::MARKER . '%')->get();
        foreach ($purchaseRequests as $pr) {
            Notification::where('notifiable_type', PurchaseRequest::class)->where('notifiable_id', $pr->id)->delete();
            ApprovalHistory::where('target_type', PurchaseRequest::class)->where('target_id', $pr->id)->delete();
            AuditLog::where('entity_type', PurchaseRequest::class)->where('entity_id', $pr->id)->delete();
            $pr->items()->delete();
            $pr->forceDelete();
        }
    }

    private function addRequestHistory(PurchaseRequest $pr, ?User $actor, string $action, ?string $from, string $to, string $comments): void
    {
        if (! $actor) {
            return;
        }

        ApprovalHistory::create([
            'target_type' => PurchaseRequest::class,
            'target_id' => $pr->id,
            'actor_user_id' => $actor->id,
            'action' => $action,
            'from_state' => $from,
            'to_state' => $to,
            'comments' => $comments,
        ]);
    }

    private function addOrderHistory(PurchaseOrder $po, User $actor, string $action, string $from, string $to, string $comments): void
    {
        ApprovalHistory::create([
            'target_type' => PurchaseOrder::class,
            'target_id' => $po->id,
            'actor_user_id' => $actor->id,
            'action' => $action,
            'from_state' => $from,
            'to_state' => $to,
            'comments' => $comments,
        ]);
    }

    private function addNotification(?User $user, PurchaseOrder $po, string $title, string $message): void
    {
        if (! $user) {
            return;
        }

        Notification::create([
            'user_id' => $user->id,
            'type' => 'PURCHASE_ORDER_ISSUED',
            'title' => $title,
            'message' => $message,
            'notifiable_type' => PurchaseOrder::class,
            'notifiable_id' => $po->id,
            'read_at' => null,
        ]);
    }
}
