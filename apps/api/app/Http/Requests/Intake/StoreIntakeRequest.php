<?php

namespace App\Http\Requests\Intake;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreIntakeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => ['prohibited'],
            'medication_id' => ['prohibited'],
            'schedule_id' => ['required', 'integer', 'exists:schedules,id'],
            'status' => ['required', 'string', Rule::in(['taken', 'skipped'])],
            'taken_at' => ['nullable', 'date'],
        ];
    }
}
