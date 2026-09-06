<?php

namespace App\Http\Requests\Reviewer;

use Illuminate\Foundation\Http\FormRequest;

class ReviewerUpdateHeaderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'priority' => ['sometimes', 'required', 'string', 'in:LOW,NORMAL,HIGH,URGENT'],
            'date_needed' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'parcel_reference' => ['sometimes', 'nullable', 'string', 'max:255'],
            'region' => ['sometimes', 'nullable', 'string', 'max:255'],
            'land_parcel_id' => ['sometimes', 'nullable', 'integer', 'exists:land_parcels,id'],
        ];
    }
}
