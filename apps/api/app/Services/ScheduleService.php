<?php

namespace App\Services;

use App\Models\Schedule;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class ScheduleService
{
    public function listForUser(User $user, bool $includeInactive = false): Collection
    {
        $query = $user->schedules()->orderByDesc('id');

        if (! $includeInactive) {
            $query->where('is_active', true);
        }

        return $query->get();
    }

    public function createForUser(User $user, array $data): Schedule
    {
        $ownsMedication = $user->medications()->whereKey($data['medication_id'])->exists();

        if (! $ownsMedication) {
            abort(404, 'Not Found');
        }

        return $user->schedules()->create($data);
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
