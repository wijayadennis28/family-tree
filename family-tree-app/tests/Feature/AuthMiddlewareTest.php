<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_api_request_returns_401(): void
    {
        $response = $this->getJson('/api/families');

        $response->assertStatus(401);
    }
}
