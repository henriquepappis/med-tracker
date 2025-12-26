<?php

namespace App\Services;

use App\Models\Intake;
use App\Models\Schedule;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

class AdherenceReportService
{
    public function build(User $user, string $period): array
    {
        [$start, $end] = $this->resolvePeriod($period);

        $expected = $this->expectedCount($user, $start, $end);

        $intakes = Intake::query()
            ->where('user_id', $user->id)
            ->whereBetween('taken_at', [$start, $end])
            ->get();

        $taken = $intakes->where('status', 'taken')->count();
        $skipped = $intakes->where('status', 'skipped')->count();
        $missed = max(0, $expected - $taken - $skipped);
        $adherence = $expected > 0 ? round($taken / $expected, 4) : 0.0;

        return [
            'period' => $period,
            'period_start' => $start->toISOString(),
            'period_end' => $end->toISOString(),
            'expected' => $expected,
            'taken' => $taken,
            'skipped' => $skipped,
            'missed' => $missed,
            'adherence' => $adherence,
        ];
    }

    private function resolvePeriod(string $period): array
    {
        $now = Carbon::now('UTC');

        return match ($period) {
            'daily' => [$now->copy()->startOfDay(), $now->copy()->endOfDay()],
            'weekly' => [$now->copy()->startOfWeek(Carbon::MONDAY), $now->copy()->endOfWeek(Carbon::SUNDAY)],
            'monthly' => [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()],
            default => [$now->copy()->startOfDay(), $now->copy()->endOfDay()],
        };
    }

    private function expectedCount(User $user, Carbon $start, Carbon $end): int
    {
        $schedules = Schedule::query()
            ->where('is_active', true)
            ->whereHas('medication', fn ($query) => $query->where('user_id', $user->id))
            ->get();

        $total = 0;
        $startDay = $start->copy()->startOfDay();
        $endDay = $end->copy()->startOfDay();
        $days = $startDay->diffInDays($endDay) + 1;

        foreach ($schedules as $schedule) {
            $timesCount = $this->countTimes($schedule->times);

            switch ($schedule->recurrence_type) {
                case 'daily':
                    $total += $days * $timesCount;
                    break;
                case 'weekly':
                    $total += $this->weeklyExpectedCount($schedule->weekdays, $timesCount, $start, $end);
                    break;
                case 'interval':
                    $total += $this->intervalExpectedCount($schedule->interval_hours, $start, $end);
                    break;
            }
        }

        return $total;
    }

    private function countTimes(?array $times): int
    {
        if (! $times) {
            return 0;
        }

        $filtered = array_filter($times, fn ($time) => is_string($time) && $time !== '');
        $unique = array_values(array_unique($filtered));

        return count($unique);
    }

    private function weeklyExpectedCount(?array $weekdays, int $timesCount, Carbon $start, Carbon $end): int
    {
        if (! $weekdays || $timesCount === 0) {
            return 0;
        }

        $map = [
            'mon' => 1,
            'tue' => 2,
            'wed' => 3,
            'thu' => 4,
            'fri' => 5,
            'sat' => 6,
            'sun' => 7,
        ];

        $allowed = [];
        foreach ($weekdays as $weekday) {
            $key = strtolower((string) $weekday);
            if (isset($map[$key])) {
                $allowed[$map[$key]] = true;
            }
        }

        if (! $allowed) {
            return 0;
        }

        $count = 0;
        foreach (CarbonPeriod::create($start, $end) as $date) {
            if (isset($allowed[$date->isoWeekday()])) {
                $count += $timesCount;
            }
        }

        return $count;
    }

    private function intervalExpectedCount(?int $intervalHours, Carbon $start, Carbon $end): int
    {
        if (! $intervalHours || $intervalHours < 1) {
            return 0;
        }

        $minutes = $intervalHours * 60;
        $diffMinutes = (int) $start->diffInMinutes($end);

        return intdiv($diffMinutes, $minutes) + 1;
    }
}
