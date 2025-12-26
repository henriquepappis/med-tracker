<?php

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->renderable(function (ValidationException $exception): JsonResponse {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => $exception->errors(),
            ], 422);
        });

        $exceptions->renderable(function (AuthenticationException $exception): JsonResponse {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        });

        $exceptions->renderable(function (AuthorizationException $exception): JsonResponse {
            return response()->json([
                'message' => 'Not Found.',
            ], 404);
        });

        $exceptions->renderable(function (ModelNotFoundException $exception): JsonResponse {
            return response()->json([
                'message' => 'Not Found.',
            ], 404);
        });

        $exceptions->renderable(function (HttpExceptionInterface $exception): JsonResponse {
            $status = $exception->getStatusCode();
            $message = $exception->getMessage() ?: (SymfonyResponse::$statusTexts[$status] ?? 'Error');

            return response()->json([
                'message' => $message,
            ], $status);
        });

        $exceptions->renderable(function (\Throwable $exception): JsonResponse {
            return response()->json([
                'message' => 'Server Error.',
            ], 500);
        });
    })->create();
