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
        // ── 1. Create families table ─────────────────────────────────────
        Schema::create('families', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('created_by', 'idx_families_created_by');
        });

        // ── 2. Add family_id to branches and remove parent_id ────────────
        Schema::table('branches', function (Blueprint $table) {
            $table->foreignId('family_id')->nullable()->after('id')->constrained('families')->onDelete('cascade');
        });

        // ── 3. Add family_id / branch_id directly to family_members ─────
        Schema::table('family_members', function (Blueprint $table) {
            $table->foreignId('family_id')->nullable()->after('id')->constrained('families')->onDelete('set null');
            $table->foreignId('branch_id')->nullable()->after('family_id')->constrained('branches')->onDelete('set null');
        });

        // ── 4. Create user_family_access (drop branch access later) ──────
        Schema::create('user_family_access', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('family_id')->constrained('families')->onDelete('cascade');
            $table->string('role', 50)->default('Viewer');
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->index('user_id', 'idx_ufa_user_id');
            $table->index('family_id', 'idx_ufa_family_id');
            $table->unique(['user_id', 'family_id'], 'ufa_user_family_unique');
        });

        // ── 5. Rename users.primary_branch_id → primary_family_id ────────
        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('primary_branch_id', 'primary_family_id');
        });

        // ── 6. Migrate data ──────────────────────────────────────────────
        $this->migrateData();

        // ── 7. Drop old pivot and self-reference ─────────────────────────
        Schema::dropIfExists('family_member_branches');

        // Drop the parent_id foreign key first so deleting top-level branches
        // does not cascade-delete their children.
        Schema::table('branches', function (Blueprint $table) {
            $table->dropForeign(['parent_id']);
        });

        // Delete the original top-level branches (they are now families).
        DB::table('branches')->whereNull('parent_id')->delete();

        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn('parent_id');
        });

        Schema::dropIfExists('user_branch_access');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Restore self-referencing branches
        Schema::table('branches', function (Blueprint $table) {
            $table->foreignId('parent_id')->nullable()->after('id')->constrained('branches')->onDelete('cascade');
        });

        // Recreate pivot tables (empty)
        Schema::create('family_member_branches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained('family_members')->onDelete('cascade');
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
            $table->unique(['member_id', 'branch_id']);
        });

        Schema::create('user_branch_access', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->string('role', 50)->default('Viewer');
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
            $table->unique(['user_id', 'branch_id']);
        });

        // Drop new columns/tables
        Schema::table('family_members', function (Blueprint $table) {
            $table->dropForeign(['family_id']);
            $table->dropForeign(['branch_id']);
            $table->dropColumn(['family_id', 'branch_id']);
        });

        Schema::dropIfExists('user_family_access');

        // Drop the family_id foreign key from branches before dropping families.
        Schema::table('branches', function (Blueprint $table) {
            $table->dropForeign(['family_id']);
            $table->dropColumn('family_id');
        });

        Schema::dropIfExists('families');

        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('primary_family_id', 'primary_branch_id');
        });
    }

    /**
     * Migrate existing branch-based data to the new family/branch model.
     */
    private function migrateData(): void
    {
        // Map old top-level branch IDs to new family IDs.
        $familyMap = []; // old_branch_id => new_family_id

        $topBranches = DB::table('branches')->whereNull('parent_id')->get();

        foreach ($topBranches as $top) {
            $familyId = DB::table('families')->insertGetId([
                'name' => $top->name,
                'description' => $top->description,
                'created_by' => $top->created_by,
                'is_active' => $top->is_active,
                'created_at' => $top->created_at,
                'updated_at' => $top->updated_at,
            ]);

            $familyMap[$top->id] = $familyId;

            // Update child branches to point to this family.
            DB::table('branches')
                ->where('parent_id', $top->id)
                ->update(['family_id' => $familyId]);
        }

        // Update all branches to have a family_id.
        foreach ($familyMap as $oldBranchId => $familyId) {
            DB::table('branches')
                ->where('id', $oldBranchId)
                ->update(['family_id' => $familyId]);
        }

        // Populate family_members.family_id / branch_id from the pivot.
        $pivotRows = DB::table('family_member_branches')->get();
        foreach ($pivotRows as $row) {
            $branch = DB::table('branches')->where('id', $row->branch_id)->first();
            if (!$branch) {
                continue;
            }

            $familyId = $branch->family_id;

            // Members attached to the original top-level branch now have no specific branch.
            // Members attached to child branches keep their branch_id.
            $branchId = is_null($branch->parent_id) ? null : $row->branch_id;

            DB::table('family_members')
                ->where('id', $row->member_id)
                ->update([
                    'family_id' => $familyId,
                    'branch_id' => $branchId,
                ]);
        }

        // Migrate user_branch_access → user_family_access.
        $accessRows = DB::table('user_branch_access')->get();
        foreach ($accessRows as $row) {
            // If the access row pointed to a top-level branch, map to its family.
            // If it pointed to a child branch, map to the branch's family.
            $branch = DB::table('branches')->where('id', $row->branch_id)->first();
            if (!$branch) {
                continue;
            }

            $familyId = $branch->family_id;
            if (!$familyId) {
                continue;
            }

            // Avoid duplicate (user_id, family_id) rows.
            $existing = DB::table('user_family_access')
                ->where('user_id', $row->user_id)
                ->where('family_id', $familyId)
                ->first();

            if (!$existing) {
                DB::table('user_family_access')->insert([
                    'user_id' => $row->user_id,
                    'family_id' => $familyId,
                    'role' => $row->role,
                    'is_primary' => $row->is_primary,
                    'created_at' => $row->created_at,
                    'updated_at' => $row->updated_at,
                ]);
            }
        }

        // Update users.primary_family_id from old top-level branch IDs.
        $users = DB::table('users')->whereNotNull('primary_family_id')->get();
        foreach ($users as $user) {
            $branch = DB::table('branches')->where('id', $user->primary_family_id)->first();
            if ($branch && $branch->family_id) {
                DB::table('users')
                    ->where('id', $user->id)
                    ->update(['primary_family_id' => $branch->family_id]);
            }
        }
    }
};
