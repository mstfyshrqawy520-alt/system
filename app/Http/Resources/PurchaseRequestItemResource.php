<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseRequestItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'item_id' => $this->item_id,
            'item' => $this->whenLoaded('item', function () {
                return [
                    'id' => $this->item->id,
                    'name' => $this->item->name,
                    'sku' => $this->item->sku,
                ];
            }),
            'item_description' => $this->item_description,
            'item_reference' => $this->item_reference,
            'region' => $this->region,
            'quantity' => number_format((float) $this->quantity, 2, '.', ''),
            'uom' => $this->uom,
            'estimated_unit_price' => number_format((float) $this->estimated_unit_price, 2, '.', ''),
            'estimated_line_total' => number_format((float) $this->estimated_line_total, 2, '.', ''),
            'specifications' => $this->specifications,
            'notes' => $this->notes,
        ];
    }
}
