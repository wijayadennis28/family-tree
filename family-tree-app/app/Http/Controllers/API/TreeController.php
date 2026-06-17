<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\FamilyMember;
use App\Models\Relationship;
use Illuminate\Http\Request;

class TreeController extends Controller
{
    /**
     * GET /api/tree/{memberId}
     * Returns a nested tree structure centered on the given member.
     * Query params:
     *   depth (int, default 3) — how many generations down to include
     *   ancestors (int, default 2) — how many generations up to include
     */
    public function show(Request $request, string $memberId)
    {
        $member = FamilyMember::findOrFail($memberId);

        $depth     = min((int) ($request->query('depth', 3)), 6);
        $ancestors = min((int) ($request->query('ancestors', 2)), 4);

        $tree = $this->buildNode($member, $depth, $ancestors, 0, []);

        return response()->json($tree);
    }

    /**
     * GET /api/tree/{memberId}/ancestors
     * Returns only the ancestors chain.
     */
    public function ancestors(string $memberId)
    {
        $member = FamilyMember::findOrFail($memberId);
        return response()->json($this->buildAncestors($member, 4, []));
    }

    /**
     * GET /api/tree/{memberId}/descendants
     * Returns only the descendants.
     */
    public function descendants(Request $request, string $memberId)
    {
        $member = FamilyMember::findOrFail($memberId);
        $depth  = min((int) ($request->query('depth', 3)), 6);
        return response()->json($this->buildDescendants($member, $depth, 0, []));
    }

    /**
     * Build a full node: member info + spouses + parents + children.
     */
    private function buildNode(FamilyMember $member, int $downDepth, int $upDepth, int $currentLevel, array $visited): array
    {
        if (in_array($member->id, $visited)) {
            return $this->memberData($member);
        }

        $visited[] = $member->id;

        $node             = $this->memberData($member);
        $node['spouses']  = $this->getSpouses($member, $visited);
        $node['parents']  = $upDepth > 0
            ? $this->getParents($member, $upDepth - 1, $visited)
            : [];
        $node['children'] = $downDepth > 0
            ? $this->getChildren($member, $downDepth - 1, $visited)
            : [];

        return $node;
    }

    /**
     * Recursive descendants-only build (for the descendants endpoint).
     */
    private function buildDescendants(FamilyMember $member, int $depth, int $current, array $visited): array
    {
        if (in_array($member->id, $visited)) {
            return $this->memberData($member);
        }
        $visited[] = $member->id;

        $node             = $this->memberData($member);
        $node['spouses']  = $this->getSpouses($member, $visited);
        $node['children'] = $depth > 0
            ? $this->getChildren($member, $depth - 1, $visited)
            : [];

        return $node;
    }

    /**
     * Recursive ancestors-only build (for the ancestors endpoint).
     */
    private function buildAncestors(FamilyMember $member, int $depth, array $visited): array
    {
        if (in_array($member->id, $visited)) {
            return $this->memberData($member);
        }
        $visited[] = $member->id;

        $node            = $this->memberData($member);
        $node['spouses'] = $this->getSpouses($member, $visited);
        $node['parents'] = $depth > 0
            ? $this->getParents($member, $depth - 1, $visited)
            : [];

        return $node;
    }

    /** Returns spouses (bidirectional) */
    private function getSpouses(FamilyMember $member, array $visited): array
    {
        $spouseIds = Relationship::where('relationship_type', 'Spouse')
            ->where(function ($q) use ($member) {
                $q->where('member1_id', $member->id)
                  ->orWhere('member2_id', $member->id);
            })
            ->get()
            ->map(fn($r) => $r->member1_id === $member->id ? $r->member2_id : $r->member1_id)
            ->unique()
            ->values();

        return FamilyMember::whereIn('id', $spouseIds)
            ->get()
            ->map(fn($m) => $this->memberData($m))
            ->values()
            ->toArray();
    }

    /** Returns parents of a member */
    private function getParents(FamilyMember $member, int $depth, array $visited): array
    {
        // Conventions:
        //   type=Parent  → member1 is parent, member2 is child
        //   type=Child   → member1 is child,  member2 is parent
        $parentIds = Relationship::where(function ($q) use ($member) {
            $q->where('member2_id', $member->id)->where('relationship_type', 'Parent');
        })->orWhere(function ($q) use ($member) {
            $q->where('member1_id', $member->id)->where('relationship_type', 'Child');
        })
        ->get()
        ->map(fn($r) => $r->relationship_type === 'Parent' ? $r->member1_id : $r->member2_id)
        ->unique()
        ->values();

        return FamilyMember::whereIn('id', $parentIds)
            ->get()
            ->map(fn($p) => $this->buildAncestors($p, $depth, $visited))
            ->values()
            ->toArray();
    }

    /** Returns children of a member */
    private function getChildren(FamilyMember $member, int $depth, array $visited): array
    {
        // type=Parent  → member1 is parent, member2 is child
        // type=Child   → member1 is child,  member2 is parent
        $childIds = Relationship::where(function ($q) use ($member) {
            $q->where('member1_id', $member->id)->where('relationship_type', 'Parent');
        })->orWhere(function ($q) use ($member) {
            $q->where('member2_id', $member->id)->where('relationship_type', 'Child');
        })
        ->get()
        ->map(fn($r) => $r->relationship_type === 'Parent' ? $r->member2_id : $r->member1_id)
        ->unique()
        ->values();

        return FamilyMember::whereIn('id', $childIds)
            ->where('is_active', true)
            ->get()
            ->map(fn($c) => $this->buildDescendants($c, $depth, 0, $visited))
            ->values()
            ->toArray();
    }

    /** Formats a member as a flat data object for the tree */
    private function memberData(FamilyMember $member): array
    {
        return [
            'id'             => $member->id,
            'name'           => $member->name,
            'chinese_name'   => $member->chinese_name,
            'gender'         => $member->gender,
            'dob'            => $member->dob?->format('Y'),
            'dod'            => $member->dod?->format('Y'),
            'is_living'      => is_null($member->dod),
            'photo'          => $member->photo
                                    ? asset('storage/' . $member->photo)
                                    : null,
            'biography'      => $member->biography,
            'place_of_birth' => $member->place_of_birth,
        ];
    }
}
