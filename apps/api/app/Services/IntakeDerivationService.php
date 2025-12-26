<?php

namespace App\Services;

use App\Models\Intake;
use App\Models\Schedule;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;

class IntakeDerivationService
{
    private const DEFAULT_TOLERANCE_MINUTES = 30;

    public function adherenceSummary(
        User $user,
        string $from,
        string $to,
        ?int $medicationId = null,
        ?int $scheduleId = null
    ): array {
        [$start, $end] = $this->resolveRange($user, $from, $to);

        $occurrences = $this->buildOccurrences($user, $start, $end, $medicationId, $scheduleId);
        $statuses = $this->resolveStatuses($user, $occurrences, $start, $end);

        $taken = $statuses->where('status', 'taken')->count();
        $skipped = $statuses->where('status', 'skipped')->count();
        $missed = $statuses->where('status', 'missed')->count();
        $expected = $taken + $skipped + $missed;
        $denominator = max(0, $expected - $skipped);
        $rate = $denominator > 0 ? round($taken / $denominator, 4) : 0.0;

        return [
            'period' => [
                'from' => $start->toISOString(),
                'to' => $end->toISOString(),
            ],
            'summary' => [
                'expected' => $expected,
                'taken' => $taken,
                'skipped' => $skipped,
                'missed' => $missed,
                'adherence_rate' => $rate,
            ],
        ];
    }

    public function intakeTimeline(User $user, string $from, string $to, int $scheduleId): array
    {
        [$start, $end] = $this->resolveRange($user, $from, $to);
        $occurrences = $this->buildOccurrences($user, $start, $end, null, $scheduleId);
        $statuses = $this->resolveStatuses($user, $occurrences, $start, $end);

        return $statuses->map(fn (array $item) => [
            'scheduled_at' => $item['scheduled_at']->toISOString(),
            'status' => $item['status'],
        ])->all();
    }

    private function resolveRange(User $user, string $from, string $to): array
    {
        $timezone = $user->timezone ?: 'UTC';
        $start = Carbon::parse($from, $timezone)->startOfDay();
        $end = Carbon::parse($to, $timezone)->endOfDay();

        return [$start->clone()->utc(), $end->clone()->utc()];
    }

    private function buildOccurrences(
        User $user,
        Carbon $start,
        Carbon $end,
        ?int $medicationId,
        ?int $scheduleId
    ): Collection {
        $query = Schedule::query()
            ->where('is_active', true)
            ->when($scheduleId, fn ($q) => $q->whereKey($scheduleId))
            ->when($medicationId, fn ($q) => $q->where('medication_id', $medicationId))
            ->whereHas('medication', fn ($q) => $q->where('user_id', $user->id));

        $schedules = $query->get();
        $timezone = $user->timezone ?: 'UTC';

        $occurrences = collect();
        foreach ($schedules as $schedule) {
            switch ($schedule->recurrence_type) {
                case 'daily':
                    $occurrences = $occurrences->merge(
                        $this->dailyOccurrences($schedule, $start, $end, $timezone)
                    );
                    break;
                case 'weekly':
                    $occurrences = $occurrences->merge(
                        $this->weeklyOccurrences($schedule, $start, $end, $timezone)
                    );
                    break;
                case 'interval':
                    $occurrences = $occurrences->merge(
                        $this->intervalOccurrences($schedule, $start, $end)
                    );
                    break;
            }
        }

        return $occurrences->sortBy('scheduled_at')->values();
    }

    private function dailyOccurrences(Schedule $schedule, Carbon $start, Carbon $end, string $timezone): Collection
    {
        $times = $schedule->times ?? [];
        if ($times === []) {
            return collect();
        }

        $period = CarbonPeriod::create($start->copy()->setTimezone($timezone), $end->copy()->setTimezone($timezone));
        $items = collect();

        foreach ($period as $date) {
            foreach ($times as $time) {
                if (! is_string($time) || $time === '') {
                    continue;
                }
                [$hour, $minute] = array_map('intval', explode(':', $time));
                $scheduled = $date->copy()->setTime($hour, $minute, 0)->utc();
                if ($scheduled->betweenIncluded($start, $end)) {
                    $items->push(['schedule_id' => $schedule->id, 'scheduled_at' => $scheduled]);
                }
            }
        }

        return $items;
    }

    private function weeklyOccurrences(Schedule $schedule, Carbon $start, Carbon $end, string $timezone): Collection
    {
        $times = $schedule->times ?? [];
        $weekdays = $schedule->weekdays ?? [];
        if ($times === [] || $weekdays === []) {
            return collect();
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
            return collect();
        }

        $period = CarbonPeriod::create($start->copy()->setTimezone($timezone), $end->copy()->setTimezone($timezone));
        $items = collect();

        foreach ($period as $date) {
            if (! isset($allowed[$date->isoWeekday()])) {
                continue;
            }
            foreach ($times as $time) {
                if (! is_string($time) || $time === '') {
                    continue;
                }
                [$hour, $minute] = array_map('intval', explode(':', $time));
                $scheduled = $date->copy()->setTime($hour, $minute, 0)->utc();
                if ($scheduled->betweenIncluded($start, $end)) {
                    $items->push(['schedule_id' => $schedule->id, 'scheduled_at' => $scheduled]);
                }
            }
        }

        return $items;
    }

    private function intervalOccurrences(Schedule $schedule, Carbon $start, Carbon $end): Collection
    {
        $intervalHours = $schedule->interval_hours;
        if ($intervalHours === null) {
            return collect();
        }

        $items = collect();
        $cursor = $start->copy();
        $step = $intervalHours * 60;

        while ($cursor->lte($end)) {
            $items->push(['schedule_id' => $schedule->id, 'scheduled_at' => $cursor->copy()]);
            $cursor->addMinutes($step);
        }

        return $items;
    }

    private function resolveStatuses(User $user, Collection $occurrences, Carbon $start, Carbon $end): Collection
    {
        if ($occurrences->isEmpty()) {
            return collect();
        }

        $scheduleIds = $occurrences->pluck('schedule_id')->unique()->all();
        $tolerance = self::DEFAULT_TOLERANCE_MINUTES;

        $intakes = Intake::query()
            ->where('user_id', $user->id)
            ->whereIn('schedule_id', $scheduleIds)
            ->whereBetween('taken_at', [$start->copy()->subMinutes($tolerance), $end->copy()->addMinutes($tolerance)])
            ->orderBy('taken_at')
            ->get()
            ->groupBy('schedule_id');

        $now = Carbon::now('UTC');
        $used = [];

        return $occurrences->map(function (array $occurrence) use ($intakes, $tolerance, $now, &$used) {
            $scheduleId = $occurrence['schedule_id'];
            $scheduledAt = $occurrence['scheduled_at'];
            $windowEnd = $scheduledAt->copy()->addMinutes($tolerance);

            $matched = null;
            foreach ($intakes->get($scheduleId, collect()) as $intake) {
                if (isset($used[$intake->id])) {
                    continue;
                }

                if ($intake->taken_at->lt($scheduledAt)) {
                    continue;
                }

                if ($intake->taken_at->lte($windowEnd)) {
                    $matched = $intake;
                    $used[$intake->id] = true;
                    break;
                }
            }

            $status = 'pending';
            if ($matched) {
                $status = $matched->status;
            } elseif ($now->gt($windowEnd)) {
                $status = 'missed';
            }

            return [
                'schedule_id' => $scheduleId,
                'scheduled_at' => $scheduledAt,
                'status' => $status,
            ];
        });
    }
}
