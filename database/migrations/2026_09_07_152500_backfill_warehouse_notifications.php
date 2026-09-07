<?php

use App\Models\PurchaseOrder;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Backfill warehouse receipt notifications for all pending purchase orders in the warehouse queue.
     */
    public function up(): void
    {
        $warehouseKeepers = User::whereHas('roles', fn ($q) => $q->where('slug', 'warehouse_keeper'))
            ->where('is_active', true)
            ->get();

        if ($warehouseKeepers->isEmpty()) {
            $warehouseKeepers = User::where('email', 'salam@gmail.com')->where('is_active', true)->get();
        }

        if ($warehouseKeepers->isEmpty()) {
            return;
        }

        $notificationService = app(NotificationService::class);

        // Find all orders currently in warehouse queue
        $orders = PurchaseOrder::where('status', 'ISSUED')
            ->whereDoesntHave('receipts', fn ($query) => $query->whereIn('status', ['PENDING_SITE_ENGINEER', 'APPROVED']))
            ->whereDoesntHave('purchaseRequest', function ($prQuery) {
                $prQuery->where('request_type', 'OFFICE_SUPPLIES')
                    ->orWhereHas('targetDepartment', fn ($q) => $q->where('code', 'BUILDINGS'))
                    ->orWhereHas('department', fn ($q) => $q->where('code', 'BUILDINGS'))
                    ->orWhereHas('assignedReviewer.department', fn ($q) => $q->where('code', 'BUILDINGS'))
                    ->orWhereHas('assignedReviewer', fn ($q) => $q->where('email', 'hatem@gmail.com'));
            })
            ->get();

        foreach ($orders as $order) {
            $notificationService->queueUsers(
                $warehouseKeepers,
                'purchase_order_ready_for_warehouse',
                'أمر شراء بانتظار استلام المواد بالمخزن',
                "تم إصدار أمر الشراء {$order->po_number} بانتظار استلام الأصناف وفحصها وإصدار إذن الاستلام.",
                $order
            );
        }
    }

    public function down(): void
    {
        // No-op
    }
};
