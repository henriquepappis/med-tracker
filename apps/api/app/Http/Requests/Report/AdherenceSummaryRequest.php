<?php

namespace App\Http\Requests\Report;

use Illuminate\Foundation\Http\FormRequest;

class AdherenceSummaryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
            'medication_id' => ['sometimes', 'integer', 'exists:medications,id'],
            'schedule_id' => ['sometimes', 'integer', 'exists:schedules,id'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($this->filled('medication_id') && $this->filled('schedule_id')) {
                $validator->errors()->add('medication_id', 'Provide either medication_id or schedule_id, not both.');
            }
        });
    }
}
