<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Relationship;
use Illuminate\Http\Request;

class RelationshipController extends Controller
{
    /** GET /api/relationships */
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->isSuperAdmin()) {
            return response()->json(
                Relationship::with(['member1', 'member2'])->get()
            );
        }

        $accessibleFamilyIds = $user->familyAccess()->pluck('family_id')->all();

        $relationships = Relationship::with(['member1', 'member2'])
            ->whereHas('member1', function ($q) use ($accessibleFamilyIds) {
                $q->whereIn('family_id', $accessibleFamilyIds);
            })
            ->get();

        return response()->json($relationships);
    }

    /** POST /api/relationships */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'member1_id'        => 'required|exists:family_members,id',
            'member2_id'        => 'required|exists:family_members,id|different:member1_id',
            'relationship_type' => 'required|in:Parent,Child,Spouse,Sibling,Grandparent,Grandchild,Uncle/Aunt,Niece/Nephew',
            'status'            => 'nullable|in:Married,Divorced,Separated,Widowed,Annulled',
            'start_date'        => 'nullable|date',
            'end_date'          => 'nullable|date',
            'notes'             => 'nullable|string',
        ]);

        if (!$this->canRelateMembers($request->user(), $validated['member1_id'], $validated['member2_id'])) {
            return response()->json(['message' => 'Forbidden. Members must be in a shared accessible family.'], 403);
        }

        $rel = Relationship::create($validated);

        return response()->json($rel->load(['member1', 'member2']), 201);
    }

    /** GET /api/relationships/{id} */
    public function show(Request $request, string $id)
    {
        $rel = Relationship::with(['member1', 'member2'])->findOrFail($id);

        if (!$this->canRelateMembers($request->user(), $rel->member1_id, $rel->member2_id)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json($rel);
    }

    /** PUT /api/relationships/{id} */
    public function update(Request $request, string $id)
    {
        $rel = Relationship::findOrFail($id);

        if (!$this->canRelateMembers($request->user(), $rel->member1_id, $rel->member2_id)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate([
            'relationship_type' => 'sometimes|in:Parent,Child,Spouse,Sibling,Grandparent,Grandchild,Uncle/Aunt,Niece/Nephew',
            'status'            => 'nullable|in:Married,Divorced,Separated,Widowed,Annulled',
            'start_date'        => 'nullable|date',
            'end_date'          => 'nullable|date',
            'notes'             => 'nullable|string',
        ]);

        $rel->update($validated);

        return response()->json($rel->load(['member1', 'member2']));
    }

    /** DELETE /api/relationships/{id} */
    public function destroy(Request $request, string $id)
    {
        $rel = Relationship::findOrFail($id);

        if (!$this->canRelateMembers($request->user(), $rel->member1_id, $rel->member2_id)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $rel->delete();

        return response()->json(['message' => 'Relationship deleted']);
    }

    /**
     * Check if the user can create/update/delete a relationship between two members.
     * Both members must belong to the same family and the user must have access to it.
     */
    private function canRelateMembers($user, int $member1Id, int $member2Id): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        $accessibleFamilyIds = $user->familyAccess()->pluck('family_id')->all();

        $members = \App\Models\FamilyMember::whereIn('id', [$member1Id, $member2Id])
            ->get()
            ->keyBy('id');

        if (!$members->has($member1Id) || !$members->has($member2Id)) {
            return false;
        }

        $family1 = (int) $members[$member1Id]->family_id;
        $family2 = (int) $members[$member2Id]->family_id;

        if ($family1 !== $family2) {
            return false;
        }

        return in_array($family1, $accessibleFamilyIds, true);
    }
}
