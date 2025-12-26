<?php

namespace Tests\Feature;

use App\Models\Intake;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_daily_report_returns_expected_counts(): void
    {
        Carbon::setTestNow(Carbon::parse('2025-12-26 10:00:00', 'UTC'));

        $user = User::factory()->create();
        $medication = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'instructions' => 'After breakfast',
            'is_active' => true,
        ]);
        $schedule = $medication->schedules()->create([
            'recurrence_type' => 'daily',
            'times' => ['08:00', '20:00'],
            'is_active' => true,
        ]);

        Intake::create([
            'schedule_id' => $schedule->id,
            'medication_id' => $medication->id,
            'user_id' => $user->id,
            'status' => 'taken',
            'taken_at' => '2025-12-26T08:00:00Z',
        ]);
        Intake::create([
            'schedule_id' => $schedule->id,
            'medication_id' => $medication->id,
            'user_id' => $user->id,
            'status' => 'skipped',
            'taken_at' => '2025-12-26T20:00:00Z',
        ]);

        $this->actingAs($user, 'sanctum');

        $this->getJson('/api/reports/adherence/daily')
            ->assertStatus(200)
            ->assertJsonFragment([
                'expected' => 2,
                'taken' => 1,
                'skipped' => 1,
                'missed' => 0,
                'adherence' => 0.5,
            ]);
    }

    public function test_medication_breakdown_returns_expected_counts(): void
    {
        Carbon::setTestNow(Carbon::parse('2025-12-26 10:00:00', 'UTC'));

        $user = User::factory()->create(['timezone' => 'UTC']);
        $medicationA = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'instructions' => 'After breakfast',
            'is_active' => true,
        ]);
        $medicationB = $user->medications()->create([
            'name' => 'Omega 3',
            'dosage' => '1 pill',
            'instructions' => 'After lunch',
            'is_active' => true,
        ]);

        $scheduleA = $medicationA->schedules()->create([
            'recurrence_type' => 'daily',
            'times' => ['08:00'],
            'is_active' => true,
        ]);
        $medicationB->schedules()->create([
            'recurrence_type' => 'daily',
            'times' => ['08:00'],
            'is_active' => true,
        ]);

        Intake::create([
            'schedule_id' => $scheduleA->id,
            'medication_id' => $medicationA->id,
            'user_id' => $user->id,
            'status' => 'taken',
            'taken_at' => '2025-12-26T08:05:00Z',
        ]);

        $this->actingAs($user, 'sanctum');

        $this->getJson('/api/reports/adherence/medications?from=2025-12-26&to=2025-12-26')
            ->assertStatus(200)
            ->assertJsonFragment([
                'medication_id' => $medicationA->id,
                'medication_name' => 'Vitamin D',
                'expected' => 1,
                'taken' => 1,
                'skipped' => 0,
                'missed' => 0,
                'adherence_rate' => 1.0,
            ])
            ->assertJsonFragment([
                'medication_id' => $medicationB->id,
                'medication_name' => 'Omega 3',
                'expected' => 1,
                'taken' => 0,
                'skipped' => 0,
                'missed' => 1,
                'adherence_rate' => 0.0,
            ]);
    }

    public function test_schedule_breakdown_filters_by_medication(): void
    {
        Carbon::setTestNow(Carbon::parse('2025-12-26 10:00:00', 'UTC'));

        $user = User::factory()->create(['timezone' => 'UTC']);
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

        $this->getJson(sprintf(
            '/api/reports/adherence/schedules?from=2025-12-26&to=2025-12-26&medication_id=%d',
            $medication->id
        ))
            ->assertStatus(200)
            ->assertJsonFragment([
                'schedule_id' => $schedule->id,
                'medication_id' => $medication->id,
                'expected' => 1,
                'taken' => 0,
                'skipped' => 0,
                'missed' => 1,
                'adherence_rate' => 0.0,
            ]);
    }

    public function test_intake_timeline_includes_medication_and_schedule_ids(): void
    {
        Carbon::setTestNow(Carbon::parse('2025-12-26 10:00:00', 'UTC'));

        $user = User::factory()->create(['timezone' => 'UTC']);
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

        $this->getJson(sprintf(
            '/api/reports/intake-timeline?from=2025-12-26&to=2025-12-26&medication_id=%d',
            $medication->id
        ))
            ->assertStatus(200)
            ->assertJsonFragment([
                'medication_id' => $medication->id,
                'schedule_id' => $schedule->id,
                'status' => 'missed',
            ]);
    }
}
