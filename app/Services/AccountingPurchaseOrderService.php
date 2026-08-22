<?php

namespace App\Services;

use App\Models\ApprovalHistory;
use App\Models\AuditLog;
use App\Models\PurchaseOrder;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class AccountingPurchaseOrderService
{
    /**
     * Get POs pending accounting financial review or history.
     */
    public function getAccountingPurchaseOrders(): Collection
    {
        return PurchaseOrder::with(['purchaseRequest.requester', 'purchaseRequest.department', 'purchaseRequest.assignedReviewer', 'purchaseRequest.approvalHistory.actor', 'supplier', 'createdBy', 'accountingReviewer', 'items.item:id,name,sku'])
            ->whereIn('status', ['ISSUED', 'PENDING_ACCOUNTING_REVIEW', 'APPROVED_BY_ACCOUNTING', 'RETURNED_TO_PROCUREMENT'])
            ->orderBy('updated_at', 'desc')
            ->get();
    }

    /**
     * Approve Purchase Order from accounting side (PENDING_ACCOUNTING_REVIEW -> APPROVED_BY_ACCOUNTING).
     */
    public function approvePo(User $accountant, PurchaseOrder $po, ?string $comment = null, ?string $financialNotes = null): PurchaseOrder
    {
        if ($po->status !== 'PENDING_ACCOUNTING_REVIEW') {
            throw new \RuntimeException('Only purchase orders pending accounting review can be approved.');
        }

        return DB::transaction(function () use ($accountant, $po, $comment, $financialNotes) {
            $lockedPo = PurchaseOrder::where('id', $po->id)->lockForUpdate()->first();

            $lockedPo->update([
                'status' => 'APPROVED_BY_ACCOUNTING',
                'reviewed_by_accounting_user_id' => $accountant->id,
                'reviewed_at_accounting' => now(),
                'financial_notes' => $financialNotes ?? $lockedPo->financial_notes,
            ]);

            ApprovalHistory::create([
                'target_type' => PurchaseOrder::class,
                'target_id' => $lockedPo->id,
                'actor_user_id' => $accountant->id,
                'action' => 'ACCOUNTING_APPROVED',
                'from_state' => 'PENDING_ACCOUNTING_REVIEW',
                'to_state' => 'APPROVED_BY_ACCOUNTING',
                'comments' => $comment ?? 'Financial review approved by accounting.',
            ]);

            AuditLog::create([
                'user_id' => $accountant->id,
                'entity_type' => PurchaseOrder::class,
                'entity_id' => $lockedPo->id,
                'action' => 'ACCOUNTING_APPROVED',
                'field_name' => 'status',
                'old_value' => 'PENDING_ACCOUNTING_REVIEW',
                'new_value' => 'APPROVED_BY_ACCOUNTING',
            ]);

            // Notify General Manager (view-only notification — no approval required)
            $notificationService = app(NotificationService::class);
            $gms = $notificationService->resolveUsersWithPermission('purchase_order.view_gm');
            $notificationService->queueUsers(
                $gms,
                'purchase_order_approved_accounting',
                'تمت الموافقة المحاسبية على أمر الشراء',
                "أمر الشراء {$lockedPo->po_number} اعتُمد محاسبياً. يمكنك الاطلاع على التفاصيل.",
                $lockedPo
            );


            return $lockedPo->fresh(['purchaseRequest.requester', 'purchaseRequest.department', 'purchaseRequest.assignedReviewer', 'purchaseRequest.approvalHistory.actor', 'supplier', 'createdBy', 'accountingReviewer', 'items.item:id,name,sku']);
        });
    }

    /**
     * Return Purchase Order to Procurement for commercial corrections (PENDING_ACCOUNTING_REVIEW -> RETURNED_TO_PROCUREMENT).
     */
    public function returnPoToProcurement(User $accountant, PurchaseOrder $po, string $comment): PurchaseOrder
    {
        if ($po->status !== 'PENDING_ACCOUNTING_REVIEW') {
            throw new \RuntimeException('Only purchase orders pending accounting review can be returned.');
        }

        return DB::transaction(function () use ($accountant, $po, $comment) {
            $lockedPo = PurchaseOrder::where('id', $po->id)->lockForUpdate()->first();

            $lockedPo->update([
                'status' => 'RETURNED_TO_PROCUREMENT',
                'reviewed_by_accounting_user_id' => $accountant->id,
                'reviewed_at_accounting' => now(),
                'financial_notes' => $comment,
            ]);

            ApprovalHistory::create([
                'target_type' => PurchaseOrder::class,
                'target_id' => $lockedPo->id,
                'actor_user_id' => $accountant->id,
                'action' => 'RETURNED_TO_PROCUREMENT',
                'from_state' => 'PENDING_ACCOUNTING_REVIEW',
                'to_state' => 'RETURNED_TO_PROCUREMENT',
                'comments' => $comment,
            ]);

            AuditLog::create([
                'user_id' => $accountant->id,
                'entity_type' => PurchaseOrder::class,
                'entity_id' => $lockedPo->id,
                'action' => 'RETURNED_TO_PROCUREMENT',
                'field_name' => 'status',
                'old_value' => 'PENDING_ACCOUNTING_REVIEW',
                'new_value' => 'RETURNED_TO_PROCUREMENT',
            ]);

            // Notify Procurement Manager who created the PO (Event 6)
            $notificationService = app(NotificationService::class);
            $notificationService->queueNotification(
                $lockedPo->created_by_user_id,
                'purchase_order_returned',
                'إعادة أمر الشراء للتصحيح',
                "تمت إعادة أمر الشراء {$lockedPo->po_number} إلى مدير المشتريات للتصحيح. السبب: {$comment}",
                $lockedPo
            );

            return $lockedPo->fresh(['purchaseRequest.requester', 'purchaseRequest.department', 'purchaseRequest.assignedReviewer', 'purchaseRequest.approvalHistory.actor', 'supplier', 'createdBy', 'accountingReviewer', 'items.item:id,name,sku']);
        });
    }
}

