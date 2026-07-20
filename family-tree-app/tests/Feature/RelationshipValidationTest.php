<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use App\Models\Family;
use App\Models\FamilyMember;
use App\Models\Relationship;
use App\Models\User;

class RelationshipValidationTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsSuperAdmin(): User
    {
        $user = User::factory()->create(['role' => 'Super Admin']);
        Sanctum::actingAs($user);

        return $user;
    }

    public function test_child_relationship_is_canonicalized_to_parent(): void
    {
        $user = $this->actingAsSuperAdmin();
        $family = Family::create(['name' => 'Test Family', 'created_by' => $user->id, 'is_active' => true]);
        $parent = FamilyMember::create(['name' => 'Parent', 'gender' => 'Male', 'family_id' => $family->id]);
        $child = FamilyMember::create(['name' => 'Child', 'gender' => 'Female', 'family_id' => $family->id]);

        $response = $this->postJson('/api/relationships', [
            'member1_id' => $parent->id,
            'member2_id' => $child->id,
            'relationship_type' => 'Child',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('relationships', [
            'member1_id' => $child->id,
            'member2_id' => $parent->id,
            'relationship_type' => 'Parent',
        ]);
    }

    public function test_duplicate_non_spouse_relationship_returns_422_with_existing(): void
    {
        $user = $this->actingAsSuperAdmin();
        $family = Family::create(['name' => 'Test Family', 'created_by' => $user->id, 'is_active' => true]);
        $parent = FamilyMember::create(['name' => 'Parent', 'gender' => 'Male', 'family_id' => $family->id]);
        $child = FamilyMember::create(['name' => 'Child', 'gender' => 'Female', 'family_id' => $family->id]);

        Relationship::create([
            'member1_id' => $child->id,
            'member2_id' => $parent->id,
            'relationship_type' => 'Parent',
        ]);

        $response = $this->postJson('/api/relationships', [
            'member1_id' => $parent->id,
            'member2_id' => $child->id,
            'relationship_type' => 'Child',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'The relationship already exists.')
            ->assertJsonPath('relationship.relationship_type', 'Parent');
    }

    public function test_archived_member_cannot_be_related(): void
    {
        $user = $this->actingAsSuperAdmin();
        $family = Family::create(['name' => 'Test Family', 'created_by' => $user->id, 'is_active' => true]);
        $active = FamilyMember::create(['name' => 'Active', 'gender' => 'Male', 'family_id' => $family->id]);
        $archived = FamilyMember::create(['name' => 'Archived', 'gender' => 'Female', 'family_id' => $family->id, 'is_active' => false]);

        $response = $this->postJson('/api/relationships', [
            'member1_id' => $active->id,
            'member2_id' => $archived->id,
            'relationship_type' => 'Sibling',
        ]);

        $response->assertStatus(403);
    }
}
