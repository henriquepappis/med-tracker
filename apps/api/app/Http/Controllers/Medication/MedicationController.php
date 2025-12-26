<?php

namespace App\Http\Controllers\Medication;

use App\Http\Controllers\Controller;
use App\Http\Requests\Medication\StoreMedicationRequest;
use App\Http\Requests\Medication\UpdateMedicationRequest;
use App\Models\Medication;
use App\Services\MedicationService;
use Illuminate\Http\Request;

class MedicationController extends Controller
{
    public function index(Request $request, MedicationService $service)
    {
        $includeInactive = $request->boolean('include_inactive');
        $items = $service->listForUser($request->user(), $includeInactive);

        return response()->json($items);
    }

    public function store(StoreMedicationRequest $request, MedicationService $service)
    {
        $medication = $service->createForUser($request->user(), $request->validated());

        return response()->json($medication, 201);
    }

    public function show(Request $request, Medication $medication)
    {
        $this->authorize('view', $medication);

        return response()->json($medication);
    }

    public function update(UpdateMedicationRequest $request, Medication $medication, MedicationService $service)
    {
        $this->authorize('update', $medication);

        $medication = $service->updateMedication($medication, $request->validated());

        return response()->json($medication);
    }

    public function destroy(Request $request, Medication $medication, MedicationService $service)
    {
        $this->authorize('delete', $medication);

        $service->deactivateMedication($medication);

        return response()->json(['message' => 'Medication deactivated']);
    }
}
