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
        Schema::create('family_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->string('name');
            $table->string('chinese_name')->nullable();
            $table->enum('gender', ['Male', 'Female', 'Other']);
            $table->date('dob')->nullable();
            $table->date('dod')->nullable();
            $table->string('photo', 255)->nullable();
            $table->text('address')->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('email', 100)->nullable();
            $table->text('biography')->nullable();
            $table->string('place_of_birth', 100)->nullable();
            $table->string('place_of_death', 100)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // Indexes for performance
            $table->index('user_id', 'idx_user_id');
            $table->index('name', 'idx_name');
            $table->index('chinese_name', 'idx_chinese_name');
            $table->index('dob', 'idx_dob');
            $table->index('dod', 'idx_dod');
            $table->index('is_active', 'idx_is_active');
            $table->index(['name', 'is_active'], 'idx_name_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('family_members');
    }
};
