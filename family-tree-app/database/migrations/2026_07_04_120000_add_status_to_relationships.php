<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adds a `status` enum to the relationships table so spouse edges can
     * carry their legal state (Married / Divorced / Separated / Widowed /
     * Annulled). Nullable — existing rows stay "unspecified".
     */
    public function up(): void
    {
        Schema::table('relationships', function (Blueprint $table) {
            $table->enum('status', ['Married', 'Divorced', 'Separated', 'Widowed', 'Annulled'])
                ->nullable()
                ->after('relationship_type');
        });
    }

    public function down(): void
    {
        Schema::table('relationships', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
