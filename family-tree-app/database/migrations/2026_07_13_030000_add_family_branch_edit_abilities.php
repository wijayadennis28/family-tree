<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $abilities = [
            ['name' => 'edit_family', 'label' => 'Edit Family', 'description' => 'Edit family name and description.', 'category' => 'administration', 'sort_order' => 121],
            ['name' => 'delete_family', 'label' => 'Delete Family', 'description' => 'Delete a family and its associated data.', 'category' => 'administration', 'sort_order' => 122],
            ['name' => 'edit_branch', 'label' => 'Edit Branch', 'description' => 'Edit branch name and description.', 'category' => 'administration', 'sort_order' => 123],
            ['name' => 'delete_branch', 'label' => 'Delete Branch', 'description' => 'Delete a branch.', 'category' => 'administration', 'sort_order' => 124],
        ];

        foreach ($abilities as $ability) {
            $exists = DB::table('abilities')->where('name', $ability['name'])->first();
            if ($exists) {
                continue;
            }

            $id = DB::table('abilities')->insertGetId($ability + [
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $roleDefaults = [
                'Admin' => true,
                'Editor' => in_array($ability['name'], ['edit_family', 'edit_branch', 'delete_branch']),
                'Member' => false,
                'Viewer' => false,
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

    public function down(): void
    {
        $names = ['edit_family', 'delete_family', 'edit_branch', 'delete_branch'];
        DB::table('abilities')->whereIn('name', $names)->delete();
    }
};
