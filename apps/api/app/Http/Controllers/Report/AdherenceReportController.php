<?php

namespace App\Http\Controllers\Report;

use App\Http\Controllers\Controller;
use App\Http\Requests\Report\AdherenceSummaryRequest;
use App\Http\Requests\Report\IntakeTimelineRequest;
use App\Services\AdherenceReportService;
use App\Services\IntakeDerivationService;
use Illuminate\Http\Request;

class AdherenceReportController extends Controller
{
    public function daily(Request $request, AdherenceReportService $service)
    {
        return response()->json($service->build($request->user(), 'daily'));
    }

    public function weekly(Request $request, AdherenceReportService $service)
    {
        return response()->json($service->build($request->user(), 'weekly'));
    }

    public function monthly(Request $request, AdherenceReportService $service)
    {
        return response()->json($service->build($request->user(), 'monthly'));
    }

    public function summary(AdherenceSummaryRequest $request, IntakeDerivationService $service)
    {
        $data = $request->validated();

        return response()->json($service->adherenceSummary(
            $request->user(),
            $data['from'],
            $data['to'],
            $data['medication_id'] ?? null,
            $data['schedule_id'] ?? null
        ));
    }

    public function timeline(IntakeTimelineRequest $request, IntakeDerivationService $service)
    {
        $data = $request->validated();

        return response()->json($service->intakeTimeline(
            $request->user(),
            $data['from'],
            $data['to'],
            $data['schedule_id']
        ));
    }
}
