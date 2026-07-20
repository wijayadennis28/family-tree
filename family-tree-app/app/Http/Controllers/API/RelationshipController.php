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
            'member1_id' => 'required|exists:family_members,id',
            'member2_id' => 'required|exists:family_members,id|different:member1_id',
            'relationship_type' => 'required|in:Parent,Child,Spouse,Sibling,Grandparent,Grandchild,Uncle/Aunt,Niece/Nephew',
            'member_order' => 'nullable|integer|min:0|max:255',
            'status' => 'nullable|in:Married,Divorced,Separated,Widowed,Annulled',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        if (! $this->canRelateMembers($request->user(), $validated['member1_id'], $validated['member2_id'])) {
            return response()->json(['message' => 'Forbidden. Members must be active and in a shared accessible family.'], 403);
        }

        $validated = $this->canonicalizeRelationship($validated);

        // Prevent duplicate relationships (and 500 DB unique-constraint errors).
        $existing = $this->findExistingRelationship($validated);

        if ($existing) {
            return response()->json([
                'message' => 'The relationship already exists.',
                'relationship' => $existing->load(['member1', 'member2']),
            ], 422);
        }

        // For Parent relationships, keep member_order in sync across all parents of the same child.
        if ($validated['relationship_type'] === 'Parent') {
            $validated = $this->syncParentMemberOrder($validated);
        }

        $rel = Relationship::create($validated);

        return response()->json($rel->load(['member1', 'member2']), 201);
    }

    /** GET /api/relationships/{id} */
    public function show(Request $request, string $id)
    {
        $rel = Relationship::with(['member1', 'member2'])->findOrFail($id);

        if (! $this->canRelateMembers($request->user(), $rel->member1_id, $rel->member2_id)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json($rel);
    }

    /** PUT /api/relationships/{id} */
    public function update(Request $request, string $id)
    {
        $rel = Relationship::findOrFail($id);

        if (! $this->canRelateMembers($request->user(), $rel->member1_id, $rel->member2_id)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate([
            'member_order' => 'nullable|integer|min:0|max:255',
            'status' => 'nullable|in:Married,Divorced,Separated,Widowed,Annulled',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $rel->update($validated);

        // Sync member_order across all Parent relationships for the same child.
        if ($rel->relationship_type === 'Parent' && array_key_exists('member_order', $validated)) {
            Relationship::where('relationship_type', 'Parent')
                ->where('member2_id', $rel->member2_id)
                ->where('id', '!=', $rel->id)
                ->update(['member_order' => $validated['member_order'] ?? 1]);
        }

        return response()->json($rel->load(['member1', 'member2']));
    }

    /** DELETE /api/relationships/{id} */
    public function destroy(Request $request, string $id)
    {
        $rel = Relationship::findOrFail($id);

        if (! $this->canRelateMembers($request->user(), $rel->member1_id, $rel->member2_id)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $rel->delete();

        return response()->json(['message' => 'Relationship deleted']);
    }

    /**
     * Symmetric rows (Spouse, Sibling, etc.) are stored with the smaller id first.
     */
    private function canonicalizeSymmetric(int $a, int $b): array
    {
        return $a <= $b ? [$a, $b] : [$b, $a];
    }

    /**
     * Canonicalize relationship input so directional types are stored with the
     * "senior" member as member1 and symmetric types keep the smaller id first.
     */
    private function canonicalizeRelationship(array $validated): array
    {
        if ($validated['relationship_type'] === 'Child') {
            [$validated['member1_id'], $validated['member2_id']] = [$validated['member2_id'], $validated['member1_id']];
            $validated['relationship_type'] = 'Parent';
        } elseif ($validated['relationship_type'] === 'Grandchild') {
            [$validated['member1_id'], $validated['member2_id']] = [$validated['member2_id'], $validated['member1_id']];
            $validated['relationship_type'] = 'Grandparent';
        } elseif ($validated['relationship_type'] === 'Niece/Nephew') {
            [$validated['member1_id'], $validated['member2_id']] = [$validated['member2_id'], $validated['member1_id']];
            $validated['relationship_type'] = 'Uncle/Aunt';
        } elseif (in_array($validated['relationship_type'], ['Sibling', 'Spouse'], true)) {
            [$validated['member1_id'], $validated['member2_id']] = $this->canonicalizeSymmetric(
                (int) $validated['member1_id'],
                (int) $validated['member2_id']
            );
        }

        return $validated;
    }

    /**
     * Keep member_order in sync for all Parent relationships of the same child.
     * When adding a new parent, inherit the existing child's birth order if available.
     */
    private function syncParentMemberOrder(array $validated): array
    {
        if ($validated['relationship_type'] !== 'Parent') {
            return $validated;
        }

        $childId = (int) $validated['member2_id'];

        if (array_key_exists('member_order', $validated) && $validated['member_order'] !== null) {
            // New parent is being created with an explicit order; sync it to existing parents.
            Relationship::where('relationship_type', 'Parent')
                ->where('member2_id', $childId)
                ->update(['member_order' => $validated['member_order']]);

            return $validated;
        }

        // No order provided; inherit from an existing parent relationship for this child.
        $existingOrder = Relationship::where('relationship_type', 'Parent')
            ->where('member2_id', $childId)
            ->value('member_order');

        if ($existingOrder !== null) {
            $validated['member_order'] = $existingOrder;
        }

        return $validated;
    }

    /**
     * Find an existing relationship that matches the canonicalized input.
     */
    private function findExistingRelationship(array $validated): ?Relationship
    {
        if ($validated['relationship_type'] === 'Spouse') {
            return Relationship::where('relationship_type', 'Spouse')
                ->where(function ($q) use ($validated) {
                    $q->where([
                        ['member1_id', '=', $validated['member1_id']],
                        ['member2_id', '=', $validated['member2_id']],
                    ])->orWhere([
                        ['member1_id', '=', $validated['member2_id']],
                        ['member2_id', '=', $validated['member1_id']],
                    ]);
                })
                ->first();
        }

        return Relationship::where('member1_id', $validated['member1_id'])
            ->where('member2_id', $validated['member2_id'])
            ->where('relationship_type', $validated['relationship_type'])
            ->first();
    }

    /**
     * Check if the user can create/update/delete a relationship between two members.
     * Both members must belong to the same family and the user must have access to it.
     */
    private function canRelateMembers($user, int $member1Id, int $member2Id): bool
    {
        $members = \App\Models\FamilyMember::whereIn('id', [$member1Id, $member2Id])
            ->where('is_active', true)
            ->get()
            ->keyBy('id');

        if (! $members->has($member1Id) || ! $members->has($member2Id)) {
            return false;
        }

        if ($user->isSuperAdmin()) {
            return true;
        }

        $accessibleFamilyIds = $user->familyAccess()->pluck('family_id')->all();

        $family1 = (int) $members[$member1Id]->family_id;
        $family2 = (int) $members[$member2Id]->family_id;

        if ($family1 !== $family2) {
            return false;
        }

        return in_array($family1, $accessibleFamilyIds, true);
    }
}
