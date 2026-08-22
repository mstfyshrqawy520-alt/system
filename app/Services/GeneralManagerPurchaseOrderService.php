<?php

namespace App\Services;

use App\Models\PurchaseOrder;

class GeneralManagerPurchaseOrderService
{
    public function getGmPurchaseOrders(int $perPage = 15)
    {
        return PurchaseOrder::with([
            'purchaseRequest.requester',
            'purchaseRequest.department',
            'supplier',
            'createdBy',
            'accountingReviewer',
            'items.item:id,name,sku',
        ])
            ->whereIn('status', ['ISSUED', 'APPROVED_BY_ACCOUNTING'])
            ->orderBy('updated_at', 'desc')
            ->paginate($perPage);
    }

    public function getPoForGmView(int $id): PurchaseOrder
    {
        return PurchaseOrder::with([
            'purchaseRequest.requester',
            'purchaseRequest.department',
            'purchaseRequest.assignedReviewer',
            'purchaseRequest.approvalHistory.actor',
            'supplier',
            'createdBy',
            'accountingReviewer',
            'items.item',
            'approvalHistory.actor',
        ])->findOrFail($id);
    }
}
