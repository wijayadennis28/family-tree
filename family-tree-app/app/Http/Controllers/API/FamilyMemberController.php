<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\FamilyMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FamilyMemberController extends Controller
{
    /** GET /api/members — list active members scoped to accessible families */
    public function index(Request $request)
    {
        $user = $request->user();
        $familyId = $request->query('family_id');
        $branchId = $request->query('branch_id');

        $query = FamilyMember::query()
            ->leftJoin('families', 'families.id', '=', 'family_members.family_id');

        // Search by name, chinese name, or family name
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('family_members.name', 'like', "%{$search}%")
                  ->orWhere('family_members.chinese_name', 'like', "%{$search}%")
                  ->orWhere('families.name', 'like', "%{$search}%");
            });
        }

        // Filter by gender
        if ($gender = $request->query('gender')) {
            $query->where('gender', $gender);
        }

        // Filter living/deceased
        if ($request->query('living') === 'true') {
            $query->whereNull('dod');
        } elseif ($request->query('living') === 'false') {
            $query->whereNotNull('dod');
        }

        $query = $this->scopeToAccessibleFamilies($query, $user, $familyId, $branchId);

        $members = $query->where('family_members.is_active', true)
            ->orderBy('family_members.name')
            ->select('family_members.*')
            ->get();

        return response()->json($members);
    }

    /** POST /api/members — create and attach to a family/branch */
    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'           => 'required|string|max:100',
            'chinese_name'   => 'nullable|string|max:100',
            'gender'         => 'required|in:Male,Female,Other',
            'dob'            => 'nullable|date',
            'dod'            => 'nullable|date|after_or_equal:dob',
            'address'        => 'nullable|string',
            'phone'          => 'nullable|string|max:20',
            'email'          => 'nullable|email|max:100',
            'biography'      => 'nullable|string',
            'place_of_birth' => 'nullable|string|max:100',
            'place_of_death' => 'nullable|string|max:100',
            'family_id'      => 'required|exists:families,id',
            'branch_id'      => 'nullable|exists:branches,id',
        ], [
            'family_id.required' => 'Please select a family.',
            'family_id.exists'   => 'The selected family does not exist.',
        ]);

        $familyId = (int) $validated['family_id'];
        $branchId = !empty($validated['branch_id']) ? (int) $validated['branch_id'] : null;

        if (!$this->canAccessFamily($user, $familyId)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if (!$user->isSuperAdmin() && !$user->hasAbility($familyId, 'add_member')) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        // Ensure branch belongs to the family (branch is optional).
        if ($branchId) {
            $branch = Branch::where('id', $branchId)->where('family_id', $familyId)->first();
            if (!$branch) {
                return response()->json(['message' => 'Branch does not belong to the selected family.'], 422);
            }
        }

        // Handle photo upload
        if ($request->hasFile('photo')) {
            $request->validate(['photo' => 'image|max:2048']);
            $validated['photo'] = $request->file('photo')->store('member-photos', 'public');
        }

        $member = FamilyMember::create([
            ...$validated,
            'family_id' => $familyId,
            'branch_id' => $branchId,
        ]);

        return response()->json($member->load(['family', 'branch']), 201);
    }

    /** GET /api/members/{id} */
    public function show(Request $request, string $id)
    {
        $member = FamilyMember::with(['family', 'branch'])->findOrFail($id);

        if (!$this->canAccessMember($request->user(), $member)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json($member);
    }

    /** PUT /api/members/{id} — update */
    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $member = FamilyMember::findOrFail($id);

        if (!$this->canAccessMember($user, $member)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if (!$user->isSuperAdmin() && !$user->hasAbility((int) $member->family_id, 'edit_member')) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate([
            'name'           => 'sometimes|string|max:100',
            'chinese_name'   => 'nullable|string|max:100',
            'gender'         => 'sometimes|in:Male,Female,Other',
            'dob'            => 'nullable|date',
            'dod'            => 'nullable|date',
            'address'        => 'nullable|string',
            'phone'          => 'nullable|string|max:20',
            'email'          => 'nullable|email|max:100',
            'biography'      => 'nullable|string',
            'place_of_birth' => 'nullable|string|max:100',
            'place_of_death' => 'nullable|string|max:100',
            'is_active'      => 'sometimes|boolean',
            'family_id'      => 'nullable|exists:families,id',
            'branch_id'      => 'nullable|exists:branches,id',
        ]);

        // Handle photo upload (replace old)
        if ($request->hasFile('photo')) {
            $request->validate(['photo' => 'image|max:2048']);
            if ($member->photo) {
                Storage::disk('public')->delete($member->photo);
            }
            $validated['photo'] = $request->file('photo')->store('member-photos', 'public');
        }

        $familyId = !empty($validated['family_id']) ? (int) $validated['family_id'] : null;
        $branchId = array_key_exists('branch_id', $validated)
            ? (!empty($validated['branch_id']) ? (int) $validated['branch_id'] : null)
            : null;

        // Validate family/branch consistency.
        if ($familyId || array_key_exists('branch_id', $validated)) {
            $familyId = $familyId ?? $member->family_id;
            $branchId = array_key_exists('branch_id', $validated) ? $branchId : $member->branch_id;

            if (!$familyId) {
                return response()->json(['message' => 'Family is required.'], 422);
            }

            if (!$this->canAccessFamily($user, $familyId)) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }

            if ($branchId) {
                $branch = Branch::where('id', $branchId)->where('family_id', $familyId)->first();
                if (!$branch) {
                    return response()->json(['message' => 'Branch does not belong to the selected family.'], 422);
                }
            }

            $validated['family_id'] = $familyId;
            $validated['branch_id'] = $branchId;
        }

        $member->update($validated);

        return response()->json($member->load(['family', 'branch']));
    }

    /** DELETE /api/members/{id} — soft-delete */
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $member = FamilyMember::findOrFail($id);

        if (!$this->canAccessMember($user, $member)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if (!$user->isSuperAdmin() && !$user->hasAbility((int) $member->family_id, 'delete_member')) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $member->update(['is_active' => false]);

        return response()->json(['message' => 'Member archived successfully']);
    }

    /** GET /api/members/{id}/relationships */
    public function relationships(Request $request, string $id)
    {
        $member = FamilyMember::findOrFail($id);

        if (!$this->canAccessMember($request->user(), $member)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $relationships = $member->relationshipsAsMember1()
            ->with('member2')
            ->get()
            ->merge(
                $member->relationshipsAsMember2()->with('member1')->get()
            );

        return response()->json($relationships);
    }

    /**
     * POST /api/members/{id}/relationships
     *
     * Directional Parent/Child writes must declare parent_id + child_id; server
     * stores the row canonically (type=Parent → M1=parent, type=Child → M1=child).
     * Other types are directionless and use member2_id.
     */
    public function attachRelationship(Request $request, string $id)
    {
        $user = $request->user();
        $member = FamilyMember::findOrFail($id);

        if (!$this->canAccessMember($user, $member)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate([
            'member2_id'        => 'nullable|exists:family_members,id',
            'parent_id'         => 'nullable|exists:family_members,id',
            'child_id'          => 'nullable|exists:family_members,id',
            'relationship_type' => 'required|in:Parent,Child,Spouse,Sibling,Grandparent,Grandchild,Uncle/Aunt,Niece/Nephew',
            'status'            => 'nullable|in:Married,Divorced,Separated,Widowed,Annulled',
            'start_date'        => 'nullable|date',
            'end_date'          => 'nullable|date',
            'notes'             => 'nullable|string',
        ]);

        // non-directional types (Spouse, Sibling, etc.) still need member2_id
        if (!in_array($validated['relationship_type'], ['Parent', 'Child'], true)
            && empty($validated['member2_id'])
        ) {
            return response()->json([
                'message' => 'member2_id is required for ' . $validated['relationship_type'] . ' relationships.',
            ], 422);
        }

        $member1Id = $id;

        // Directional Parent/Child writes. Strict — client must declare
        // who-is-who via parent_id + child_id, else 422.
        if (in_array($validated['relationship_type'], ['Parent', 'Child'], true)) {
            if (empty($validated['parent_id']) || empty($validated['child_id'])) {
                return response()->json([
                    'message' => 'Parent/Child writes require parent_id and child_id.',
                ], 422);
            }
            $parentId = (int) $validated['parent_id'];
            $childId  = (int) $validated['child_id'];
            if ($parentId === $childId) {
                return response()->json(['message' => 'parent_id and child_id must differ.'], 422);
            }
            // type=Parent → M1 = parent, M2 = child. type=Child → M1 = child, M2 = parent.
            [$member1Id, $validated['member2_id']] = $validated['relationship_type'] === 'Parent'
                ? [$parentId, $childId]
                : [$childId, $parentId];
        }

        // Canonical ordering for symmetric Spouse rows.
        if ($validated['relationship_type'] === 'Spouse') {
            [$member1Id, $validated['member2_id']] = $this->canonicalizeSpouse(
                $member1Id,
                $validated['member2_id']
            );

            $existing = \App\Models\Relationship::where('relationship_type', 'Spouse')
                ->where(function ($q) use ($member1Id, $validated) {
                    $q->where([
                        'member1_id' => $member1Id,
                        'member2_id' => $validated['member2_id'],
                    ])->orWhere([
                        'member1_id' => $validated['member2_id'],
                        'member2_id' => $member1Id,
                    ]);
                })
                ->first();

            if ($existing) {
                return response()->json($existing->load(['member1', 'member2']));
            }
        }

        // Parent/Child idempotent at the (M1, M2, type) triple.
        $rel = \App\Models\Relationship::firstOrCreate(
            [
                'member1_id'        => $member1Id,
                'member2_id'        => $validated['member2_id'],
                'relationship_type' => $validated['relationship_type'],
            ],
            [
                'status'    => $validated['status']    ?? null,
                'start_date' => $validated['start_date'] ?? null,
                'end_date'   => $validated['end_date']   ?? null,
                'notes'      => $validated['notes']      ?? null,
            ]
        );

        return response()->json($rel, $rel->wasRecentlyCreated ? 201 : 200);
    }

    /**
     * DELETE /api/members/{id}/relationships/{relationshipId}
     */
    public function detachRelationship(Request $request, string $id, string $relationshipId)
    {
        $member = FamilyMember::findOrFail($id);

        if (!$this->canAccessMember($request->user(), $member)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $rel = \App\Models\Relationship::where('id', $relationshipId)
            ->where(function ($q) use ($id) {
                $q->where('member1_id', $id)->orWhere('member2_id', $id);
            })
            ->firstOrFail();

        $rel->delete();

        return response()->json(['message' => 'Relationship removed']);
    }

    /**
     * Spouse rows are symmetric; force M1 = smaller id for one canonical form.
     */
    private function canonicalizeSpouse(int $a, int $b): array
    {
        return $a <= $b ? [$a, $b] : [$b, $a];
    }

    /**
     * Scope a member query to families the user can access.
     */
    private function scopeToAccessibleFamilies($query, $user, ?string $familyId, ?string $branchId)
    {
        $accessibleFamilyIds = $user->isSuperAdmin()
            ? \App\Models\Family::pluck('id')->all()
            : $user->familyAccess()->pluck('family_id')->all();            if ($familyId) {
                if (!in_array((int) $familyId, $accessibleFamilyIds, true)) {
                    throw new \Illuminate\Auth\Access\AuthorizationException('Forbidden.');
                }
                $query->where('family_members.family_id', $familyId);
            } else {
                $query->whereIn('family_members.family_id', $accessibleFamilyIds);
            }

            if ($branchId) {
                $query->where('family_members.branch_id', $branchId);
            }

        return $query;
    }

    /**
     * Check if the user can access a specific member.
     */
    private function canAccessMember($user, FamilyMember $member): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        $accessibleFamilyIds = $user->familyAccess()->pluck('family_id')->all();

        return in_array((int) $member->family_id, $accessibleFamilyIds, true);
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
