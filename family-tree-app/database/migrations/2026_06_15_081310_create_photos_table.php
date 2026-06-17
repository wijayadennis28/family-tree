<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('photos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('gallery_id')->nullable();
            $table->unsignedBigInteger('member_id')->nullable();
            $table->unsignedBigInteger('event_id')->nullable();
            $table->string('photo_path', 255);
            $table->text('caption')->nullable();
            $table->timestamp('upload_date')->default(DB::raw('CURRENT_TIMESTAMP'));
            $table->unsignedBigInteger('uploaded_by');

            // Foreign key constraints
            $table->foreign('gallery_id')->references('id')->on('photo_galleries')->onDelete('set null');
            $table->foreign('member_id')->references('id')->on('family_members')->onDelete('set null');
            $table->foreign('event_id')->references('id')->on('events')->onDelete('set null');
            $table->foreign('uploaded_by')->references('id')->on('users')->onDelete('cascade');

            $table->timestamps();

            // Indexes for performance
            $table->index('gallery_id', 'idx_gallery_id');
            $table->index('member_id', 'idx_member_id');
            $table->index('event_id', 'idx_event_id');
            $table->index('uploaded_by', 'idx_uploaded_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('photos');
    }
};
