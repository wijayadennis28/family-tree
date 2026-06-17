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
        Schema::create('user_branch_access', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            // Indexes for performance
            $table->index('user_id', 'idx_user_id');
            $table->index('branch_id', 'idx_branch_id');
            // Ensure a user can't be linked to same branch twice
            $table->unique(['user_id', 'branch_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_branch_access');
    }
};
