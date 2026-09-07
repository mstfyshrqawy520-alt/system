<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required' => 'اكتب البريد الإلكتروني أو كود الدخول الخاص بالحساب.',
            'password.required' => 'اكتب كلمة المرور للمتابعة.',
        ];
    }

    public function attributes(): array
    {
        return [
            'email' => 'البريد الإلكتروني أو كود الدخول',
            'password' => 'كلمة المرور',
        ];
    }
}
