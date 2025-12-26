<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Intake\IntakeController;
use App\Http\Controllers\Medication\MedicationController;
use App\Http\Controllers\Report\AdherenceReportController;
use App\Http\Controllers\Schedule\ScheduleController;
use App\Http\Controllers\User\UserProfileController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));
Route::get('/health/app', fn () => response()->json([
    'status' => 'ok',
    'app' => true,
]));

Route::prefix('auth')->controller(AuthController::class)->group(function () {
    Route::post('/register', 'register');
    Route::post('/login', 'login');
    Route::middleware('auth:sanctum')->post('/logout', 'logout');
});

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('user')->group(function () {
        Route::get('/profile', [UserProfileController::class, 'show']);
        Route::put('/profile', [UserProfileController::class, 'update']);
    });
});

Route::middleware('auth:sanctum')->prefix('medications')->group(function () {
    Route::get('/', [MedicationController::class, 'index']);
    Route::post('/', [MedicationController::class, 'store']);
    Route::get('/{medication}', [MedicationController::class, 'show']);
    Route::put('/{medication}', [MedicationController::class, 'update']);
    Route::delete('/{medication}', [MedicationController::class, 'destroy']);
    Route::get('/{medication}/schedules', [ScheduleController::class, 'indexForMedication']);
});

Route::middleware('auth:sanctum')->prefix('schedules')->group(function () {
    Route::post('/', [ScheduleController::class, 'store']);
    Route::get('/{schedule}', [ScheduleController::class, 'show']);
    Route::put('/{schedule}', [ScheduleController::class, 'update']);
    Route::delete('/{schedule}', [ScheduleController::class, 'destroy']);
});

Route::middleware('auth:sanctum')->prefix('intakes')->group(function () {
    Route::get('/', [IntakeController::class, 'index']);
    Route::post('/', [IntakeController::class, 'store']);
});

Route::middleware('auth:sanctum')->prefix('reports/adherence')->group(function () {
    Route::get('/daily', [AdherenceReportController::class, 'daily']);
    Route::get('/weekly', [AdherenceReportController::class, 'weekly']);
    Route::get('/monthly', [AdherenceReportController::class, 'monthly']);
    Route::get('/', [AdherenceReportController::class, 'summary']);
    Route::get('/medications', [AdherenceReportController::class, 'medicationBreakdown']);
    Route::get('/schedules', [AdherenceReportController::class, 'scheduleBreakdown']);
});

Route::middleware('auth:sanctum')->get('/reports/intake-timeline', [AdherenceReportController::class, 'timeline']);
