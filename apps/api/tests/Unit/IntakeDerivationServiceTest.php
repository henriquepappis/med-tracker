<?php

namespace Tests\Unit;

use App\Models\Intake;
use App\Models\User;
use App\Services\IntakeDerivationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IntakeDerivationServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_weekly_occurrence_is_marked_taken(): void
    {
        Carbon::setTestNow(Carbon::parse('2025-12-29 10:00:00', 'UTC'));

        $user = User::factory()->create(['timezone' => 'UTC']);
        $medication = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'is_active' => true,
        ]);
        $schedule = $medication->schedules()->create([
            'recurrence_type' => 'weekly',
            'times' => ['08:00'],
            'weekdays' => ['mon'],
            'is_active' => true,
        ]);

        Intake::create([
            'schedule_id' => $schedule->id,
            'medication_id' => $medication->id,
            'user_id' => $user->id,
            'status' => 'taken',
            'taken_at' => '2025-12-29T08:05:00Z',
        ]);

        $service = new IntakeDerivationService;
        $statuses = $service->deriveStatuses($user, '2025-12-29', '2025-12-30', null, null);

        $this->assertCount(1, $statuses);
        $this->assertSame('taken', $statuses->first()['status']);
        $this->assertSame($medication->id, $statuses->first()['medication_id']);
    }

    public function test_interval_occurrence_marks_missed_when_late(): void
    {
        Carbon::setTestNow(Carbon::parse('2025-12-29 23:00:00', 'UTC'));

        $user = User::factory()->create(['timezone' => 'UTC']);
        $medication = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'is_active' => true,
        ]);
        $schedule = $medication->schedules()->create([
            'recurrence_type' => 'interval',
            'times' => [],
            'interval_hours' => 12,
            'is_active' => true,
        ]);

        Intake::create([
            'schedule_id' => $schedule->id,
            'medication_id' => $medication->id,
            'user_id' => $user->id,
            'status' => 'taken',
            'taken_at' => '2025-12-29T00:10:00Z',
        ]);

        $service = new IntakeDerivationService;
        $statuses = $service->deriveStatuses($user, '2025-12-29', '2025-12-29', null, null);

        $this->assertCount(2, $statuses);
        $this->assertSame('taken', $statuses->first()['status']);
        $this->assertSame('missed', $statuses->last()['status']);
    }
}
