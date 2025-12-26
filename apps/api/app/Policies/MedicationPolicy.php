<?php

namespace App\Policies;

use App\Models\Medication;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class MedicationPolicy
{
    public function view(User $user, Medication $medication): Response
    {
        return $this->ownsMedication($user, $medication);
    }

    public function update(User $user, Medication $medication): Response
    {
        return $this->ownsMedication($user, $medication);
    }

    public function delete(User $user, Medication $medication): Response
    {
        return $this->ownsMedication($user, $medication);
    }

    private function ownsMedication(User $user, Medication $medication): Response
    {
        return $medication->user_id === $user->id
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
