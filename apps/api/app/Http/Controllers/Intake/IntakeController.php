<?php

namespace App\Http\Controllers\Intake;

use App\Http\Controllers\Controller;
use App\Http\Requests\Intake\StoreIntakeRequest;
use App\Services\IntakeService;
use Illuminate\Http\Request;

class IntakeController extends Controller
{
    public function index(Request $request, IntakeService $service)
    {
        $items = $service->listForUser($request->user());

        return response()->json($items);
    }

    public function store(StoreIntakeRequest $request, IntakeService $service)
    {
        $intake = $service->createForUser($request->user(), $request->validated());

        return response()->json($intake, 201);
    }
}
