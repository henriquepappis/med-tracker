<?php

namespace App\Policies;

use App\Models\Schedule;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class SchedulePolicy
{
    public function view(User $user, Schedule $schedule): Response
    {
        return $this->ownsSchedule($user, $schedule);
    }

    public function update(User $user, Schedule $schedule): Response
    {
        return $this->ownsSchedule($user, $schedule);
    }

    public function delete(User $user, Schedule $schedule): Response
    {
        return $this->ownsSchedule($user, $schedule);
    }

    private function ownsSchedule(User $user, Schedule $schedule): Response
    {
        return $schedule->user_id === $user->id
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
