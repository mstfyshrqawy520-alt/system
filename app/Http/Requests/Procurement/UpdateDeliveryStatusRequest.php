<?php

namespace App\Http\Requests\Procurement;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDeliveryStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'delivery_status' => ['required', 'string', 'in:NOT_STARTED,PARTIAL,COMPLETE,LATE'],
            'actual_delivery_date' => ['nullable', 'date'],
            'delivery_notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
