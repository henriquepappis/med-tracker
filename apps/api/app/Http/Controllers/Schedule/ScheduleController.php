<?php

namespace App\Http\Controllers\Schedule;

use App\Http\Controllers\Controller;
use App\Http\Requests\Schedule\StoreScheduleRequest;
use App\Http\Requests\Schedule\UpdateScheduleRequest;
use App\Models\Schedule;
use App\Services\ScheduleService;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    public function index(Request $request, ScheduleService $service)
    {
        $includeInactive = $request->boolean('include_inactive');
        $items = $service->listForUser($request->user(), $includeInactive);

        return response()->json($items);
    }

    public function store(StoreScheduleRequest $request, ScheduleService $service)
    {
        $schedule = $service->createForUser($request->user(), $request->validated());

        return response()->json($schedule, 201);
    }

    public function show(Request $request, Schedule $schedule)
    {
        $this->authorize('view', $schedule);

        return response()->json($schedule);
    }

    public function update(UpdateScheduleRequest $request, Schedule $schedule, ScheduleService $service)
    {
        $this->authorize('update', $schedule);

        $schedule = $service->updateSchedule($schedule, $request->validated());

        return response()->json($schedule);
    }

    public function destroy(Request $request, Schedule $schedule, ScheduleService $service)
    {
        $this->authorize('delete', $schedule);

        $service->deactivateSchedule($schedule);

        return response()->json(['message' => 'Schedule deactivated']);
    }
}
