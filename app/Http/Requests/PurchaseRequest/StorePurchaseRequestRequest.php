<?php

namespace App\Http\Requests\PurchaseRequest;

use App\Models\Item;
use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'target_department_id' => ['required', 'integer', 'exists:departments,id'],
            'reviewer_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'site_engineer_user_id' => ['nullable', 'integer', 'exists:users,id'],

            'priority' => ['nullable', 'string', 'in:LOW,NORMAL,HIGH,URGENT'],
            'date_needed' => ['nullable', 'date'],
        
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_id' => ['nullable', 'integer', 'exists:items,id'],
            'items.*.item_description' => ['required', 'string', 'max:255'],
            'items.*.item_reference' => ['required', 'string', 'max:100'],
            'items.*.region' => ['required', 'string', 'max:150'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
            'items.*.uom' => ['nullable', 'string', 'max:20'],
            'items.*.specifications' => ['nullable', 'string'],
            'items.*.notes' => ['nullable', 'string'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $items = $this->input('items', []);
            $itemIds = collect($items)->pluck('item_id')->filter()->unique()->toArray();

            if (! empty($itemIds)) {
                $inactiveItemCount = Item::whereIn('id', $itemIds)->where('is_active', false)->count();
                if ($inactiveItemCount > 0) {
                    $validator->errors()->add('items', 'One or more selected catalog items are inactive.');
                }
            }
        });
    }
}
