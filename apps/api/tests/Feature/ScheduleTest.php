<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScheduleTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_schedule_for_owned_medication(): void
    {
        $user = User::factory()->create();
        $medication = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'instructions' => 'After breakfast',
            'is_active' => true,
        ]);

        $this->actingAs($user, 'sanctum');

        $response = $this->postJson('/api/schedules', [
            'medication_id' => $medication->id,
            'type' => 'daily',
            'payload' => ['times' => ['08:00', '20:00']],
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'medication_id' => $medication->id,
                'type' => 'daily',
                'is_active' => true,
            ]);

        $this->assertDatabaseHas('schedules', [
            'medication_id' => $medication->id,
            'user_id' => $user->id,
            'type' => 'daily',
        ]);
    }

    public function test_user_cannot_access_another_users_schedule(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $medication = $owner->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'instructions' => 'After breakfast',
            'is_active' => true,
        ]);
        $schedule = $owner->schedules()->create([
            'medication_id' => $medication->id,
            'type' => 'daily',
            'payload' => ['times' => ['08:00']],
            'is_active' => true,
        ]);

        $this->actingAs($other, 'sanctum');

        $this->getJson("/api/schedules/{$schedule->id}")
            ->assertStatus(404);
    }

    public function test_list_excludes_inactive_by_default(): void
    {
        $user = User::factory()->create();
        $medication = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'instructions' => 'After breakfast',
            'is_active' => true,
        ]);

        $active = $user->schedules()->create([
            'medication_id' => $medication->id,
            'type' => 'daily',
            'payload' => ['times' => ['08:00']],
            'is_active' => true,
        ]);
        $inactive = $user->schedules()->create([
            'medication_id' => $medication->id,
            'type' => 'daily',
            'payload' => ['times' => ['20:00']],
            'is_active' => false,
        ]);

        $this->actingAs($user, 'sanctum');

        $this->getJson('/api/schedules')
            ->assertStatus(200)
            ->assertJsonFragment(['id' => $active->id])
            ->assertJsonMissing(['id' => $inactive->id]);

        $this->getJson('/api/schedules?include_inactive=true')
            ->assertStatus(200)
            ->assertJsonFragment(['id' => $active->id])
            ->assertJsonFragment(['id' => $inactive->id]);
    }
}
