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
}
