<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Family;
use Illuminate\Http\Request;

class BranchController extends Controller
{
    /**
     * List branches. If family_id is provided, filter to that family.
     * Otherwise, list branches from families the user can access.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $familyId = $request->query('family_id');

        $query = Branch::query();

        if ($familyId) {
            if (!$user->isSuperAdmin() && !$this->canAccessFamily($user, (int) $familyId)) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }
            $query->where('family_id', $familyId);
        } elseif (!$user->isSuperAdmin()) {
            $accessibleFamilyIds = $user->familyAccess()->pluck('family_id')->all();
            $query->whereIn('family_id', $accessibleFamilyIds);
        }

        return response()->json($query->orderBy('name')->get());
    }

    /**
     * Store a newly created branch under a family.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'family_id' => 'required|exists:families,id',
            'name' => 'required|string|max:100',
            'description' => 'nullable|string',
        ], [
            'family_id.required' => 'Please select a family.',
            'family_id.exists'   => 'The selected family does not exist.',
        ]);

        $familyId = (int) $validated['family_id'];

        if (!$user->isSuperAdmin() && !$user->hasAbility($familyId, 'manage_branches')) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $branch = Branch::create([
            'family_id' => $familyId,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'created_by' => $user->id,
            'is_active' => true,
        ]);

        return response()->json($branch, 201);
    }

    /**
     * Display the specified branch.
     */
    public function show(Request $request, string $id)
    {
        $branch = Branch::with('family')->findOrFail($id);

        if (!$this->canAccessFamily($request->user(), (int) $branch->family_id)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json($branch);
    }

    /**
     * Update the specified branch.
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $branch = Branch::findOrFail($id);

        if (!$user->isSuperAdmin() && !$user->hasAbility((int) $branch->family_id, 'edit_branch')) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'description' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $branch->update($validated);

        return response()->json($branch);
    }

    /**
     * Remove the specified branch.
     */
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $branch = Branch::findOrFail($id);

        if (!$user->isSuperAdmin() && !$user->hasAbility((int) $branch->family_id, 'delete_branch')) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        // Prevent deleting the last branch of a family.
        $remaining = Branch::where('family_id', $branch->family_id)->count();
        if ($remaining <= 1) {
            return response()->json(['message' => 'Cannot delete the only branch of a family.'], 422);
        }

        $branch->delete();

        return response()->json(['message' => 'Branch deleted']);
    }
}
