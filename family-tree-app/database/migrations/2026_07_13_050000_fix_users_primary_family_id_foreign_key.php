<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Nullify any primary_family_id values that don't exist in families.
        DB::statement('UPDATE users u LEFT JOIN families f ON u.primary_family_id = f.id SET u.primary_family_id = NULL WHERE f.id IS NULL');

        Schema::table('users', function (Blueprint $table) {
            // Drop the old foreign key that still references branches(id).
            $table->dropForeign('users_primary_branch_id_foreign');

            // Add the correct foreign key referencing families(id).
            $table->foreign('primary_family_id', 'users_primary_family_id_foreign')
                ->references('id')
                ->on('families')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign('users_primary_family_id_foreign');

            $table->foreign('primary_family_id', 'users_primary_branch_id_foreign')
                ->references('id')
                ->on('branches')
                ->onDelete('set null');
        });
    }
};
