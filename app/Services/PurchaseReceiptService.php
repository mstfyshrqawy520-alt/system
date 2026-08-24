<?php

namespace App\Services;

use App\Models\ApprovalHistory;
use App\Models\PurchaseOrder;
use App\Models\PurchaseReceipt;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PurchaseReceiptService
{
    public function warehouseQueue(int $perPage = 15)
    {
        return PurchaseOrder::with([
            'supplier',
            'purchaseRequest.requester',
            'purchaseRequest.department',
            'purchaseRequest.siteEngineer',
            'items.item',
            'items.prItem',
        ])
            ->where('status', 'ISSUED')
            ->whereDoesntHave('receipts', fn ($query) => $query->whereIn('status', ['PENDING_SITE_ENGINEER', 'APPROVED']))
            ->orderByDesc('updated_at')
            ->paginate($perPage);
    }

    public function createByWarehouse(User $warehouseKeeper, PurchaseOrder $purchaseOrder, array $items, ?string $receivedAt = null, ?string $notes = null): PurchaseReceipt
    {
        $purchaseOrder->loadMissing(['purchaseRequest', 'items']);
        $siteEngineerId = $purchaseOrder->purchaseRequest?->site_engineer_user_id;

        if (! $siteEngineerId) {
            throw new \RuntimeException('لا يوجد مهندس موقع محدد لهذا الطلب.');
        }
        if (! in_array($purchaseOrder->status, ['ISSUED', 'PENDING_ACCOUNTING_REVIEW', 'APPROVED_BY_ACCOUNTING', 'FINAL_APPROVED'], true)) {
            throw new \RuntimeException('لا يمكن تسجيل الاستلام في حالة أمر الشراء الحالية.');
        }
        if (PurchaseReceipt::where('purchase_order_id', $purchaseOrder->id)->whereIn('status', ['PENDING_SITE_ENGINEER', 'APPROVED'])->exists()) {
            throw new \RuntimeException('تم إنشاء إذن استلام لهذا الأمر بالفعل.');
        }

        $orderItems = $purchaseOrder->items->keyBy('id');
        if (count($items) !== $orderItems->count()) {
            throw ValidationException::withMessages(['items' => ['يجب تسجيل الكمية المستلمة لكل بند في أمر الشراء.']]);
        }

        return DB::transaction(function () use ($warehouseKeeper, $purchaseOrder, $items, $receivedAt, $notes, $siteEngineerId, $orderItems): PurchaseReceipt {
            $receipt = PurchaseReceipt::create([
                'purchase_order_id' => $purchaseOrder->id,
                'purchase_request_id' => $purchaseOrder->purchase_request_id,
                'warehouse_keeper_user_id' => $warehouseKeeper->id,
                'site_engineer_user_id' => $siteEngineerId,
                'receipt_number' => 'GRN-' . now()->format('YmdHis') . '-' . $purchaseOrder->id,
                'status' => 'PENDING_SITE_ENGINEER',
                'received_at' => $receivedAt ?: now()->toDateString(),
                'warehouse_submitted_at' => now(),
                'warehouse_notes' => $notes,
            ]);

            foreach ($items as $item) {
                $orderItemId = (int) ($item['purchase_order_item_id'] ?? 0);
                $orderItem = $orderItems->get($orderItemId);
                if (! $orderItem) {
                    throw ValidationException::withMessages(['items' => ['يوجد بند غير مرتبط بأمر الشراء.']]);
                }
                $receivedQuantity = (float) ($item['received_quantity'] ?? -1);
                if ($receivedQuantity < 0) {
                    throw ValidationException::withMessages(['items' => ['الكمية المستلمة لا يمكن أن تكون سالبة.']]);
                }

                $receipt->items()->create([
                    'purchase_order_item_id' => $orderItem->id,
                    'ordered_quantity' => $orderItem->quantity,
                    'received_quantity' => $receivedQuantity,
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            $purchaseOrder->update(['delivery_status' => 'IN_RECEIPT']);
            ApprovalHistory::create([
                'target_type' => PurchaseReceipt::class,
                'target_id' => $receipt->id,
                'actor_user_id' => $warehouseKeeper->id,
                'action' => 'WAREHOUSE_RECEIPT_SUBMITTED',
                'from_state' => 'PENDING_WAREHOUSE',
                'to_state' => 'PENDING_SITE_ENGINEER',
                'comments' => 'سجل أمين المخزن الكميات المستلمة وأرسل إذن الاستلام لمهندس الموقع.',
            ]);

            $siteEngineer = User::find($siteEngineerId);
            if ($siteEngineer) {
                app(NotificationService::class)->queueNotification(
                    $siteEngineer,
                    'purchase_receipt_pending_site_engineer',
                    'إذن استلام بانتظار اعتمادك',
                    "إذن الاستلام {$receipt->receipt_number} لأمر الشراء {$purchaseOrder->po_number} بانتظار مراجعتك.",
                    $receipt
                );
            }

            return $receipt->fresh(['purchaseOrder.supplier', 'purchaseOrder.items.item', 'purchaseRequest', 'warehouseKeeper', 'siteEngineer', 'items.purchaseOrderItem']);
        });
    }

    public function updateBySiteEngineer(User $siteEngineer, PurchaseReceipt $receipt, array $items, ?string $notes = null): PurchaseReceipt
    {
        $receipt->loadMissing(['items', 'purchaseOrder.items']);
        if ((int) $receipt->site_engineer_user_id !== (int) $siteEngineer->id) {
            throw new \RuntimeException('هذا الإذن غير مخصص لمهندس الموقع الحالي.');
        }
        if ($receipt->status !== 'PENDING_SITE_ENGINEER') {
            throw new \RuntimeException('لا يمكن تعديل إذن الاستلام بعد اعتماده أو إرساله للحسابات.');
        }

        return DB::transaction(function () use ($siteEngineer, $receipt, $items, $notes): PurchaseReceipt {
            $receiptItems = $receipt->items->keyBy('id');
            foreach ($items as $input) {
                $receiptItem = $receiptItems->get((int) ($input['id'] ?? 0));
                if (! $receiptItem) {
                    throw ValidationException::withMessages(['items' => ['يوجد بند غير مرتبط بإذن الاستلام.']]);
                }
                $receivedQuantity = (float) ($input['received_quantity'] ?? -1);
                if ($receivedQuantity < 0) {
                    throw ValidationException::withMessages(['items' => ['الكمية المستلمة لا يمكن أن تكون سالبة.']]);
                }
                $receiptItem->update([
                    'received_quantity' => $receivedQuantity,
                    'notes' => $input['notes'] ?? $receiptItem->notes,
                ]);
            }
            if ($notes !== null) {
                $receipt->update(['site_engineer_notes' => $notes]);
            }

            ApprovalHistory::create([
                'target_type' => PurchaseReceipt::class,
                'target_id' => $receipt->id,
                'actor_user_id' => $siteEngineer->id,
                'action' => 'SITE_ENGINEER_RECEIPT_UPDATED',
                'from_state' => 'PENDING_SITE_ENGINEER',
                'to_state' => 'PENDING_SITE_ENGINEER',
                'comments' => 'عدّل مهندس الموقع كميات إذن الاستلام قبل إرساله للحسابات.',
            ]);

            return $receipt->fresh(['purchaseOrder.supplier', 'purchaseOrder.items.item', 'purchaseRequest', 'warehouseKeeper', 'siteEngineer', 'items.purchaseOrderItem']);
        });
    }

    public function approveBySiteEngineer(User $siteEngineer, PurchaseReceipt $receipt, ?string $notes = null): PurchaseReceipt
    {
        $receipt->loadMissing(['purchaseOrder', 'items']);
        if ($receipt->site_engineer_user_id !== $siteEngineer->id) {
            throw new \RuntimeException('هذا الإذن غير مخصص لمهندس الموقع الحالي.');
        }
        if ($receipt->status !== 'PENDING_SITE_ENGINEER') {
            throw new \RuntimeException('إذن الاستلام ليس بانتظار اعتماد مهندس الموقع.');
        }

        return DB::transaction(function () use ($siteEngineer, $receipt, $notes): PurchaseReceipt {
            $receipt->update([
                'status' => 'APPROVED',
                'site_engineer_approved_at' => now(),
                'site_engineer_notes' => $notes,
            ]);
            $receipt->purchaseOrder->update([
                'delivery_status' => 'DELIVERED',
                'actual_delivery_date' => $receipt->received_at ?: now()->toDateString(),
            ]);
            ApprovalHistory::create([
                'target_type' => PurchaseReceipt::class,
                'target_id' => $receipt->id,
                'actor_user_id' => $siteEngineer->id,
                'action' => 'SITE_ENGINEER_RECEIPT_APPROVED',
                'from_state' => 'PENDING_SITE_ENGINEER',
                'to_state' => 'APPROVED',
                'comments' => $notes ?? 'اعتمد مهندس الموقع الكميات المستلمة.',
            ]);

            $notificationService = app(NotificationService::class);
            $accountants = $notificationService->resolveUsersWithPermission('purchase_order.view_accounting');
            $notificationService->queueAccountingWithPurchaseOrderAndReceipt(
                $accountants,
                $receipt->purchaseOrder,
                $receipt
            );

            return $receipt->fresh(['purchaseOrder.supplier', 'purchaseOrder.items.item', 'purchaseRequest', 'warehouseKeeper', 'siteEngineer', 'items.purchaseOrderItem']);
        });
    }
}
