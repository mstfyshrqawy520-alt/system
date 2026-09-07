<?php

use App\Models\PurchaseOrder;
use App\Models\PurchaseReceipt;
use App\Services\PurchaseReceiptService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Backfill any currently ISSUED purchase orders for the Buildings department
     * directly to site engineers as direct site receipts, bypassing the warehouse.
     */
    public function up(): void
    {
        $buildingsOrders = PurchaseOrder::with([
            'purchaseRequest.department',
            'purchaseRequest.targetDepartment',
            'purchaseRequest.assignedReviewer.department',
            'items',
        ])
            ->where('status', 'ISSUED')
            ->whereDoesntHave('receipts', fn ($query) => $query->whereIn('status', ['PENDING_SITE_ENGINEER', 'APPROVED']))
            ->get();

        $service = app(PurchaseReceiptService::class);

        foreach ($buildingsOrders as $order) {
            if ($order->isBuildingsDirectDelivery()) {
                try {
                    $service->createDirectSiteReceiptForBuildings($order);
                } catch (\Throwable $e) {
                    report($e);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No destructive reverse needed
    }
};
