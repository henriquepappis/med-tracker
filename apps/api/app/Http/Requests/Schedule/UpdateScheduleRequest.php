<?php

namespace App\Http\Requests\Schedule;

use App\Models\Schedule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateScheduleRequest extends FormRequest
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
            'recurrence_type' => ['sometimes', 'string', Rule::in(['daily', 'weekly', 'interval'])],
            'times' => ['sometimes', 'array'],
            'weekdays' => ['sometimes', 'array'],
            'interval_hours' => ['sometimes', 'integer', 'min:1'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $schedule = $this->route('schedule');
            $type = $this->input('recurrence_type');
            $times = $this->input('times');
            $weekdays = $this->input('weekdays');
            $intervalHours = $this->input('interval_hours');

            if (! $type && $schedule instanceof Schedule) {
                $type = $schedule->recurrence_type;
            }

            if (! $type) {
                return;
            }

            $this->validateByType($validator, $type, $times, $weekdays, $intervalHours, $schedule);

            if (! $validator->errors()->isEmpty()) {
                return;
            }

            $this->validateOverlap($validator, $schedule, $type, $times, $weekdays);
        });
    }

    private function validateByType($validator, string $type, $times, $weekdays, $intervalHours, $schedule): void
    {
        $existingTimes = $schedule instanceof Schedule ? $schedule->times : null;
        $existingWeekdays = $schedule instanceof Schedule ? $schedule->weekdays : null;
        $existingIntervalHours = $schedule instanceof Schedule ? $schedule->interval_hours : null;

        switch ($type) {
            case 'daily':
                $this->validateTimes($validator, $times, $existingTimes, true);
                $this->rejectWeekdays($validator, $weekdays);
                $this->rejectIntervalHours($validator, $intervalHours);
                break;
            case 'weekly':
                $this->validateTimes($validator, $times, $existingTimes, true);
                $this->validateWeekdays($validator, $weekdays, $existingWeekdays, true);
                $this->rejectIntervalHours($validator, $intervalHours);
                break;
            case 'interval':
                $this->validateIntervalHours($validator, $intervalHours, $existingIntervalHours, true);
                $this->rejectTimes($validator, $times);
                $this->rejectWeekdays($validator, $weekdays);
                break;
        }
    }

    private function validateTimes($validator, $times, $existingTimes, bool $required): void
    {
        if ($times === null) {
            if ($required && (! is_array($existingTimes) || count($existingTimes) === 0)) {
                $validator->errors()->add('times', 'Times must be a non-empty array.');
            }
            return;
        }

        if (! is_array($times) || count($times) === 0) {
            $validator->errors()->add('times', 'Times must be a non-empty array.');
            return;
        }

        $normalized = [];
        foreach ($times as $time) {
            if (! is_string($time) || ! preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $time)) {
                $validator->errors()->add('times', 'Each time must be in HH:mm format.');
                return;
            }
            $normalized[] = $time;
        }

        if (count(array_unique($normalized)) !== count($normalized)) {
            $validator->errors()->add('times', 'Times must be unique.');
        }
    }

    private function validateWeekdays($validator, $weekdays, $existingWeekdays, bool $required): void
    {
        if ($weekdays === null) {
            if ($required && (! is_array($existingWeekdays) || count($existingWeekdays) === 0)) {
                $validator->errors()->add('weekdays', 'Weekdays must be a non-empty array.');
            }
            return;
        }

        if (! is_array($weekdays) || count($weekdays) === 0) {
            $validator->errors()->add('weekdays', 'Weekdays must be a non-empty array.');
            return;
        }

        $allowed = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        $normalized = [];

        foreach ($weekdays as $weekday) {
            if (! is_string($weekday)) {
                $validator->errors()->add('weekdays', 'Each weekday must be a string.');
                return;
            }

            $value = strtolower($weekday);
            if (! in_array($value, $allowed, true)) {
                $validator->errors()->add('weekdays', 'Weekdays must be one of mon, tue, wed, thu, fri, sat, sun.');
                return;
            }

            $normalized[] = $value;
        }

        if (count(array_unique($normalized)) !== count($normalized)) {
            $validator->errors()->add('weekdays', 'Weekdays must be unique.');
        }
    }

    private function validateIntervalHours($validator, $intervalHours, $existingIntervalHours, bool $required): void
    {
        if ($intervalHours === null) {
            if ($required && ($existingIntervalHours === null)) {
                $validator->errors()->add('interval_hours', 'Interval hours is required.');
            }
            return;
        }

        if (! is_int($intervalHours) || $intervalHours < 1) {
            $validator->errors()->add('interval_hours', 'Interval hours must be an integer of at least 1.');
        }
    }

    private function rejectTimes($validator, $times): void
    {
        if ($times !== null) {
            $validator->errors()->add('times', 'Times are not allowed for interval schedules.');
        }
    }

    private function rejectWeekdays($validator, $weekdays): void
    {
        if ($weekdays !== null) {
            $validator->errors()->add('weekdays', 'Weekdays are only allowed for weekly schedules.');
        }
    }

    private function rejectIntervalHours($validator, $intervalHours): void
    {
        if ($intervalHours !== null) {
            $validator->errors()->add('interval_hours', 'Interval hours are only allowed for interval schedules.');
        }
    }

    private function validateOverlap($validator, $schedule, string $type, $times, $weekdays): void
    {
        if (! $schedule instanceof Schedule || $type === 'interval') {
            return;
        }

        $isActive = $this->has('is_active') ? $this->boolean('is_active') : $schedule->is_active;
        if (! $isActive) {
            return;
        }

        $normalizedTimes = $this->normalizeTimes($times ?? $schedule->times);
        if ($normalizedTimes === null) {
            return;
        }

        $normalizedWeekdays = $this->normalizeWeekdays($weekdays ?? $schedule->weekdays);

        $existing = Schedule::query()
            ->where('medication_id', $schedule->medication_id)
            ->where('is_active', true)
            ->where('recurrence_type', $type)
            ->whereKeyNot($schedule->id)
            ->get();

        foreach ($existing as $other) {
            $existingTimes = $this->normalizeTimes($other->times);
            if ($existingTimes === null || $existingTimes !== $normalizedTimes) {
                continue;
            }

            if ($type === 'weekly') {
                $existingWeekdays = $this->normalizeWeekdays($other->weekdays);
                if ($this->weekdaysOverlap($normalizedWeekdays, $existingWeekdays)) {
                    $validator->errors()->add('weekdays', 'Overlapping weekly schedules are not allowed.');
                    return;
                }
            } else {
                $validator->errors()->add('times', 'Overlapping schedules with identical times are not allowed.');
                return;
            }
        }
    }

    private function normalizeTimes($times): ?array
    {
<<<<<<< HEAD
        if (! is_array($days) || count($days) === 0) {
            $validator->errors()->add('payload.days', 'Days must be a non-empty array.');

            return;
        }

        foreach ($days as $day) {
            if (! is_int($day) || $day < 1 || $day > 7) {
                $validator->errors()->add('payload.days', 'Each day must be an integer between 1 and 7.');

                return;
=======
        if (! is_array($times)) {
            return null;
        }

        $normalized = [];
        foreach ($times as $time) {
            if (! is_string($time)) {
                return null;
>>>>>>> 23af205 (SCHED-1: align schedule model, routes, and validations)
            }
            $normalized[] = $time;
        }

        sort($normalized);
        return $normalized;
    }

    private function normalizeWeekdays($weekdays): array
    {
<<<<<<< HEAD
        $everyMinutes = $payload['every_minutes'] ?? null;

        if (! is_int($everyMinutes) || $everyMinutes < 15) {
            $validator->errors()->add('payload.every_minutes', 'Every minutes must be an integer of at least 15.');

            return;
=======
        if (! is_array($weekdays)) {
            return [];
>>>>>>> 23af205 (SCHED-1: align schedule model, routes, and validations)
        }

        $normalized = array_map('strtolower', array_filter($weekdays, 'is_string'));
        $normalized = array_values(array_unique($normalized));
        sort($normalized);

        return $normalized;
    }

    private function weekdaysOverlap(array $left, array $right): bool
    {
        if (! $left || ! $right) {
            return false;
        }

        return count(array_intersect($left, $right)) > 0;
    }
}
