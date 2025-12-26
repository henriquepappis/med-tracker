<?php

namespace Tests\Feature;

use App\Models\Intake;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IntakeTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_intake_for_active_schedule(): void
    {
        $user = User::factory()->create();
        $medication = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'instructions' => 'After breakfast',
            'is_active' => true,
        ]);
        $schedule = $medication->schedules()->create([
            'recurrence_type' => 'daily',
            'times' => ['08:00'],
            'is_active' => true,
        ]);

        $this->actingAs($user, 'sanctum');

        $response = $this->postJson('/api/intakes', [
            'schedule_id' => $schedule->id,
            'status' => 'taken',
            'taken_at' => '2025-12-26T08:00:00Z',
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'schedule_id' => $schedule->id,
                'medication_id' => $medication->id,
                'user_id' => $user->id,
                'status' => 'taken',
            ]);

        $this->assertDatabaseHas('intakes', [
            'schedule_id' => $schedule->id,
            'medication_id' => $medication->id,
            'user_id' => $user->id,
            'status' => 'taken',
        ]);
    }

    public function test_user_cannot_create_intake_for_inactive_schedule(): void
    {
        $user = User::factory()->create();
        $medication = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'instructions' => 'After breakfast',
            'is_active' => true,
        ]);
        $schedule = $medication->schedules()->create([
            'recurrence_type' => 'daily',
            'times' => ['08:00'],
            'is_active' => false,
        ]);

        $this->actingAs($user, 'sanctum');

        $this->postJson('/api/intakes', [
            'schedule_id' => $schedule->id,
            'status' => 'taken',
            'taken_at' => '2025-12-26T08:00:00Z',
        ])->assertStatus(404);
    }

    public function test_user_cannot_create_intake_for_other_users_schedule(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $medication = $owner->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'instructions' => 'After breakfast',
            'is_active' => true,
        ]);
        $schedule = $medication->schedules()->create([
            'recurrence_type' => 'daily',
            'times' => ['08:00'],
            'is_active' => true,
        ]);

        $this->actingAs($other, 'sanctum');

        $this->postJson('/api/intakes', [
            'schedule_id' => $schedule->id,
            'status' => 'taken',
            'taken_at' => '2025-12-26T08:00:00Z',
        ])->assertStatus(404);
    }

    public function test_list_returns_only_user_intakes(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        $medication = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'instructions' => 'After breakfast',
            'is_active' => true,
        ]);
        $schedule = $medication->schedules()->create([
            'recurrence_type' => 'daily',
            'times' => ['08:00'],
            'is_active' => true,
        ]);

        $otherMedication = $other->medications()->create([
            'name' => 'Vitamin C',
            'dosage' => '1 pill',
            'instructions' => 'After lunch',
            'is_active' => true,
        ]);
        $otherSchedule = $otherMedication->schedules()->create([
            'recurrence_type' => 'daily',
            'times' => ['09:00'],
            'is_active' => true,
        ]);

        $ownIntake = Intake::create([
            'schedule_id' => $schedule->id,
            'medication_id' => $medication->id,
            'user_id' => $user->id,
            'status' => 'taken',
            'taken_at' => '2025-12-26T08:00:00Z',
        ]);

        $otherIntake = Intake::create([
            'schedule_id' => $otherSchedule->id,
            'medication_id' => $otherMedication->id,
            'user_id' => $other->id,
            'status' => 'skipped',
            'taken_at' => '2025-12-26T09:00:00Z',
        ]);

        $this->actingAs($user, 'sanctum');

        $this->getJson('/api/intakes')
            ->assertStatus(200)
            ->assertJsonFragment(['id' => $ownIntake->id])
            ->assertJsonMissing(['id' => $otherIntake->id]);
    }
}
