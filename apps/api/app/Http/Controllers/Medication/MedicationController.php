<?php

namespace App\Http\Controllers\Medication;

use App\Http\Controllers\Controller;
use App\Models\Medication;
use Illuminate\Http\Request;

class MedicationController extends Controller
{
    public function index(Request $request)
    {
        $items = $request->user()
            ->medications()
            ->orderByDesc('id')
            ->get();

        return response()->json($items);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'dosage' => ['required', 'string', 'max:255'],
            'instructions' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $medication = $request->user()->medications()->create($data);

        return response()->json($medication, 201);
    }

    public function show(Request $request, Medication $medication)
    {
        if ($medication->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Not Found'], 404);
        }

        return response()->json($medication);
    }

    public function update(Request $request, Medication $medication)
    {
        if ($medication->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Not Found'], 404);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'dosage' => ['sometimes', 'string', 'max:255'],
            'instructions' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $medication->update($data);

        return response()->json($medication->fresh());
    }

    public function destroy(Request $request, Medication $medication)
    {
        if ($medication->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Not Found'], 404);
        }

        $medication->update(['is_active' => false]);

        return response()->json(['message' => 'Medication deactivated']);
    }
}
