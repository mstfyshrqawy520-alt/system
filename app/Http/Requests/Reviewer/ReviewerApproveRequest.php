<?php

namespace App\Http\Requests\Reviewer;

use Illuminate\Foundation\Http\FormRequest;

class ReviewerApproveRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'comment' => ['nullable', 'string', 'max:1000'],
            'site_engineer_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }
}
