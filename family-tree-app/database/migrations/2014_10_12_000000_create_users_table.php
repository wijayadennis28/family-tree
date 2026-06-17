<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('email', 100)->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->enum('role', ['Super Admin', 'Family Admin', 'Family Member', 'Viewer'])->default('Family Member');
            $table->rememberToken();
            $table->boolean('is_active')->default(true);
            $table->softDeletes();
            $table->timestamps();

            $table->index('role', 'idx_role');
            $table->index('is_active', 'idx_is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
