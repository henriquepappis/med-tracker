<?php

namespace App\Policies;

use App\Models\Intake;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class IntakePolicy
{
    public function view(User $user, Intake $intake): Response
    {
        return $this->ownsIntake($user, $intake);
    }

    public function update(User $user, Intake $intake): Response
    {
        return $this->ownsIntake($user, $intake);
    }

    public function delete(User $user, Intake $intake): Response
    {
        return $this->ownsIntake($user, $intake);
    }

    private function ownsIntake(User $user, Intake $intake): Response
    {
        return $intake->user_id === $user->id
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
