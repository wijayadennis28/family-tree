<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ponytail: Parent/Child writes are directionless after canonical
     * resolution (M1=parent, M2=child for type=Parent). The composite
     * unique index makes (member1_id, member2_id, relationship_type)
     * idempotent at the DB layer — a defense-in-depth against duplicate
     * rows from any caller (canvas rapid-double-click, retry on network
     * blip, modal remount under StrictMode, future API consumers).
     *
     * Spouse is intentionally excluded: it has its own application-level
     * canonicalization (smaller-id-first) and the (M1, M2, type) triple
     * is not its identity key.
     */
    public function up(): void
    {
        Schema::table('relationships', function (Blueprint $table) {
            $table->unique(
                ['member1_id', 'member2_id', 'relationship_type'],
                'uniq_parent_child_pair'
            );
        });
    }

    public function down(): void
    {
        Schema::table('relationships', function (Blueprint $table) {
            $table->dropUnique('uniq_parent_child_pair');
        });
    }
};
