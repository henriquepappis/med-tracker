<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_returns_token(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'password' => 'secret123',
        ]);

        $response->assertStatus(201)->assertJsonStructure(['token']);
        $this->assertDatabaseHas('users', ['email' => 'jane@example.com']);
    }

    public function test_login_rejects_invalid_credentials(): void
    {
        User::factory()->create([
            'email' => 'jane@example.com',
            'password' => Hash::make('secret123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'jane@example.com',
            'password' => 'wrong',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    public function test_login_returns_token(): void
    {
        User::factory()->create([
            'email' => 'jane@example.com',
            'password' => Hash::make('secret123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'jane@example.com',
            'password' => 'secret123',
        ]);

        $response->assertStatus(200)->assertJsonStructure(['token']);
    }

    public function test_logout_revokes_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('api')->plainTextToken;

        $response = $this->postJson('/api/auth/logout', [], [
            'Authorization' => sprintf('Bearer %s', $token),
        ]);

        $response->assertStatus(200)->assertJsonFragment(['message' => 'Logged out']);
        $this->assertSame(0, $user->tokens()->count());
    }
}
