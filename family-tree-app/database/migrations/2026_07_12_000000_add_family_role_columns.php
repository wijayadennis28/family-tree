<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add family-scoped role to the pivot table
        Schema::table('user_branch_access', function (Blueprint $table) {
            $table->enum('role', ['Admin', 'Editor', 'Member', 'Viewer'])
                  ->default('Member')
                  ->after('branch_id');
        });

        // Add primary family reference to users for quick lookup
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('primary_branch_id')
                  ->nullable()
                  ->after('role')
                  ->constrained('branches')
                  ->onDelete('set null');
        });

        // Backfill existing Family Admin users: give them Admin role on their
        // primary branch. If they don't have a user_branch_access row yet,
        // create one using the first branch they have access to, or the first
        // branch in the system as a safe fallback.
        $familyAdmins = DB::table('users')
            ->where('role', 'Family Admin')
            ->whereNull('deleted_at')
            ->get();

        foreach ($familyAdmins as $user) {
            $access = DB::table('user_branch_access')
                ->where('user_id', $user->id)
                ->orderBy('is_primary', 'desc')
                ->orderBy('id')
                ->first();

            if ($access) {
                DB::table('user_branch_access')
                    ->where('id', $access->id)
                    ->update(['role' => 'Admin']);

                DB::table('users')
                    ->where('id', $user->id)
                    ->update(['primary_branch_id' => $access->branch_id]);
            } else {
                $firstBranch = DB::table('branches')
                    ->orderBy('id')
                    ->value('id');

                if ($firstBranch) {
                    DB::table('user_branch_access')->insert([
                        'user_id'   => $user->id,
                        'branch_id' => $firstBranch,
                        'role'      => 'Admin',
                        'is_primary'=> true,
                        'created_at'=> now(),
                        'updated_at'=> now(),
                    ]);

                    DB::table('users')
                        ->where('id', $user->id)
                        ->update(['primary_branch_id' => $firstBranch]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['primary_branch_id']);
            $table->dropColumn('primary_branch_id');
        });

        Schema::table('user_branch_access', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }
};
