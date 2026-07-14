<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use App\Models\Branch;
use App\Models\FamilyMember;

return new class extends Migration
{
    /**
     * Run the migration.
     */
    public function up(): void
    {
        $firstBranch = Branch::orderBy('id')->first();

        if (!$firstBranch) {
            return;
        }

        FamilyMember::whereDoesntHave('branches')
            ->get()
            ->each(function ($member) use ($firstBranch) {
                $member->branches()->attach($firstBranch->id, ['is_primary' => true]);
            });
    }

    /**
     * Reverse the migration.
     */
    public function down(): void
    {
        $firstBranch = Branch::orderBy('id')->first();

        if (!$firstBranch) {
            return;
        }

        DB::table('family_member_branches')
            ->where('branch_id', $firstBranch->id)
            ->delete();
    }
};
