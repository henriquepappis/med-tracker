<?php

namespace App\Http\Requests\Schedule;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => ['prohibited'],
            'medication_id' => ['required', 'integer', 'exists:medications,id'],
            'type' => ['required', 'string', Rule::in(['daily', 'weekly', 'interval'])],
            'payload' => ['required', 'array'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $type = $this->input('type');
            $payload = $this->input('payload');

            if (! is_array($payload)) {
                return;
            }

            $this->validatePayload($validator, $type, $payload);
        });
    }

    private function validatePayload($validator, ?string $type, array $payload): void
    {
        if (! $type) {
            return;
        }

        switch ($type) {
            case 'daily':
                $this->validateTimes($validator, $payload['times'] ?? null);
                break;
            case 'weekly':
                $this->validateDays($validator, $payload['days'] ?? null);
                $this->validateTimes($validator, $payload['times'] ?? null);
                break;
            case 'interval':
                $this->validateInterval($validator, $payload);
                break;
        }
    }

    private function validateTimes($validator, $times): void
    {
        if (! is_array($times) || count($times) === 0) {
            $validator->errors()->add('payload.times', 'Times must be a non-empty array.');

            return;
        }

        foreach ($times as $time) {
            if (! is_string($time) || ! preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $time)) {
                $validator->errors()->add('payload.times', 'Each time must be in HH:MM format.');

                return;
            }
        }
    }

    private function validateDays($validator, $days): void
    {
        if (! is_array($days) || count($days) === 0) {
            $validator->errors()->add('payload.days', 'Days must be a non-empty array.');

            return;
        }

        foreach ($days as $day) {
            if (! is_int($day) || $day < 1 || $day > 7) {
                $validator->errors()->add('payload.days', 'Each day must be an integer between 1 and 7.');

                return;
            }
        }
    }

    private function validateInterval($validator, array $payload): void
    {
        $everyMinutes = $payload['every_minutes'] ?? null;

        if (! is_int($everyMinutes) || $everyMinutes < 15) {
            $validator->errors()->add('payload.every_minutes', 'Every minutes must be an integer of at least 15.');

            return;
        }

        if (array_key_exists('anchor_time', $payload) && $payload['anchor_time'] !== null) {
            $anchorTime = $payload['anchor_time'];

            if (! is_string($anchorTime) || ! preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $anchorTime)) {
                $validator->errors()->add('payload.anchor_time', 'Anchor time must be in HH:MM format.');
            }
        }
    }
}
