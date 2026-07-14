<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('family_members', function (Blueprint $table) {
            if (!$this->indexExists('family_members', 'idx_family_members_family_id')) {
                $table->index('family_id', 'idx_family_members_family_id');
            }
            if (!$this->indexExists('family_members', 'idx_family_members_branch_id')) {
                $table->index('branch_id', 'idx_family_members_branch_id');
            }
            if (!$this->indexExists('family_members', 'idx_family_members_family_active')) {
                $table->index(['family_id', 'is_active'], 'idx_family_members_family_active');
            }
        });

        Schema::table('branches', function (Blueprint $table) {
            if (!$this->indexExists('branches', 'idx_branches_family_id')) {
                $table->index('family_id', 'idx_branches_family_id');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (!$this->indexExists('users', 'idx_users_primary_family_id')) {
                $table->index('primary_family_id', 'idx_users_primary_family_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('family_members', function (Blueprint $table) {
            $table->dropIndex('idx_family_members_family_id');
            $table->dropIndex('idx_family_members_branch_id');
            $table->dropIndex('idx_family_members_family_active');
        });

        Schema::table('branches', function (Blueprint $table) {
            $table->dropIndex('idx_branches_family_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('idx_users_primary_family_id');
        });
    }

    /**
     * Check if an index exists on a table.
     */
    private function indexExists(string $table, string $index): bool
    {
        return \Illuminate\Support\Facades\Schema::hasIndex($table, $index);
    }
};
