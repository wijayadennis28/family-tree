<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\FamilyMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FamilyMemberController extends Controller
{
    /** GET /api/members — list all active members */
    public function index(Request $request)
    {
        $query = FamilyMember::query();

        // Search by name or chinese name
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('chinese_name', 'like', "%{$search}%");
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

        $members = $query->where('is_active', true)->orderBy('name')->get();

        return response()->json($members);
    }

    /** POST /api/members — create (admin only) */
    public function store(Request $request)
    {
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
        ]);

        // Handle photo upload
        if ($request->hasFile('photo')) {
            $request->validate(['photo' => 'image|max:2048']);
            $validated['photo'] = $request->file('photo')->store('member-photos', 'public');
        }

        $member = FamilyMember::create($validated);

        return response()->json($member, 201);
    }

    /** GET /api/members/{id} */
    public function show(string $id)
    {
        $member = FamilyMember::with(['branches'])->findOrFail($id);
        return response()->json($member);
    }

    /** PUT /api/members/{id} — update (admin only) */
    public function update(Request $request, string $id)
    {
        $member = FamilyMember::findOrFail($id);

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
        ]);

        // Handle photo upload (replace old)
        if ($request->hasFile('photo')) {
            $request->validate(['photo' => 'image|max:2048']);
            if ($member->photo) {
                Storage::disk('public')->delete($member->photo);
            }
            $validated['photo'] = $request->file('photo')->store('member-photos', 'public');
        }

        $member->update($validated);

        return response()->json($member);
    }

    /** DELETE /api/members/{id} — soft-delete (admin only) */
    public function destroy(string $id)
    {
        $member = FamilyMember::findOrFail($id);
        $member->update(['is_active' => false]);

        return response()->json(['message' => 'Member archived successfully']);
    }

    /** GET /api/members/{id}/relationships */
    public function relationships(string $id)
    {
        $member = FamilyMember::findOrFail($id);

        $relationships = $member->relationshipsAsMember1()
            ->with('member2')
            ->get()
            ->merge(
                $member->relationshipsAsMember2()->with('member1')->get()
            );

        return response()->json($relationships);
    }

    /** POST /api/members/{id}/relationships */
    public function attachRelationship(Request $request, string $id)
    {
        FamilyMember::findOrFail($id);

        $validated = $request->validate([
            'member2_id'        => 'required|exists:family_members,id',
            'relationship_type' => 'required|in:Parent,Child,Spouse,Sibling,Grandparent,Grandchild,Uncle/Aunt,Niece/Nephew',
            'start_date'        => 'nullable|date',
            'end_date'          => 'nullable|date',
            'notes'             => 'nullable|string',
        ]);

        $rel = \App\Models\Relationship::create([
            'member1_id'        => $id,
            'member2_id'        => $validated['member2_id'],
            'relationship_type' => $validated['relationship_type'],
            'start_date'        => $validated['start_date'] ?? null,
            'end_date'          => $validated['end_date'] ?? null,
            'notes'             => $validated['notes'] ?? null,
        ]);

        return response()->json($rel, 201);
    }

    /** DELETE /api/members/{id}/relationships/{relationshipId} */
    public function detachRelationship(string $id, string $relationshipId)
    {
        $rel = \App\Models\Relationship::where('id', $relationshipId)
            ->where(function ($q) use ($id) {
                $q->where('member1_id', $id)->orWhere('member2_id', $id);
            })
            ->firstOrFail();

        $rel->delete();

        return response()->json(['message' => 'Relationship removed']);
    }
}

