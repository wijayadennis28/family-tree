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
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('title', 200);
            $table->text('description')->nullable();
            $table->date('event_date');
            $table->enum('event_type', ['Birth', 'Death', 'Marriage', 'Anniversary', 'Other']);
            $table->string('location', 200)->nullable();
            $table->boolean('is_public')->default(true);
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            // Indexes for performance
            $table->index('created_by', 'idx_created_by');
            $table->index('event_date', 'idx_event_date');
            $table->index('is_public', 'idx_is_public');
            $table->index('event_type', 'idx_event_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
