<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_requires_authentication(): void
    {
        $this->getJson('/api/user/profile')
            ->assertStatus(401);
    }

    public function test_user_can_view_profile(): void
    {
        $user = User::factory()->create([
            'timezone' => 'UTC',
            'language' => 'en',
        ]);

        $this->actingAs($user, 'sanctum');

        $this->getJson('/api/user/profile')
            ->assertStatus(200)
            ->assertJsonFragment([
                'id' => $user->id,
                'timezone' => 'UTC',
                'language' => 'en',
            ]);
    }

    public function test_user_can_update_profile(): void
    {
        $user = User::factory()->create([
            'timezone' => 'UTC',
            'language' => 'en',
        ]);

        $this->actingAs($user, 'sanctum');

        $this->putJson('/api/user/profile', [
            'timezone' => 'America/Sao_Paulo',
            'language' => 'pt-BR',
        ])->assertStatus(200)
            ->assertJsonFragment([
                'timezone' => 'America/Sao_Paulo',
                'language' => 'pt-BR',
            ]);
    }

    public function test_profile_rejects_invalid_language(): void
    {
        $user = User::factory()->create([
            'timezone' => 'UTC',
            'language' => 'en',
        ]);

        $this->actingAs($user, 'sanctum');

        $this->putJson('/api/user/profile', [
            'timezone' => 'UTC',
            'language' => 'fr',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['language']);
    }
}
