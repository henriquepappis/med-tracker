<?php

namespace App\Services;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class ReportService
{
    public function __construct(private IntakeDerivationService $derivationService) {}

    public function adherenceSummary(
        User $user,
        string $from,
        string $to,
        ?int $medicationId = null,
        ?int $scheduleId = null
    ): array {
        $statuses = $this->derivationService->deriveStatuses($user, $from, $to, $medicationId, $scheduleId);
        $summary = $this->summarize($statuses);
        [$start, $end] = $this->resolveRange($user, $from, $to);

        $response = [
            'period' => [
                'from' => $start->toISOString(),
                'to' => $end->toISOString(),
            ],
            'summary' => $summary,
        ];

        if ($medicationId === null) {
            $response['by_medication'] = $this->medicationBreakdownFromStatuses($statuses);
        }

        return $response;
    }

    public function medicationBreakdown(User $user, string $from, string $to): array
    {
        $statuses = $this->derivationService->deriveStatuses($user, $from, $to);

        return $this->medicationBreakdownFromStatuses($statuses);
    }

    public function scheduleBreakdown(User $user, string $from, string $to, ?int $medicationId = null): array
    {
        $statuses = $this->derivationService->deriveStatuses($user, $from, $to, $medicationId);

        return $this->scheduleBreakdownFromStatuses($statuses);
    }

    public function intakeTimeline(
        User $user,
        string $from,
        string $to,
        ?int $medicationId = null,
        ?int $scheduleId = null
    ): array {
        $statuses = $this->derivationService->deriveStatuses($user, $from, $to, $medicationId, $scheduleId);

        return $statuses->map(fn (array $item) => [
            'scheduled_at' => $item['scheduled_at']->toISOString(),
            'status' => $item['status'],
            'medication_id' => $item['medication_id'],
            'schedule_id' => $item['schedule_id'],
        ])->all();
    }

    private function summarize(Collection $statuses): array
    {
        $taken = $statuses->where('status', 'taken')->count();
        $skipped = $statuses->where('status', 'skipped')->count();
        $missed = $statuses->where('status', 'missed')->count();
        $expected = $taken + $skipped + $missed;
        $denominator = max(0, $expected - $skipped);
        $rate = $denominator > 0 ? round($taken / $denominator, 4) : 0.0;

        return [
            'expected' => $expected,
            'taken' => $taken,
            'skipped' => $skipped,
            'missed' => $missed,
            'adherence_rate' => $rate,
        ];
    }

    private function medicationBreakdownFromStatuses(Collection $statuses): array
    {
        return $statuses
            ->groupBy('medication_id')
            ->map(function (Collection $items, $medicationId) {
                $summary = $this->summarize($items);

                return [
                    'medication_id' => (int) $medicationId,
                    'medication_name' => $items->first()['medication_name'] ?? null,
                ] + $summary;
            })
            ->values()
            ->all();
    }

    private function scheduleBreakdownFromStatuses(Collection $statuses): array
    {
        return $statuses
            ->groupBy('schedule_id')
            ->map(function (Collection $items, $scheduleId) {
                $summary = $this->summarize($items);
                $first = $items->first();

                return [
                    'schedule_id' => (int) $scheduleId,
                    'medication_id' => $first['medication_id'] ?? null,
                ] + $summary;
            })
            ->values()
            ->all();
    }

    private function resolveRange(User $user, string $from, string $to): array
    {
        $timezone = $user->timezone ?: 'UTC';
        $start = Carbon::parse($from, $timezone)->startOfDay();
        $end = Carbon::parse($to, $timezone)->endOfDay();

        return [$start->clone()->utc(), $end->clone()->utc()];
    }
}
