<?php

namespace Tests\Feature;

use App\Models\Intake;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IntakeDerivationTest extends TestCase
{
    use RefreshDatabase;

    public function test_adherence_summary_excludes_pending_occurrences(): void
    {
        Carbon::setTestNow(Carbon::parse('2025-12-26 08:10:00', 'UTC'));

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

        Intake::create([
            'schedule_id' => $schedule->id,
            'medication_id' => $medication->id,
            'user_id' => $user->id,
            'status' => 'taken',
            'taken_at' => '2025-12-26T08:05:00Z',
        ]);

        $this->actingAs($user, 'sanctum');

        $this->getJson('/api/reports/adherence?from=2025-12-26&to=2025-12-26')
            ->assertStatus(200)
            ->assertJsonFragment([
                'expected' => 1,
                'taken' => 1,
                'skipped' => 0,
                'missed' => 0,
                'adherence_rate' => 1.0,
            ]);
    }

    public function test_timeline_marks_missed_after_tolerance(): void
    {
        Carbon::setTestNow(Carbon::parse('2025-12-26 09:00:00', 'UTC'));

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

        $response = $this->getJson(sprintf(
            '/api/reports/intake-timeline?from=2025-12-26&to=2025-12-26&schedule_id=%d',
            $schedule->id
        ))
            ->assertStatus(200);

        $response->assertJsonFragment([
            'status' => 'missed',
        ]);
    }
}
