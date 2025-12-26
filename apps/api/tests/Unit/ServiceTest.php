<?php

namespace Tests\Unit;

use App\Models\Intake;
use App\Models\User;
use App\Services\AdherenceReportService;
use App\Services\MedicationService;
use App\Services\ScheduleService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_medication_service_filters_inactive(): void
    {
        $user = User::factory()->create();
        $service = new MedicationService;

        $active = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'is_active' => true,
        ]);
        $inactive = $user->medications()->create([
            'name' => 'Omega 3',
            'dosage' => '1 pill',
            'is_active' => false,
        ]);

        $list = $service->listForUser($user, false);
        $this->assertCount(1, $list);
        $this->assertTrue($list->first()->is($active));

        $all = $service->listForUser($user, true);
        $this->assertCount(2, $all);
        $this->assertTrue($all->contains($inactive));
    }

    public function test_schedule_service_filters_inactive(): void
    {
        $user = User::factory()->create();
        $medication = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'is_active' => true,
        ]);
        $service = new ScheduleService;

        $active = $medication->schedules()->create([
            'recurrence_type' => 'daily',
            'times' => ['08:00'],
            'is_active' => true,
        ]);
        $inactive = $medication->schedules()->create([
            'recurrence_type' => 'daily',
            'times' => ['20:00'],
            'is_active' => false,
        ]);

        $list = $service->listForMedication($medication, false);
        $this->assertCount(1, $list);
        $this->assertTrue($list->first()->is($active));

        $all = $service->listForMedication($medication, true);
        $this->assertCount(2, $all);
        $this->assertTrue($all->contains($inactive));
    }

    public function test_adherence_report_service_daily_counts(): void
    {
        Carbon::setTestNow(Carbon::parse('2025-12-26 10:00:00', 'UTC'));

        $user = User::factory()->create();
        $medication = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
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

        $service = new AdherenceReportService;
        $report = $service->build($user, 'daily');

        $this->assertSame(2, $report['expected']);
        $this->assertSame(1, $report['taken']);
        $this->assertSame(1, $report['skipped']);
        $this->assertSame(0, $report['missed']);
        $this->assertSame(0.5, $report['adherence']);
    }

    public function test_adherence_report_service_weekly_and_interval_counts(): void
    {
        Carbon::setTestNow(Carbon::parse('2025-12-29 10:00:00', 'UTC'));

        $user = User::factory()->create();
        $medication = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'is_active' => true,
        ]);

        $weekly = $medication->schedules()->create([
            'recurrence_type' => 'weekly',
            'times' => ['09:00'],
            'weekdays' => ['mon', 'wed'],
            'is_active' => true,
        ]);
        $interval = $medication->schedules()->create([
            'recurrence_type' => 'interval',
            'times' => [],
            'interval_hours' => 12,
            'is_active' => true,
        ]);

        Intake::create([
            'schedule_id' => $weekly->id,
            'medication_id' => $medication->id,
            'user_id' => $user->id,
            'status' => 'taken',
            'taken_at' => '2025-12-29T09:00:00Z',
        ]);
        Intake::create([
            'schedule_id' => $weekly->id,
            'medication_id' => $medication->id,
            'user_id' => $user->id,
            'status' => 'taken',
            'taken_at' => '2025-12-31T09:00:00Z',
        ]);

        $service = new AdherenceReportService;
        $report = $service->build($user, 'weekly');

        $this->assertSame(14 + 2, $report['expected']);
        $this->assertSame(2, $report['taken']);
        $this->assertSame(0, $report['skipped']);
        $this->assertSame(14, $report['missed']);
        $this->assertSame(round(2 / 16, 4), $report['adherence']);
    }
}
