<?php

namespace App\Http\Requests\Procurement;

use App\Models\Supplier;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePurchaseOrderHeaderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'supplier_id' => ['sometimes', 'required', 'integer', 'exists:suppliers,id'],
            'payment_terms' => ['nullable', 'string', 'max:150'],
            'delivery_terms' => ['nullable', 'string', 'max:150'],
            'delivery_date' => ['nullable', 'date'],
            'budget_code' => ['nullable', 'string', 'max:50'],
            'financial_notes' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $supplierId = $this->input('supplier_id');
            if ($supplierId) {
                $supplier = Supplier::find($supplierId);
                if ($supplier && ! $supplier->is_active) {
                    $validator->errors()->add('supplier_id', 'The selected supplier is inactive.');
                }
            }
        });
    }
}
