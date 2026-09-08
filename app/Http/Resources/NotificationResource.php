<?php

namespace App\Http\Resources;

use App\Models\PurchaseOrder;
use App\Models\PurchaseRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = [
            'id' => $this->notifiable_id,
        ];

        if ($this->notifiable_type === PurchaseRequest::class) {
            $data['purchase_request_id'] = $this->notifiable_id;
        } elseif ($this->notifiable_type === PurchaseOrder::class) {
            $data['purchase_order_id'] = $this->notifiable_id;
        }

        if ($this->purchase_order_id) {
            $data['purchase_order_id'] = $this->purchase_order_id;
        }
        if ($this->purchase_receipt_id) {
            $data['purchase_receipt_id'] = $this->purchase_receipt_id;
        }

        $user = $request->user() ?: ($this->relationLoaded('user') ? $this->user : \App\Models\User::find($this->user_id));
        $targetUrl = null;

        if ($user) {
            $user->loadMissing('roles');
            $role = $user->roles->first()?->slug;

            if ($role === 'accountant') {
                if (in_array($this->type, ['purchase_order_and_receipt_ready_accounting', 'purchase_order_and_receipt_approved_info'], true) || $this->purchase_receipt_id || $this->notifiable_type === PurchaseOrder::class || $this->purchase_order_id) {
                    $poId = $this->purchase_order_id ?: ($this->notifiable_type === PurchaseOrder::class ? $this->notifiable_id : null);
                    if ($poId) {
                        $targetUrl = "/accounting/purchase-orders/{$poId}" . ($this->purchase_receipt_id ? "?receipt_id={$this->purchase_receipt_id}" : '');
                    } else {
                        $targetUrl = '/accounting/purchase-orders';
                    }
                } elseif ($this->notifiable_type === PurchaseRequest::class) {
                    $targetUrl = '/accounting/purchase-requests';
                }
            } elseif (in_array($role, ['site_accountant', 'licenses_accountant', 'buffet_accountant'], true)) {
                if ($this->purchase_receipt_id) {
                    $targetUrl = "/accounting/supplier-finance?tab=invoicing&receipt_id={$this->purchase_receipt_id}";
                } elseif ($this->type === 'purchase_order_and_receipt_ready_accounting' || $this->notifiable_type === PurchaseOrder::class || $this->purchase_order_id) {
                    $poId = $this->purchase_order_id ?: ($this->notifiable_type === PurchaseOrder::class ? $this->notifiable_id : null);
                    if ($poId) {
                        $targetUrl = "/accounting/purchase-orders/{$poId}";
                    } else {
                        $targetUrl = "/accounting/supplier-finance?tab=invoicing";
                    }
                } elseif ($this->notifiable_type === PurchaseRequest::class) {
                    $targetUrl = "/requests/{$this->notifiable_id}";
                } else {
                    $targetUrl = "/accounting/supplier-finance";
                }
            } elseif ($role === 'general_manager') {
                if ($this->notifiable_type === PurchaseOrder::class || $this->purchase_order_id) {
                    $poId = $this->notifiable_type === PurchaseOrder::class ? $this->notifiable_id : $this->purchase_order_id;
                    $targetUrl = "/general-manager/purchase-orders/{$poId}";
                } elseif ($this->notifiable_type === PurchaseRequest::class) {
                    $targetUrl = '/general-manager/purchase-requests';
                }
            } elseif ($role === 'procurement_manager') {
                if ($this->notifiable_type === PurchaseOrder::class || $this->purchase_order_id) {
                    $poId = $this->notifiable_type === PurchaseOrder::class ? $this->notifiable_id : $this->purchase_order_id;
                    $targetUrl = "/procurement/purchase-orders/{$poId}";
                } elseif ($this->notifiable_type === PurchaseRequest::class) {
                    $targetUrl = '/procurement/approved-requests';
                }
            } elseif ($role === 'reviewer') {
                if ($this->notifiable_type === PurchaseRequest::class && $this->notifiable_id) {
                    $targetUrl = "/reviewer/requests/{$this->notifiable_id}/review";
                }
            } elseif ($role === 'warehouse_keeper') {
                $targetUrl = '/warehouse';
            } elseif ($role === 'site_engineer') {
                $targetUrl = $this->purchase_receipt_id
                    ? "/site-engineer?receipt_id={$this->purchase_receipt_id}"
                    : '/site-engineer';
            }
        }

        // Fallback default target URL if still null
        if (! $targetUrl) {
            if ($this->notifiable_type === PurchaseRequest::class && $this->notifiable_id) {
                $targetUrl = "/requests/{$this->notifiable_id}";
            } elseif ($this->purchase_receipt_id) {
                $targetUrl = "/site-engineer?receipt_id={$this->purchase_receipt_id}";
            } elseif ($this->notifiable_type === PurchaseOrder::class && $this->notifiable_id) {
                $targetUrl = "/requests";
            }
        }

        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->title,
            'message' => $this->message,
            'notifiable_type' => $this->notifiable_type,
            'notifiable_id' => $this->notifiable_id,
            'purchase_order_id' => $this->purchase_order_id,
            'purchase_receipt_id' => $this->purchase_receipt_id,
            'data' => $data,
            'target_url' => $targetUrl,
            'read_at' => $this->read_at ? $this->read_at->toIso8601String() : null,
            'created_at' => $this->created_at ? $this->created_at->toIso8601String() : null,
        ];
    }
}
