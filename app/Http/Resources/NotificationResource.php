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

        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->title,
            'message' => $this->message,
            'notifiable_type' => $this->notifiable_type,
            'notifiable_id' => $this->notifiable_id,
            'data' => $data,
            'read_at' => $this->read_at ? $this->read_at->toIso8601String() : null,
            'created_at' => $this->created_at ? $this->created_at->toIso8601String() : null,
        ];
    }
}
