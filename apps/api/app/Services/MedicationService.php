<?php

namespace App\Services;

use App\Models\Medication;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class MedicationService
{
    public function listForUser(User $user, bool $includeInactive = false): Collection
    {
        $query = $user->medications()->orderByDesc('id');

        if (! $includeInactive) {
            $query->where('is_active', true);
        }

        return $query->get();
    }

    public function createForUser(User $user, array $data): Medication
    {
        return $user->medications()->create($data);
    }

    public function updateMedication(Medication $medication, array $data): Medication
    {
        $medication->update($data);

        return $medication->fresh();
    }

    public function deactivateMedication(Medication $medication): Medication
    {
        $medication->update(['is_active' => false]);

        return $medication->fresh();
    }
}
