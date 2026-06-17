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
        Schema::create('family_member_branches', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('member_id');
            $table->unsignedBigInteger('branch_id');
            $table->foreign('member_id')->references('id')->on('family_members')->onDelete('cascade');
            $table->foreign('branch_id')->references('id')->on('branches')->onDelete('cascade');
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            // Indexes for performance (foreign keys already create indexes, but we keep explicit names)
            $table->index('member_id', 'idx_member_id');
            $table->index('branch_id', 'idx_branch_id');
            // Optional: ensure a member can't be linked to same branch twice
            $table->unique(['member_id', 'branch_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('family_member_branches');
    }
};
