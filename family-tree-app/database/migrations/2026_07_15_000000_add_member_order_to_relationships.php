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
        Schema::table('relationships', function (Blueprint $table) {
            $table->tinyInteger('member_order')->default(1)->after('relationship_type');
            $table->index('member_order', 'idx_member_order');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('relationships', function (Blueprint $table) {
            $table->dropIndex('idx_member_order');
            $table->dropColumn('member_order');
        });
    }
};
