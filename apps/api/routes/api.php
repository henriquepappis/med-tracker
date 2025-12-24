<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
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
