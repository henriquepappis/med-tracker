<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MedicationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_medication(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum');

        $response = $this->postJson('/api/medications', [
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'instructions' => 'After breakfast',
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'name' => 'Vitamin D',
                'dosage' => '1 pill',
                'is_active' => true,
            ]);

        $this->assertDatabaseHas('medications', [
            'name' => 'Vitamin D',
            'user_id' => $user->id,
        ]);
    }

    public function test_user_cannot_access_another_users_medication(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();

        $medication = $owner->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'instructions' => 'After breakfast',
            'is_active' => true,
        ]);

        $this->actingAs($other, 'sanctum');

        $this->getJson("/api/medications/{$medication->id}")
            ->assertStatus(404);
    }

    public function test_list_excludes_inactive_by_default(): void
    {
        $user = User::factory()->create();

        $active = $user->medications()->create([
            'name' => 'Vitamin D',
            'dosage' => '1 pill',
            'instructions' => 'After breakfast',
            'is_active' => true,
        ]);
        $inactive = $user->medications()->create([
            'name' => 'Vitamin C',
            'dosage' => '1 pill',
            'instructions' => 'After lunch',
            'is_active' => false,
        ]);

        $this->actingAs($user, 'sanctum');

        $this->getJson('/api/medications')
            ->assertStatus(200)
            ->assertJsonFragment(['id' => $active->id])
            ->assertJsonMissing(['id' => $inactive->id]);

        $this->getJson('/api/medications?include_inactive=true')
            ->assertStatus(200)
            ->assertJsonFragment(['id' => $active->id])
            ->assertJsonFragment(['id' => $inactive->id]);
    }
}
