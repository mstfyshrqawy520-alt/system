<?php

namespace App\Http\Requests\GeneralManager;

use Illuminate\Foundation\Http\FormRequest;

class GmRejectPoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'comment' => ['required', 'string', 'min:3', 'max:1000'],
        ];
    }
}
