<?php

namespace App\Services;

use App\Models\Medication;
use App\Models\Schedule;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class ScheduleService
{
    public function listForMedication(Medication $medication, bool $includeInactive = false): Collection
    {
        $query = $medication->schedules()->orderByDesc('id');

        if (! $includeInactive) {
            $query->where('is_active', true);
        }

        return $query->get();
    }

    public function createForUser(User $user, array $data): Schedule
    {
        $medication = $user->medications()->whereKey($data['medication_id'])->first();

        if (! $medication) {
            abort(404, 'Not Found');
        }

        $schedule = $medication->schedules()->create($data);

        return $schedule->fresh();
    }

    public function updateSchedule(Schedule $schedule, array $data): Schedule
    {
        $schedule->update($data);

        return $schedule->fresh();
    }

    public function deactivateSchedule(Schedule $schedule): Schedule
    {
        $schedule->update(['is_active' => false]);

        return $schedule->fresh();
    }
}
