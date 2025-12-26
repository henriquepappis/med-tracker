<?php

namespace Tests\Unit;

use App\Models\Intake;
use App\Models\Schedule;
use App\Models\User;
use App\Policies\IntakePolicy;
use App\Policies\MedicationPolicy;
use App\Policies\SchedulePolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_medication_policy_allows_owner(): void
    {
        $user = User::factory()->create();
        $medication = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'is_active' => true,
        ]);

        $policy = new MedicationPolicy;

        $this->assertTrue($policy->view($user, $medication)->allowed());
        $this->assertTrue($policy->update($user, $medication)->allowed());
        $this->assertTrue($policy->delete($user, $medication)->allowed());
    }

    public function test_medication_policy_denies_non_owner(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $medication = $owner->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'is_active' => true,
        ]);

        $policy = new MedicationPolicy;

        $this->assertTrue($policy->view($other, $medication)->denied());
        $this->assertTrue($policy->update($other, $medication)->denied());
        $this->assertTrue($policy->delete($other, $medication)->denied());
    }

    public function test_schedule_policy_allows_owner(): void
    {
        $user = User::factory()->create();
        $medication = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'is_active' => true,
        ]);
        $schedule = $medication->schedules()->create([
            'recurrence_type' => 'daily',
            'times' => ['08:00'],
            'is_active' => true,
        ]);

        $policy = new SchedulePolicy;

        $this->assertTrue($policy->view($user, $schedule)->allowed());
        $this->assertTrue($policy->update($user, $schedule)->allowed());
        $this->assertTrue($policy->delete($user, $schedule)->allowed());
    }

    public function test_schedule_policy_denies_when_medication_missing(): void
    {
        $user = User::factory()->create();
        $schedule = new Schedule(['medication_id' => 999, 'recurrence_type' => 'daily']);

        $policy = new SchedulePolicy;

        $this->assertTrue($policy->view($user, $schedule)->denied());
        $this->assertTrue($policy->update($user, $schedule)->denied());
        $this->assertTrue($policy->delete($user, $schedule)->denied());
    }

    public function test_intake_policy_allows_owner(): void
    {
        $user = User::factory()->create();
        $medication = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'is_active' => true,
        ]);
        $schedule = $medication->schedules()->create([
            'recurrence_type' => 'daily',
            'times' => ['08:00'],
            'is_active' => true,
        ]);
        $intake = Intake::create([
            'schedule_id' => $schedule->id,
            'medication_id' => $medication->id,
            'user_id' => $user->id,
            'status' => 'taken',
            'taken_at' => '2025-12-26T08:00:00Z',
        ]);

        $policy = new IntakePolicy;

        $this->assertTrue($policy->view($user, $intake)->allowed());
        $this->assertTrue($policy->update($user, $intake)->allowed());
        $this->assertTrue($policy->delete($user, $intake)->allowed());
    }

    public function test_intake_policy_denies_non_owner(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $medication = $owner->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'is_active' => true,
        ]);
        $schedule = $medication->schedules()->create([
            'recurrence_type' => 'daily',
            'times' => ['08:00'],
            'is_active' => true,
        ]);
        $intake = Intake::create([
            'schedule_id' => $schedule->id,
            'medication_id' => $medication->id,
            'user_id' => $owner->id,
            'status' => 'taken',
            'taken_at' => '2025-12-26T08:00:00Z',
        ]);

        $policy = new IntakePolicy;

        $this->assertTrue($policy->view($other, $intake)->denied());
        $this->assertTrue($policy->update($other, $intake)->denied());
        $this->assertTrue($policy->delete($other, $intake)->denied());
    }
}
