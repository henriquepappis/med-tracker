<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Medication\MedicationController;
use App\Http\Controllers\Schedule\ScheduleController;
use App\Http\Controllers\User\UserProfileController;

Route::get('/health', fn() => response()->json(['status' => 'ok']));

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
});

Route::middleware('auth:sanctum')->prefix('schedules')->group(function () {
    Route::get('/', [ScheduleController::class, 'index']);
    Route::post('/', [ScheduleController::class, 'store']);
    Route::get('/{schedule}', [ScheduleController::class, 'show']);
    Route::put('/{schedule}', [ScheduleController::class, 'update']);
    Route::delete('/{schedule}', [ScheduleController::class, 'destroy']);
});
