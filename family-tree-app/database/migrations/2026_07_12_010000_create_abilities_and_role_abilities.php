<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('abilities', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->string('label', 100);
            $table->text('description')->nullable();
            $table->string('category', 50)->default('general');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index('category');
        });

        Schema::create('role_abilities', function (Blueprint $table) {
            $table->id();
            $table->enum('role', ['Admin', 'Editor', 'Member', 'Viewer']);
            $table->foreignId('ability_id')->constrained('abilities')->onDelete('cascade');
            $table->boolean('allowed')->default(true);
            $table->timestamps();

            $table->unique(['role', 'ability_id']);
        });

        $this->seedAbilities();
    }

    public function down(): void
    {
        Schema::dropIfExists('role_abilities');
        Schema::dropIfExists('abilities');
    }

    private function seedAbilities(): void
    {
        $abilities = [
            ['name' => 'view_tree', 'label' => 'View Tree', 'description' => 'View the family tree.', 'category' => 'tree', 'sort_order' => 10],
            ['name' => 'edit_tree', 'label' => 'Edit Tree', 'description' => 'Edit the family tree layout and connections.', 'category' => 'tree', 'sort_order' => 20],
            ['name' => 'add_member', 'label' => 'Add Member', 'description' => 'Add new family members.', 'category' => 'members', 'sort_order' => 30],
            ['name' => 'edit_member', 'label' => 'Edit Member', 'description' => 'Edit existing family member details.', 'category' => 'members', 'sort_order' => 40],
            ['name' => 'delete_member', 'label' => 'Delete Member', 'description' => 'Delete or archive family members.', 'category' => 'members', 'sort_order' => 50],
            ['name' => 'manage_relationships', 'label' => 'Manage Relationships', 'description' => 'Add, edit, and remove relationships.', 'category' => 'relationships', 'sort_order' => 60],
            ['name' => 'manage_events', 'label' => 'Manage Events', 'description' => 'Create and manage family events.', 'category' => 'events', 'sort_order' => 70],
            ['name' => 'manage_photos', 'label' => 'Manage Photos', 'description' => 'Upload and manage photos.', 'category' => 'photos', 'sort_order' => 80],
            ['name' => 'manage_galleries', 'label' => 'Manage Galleries', 'description' => 'Create and manage photo galleries.', 'category' => 'photos', 'sort_order' => 90],
            ['name' => 'manage_users_branch_access', 'label' => 'Manage User Branch Access', 'description' => 'Assign users to families and roles.', 'category' => 'administration', 'sort_order' => 100],
            ['name' => 'manage_role_abilities', 'label' => 'Manage Role Abilities', 'description' => 'Configure what each role can do.', 'category' => 'administration', 'sort_order' => 110],
            ['name' => 'manage_branches', 'label' => 'Manage Families', 'description' => 'Create and manage families/branches.', 'category' => 'administration', 'sort_order' => 120],
        ];

        foreach ($abilities as $ability) {
            $id = DB::table('abilities')->insertGetId($ability + ['created_at' => now(), 'updated_at' => now()]);

            $roleDefaults = [
                'Admin' => true,
                'Editor' => in_array($ability['name'], [
                    'view_tree', 'edit_tree', 'add_member', 'edit_member', 'delete_member',
                    'manage_relationships', 'manage_events', 'manage_photos', 'manage_galleries',
                ]),
                'Member' => in_array($ability['name'], ['view_tree', 'manage_events', 'manage_photos']),
                'Viewer' => $ability['name'] === 'view_tree',
            ];

            foreach ($roleDefaults as $role => $allowed) {
                DB::table('role_abilities')->insert([
                    'role' => $role,
                    'ability_id' => $id,
                    'allowed' => $allowed,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }
};
