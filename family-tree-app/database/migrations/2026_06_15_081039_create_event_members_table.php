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
        Schema::create('event_members', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('event_id');
            $table->unsignedBigInteger('member_id');
            $table->foreign('event_id')->references('id')->on('events')->onDelete('cascade');
            $table->foreign('member_id')->references('id')->on('family_members')->onDelete('cascade');
            $table->enum('role', ['Participant', 'Host', 'Witness'])->default('Participant');
            $table->timestamps();

            // Indexes for performance
            $table->index('event_id', 'idx_event_id');
            $table->index('member_id', 'idx_member_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('event_members');
    }
};
