<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'request_number' => $this->request_number,
                        'status' => $this->status,
            'procurement_route' => $this->procurement_route,
            'direct_supplier_id' => $this->direct_supplier_id,
            'total_estimated_cost' => number_format((float) $this->total_estimated_cost, 2, '.', ''),
            'purchase_order_issued' => (int) ($this->issued_purchase_orders_count ?? 0) > 0,
            'priority' => $this->priority,
            'date_needed' => $this->date_needed ? $this->date_needed->format('Y-m-d') : null,
            'notes' => $this->notes,
            'rejection_reason' => $this->rejection_reason,
            'return_reason' => $this->return_reason,
            'submitted_at' => $this->submitted_at ? $this->submitted_at->toIso8601String() : null,
            'created_at' => $this->created_at ? $this->created_at->toIso8601String() : null,
            'updated_at' => $this->updated_at ? $this->updated_at->toIso8601String() : null,
            'requester' => $this->whenLoaded('requester', function () {
                return [
                    'id' => $this->requester->id,
                    'name' => $this->requester->name,
                    'email' => $this->requester->email,
                    'role' => $this->requester->relationLoaded('roles')
                        ? $this->requester->roles->pluck('slug')->first()
                        : null,
                ];
            }),
            'requester_role' => $this->when(
                $this->relationLoaded('requester') && $this->requester->relationLoaded('roles'),
                fn () => $this->requester->roles->pluck('slug')->first(),
            ),
            'is_general_manager_requester' => $this->when(
                $this->relationLoaded('requester') && $this->requester->relationLoaded('roles'),
                fn () => $this->requester->roles->contains(fn ($role) => $role->slug === 'general_manager'),
            ),
            'department' => $this->whenLoaded('department', function () {
                return [
                    'id' => $this->department->id,
                    'name' => $this->department->name,
                    'code' => $this->department->code,
                ];
            }),
            'target_department_id' => $this->target_department_id,
            'target_department' => $this->whenLoaded('targetDepartment', function () {
                return $this->targetDepartment ? [
                    'id' => $this->targetDepartment->id,
                    'name' => $this->targetDepartment->name,
                    'code' => $this->targetDepartment->code,
                    'manager' => $this->targetDepartment->relationLoaded('manager') && $this->targetDepartment->manager
                        ? ['id' => $this->targetDepartment->manager->id, 'name' => $this->targetDepartment->manager->name]
                        : null,
                    'site_engineer' => $this->targetDepartment->relationLoaded('siteEngineer') && $this->targetDepartment->siteEngineer
                        ? ['id' => $this->targetDepartment->siteEngineer->id, 'name' => $this->targetDepartment->siteEngineer->name]
                        : null,
                ] : null;
            }),
            'direct_supplier' => $this->whenLoaded('directSupplier', function () {
                return $this->directSupplier ? [
                    'id' => $this->directSupplier->id,
                    'company_name' => $this->directSupplier->company_name,
                    'code' => $this->directSupplier->code,
                ] : null;
            }),
            'assigned_reviewer' => $this->whenLoaded('assignedReviewer', function () {
                return $this->assignedReviewer ? [
                    'id' => $this->assignedReviewer->id,
                    'name' => $this->assignedReviewer->name,
                    'email' => $this->assignedReviewer->email,
                    'department_id' => $this->assignedReviewer->department_id,
                ] : null;
            }),
            'site_engineer' => $this->whenLoaded('siteEngineer', function () {
                return $this->siteEngineer ? [
                    'id' => $this->siteEngineer->id,
                    'name' => $this->siteEngineer->name,
                    'email' => $this->siteEngineer->email,
                    'department_id' => $this->siteEngineer->department_id,
                ] : null;
            }),
            'items' => PurchaseRequestItemResource::collection($this->whenLoaded('items')),
            'quotes' => $this->whenLoaded('quotes', function () {
                return $this->quotes->map(fn ($quote) => [
                    'id' => $quote->id,
                    'supplier_id' => $quote->supplier_id,
                    'supplier' => $quote->relationLoaded('supplier') && $quote->supplier ? [
                        'id' => $quote->supplier->id,
                        'company_name' => $quote->supplier->company_name,
                    ] : null,
                    'unit_price' => number_format((float) $quote->unit_price, 2, '.', ''),
                    'total_amount' => number_format((float) $quote->total_amount, 2, '.', ''),
                    'currency' => $quote->currency,
                    'notes' => $quote->notes,
                    'status' => $quote->status,
                    'recommendations' => $quote->relationLoaded('recommendations')
                        ? $quote->recommendations->map(fn ($recommendation) => [
                            'id' => $recommendation->id,
                            'user_id' => $recommendation->user_id,
                            'role_type' => $recommendation->role_type,
                            'decision' => $recommendation->decision,
                            'comment' => $recommendation->comment,
                            'user' => $recommendation->relationLoaded('user') && $recommendation->user
                                ? ['id' => $recommendation->user->id, 'name' => $recommendation->user->name]
                                : null,
                        ])->values()
                        : [],
                ])->values();
            }),
            'selected_quote' => $this->whenLoaded('selectedQuote', function () {
                return $this->selectedQuote ? [
                    'id' => $this->selectedQuote->id,
                    'supplier_id' => $this->selectedQuote->supplier_id,
                    'supplier' => $this->selectedQuote->relationLoaded('supplier') && $this->selectedQuote->supplier
                        ? ['id' => $this->selectedQuote->supplier->id, 'company_name' => $this->selectedQuote->supplier->company_name]
                        : null,
                    'unit_price' => number_format((float) $this->selectedQuote->unit_price, 2, '.', ''),
                    'total_amount' => number_format((float) $this->selectedQuote->total_amount, 2, '.', ''),
                    'currency' => $this->selectedQuote->currency,
                    'status' => $this->selectedQuote->status,
                ] : null;
            }),
            'approval_history' => $this->whenLoaded('approvalHistory', function () {
                return $this->approvalHistory->map(fn ($entry) => [
                    'action' => $entry->action,
                    'from_state' => $entry->from_state,
                    'to_state' => $entry->to_state,
                    'comments' => $entry->comments,
                    'created_at' => $entry->created_at?->toIso8601String(),
                    'actor' => $entry->relationLoaded('actor') && $entry->actor ? ['name' => $entry->actor->name] : null,
                ])->values();
            }),
            'attachments' => $this->whenLoaded('attachments', function () {
                return $this->attachments->map(fn ($att) => [
                    'id' => $att->id,
                    'file_name' => $att->file_name,
                    'mime_type' => $att->mime_type,
                    'file_size' => $att->file_size,
                    'uploaded_by' => $att->relationLoaded('uploadedBy') && $att->uploadedBy
                        ? $att->uploadedBy->name
                        : null,
                    'created_at' => $att->created_at?->toIso8601String(),
                ])->values();
            }),
        ];
    }
}

