<?php

namespace App\Http\Requests\Procurement;

use App\Models\Item;
use Illuminate\Foundation\Http\FormRequest;

class AddPurchaseOrderItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'item_id'          => ['nullable', 'integer', 'exists:items,id'],
            'item_description' => ['required', 'string', 'max:255'],
            'item_reference'  => ['required', 'string', 'max:100'],
            'region'          => ['required', 'string', 'max:150'],
            'quantity'         => ['required', 'numeric', 'gt:0'],
            'uom'              => ['nullable', 'string', 'max:20'],
            'unit_price'       => ['required', 'numeric', 'gte:0'],
            'specifications'   => ['nullable', 'string'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $itemId = $this->input('item_id');
            if ($itemId) {
                $catalogItem = Item::find($itemId);
                if ($catalogItem && ! $catalogItem->is_active) {
                    $validator->errors()->add('item_id', 'The selected catalog item is inactive.');
                }
            }
        });
    }
}
