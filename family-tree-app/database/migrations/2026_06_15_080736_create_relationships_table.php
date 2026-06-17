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
        Schema::create('relationships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member1_id')->constrained('family_members')->onDelete('cascade');
            $table->foreignId('member2_id')->constrained('family_members')->onDelete('cascade');
            $table->enum('relationship_type', ['Parent', 'Child', 'Spouse', 'Sibling', 'Grandparent', 'Grandchild', 'Uncle/Aunt', 'Niece/Nephew']);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            // Indexes for performance
            $table->index('member1_id', 'idx_member1_id');
            $table->index('member2_id', 'idx_member2_id');
            $table->index('relationship_type', 'idx_relationship_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('relationships');
    }
};
