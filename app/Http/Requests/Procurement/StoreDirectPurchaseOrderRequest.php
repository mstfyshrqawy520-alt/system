<?php

namespace App\Http\Requests\Procurement;

use Illuminate\Foundation\Http\FormRequest;

class StoreDirectPurchaseOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'supplier_id' => ['required', 'integer', 'exists:suppliers,id'],
            'department_id' => ['required', 'integer', 'exists:departments,id'],
            'site_engineer_user_id' => ['required', 'integer', 'exists:users,id'],
            'delivery_date' => ['nullable', 'date'],
            'priority' => ['nullable', 'string', 'in:LOW,NORMAL,HIGH,URGENT'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_id' => ['nullable', 'integer', 'exists:items,id'],
            'items.*.item_description' => ['required', 'string', 'max:255'],
            'items.*.item_reference' => ['required', 'string', 'max:100'],
            'items.*.region' => ['required', 'string', 'max:150'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01', 'max:999999999'],
            'items.*.uom' => ['required', 'string', 'max:30'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0', 'max:999999999'],
            'items.*.specifications' => ['nullable', 'string'],
        ];
    }
}
