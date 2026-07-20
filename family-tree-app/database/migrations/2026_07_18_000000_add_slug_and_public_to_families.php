<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('families', function (Blueprint $table) {
            $table->string('slug', 150)->nullable()->after('name');
            $table->boolean('is_public')->default(false)->after('is_active');
        });

        // Generate slugs for existing families and make them public by default.
        $families = DB::table('families')->get();
        foreach ($families as $family) {
            $slug = $this->uniqueSlug($family->name, $family->id);
            DB::table('families')
                ->where('id', $family->id)
                ->update(['slug' => $slug, 'is_public' => true]);
        }

        Schema::table('families', function (Blueprint $table) {
            $table->unique('slug', 'families_slug_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('families', function (Blueprint $table) {
            $table->dropUnique('families_slug_unique');
            $table->dropColumn(['slug', 'is_public']);
        });
    }

    /**
     * Generate a unique URL slug for a family.
     */
    private function uniqueSlug(string $name, int $id): string
    {
        $base = Str::slug($name);
        $slug = $base ?: 'family';
        return "{$slug}-{$id}";
    }
};
