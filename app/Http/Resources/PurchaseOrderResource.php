<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'po_number' => $this->po_number,
            'purchase_request_id' => $this->purchase_request_id,
            'selected_quote_id' => $this->selected_quote_id,
            'selected_quote' => $this->whenLoaded('selectedQuote', function () {
                return $this->selectedQuote ? [
                    'id' => $this->selectedQuote->id,
                    'supplier_id' => $this->selectedQuote->supplier_id,
                    'unit_price' => number_format((float) $this->selectedQuote->unit_price, 2, '.', ''),
                    'total_amount' => number_format((float) $this->selectedQuote->total_amount, 2, '.', ''),
                    'currency' => $this->selectedQuote->currency,
                    'status' => $this->selectedQuote->status,
                ] : null;
            }),
            'purchase_request' => new PurchaseRequestResource($this->whenLoaded('purchaseRequest')),
            'requested_by' => $this->when($this->relationLoaded('purchaseRequest') && $this->purchaseRequest?->relationLoaded('requester'), function () {
                return $this->purchaseRequest?->requester ? [
                    'id' => $this->purchaseRequest->requester->id,
                    'name' => $this->purchaseRequest->requester->name,
                    'email' => $this->purchaseRequest->requester->email,
                ] : null;
            }),
            'executive_approver' => $this->when($this->relationLoaded('purchaseRequest'), function () {
                $entry = $this->purchaseRequest?->relationLoaded('approvalHistory')
                    ? $this->purchaseRequest->approvalHistory->first(fn ($item) => in_array($item->action, ['APPROVED_BY_EXECUTIVE', 'EXECUTIVE_SELECTED_QUOTE'], true))
                    : null;
                return $entry?->actor ? ['id' => $entry->actor->id, 'name' => $entry->actor->name, 'email' => $entry->actor->email] : null;
            }),
            'department_approver' => $this->when($this->relationLoaded('purchaseRequest'), function () {
                $approvedEntry = $this->purchaseRequest?->relationLoaded('approvalHistory')
                    ? $this->purchaseRequest->approvalHistory->firstWhere('action', 'APPROVED_BY_REVIEWER')
                    : null;
                $approver = $approvedEntry?->actor
                    ?? ($this->purchaseRequest?->relationLoaded('assignedReviewer') ? $this->purchaseRequest->assignedReviewer : null);

                return $approver ? [
                    'id' => $approver->id,
                    'name' => $approver->name,
                    'email' => $approver->email,
                ] : null;
            }),
            'department' => $this->when($this->relationLoaded('purchaseRequest') && $this->purchaseRequest?->relationLoaded('department'), function () {
                return $this->purchaseRequest?->department ? [
                    'id' => $this->purchaseRequest->department->id,
                    'name' => $this->purchaseRequest->department->name,
                    'code' => $this->purchaseRequest->department->code,
                ] : null;
            }),
            'supplier_id' => $this->supplier_id,
            'supplier' => new SupplierResource($this->whenLoaded('supplier')),
            'created_by' => $this->whenLoaded('createdBy', function () {
                return [
                    'id' => $this->createdBy->id,
                    'name' => $this->createdBy->name,
                    'email' => $this->createdBy->email,
                ];
            }),
            'status'       => $this->status,
            'currency'     => 'EGP',
            'subtotal'     => number_format((float) $this->subtotal,    2, '.', ''),
            'grand_total'  => number_format((float) $this->grand_total, 2, '.', ''),
            'payment_terms'    => $this->payment_terms,
            'delivery_terms' => $this->delivery_terms,
            'delivery_date' => $this->delivery_date ? $this->delivery_date->format('Y-m-d') : null,
            'delivery_status' => $this->delivery_status ?? 'NOT_STARTED',
            'actual_delivery_date' => $this->actual_delivery_date ? $this->actual_delivery_date->format('Y-m-d') : null,
            'delivery_notes' => $this->delivery_notes,
            'budget_code' => $this->budget_code,
            'financial_notes' => $this->financial_notes,
            'notes' => $this->notes,
            'rejection_reason' => $this->rejection_reason,
            'created_at' => $this->created_at ? $this->created_at->toIso8601String() : null,
            'updated_at' => $this->updated_at ? $this->updated_at->toIso8601String() : null,
            'items' => PurchaseOrderItemResource::collection($this->whenLoaded('items')),
        ];
    }
}
