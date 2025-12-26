<?php

namespace App\Services;

use App\Models\Intake;
use App\Models\Schedule;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;

class IntakeService
{
    public function listForUser(User $user): Collection
    {
        return $user->intakes()->orderByDesc('id')->get();
    }

    public function createForUser(User $user, array $data): Intake
    {
        $schedule = Schedule::query()
            ->with('medication')
            ->whereKey($data['schedule_id'])
            ->first();

        if (! $schedule || ! $schedule->is_active) {
            abort(404, 'Not Found');
        }

        $medication = $schedule->medication;
        if (! $medication || $medication->user_id !== $user->id) {
            abort(404, 'Not Found');
        }

        $takenAt = isset($data['taken_at'])
            ? Carbon::parse($data['taken_at'])->utc()
            : now()->utc();

        $payload = [
            'schedule_id' => $schedule->id,
            'medication_id' => $medication->id,
            'user_id' => $user->id,
            'status' => $data['status'],
            'taken_at' => $takenAt,
        ];

        $intake = Intake::create($payload);

        return $intake->fresh();
    }
}
