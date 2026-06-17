<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Relationship;
use Illuminate\Http\Request;

class RelationshipController extends Controller
{
    /** GET /api/relationships */
    public function index()
    {
        return response()->json(
            Relationship::with(['member1', 'member2'])->get()
        );
    }

    /** POST /api/relationships */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'member1_id'        => 'required|exists:family_members,id',
            'member2_id'        => 'required|exists:family_members,id|different:member1_id',
            'relationship_type' => 'required|in:Parent,Child,Spouse,Sibling,Grandparent,Grandchild,Uncle/Aunt,Niece/Nephew',
            'start_date'        => 'nullable|date',
            'end_date'          => 'nullable|date',
            'notes'             => 'nullable|string',
        ]);

        $rel = Relationship::create($validated);

        return response()->json($rel->load(['member1', 'member2']), 201);
    }

    /** GET /api/relationships/{id} */
    public function show(string $id)
    {
        return response()->json(
            Relationship::with(['member1', 'member2'])->findOrFail($id)
        );
    }

    /** PUT /api/relationships/{id} */
    public function update(Request $request, string $id)
    {
        $rel = Relationship::findOrFail($id);

        $validated = $request->validate([
            'relationship_type' => 'sometimes|in:Parent,Child,Spouse,Sibling,Grandparent,Grandchild,Uncle/Aunt,Niece/Nephew',
            'start_date'        => 'nullable|date',
            'end_date'          => 'nullable|date',
            'notes'             => 'nullable|string',
        ]);

        $rel->update($validated);

        return response()->json($rel->load(['member1', 'member2']));
    }

    /** DELETE /api/relationships/{id} */
    public function destroy(string $id)
    {
        Relationship::findOrFail($id)->delete();

        return response()->json(['message' => 'Relationship deleted']);
    }
}

