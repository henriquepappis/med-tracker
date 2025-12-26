<?php

namespace App\Http\Controllers\Report;

use App\Http\Controllers\Controller;
use App\Services\AdherenceReportService;
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
}
