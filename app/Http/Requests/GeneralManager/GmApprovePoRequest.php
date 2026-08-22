<?php

namespace App\Http\Requests\GeneralManager;

use Illuminate\Foundation\Http\FormRequest;

class GmApprovePoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'comment' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
