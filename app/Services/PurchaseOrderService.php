<?php

namespace App\Services;

use App\Models\ApprovalHistory;
use App\Models\AuditLog;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\PurchaseRequest;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PurchaseOrderService
{
    /**
     * Generate sequential unique Purchase Order number (PO-YYYY-XXXXX).
     */
    public function generatePoNumber(): string
    {
        $year = date('Y');
        $count = PurchaseOrder::withTrashed()
            ->whereYear('created_at', $year)
            ->count() + 1;

        return sprintf('PO-%s-%05d', $year, $count);
    }

    /**
     * Recalculate PO grand total: grand_total = SUM(quantity × unit_price).
     *
     */
    public function recalculateTotals(PurchaseOrder $po): void
    {
        $items = $po->items;

        $grandTotal = 0.00;
        foreach ($items as $item) {
            $grandTotal += round((float) $item->quantity * (float) $item->unit_price, 2);
        }
        $grandTotal = round($grandTotal, 2);

        $po->update([
            'subtotal'        => $grandTotal,  // subtotal = grand_total (no deductions)
            'grand_total'     => $grandTotal,
        ]);
    }

    /**
     * List approved PRs eligible for PO creation.
     */
    public function getApprovedPurchaseRequests(): Collection
    {
        return PurchaseRequest::with(['requester', 'department', 'assignedReviewer', 'approvalHistory.actor', 'items.item'])
            ->where('status', 'APPROVED_BY_PROCUREMENT')
            ->orderBy('updated_at', 'desc')
            ->limit(500)
            ->get();
    }

    /**
     * List active suppliers for procurement.
     */
    public function getActiveSuppliers(): Collection
    {
        return Supplier::where('is_active', true)
            ->orderBy('company_name', 'asc')
            ->limit(500)
            ->get();
    }

    /**
     * Create a new draft Purchase Order from an approved Purchase Request.
     */
    public function createPoFromPr(User $user, int $prId, int $supplierId, array $options = []): PurchaseOrder
    {
        $pr = PurchaseRequest::with(['items', 'selectedQuote.supplier'])->findOrFail($prId);

        $isDirectPath = $pr->procurement_route === 'DIRECT';
        $canCreateFromDirectAccountingApproval = $isDirectPath && in_array($pr->status, ['APPROVED_BY_ACCOUNTING', 'APPROVED_BY_PROCUREMENT', 'APPROVED_BY_EXECUTIVE', 'PENDING_PROCUREMENT_APPROVAL'], true);
        $canCreateFromQuoteDecision = ! $isDirectPath && in_array($pr->status, ['APPROVED_BY_PROCUREMENT', 'APPROVED_BY_ACCOUNTING', 'APPROVED_BY_EXECUTIVE', 'PENDING_PROCUREMENT_APPROVAL'], true);

        if (! $canCreateFromDirectAccountingApproval && ! $canCreateFromQuoteDecision) {
            throw new \RuntimeException('لا يمكن إنشاء أمر الشراء قبل اعتماد الحسابات للطلب المباشر أو اكتمال قرار عروض الأسعار.');
        }

        $selectedQuote = $pr->selectedQuote;
        if ($selectedQuote && (int) $selectedQuote->supplier_id !== (int) $supplierId) {
            throw new \RuntimeException('لا يمكن تغيير مورد العرض الذي اختاره المدير التنفيذي.');
        }

        if ($isDirectPath && $pr->direct_supplier_id && (int) $pr->direct_supplier_id !== (int) $supplierId) {
            throw new \RuntimeException('لا يمكن تغيير المورد المحدد في طلب الشراء المباشر بعد اعتماده.');
        }

        if ($selectedQuote) {
            $supplierId = (int) $selectedQuote->supplier_id;
        } elseif ($isDirectPath && $pr->direct_supplier_id) {
            $supplierId = (int) $pr->direct_supplier_id;
        }

        $supplier = Supplier::findOrFail($supplierId);
        if (! $supplier->is_active) {
            throw ValidationException::withMessages([
                'supplier_id' => ['The selected supplier is inactive.'],
            ]);
        }

        return DB::transaction(function () use ($user, $pr, $supplier, $options, $selectedQuote, $isDirectPath) {
            $sourceState = $pr->status;
            // Lock PR row to prevent race condition during concurrent PO creation
            $lockedPr = PurchaseRequest::where('id', $pr->id)->lockForUpdate()->first();

            $allowedStatuses = ['APPROVED_BY_ACCOUNTING', 'APPROVED_BY_PROCUREMENT', 'APPROVED_BY_EXECUTIVE', 'PENDING_PROCUREMENT_APPROVAL'];
            if (! in_array($lockedPr->status, $allowedStatuses, true)) {
                throw new \RuntimeException('تغيرت حالة طلب الشراء أثناء الإنشاء. أعد تحميل الطلب وحاول مرة أخرى.');
            }

            // Check if PO already exists for this PR
            $existingPo = PurchaseOrder::where('purchase_request_id', $pr->id)
                ->whereNotIn('status', ['REJECTED'])
                ->first();

            if ($existingPo) {
                if (in_array($existingPo->status, ['PO_DRAFT', 'RETURNED_TO_PROCUREMENT'], true)) {
                    $existingPo->update([
                        'supplier_id' => $supplier->id,
                        'payment_terms' => $options['payment_terms'] ?? $existingPo->payment_terms,
                        'delivery_terms' => $options['delivery_terms'] ?? $existingPo->delivery_terms,
                        'delivery_date' => !empty($options['delivery_date']) ? $options['delivery_date'] : ($existingPo->delivery_date ?? now()->toDateString()),
                        'budget_code' => $options['budget_code'] ?? $existingPo->budget_code,
                        'notes' => $options['notes'] ?? $existingPo->notes,
                    ]);
                    return $existingPo;
                }
                if ($existingPo->status === 'PENDING_ACCOUNTING_REVIEW') {
                    return $existingPo;
                }
                throw new \RuntimeException('يوجد أمر شراء مصدر بالفعل لهذا الطلب (' . $existingPo->po_number . ').');
            }

            $poNumber = $this->generatePoNumber();

            $po = PurchaseOrder::create([
                'po_number' => $poNumber,
                'purchase_request_id' => $pr->id,
                'selected_quote_id' => $selectedQuote?->id,
                'supplier_id' => $supplier->id,
                'created_by_user_id' => $user->id,
                'status' => 'PO_DRAFT',
                'payment_terms' => $options['payment_terms'] ?? null,
                'delivery_terms' => $options['delivery_terms'] ?? null,
                'delivery_date' => !empty($options['delivery_date']) ? $options['delivery_date'] : now()->toDateString(),
                'budget_code' => $options['budget_code'] ?? null,
                'notes' => $options['notes'] ?? null,
            ]);

            // Copy or map PR items to PO items
            $itemsInput = $options['items'] ?? null;

            if (! empty($itemsInput)) {
                foreach ($itemsInput as $inputIndex => $input) {
                    $prItemId = $input['pr_item_id'] ?? null;
                    $prItem = $prItemId ? $pr->items->firstWhere('id', $prItemId) : null;
                    [$itemReference, $region] = $this->requireReferenceFields(
                        $prItem?->item_reference,
                        $prItem?->region,
                        "items.{$inputIndex}"
                    );

                    $qty       = isset($input['quantity'])   ? (float) $input['quantity']   : ($prItem ? (float) $prItem->quantity : 1.0);
                    // Procurement sets the commercial unit price. PR estimated price is ignored.
                    $unitPrice = $selectedQuote
                        ? (float) $selectedQuote->unit_price
                        : (isset($input['unit_price']) ? (float) $input['unit_price'] : 0.0);
                    $lineTotal = round($qty * $unitPrice, 2);

                    $poItem = $po->items()->create([
                        'pr_item_id'      => $prItem?->id,
                        'item_id'         => $input['item_id'] ?? $prItem?->item_id,
                        'item_description'=> $input['item_description'] ?? $prItem?->item_description ?? '',
                        'item_reference'  => $itemReference,
                        'region'          => $region,
                        'quantity'        => $qty,
                        'uom'             => $input['uom'] ?? $prItem?->uom ?? 'PCS',
                        'unit_price'      => $unitPrice,
                        'line_total'      => $lineTotal,
                        'specifications'  => $input['specifications'] ?? $prItem?->specifications,
                    ]);

                    if ($prItem && (float) $prItem->quantity !== $qty) {
                        AuditLog::create([
                            'user_id'     => $user->id,
                            'entity_type' => PurchaseOrderItem::class,
                            'entity_id'   => $poItem->id,
                            'action'      => 'QUANTITY_CHANGED',
                            'field_name'  => 'quantity',
                            'old_value'   => (string) $prItem->quantity,
                            'new_value'   => (string) $qty,
                        ]);
                    }
                }
            } else {
                // When no items array supplied: copy PR items with ZERO unit price.
                // Procurement Manager must set commercial prices on the PO before submitting.
                foreach ($pr->items as $prItem) {
                    [$itemReference, $region] = $this->requireReferenceFields(
                        $prItem->item_reference,
                        $prItem->region,
                        "pr_item.{$prItem->id}"
                    );
                    $qty = (float) $prItem->quantity;

                    $po->items()->create([
                        'pr_item_id'      => $prItem->id,
                        'item_id'         => $prItem->item_id,
                        'item_description'=> $prItem->item_description,
                        'item_reference'  => $itemReference,
                        'region'          => $region,
                        'quantity'        => $qty,
                        'uom'             => $prItem->uom,
                        'unit_price'      => (float) ($selectedQuote?->unit_price ?? 0.00),
                        'line_total'      => round($qty * (float) ($selectedQuote?->unit_price ?? 0.00), 2),
                        'specifications'  => $prItem->specifications,
                    ]);
                }
            }

            $this->recalculateTotals($po);

            app(\App\Services\NotificationService::class)->markEntityNotificationsAsRead($pr);

            ApprovalHistory::create([
                'target_type' => PurchaseOrder::class,
                'target_id' => $po->id,
                'actor_user_id' => $user->id,
                'action' => 'PO_CREATED',
                'from_state' => $sourceState,
                'to_state' => 'PO_DRAFT',
                'comments' => 'Purchase order created by procurement manager.',
            ]);

            app(SystemEventService::class)->recordAction(
                $po,
                'PO_CREATED',
                'أنشأ مدير المشتريات أمر شراء من طلب معتمد.',
                ['event_type' => 'purchase_order.created', 'from_state' => $sourceState, 'to_state' => 'PO_DRAFT', 'actor_user_id' => $user->id, 'metadata' => ['supplier_id' => $supplier->id, 'selected_quote_id' => $selectedQuote?->id]]
            );

            AuditLog::create([
                'user_id' => $user->id,
                'entity_type' => PurchaseOrder::class,
                'entity_id' => $po->id,
                'action' => 'CREATED',
                'field_name' => 'po_number',
                'old_value' => null,
                'new_value' => $po->po_number,
            ]);

            return $po->fresh(['purchaseRequest.requester', 'purchaseRequest.department', 'purchaseRequest.assignedReviewer', 'purchaseRequest.approvalHistory.actor', 'selectedQuote', 'supplier', 'createdBy', 'items.item']);
        });
    }

    /**
     * Update draft Purchase Order header details.
     */
    public function updateHeader(User $user, PurchaseOrder $po, array $data): PurchaseOrder
    {
        if ($po->status !== 'PO_DRAFT' && $po->status !== 'RETURNED_TO_PROCUREMENT') {
            throw new \RuntimeException('Only draft or returned purchase orders can be edited.');
        }

        return DB::transaction(function () use ($user, $po, $data) {
            $lockedPo = PurchaseOrder::where('id', $po->id)->lockForUpdate()->first();

            $allowedFields = ['supplier_id', 'payment_terms', 'delivery_terms', 'delivery_date', 'budget_code', 'financial_notes', 'notes'];
            $updateFields = [];

            foreach ($allowedFields as $field) {
                if (array_key_exists($field, $data)) {
                    $oldVal = (string) ($lockedPo->{$field} ?? '');
                    $newVal = (string) ($data[$field] ?? '');

                    if ($oldVal !== $newVal) {
                        $updateFields[$field] = $data[$field];

                        AuditLog::create([
                            'user_id' => $user->id,
                            'entity_type' => PurchaseOrder::class,
                            'entity_id' => $lockedPo->id,
                            'action' => 'PO_HEADER_UPDATED',
                            'field_name' => $field,
                            'old_value' => $oldVal,
                            'new_value' => $newVal,
                        ]);
                    }
                }
            }

            if (! empty($updateFields)) {
                $lockedPo->update($updateFields);
            }

            return $lockedPo->fresh(['purchaseRequest.requester', 'purchaseRequest.department', 'purchaseRequest.assignedReviewer', 'purchaseRequest.approvalHistory.actor', 'selectedQuote', 'supplier', 'createdBy', 'items.item']);
        });
    }

    /**
     * Update commercial line item details on a draft PO.
     */
    public function updateItem(User $user, PurchaseOrder $po, PurchaseOrderItem $item, array $data): PurchaseOrder
    {
        if ($po->status !== 'PO_DRAFT' && $po->status !== 'RETURNED_TO_PROCUREMENT') {
            throw new \RuntimeException('Only draft or returned purchase orders can be edited.');
        }

        if ($item->purchase_order_id !== $po->id) {
            throw new \InvalidArgumentException('Item does not belong to this purchase order.');
        }

        return DB::transaction(function () use ($user, $po, $item, $data) {
            $lockedPo = PurchaseOrder::where('id', $po->id)->lockForUpdate()->first();
            $lockedItem = PurchaseOrderItem::where('id', $item->id)->lockForUpdate()->first();

            $newQty       = array_key_exists('quantity',   $data) ? (float) $data['quantity']   : (float) $lockedItem->quantity;
            $newUnitPrice = array_key_exists('unit_price', $data) ? (float) $data['unit_price'] : (float) $lockedItem->unit_price;
            $newLineTotal = round($newQty * $newUnitPrice, 2);
            [$itemReference, $region] = $this->requireReferenceFields(
                array_key_exists('item_reference', $data) ? $data['item_reference'] : $lockedItem->item_reference,
                array_key_exists('region', $data) ? $data['region'] : $lockedItem->region,
                'item'
            );

            $updatePayload = [
                'item_id'         => $data['item_id'] ?? $lockedItem->item_id,
                'item_description'=> $data['item_description'] ?? $lockedItem->item_description,
                'item_reference'  => $itemReference,
                'region'          => $region,
                'quantity'        => $newQty,
                'uom'             => $data['uom'] ?? $lockedItem->uom,
                'unit_price'      => $newUnitPrice,
                'line_total'      => $newLineTotal,
                'specifications'  => array_key_exists('specifications', $data) ? $data['specifications'] : $lockedItem->specifications,
            ];

            foreach ($updatePayload as $field => $newVal) {
                $oldVal = (string) ($lockedItem->{$field} ?? '');
                $strNewVal = (string) ($newVal ?? '');

                if ($oldVal !== $strNewVal) {
                    AuditLog::create([
                        'user_id' => $user->id,
                        'entity_type' => PurchaseOrderItem::class,
                        'entity_id' => $lockedItem->id,
                        'action' => 'PO_ITEM_UPDATED',
                        'field_name' => $field,
                        'old_value' => $oldVal,
                        'new_value' => $strNewVal,
                    ]);
                }
            }

            $lockedItem->update($updatePayload);

            $this->recalculateTotals($lockedPo);

            return $lockedPo->fresh(['purchaseRequest.requester', 'purchaseRequest.department', 'purchaseRequest.assignedReviewer', 'purchaseRequest.approvalHistory.actor', 'selectedQuote', 'supplier', 'createdBy', 'items.item']);
        });
    }

    /**
     * Add line item to a draft PO.
     */
    public function addItem(User $user, PurchaseOrder $po, array $data): PurchaseOrder
    {
        if ($po->status !== 'PO_DRAFT' && $po->status !== 'RETURNED_TO_PROCUREMENT') {
            throw new \RuntimeException('Only draft or returned purchase orders can be edited.');
        }

        return DB::transaction(function () use ($user, $po, $data) {
            $lockedPo = PurchaseOrder::where('id', $po->id)->lockForUpdate()->first();

            $qty       = (float) $data['quantity'];
            $unitPrice = (float) $data['unit_price'];
            $lineTotal = round($qty * $unitPrice, 2);
            [$itemReference, $region] = $this->requireReferenceFields(
                $data['item_reference'] ?? null,
                $data['region'] ?? null,
                'item'
            );

            $newItem = $lockedPo->items()->create([
                'item_id'         => $data['item_id'] ?? null,
                'item_description'=> $data['item_description'],
                'item_reference'  => $itemReference,
                'region'          => $region,
                'quantity'        => $qty,
                'uom'             => $data['uom'] ?? 'PCS',
                'unit_price'      => $unitPrice,
                'line_total'      => $lineTotal,
                'specifications'  => $data['specifications'] ?? null,
            ]);

            AuditLog::create([
                'user_id' => $user->id,
                'entity_type' => PurchaseOrderItem::class,
                'entity_id' => $newItem->id,
                'action' => 'PO_ITEM_ADDED',
                'field_name' => 'item_description',
                'old_value' => null,
                'new_value' => $newItem->item_description,
            ]);

            $this->recalculateTotals($lockedPo);

            return $lockedPo->fresh(['purchaseRequest.requester', 'purchaseRequest.department', 'purchaseRequest.assignedReviewer', 'purchaseRequest.approvalHistory.actor', 'selectedQuote', 'supplier', 'createdBy', 'items.item']);
        });
    }

    /**
     * Delete line item from a draft PO.
     */
    public function deleteItem(User $user, PurchaseOrder $po, PurchaseOrderItem $item): PurchaseOrder
    {
        if ($po->status !== 'PO_DRAFT' && $po->status !== 'RETURNED_TO_PROCUREMENT') {
            throw new \RuntimeException('Only draft or returned purchase orders can be edited.');
        }

        if ($item->purchase_order_id !== $po->id) {
            throw new \InvalidArgumentException('Item does not belong to this purchase order.');
        }

        return DB::transaction(function () use ($user, $po, $item) {
            $lockedPo = PurchaseOrder::where('id', $po->id)->lockForUpdate()->first();

            AuditLog::create([
                'user_id' => $user->id,
                'entity_type' => PurchaseOrderItem::class,
                'entity_id' => $item->id,
                'action' => 'PO_ITEM_REMOVED',
                'field_name' => 'item_description',
                'old_value' => $item->item_description,
                'new_value' => null,
            ]);

            $item->delete();

            $this->recalculateTotals($lockedPo);

            return $lockedPo->fresh(['purchaseRequest.requester', 'purchaseRequest.department', 'purchaseRequest.assignedReviewer', 'purchaseRequest.approvalHistory.actor', 'selectedQuote', 'supplier', 'createdBy', 'items.item']);
        });
    }

    /**
     * Submit draft Purchase Order to Accounting for financial audit (PO_DRAFT -> PENDING_ACCOUNTING_REVIEW).
     */
    public function submitToAccounting(User $user, PurchaseOrder $po): PurchaseOrder
    {
        if ($po->status !== 'PO_DRAFT' && $po->status !== 'RETURNED_TO_PROCUREMENT') {
            throw new \RuntimeException('Only draft or returned purchase orders can be submitted.');
        }

        if ($po->items()->count() === 0) {
            throw ValidationException::withMessages([
                'items' => ['Cannot submit a purchase order with no line items.'],
            ]);
        }

        if (! $po->supplier || ! $po->supplier->is_active) {
            throw ValidationException::withMessages([
                'supplier_id' => ['Purchase order supplier is inactive or missing.'],
            ]);
        }

        return DB::transaction(function () use ($user, $po) {
            $lockedPo = PurchaseOrder::where('id', $po->id)->lockForUpdate()->firstOrFail();

            if ($lockedPo->status === 'ISSUED') {
                return $lockedPo->fresh(['purchaseRequest.requester', 'purchaseRequest.department', 'purchaseRequest.assignedReviewer', 'purchaseRequest.approvalHistory.actor', 'selectedQuote', 'supplier', 'createdBy', 'items.item']);
            }

            $fromState = $lockedPo->status;

            $this->recalculateTotals($lockedPo);

            $lockedPo->update([
                'status' => 'ISSUED',
            ]);

            ApprovalHistory::create([
                'target_type' => PurchaseOrder::class,
                'target_id' => $lockedPo->id,
                'actor_user_id' => $user->id,
                'action' => 'PO_ISSUED',
                'from_state' => $fromState,
                'to_state' => 'ISSUED',
                'comments' => 'Purchase order issued by procurement manager.',
            ]);

            app(SystemEventService::class)->recordAction(
                $lockedPo,
                'PO_ISSUED',
                'أصدر مدير المشتريات أمر الشراء وأرسله للاطلاع المالي والإداري.',
                ['event_type' => 'purchase_order.issued', 'from_state' => $fromState, 'to_state' => 'ISSUED', 'actor_user_id' => $user->id]
            );

            AuditLog::create([
                'user_id' => $user->id,
                'entity_type' => PurchaseOrder::class,
                'entity_id' => $lockedPo->id,
                'action' => 'PO_ISSUED',
                'field_name' => 'status',
                'old_value' => $fromState,
                'new_value' => 'ISSUED',
            ]);

            // Notify Accountants (Read-only access notification)
            $notificationService = app(\App\Services\NotificationService::class);
            $accountants = $notificationService->resolveUsersWithPermission('purchase_order.view_accounting');
            $notificationService->queueUsers(
                $accountants,
                'purchase_order_issued_accounting',
                'تم إصدار أمر شراء جديد',
                "تم إصدار أمر الشراء {$lockedPo->po_number} للاطلاع المالي.",
                $lockedPo
            );

            // Notify requester if the request was created by the General Manager or user
            if ($lockedPo->purchaseRequest && $lockedPo->purchaseRequest->user_id) {
                $notificationService->queueNotification(
                    $lockedPo->purchaseRequest->user_id,
                    'purchase_order_issued_requester',
                    'تم إصدار أمر الشراء لطلبك',
                    "تم إصدار أمر الشراء {$lockedPo->po_number} لطلب الشراء {$lockedPo->purchaseRequest->request_number}.",
                    $lockedPo
                );
            }

            return $lockedPo->fresh(['purchaseRequest.requester', 'purchaseRequest.department', 'purchaseRequest.assignedReviewer', 'purchaseRequest.approvalHistory.actor', 'selectedQuote', 'supplier', 'createdBy', 'items.item']);
        });
    }

    /**
     * Validate and normalize fields that are mandatory for financial traceability.
     */
    private function requireReferenceFields($itemReference, $region, string $key): array
    {
        $itemReference = trim((string) ($itemReference ?? ''));
        $region = trim((string) ($region ?? ''));
        $errors = [];

        if ($itemReference === '') {
            $errors["{$key}.item_reference"] = ['رقم قطعة الأرض مطلوب ولا يمكن أن يكون فارغًا.'];
        }
        if ($region === '') {
            $errors["{$key}.region"] = ['المنطقة مطلوبة ولا يمكن أن تكون فارغة.'];
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        return [$itemReference, $region];
    }
}
