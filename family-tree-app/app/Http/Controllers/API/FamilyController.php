<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Family;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FamilyController extends Controller
{
    /**
     * List families the current user can access.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->isSuperAdmin()) {
            return response()->json(
                Family::with('branches')
                    ->withCount('members')
                    ->orderBy('name')
                    ->get()
            );
        }

        $familyIds = $user->familyAccess()->pluck('family_id');

        return response()->json(
            Family::whereIn('id', $familyIds)
                ->with('branches')
                ->withCount('members')
                ->orderBy('name')
                ->get()
        );
    }

    /**
     * Store a newly created family.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string',
        ]);

        // Permission rules:
        // - Super Admins can always create families.
        // - Users without a primary family are in onboarding: allow them to create their first family.
        // - Otherwise, require manage_branches on their current primary family.
        if (!$user->isSuperAdmin()) {
            if ($user->primary_family_id) {
                if (!$user->hasAbility((int) $user->primary_family_id, 'manage_branches')) {
                    return response()->json(['message' => 'Forbidden.'], 403);
                }
            }
            // No primary family -> onboarding, allow creation.
        }

        $family = DB::transaction(function () use ($validated, $user) {
            $family = Family::create([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'created_by' => $user->id,
                'is_active' => true,
            ]);

            // Grant the creator admin access to the new family.
            \App\Models\UserFamilyAccess::firstOrCreate(
                ['user_id' => $user->id, 'family_id' => $family->id],
                ['role' => 'Admin', 'is_primary' => true]
            );

            // If the user has no primary family yet, set this as their primary.
            if (!$user->primary_family_id) {
                $user->update(['primary_family_id' => $family->id]);
            }

            return $family->load('branches');
        });

        return response()->json($family, 201);
    }

    /**
     * Display the specified family.
     */
    public function show(Request $request, string $id)
    {
        $family = Family::with('branches')->findOrFail($id);

        if (!$this->canAccessFamily($request->user(), (int) $family->id)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json($family);
    }

    /**
     * Update the specified family.
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $family = Family::findOrFail($id);

        if (!$user->isSuperAdmin() && !$user->hasAbility((int) $family->id, 'edit_family')) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'description' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $family->update($validated);

        return response()->json($family);
    }

    /**
     * Remove the specified family.
     */
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $family = Family::findOrFail($id);

        if (!$user->isSuperAdmin() && !$user->hasAbility((int) $family->id, 'delete_family')) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $family->delete();

        return response()->json(['message' => 'Family deleted']);
    }

    /**
     * GET /api/families/{id}/branch-tree
     * Returns the family and its branches formatted for a React Flow canvas.
     */
    public function branchTree(Request $request, string $id)
    {
        $user = $request->user();
        $family = Family::withCount('members')->findOrFail($id);

        if (!$user->isSuperAdmin() && !$this->canAccessFamily($user, (int) $family->id)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $branches = Branch::where('family_id', $family->id)
            ->withCount('members')
            ->orderBy('name')
            ->get();

        return response()->json([
            'family' => [
                'id' => $family->id,
                'name' => $family->name,
                'description' => $family->description,
                'members_count' => $family->members_count,
            ],
            'branches' => $branches->map(fn ($branch) => [
                'id' => $branch->id,
                'name' => $branch->name,
                'description' => $branch->description,
                'members_count' => $branch->members_count,
            ])->values(),
        ]);
    }

    /**
     * Check if the user can access a specific family.
     */
    private function canAccessFamily($user, int $familyId): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        $accessibleFamilyIds = $user->familyAccess()->pluck('family_id')->all();

        return in_array($familyId, $accessibleFamilyIds, true);
    }
}
