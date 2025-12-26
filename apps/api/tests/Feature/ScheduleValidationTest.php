<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScheduleValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_daily_schedule_requires_times(): void
    {
        $user = User::factory()->create();
        $medication = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'is_active' => true,
        ]);

        $this->actingAs($user, 'sanctum');

        $response = $this->postJson('/api/schedules', [
            'medication_id' => $medication->id,
            'recurrence_type' => 'daily',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['times']);
    }

    public function test_daily_schedule_rejects_invalid_times(): void
    {
        $user = User::factory()->create();
        $medication = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'is_active' => true,
        ]);

        $this->actingAs($user, 'sanctum');

        $response = $this->postJson('/api/schedules', [
            'medication_id' => $medication->id,
            'recurrence_type' => 'daily',
            'times' => ['8:00', '08:00'],
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['times']);
    }

    public function test_weekly_schedule_requires_weekdays(): void
    {
        $user = User::factory()->create();
        $medication = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'is_active' => true,
        ]);

        $this->actingAs($user, 'sanctum');

        $response = $this->postJson('/api/schedules', [
            'medication_id' => $medication->id,
            'recurrence_type' => 'weekly',
            'times' => ['08:00'],
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['weekdays']);
    }

    public function test_interval_schedule_requires_interval_hours_and_rejects_times(): void
    {
        $user = User::factory()->create();
        $medication = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'is_active' => true,
        ]);

        $this->actingAs($user, 'sanctum');

        $response = $this->postJson('/api/schedules', [
            'medication_id' => $medication->id,
            'recurrence_type' => 'interval',
            'times' => ['08:00'],
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['interval_hours', 'times']);
    }

    public function test_daily_schedule_overlap_is_blocked(): void
    {
        $user = User::factory()->create();
        $medication = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'is_active' => true,
        ]);

        $medication->schedules()->create([
            'recurrence_type' => 'daily',
            'times' => ['08:00'],
            'is_active' => true,
        ]);

        $this->actingAs($user, 'sanctum');

        $response = $this->postJson('/api/schedules', [
            'medication_id' => $medication->id,
            'recurrence_type' => 'daily',
            'times' => ['08:00'],
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['times']);
    }

    public function test_weekly_schedule_overlap_is_blocked(): void
    {
        $user = User::factory()->create();
        $medication = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'is_active' => true,
        ]);

        $medication->schedules()->create([
            'recurrence_type' => 'weekly',
            'times' => ['08:00'],
            'weekdays' => ['mon', 'wed'],
            'is_active' => true,
        ]);

        $this->actingAs($user, 'sanctum');

        $response = $this->postJson('/api/schedules', [
            'medication_id' => $medication->id,
            'recurrence_type' => 'weekly',
            'times' => ['08:00'],
            'weekdays' => ['wed'],
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['weekdays']);
    }

    public function test_update_interval_schedule_requires_interval_hours_and_rejects_times(): void
    {
        $user = User::factory()->create();
        $medication = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'is_active' => true,
        ]);
        $schedule = $medication->schedules()->create([
            'recurrence_type' => 'daily',
            'times' => ['08:00'],
            'is_active' => true,
        ]);

        $this->actingAs($user, 'sanctum');

        $response = $this->putJson(sprintf('/api/schedules/%d', $schedule->id), [
            'recurrence_type' => 'interval',
            'times' => ['08:00'],
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['interval_hours', 'times']);
    }

    public function test_update_schedule_overlap_is_blocked(): void
    {
        $user = User::factory()->create();
        $medication = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'is_active' => true,
        ]);
        $scheduleA = $medication->schedules()->create([
            'recurrence_type' => 'daily',
            'times' => ['08:00'],
            'is_active' => true,
        ]);
        $scheduleB = $medication->schedules()->create([
            'recurrence_type' => 'daily',
            'times' => ['20:00'],
            'is_active' => true,
        ]);

        $this->actingAs($user, 'sanctum');

        $response = $this->putJson(sprintf('/api/schedules/%d', $scheduleB->id), [
            'times' => ['08:00'],
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['times']);
    }

    public function test_inactive_schedule_skips_overlap_check(): void
    {
        $user = User::factory()->create();
        $medication = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'is_active' => true,
        ]);

        $medication->schedules()->create([
            'recurrence_type' => 'daily',
            'times' => ['08:00'],
            'is_active' => true,
        ]);

        $this->actingAs($user, 'sanctum');

        $response = $this->postJson('/api/schedules', [
            'medication_id' => $medication->id,
            'recurrence_type' => 'daily',
            'times' => ['08:00'],
            'is_active' => false,
        ]);

        $response->assertStatus(201);
    }
}
