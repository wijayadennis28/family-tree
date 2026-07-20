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
     *   family_id (int) — family context (defaults to user's primary family)
     */
    public function show(Request $request, string $memberId)
    {
        $member = FamilyMember::findOrFail($memberId);
        $familyId = $this->resolveFamilyId($request);

        if (! $this->canAccessMemberInFamily($request->user(), $member, $familyId)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $depth = min((int) ($request->query('depth', 3)), 6);
        $ancestors = min((int) ($request->query('ancestors', 2)), 4);

        $tree = $this->buildNode($member, $depth, $ancestors, 0, [], $familyId);

        return response()->json($tree);
    }

    /**
     * GET /api/tree/{memberId}/ancestors
     * Returns only the ancestors chain.
     */
    public function ancestors(Request $request, string $memberId)
    {
        $member = FamilyMember::findOrFail($memberId);
        $familyId = $this->resolveFamilyId($request);

        if (! $this->canAccessMemberInFamily($request->user(), $member, $familyId)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json($this->buildAncestors($member, 4, [], $familyId));
    }

    /**
     * GET /api/families/{familySlug}/tree
     * Returns the full family tree as an array of nested trees (one per root branch).
     * Publicly accessible for families marked is_public; authenticated users with
     * access can also view private families.
     */
    public function familyTree(Request $request, string $familySlug)
    {
        $family = \App\Models\Family::where('slug', $familySlug)->first();

        if (! $family && is_numeric($familySlug)) {
            $family = \App\Models\Family::where('id', (int) $familySlug)->first();
        }

        if (! $family) {
            abort(404);
        }

        $user = $request->user();

        if (! $family->is_public) {
            if (! $user) {
                return response()->json(['message' => 'Forbidden.'], 403);
            }

            if (! $user->isSuperAdmin()) {
                $accessibleFamilyIds = $user->familyAccess()->pluck('family_id')->all();
                if (! in_array((int) $family->id, $accessibleFamilyIds, true)) {
                    return response()->json(['message' => 'Forbidden.'], 403);
                }
            }
        }

        $roots = $this->buildFamilyTreeRoots((int) $family->id);

        return response()->json([
            'family' => ['id' => $family->id, 'name' => $family->name, 'slug' => $family->slug],
            'roots' => $roots,
        ]);
    }

    /**
     * GET /api/tree/{memberId}/descendants
     * Returns only the descendants.
     */
    public function descendants(Request $request, string $memberId)
    {
        $member = FamilyMember::findOrFail($memberId);
        $familyId = $this->resolveFamilyId($request);

        if (! $this->canAccessMemberInFamily($request->user(), $member, $familyId)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $depth = min((int) ($request->query('depth', 3)), 6);

        return response()->json($this->buildDescendants($member, $depth, 0, [], $familyId));
    }

    /**
     * Build a full node: member info + spouses + parents + children.
     */
    private function buildNode(FamilyMember $member, int $downDepth, int $upDepth, int $currentLevel, array $visited, ?int $familyId): array
    {
        if (in_array($member->id, $visited)) {
            return $this->memberData($member);
        }

        $visited[] = $member->id;

        $node = $this->memberData($member);
        $node['spouses'] = $this->getSpouses($member, $visited, $familyId, $upDepth);
        $node['parents'] = $upDepth > 0
            ? $this->getParents($member, $upDepth - 1, $visited, $familyId)
            : [];
        $node['children'] = $downDepth > 0
            ? $this->getChildren($member, $downDepth - 1, $visited, $familyId)
            : [];

        return $node;
    }

    /**
     * Recursive descendants-only build (for the descendants endpoint).
     */
    private function buildDescendants(FamilyMember $member, int $depth, int $current, array $visited, ?int $familyId): array
    {
        if (in_array($member->id, $visited)) {
            return $this->memberData($member);
        }
        $visited[] = $member->id;

        $node = $this->memberData($member);
        $node['spouses'] = $this->getSpouses($member, $visited, $familyId, 0);
        $node['parents'] = $this->getParentStubs($member, $familyId);
        $node['children'] = $depth > 0
            ? $this->getChildren($member, $depth - 1, $visited, $familyId)
            : [];

        return $node;
    }

    /**
     * Build a family-wide tree: array of root trees for all disconnected branches.
     *
     * Uses connected components so each member appears exactly once. Members with
     * no relationships become single-node roots.
     */
    public function buildFamilyTreeRoots(int $familyId): array
    {
        $members = FamilyMember::where('family_id', $familyId)
            ->where('is_active', true)
            ->get()
            ->keyBy('id');

        if ($members->isEmpty()) {
            return [];
        }

        // Pre-load all relationships within this family to build connected components.
        $memberIds = $members->keys()->all();
        $relationships = Relationship::whereIn('member1_id', $memberIds)
            ->orWhereIn('member2_id', $memberIds)
            ->get();

        // Adjacency list for connected components (Spouse and Parent/Child both connect people).
        $adj = [];
        foreach ($relationships as $r) {
            $adj[$r->member1_id][] = $r->member2_id;
            $adj[$r->member2_id][] = $r->member1_id;
        }

        // Build parent lookup for choosing a root inside each component.
        $childToParents = [];
        foreach ($relationships as $r) {
            if ($r->relationship_type === 'Parent') {
                $childToParents[$r->member2_id][] = $r->member1_id;
            } elseif ($r->relationship_type === 'Child') {
                $childToParents[$r->member1_id][] = $r->member2_id;
            }
        }

        // Find connected components via BFS.
        $visited = [];
        $components = [];
        foreach ($members as $member) {
            if (in_array($member->id, $visited, true)) {
                continue;
            }

            $component = [];
            $queue = [$member->id];
            $visited[] = $member->id;

            while (! empty($queue)) {
                $id = array_shift($queue);
                $component[] = $id;

                foreach ($adj[$id] ?? [] as $neighborId) {
                    if (! in_array($neighborId, $visited, true) && $members->has($neighborId)) {
                        $visited[] = $neighborId;
                        $queue[] = $neighborId;
                    }
                }
            }

            $components[] = $component;
        }

        // Build one tree per connected component.
        $roots = [];
        $sharedVisited = [];

        foreach ($components as $component) {
            // Prefer a root with no parents in the family; otherwise use the first member.
            $rootId = null;
            foreach ($component as $id) {
                $parentsInFamily = array_filter(
                    $childToParents[$id] ?? [],
                    fn ($pid) => $members->has($pid),
                );
                if (empty($parentsInFamily)) {
                    $rootId = $id;
                    break;
                }
            }

            if (! $rootId) {
                $rootId = $component[0];
            }

            $roots[] = $this->buildDescendantsShared($members[$rootId], 10, 0, $sharedVisited, $familyId);
        }

        return $roots;
    }

    /**
     * Shared-visited variant of buildDescendants for family-wide tree building.
     */
    private function buildDescendantsShared(FamilyMember $member, int $depth, int $current, array &$visited, ?int $familyId): array
    {
        if (in_array($member->id, $visited)) {
            return $this->memberData($member);
        }
        $visited[] = $member->id;

        $node = $this->memberData($member);
        $node['spouses'] = $this->getSpouses($member, $visited, $familyId, 0);
        $node['parents'] = $this->getParentStubs($member, $familyId);
        $node['children'] = $depth > 0
            ? $this->getChildrenShared($member, $depth - 1, $visited, $familyId)
            : [];

        return $node;
    }

    /** Shared-visited variant of getChildren. */
    private function getChildrenShared(FamilyMember $member, int $depth, array &$visited, ?int $familyId): array
    {
        $childIds = $this->collectChildIds($member, $familyId);

        // Build a map of child_id => member_order from Parent relationships
        $childOrders = $this->relationsWhereMemberIs('parent', $member)
            ->get()
            ->mapWithKeys(fn ($r) => [
                (int) ($r->member1_id === $member->id ? $r->member2_id : $r->member1_id) => (int) $r->member_order,
            ]);

        return FamilyMember::whereIn('id', $childIds)
            ->where('is_active', true)
            ->when($familyId, fn ($q) => $q->where('family_id', $familyId))
            ->get()
            ->map(fn ($c) => array_merge(
                $this->buildDescendantsShared($c, $depth, 0, $visited, $familyId),
                ['child_order' => $childOrders->get((int) $c->id, 0)],
            ))
            ->values()
            ->toArray();
    }

    /**
     * Recursive ancestors-only build (for the ancestors endpoint).
     */
    private function buildAncestors(FamilyMember $member, int $depth, array $visited, ?int $familyId): array
    {
        if (in_array($member->id, $visited)) {
            return $this->memberData($member);
        }
        $visited[] = $member->id;

        $node = $this->memberData($member);
        $node['spouses'] = $this->getSpouses($member, $visited, $familyId, 0);
        $node['parents'] = $depth > 0
            ? $this->getParents($member, $depth - 1, $visited, $familyId)
            : [];

        return $node;
    }

    /** Returns spouses (bidirectional), each carrying its relationship edge */
    private function getSpouses(FamilyMember $member, array $visited, ?int $familyId, int $upDepth = 0): array
    {
        $spouseRels = Relationship::where('relationship_type', 'Spouse')
            ->where(function ($q) use ($member) {
                $q->where('member1_id', $member->id)
                    ->orWhere('member2_id', $member->id);
            })
            ->get()
            ->map(fn ($r) => [
                'spouse_id' => (int) ($r->member1_id === $member->id ? $r->member2_id : $r->member1_id),
                'rel' => $r,
            ]);

        $members = FamilyMember::whereIn('id', $spouseRels->pluck('spouse_id')->unique())
            ->where('is_active', true)
            ->when($familyId, fn ($q) => $q->where('family_id', $familyId))
            ->get()
            ->keyBy('id');

        return $spouseRels
            ->filter(fn ($s) => $members->has($s['spouse_id']))
            ->unique('spouse_id')
            ->values()
            ->map(function ($s) use ($members, $visited, $upDepth, $familyId) {
                $r = $s['rel'];
                $spouse = $members->get($s['spouse_id']);
                $data = array_merge($this->memberData($spouse), [
                    'relationship' => [
                        'id' => $r->id,
                        'type' => $r->relationship_type,
                        'member_order' => (int) $r->member_order,
                        'status' => $r->status,
                        'start_date' => $r->start_date?->format('Y-m-d'),
                        'end_date' => $r->end_date?->format('Y-m-d'),
                        'notes' => $r->notes,
                    ],
                    'parents' => $upDepth > 0
                        ? $this->getParents($spouse, $upDepth - 1, $visited, $familyId)
                        : [],
                ]);

                return $data;
            })
            ->values()
            ->toArray();
    }

    /**
     * Convention for parent/child rows:
     *   type=Parent → member1 is parent, member2 is child.
     *   type=Child  → member1 is child,  member2 is parent.
     */
    private function relationsWhereMemberIs(string $role, FamilyMember $member)
    {
        if ($role === 'child') {
            return Relationship::where(function ($q) use ($member) {
                $q->where('member2_id', $member->id)->where('relationship_type', 'Parent');
            })->orWhere(function ($q) use ($member) {
                $q->where('member1_id', $member->id)->where('relationship_type', 'Child');
            });
        }

        // role === 'parent'
        return Relationship::where(function ($q) use ($member) {
            $q->where('member1_id', $member->id)->where('relationship_type', 'Parent');
        })->orWhere(function ($q) use ($member) {
            $q->where('member2_id', $member->id)->where('relationship_type', 'Child');
        });
    }

    /** Returns parents of a member */
    private function getParents(FamilyMember $member, int $depth, array $visited, ?int $familyId): array
    {
        $parentIds = $this->relationsWhereMemberIs('child', $member)
            ->get()
            ->map(fn ($r) => $r->member1_id === $member->id ? $r->member2_id : $r->member1_id)
            ->unique()
            ->values();

        $parents = FamilyMember::whereIn('id', $parentIds)
            ->where('is_active', true)
            ->when($familyId, fn ($q) => $q->where('family_id', $familyId))
            ->get()
            ->map(fn ($p) => $this->buildAncestors($p, $depth, $visited, $familyId))
            ->values()
            ->toArray();

        // De-dupe spouses: when a child's parents are spouses of each other, each
        // parent's own `spouses` includes the other. They're already shown as the
        // other parent card — drop them here so the UI doesn't render two of each.
        $parentIdSet = array_flip(array_column($parents, 'id'));
        foreach ($parents as &$parent) {
            if (! empty($parent['spouses'])) {
                $parent['spouses'] = array_values(array_filter(
                    $parent['spouses'],
                    fn ($s) => ! isset($parentIdSet[$s['id']]),
                ));
            }
        }
        unset($parent);

        return $parents;
    }

    /** Lightweight parent ids for layout co-parent routing */
    private function getParentStubs(FamilyMember $member, ?int $familyId = null): array
    {
        $parentIds = $this->relationsWhereMemberIs('child', $member)
            ->get()
            ->map(fn ($r) => (int) ($r->member1_id === $member->id ? $r->member2_id : $r->member1_id))
            ->unique()
            ->values();

        if ($familyId) {
            $parentIds = FamilyMember::whereIn('id', $parentIds)
                ->where('family_id', $familyId)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->values();
        }

        $parents = FamilyMember::whereIn('id', $parentIds)
            ->get()
            ->keyBy('id');

        return $parentIds->map(fn ($id) => $parents[$id]
            ? $this->memberData($parents[$id])
            : ['id' => $id]
        )->values()->toArray();
    }

    /** Returns children of a member (includes spouse's children for the couple union). */
    private function getChildren(FamilyMember $member, int $depth, array $visited, ?int $familyId): array
    {
        $childIds = $this->collectChildIds($member, $familyId);

        // Build a map of child_id => member_order from Parent relationships
        $childOrders = $this->relationsWhereMemberIs('parent', $member)
            ->get()
            ->mapWithKeys(fn ($r) => [
                (int) ($r->member1_id === $member->id ? $r->member2_id : $r->member1_id) => (int) $r->member_order,
            ]);

        return FamilyMember::whereIn('id', $childIds)
            ->where('is_active', true)
            ->when($familyId, fn ($q) => $q->where('family_id', $familyId))
            ->get()
            ->map(fn ($c) => array_merge(
                $this->buildDescendants($c, $depth, 0, $visited, $familyId),
                ['child_order' => $childOrders->get((int) $c->id, 0)],
            ))
            ->values()
            ->toArray();
    }

    /** Child ids for this member plus any spouse's children (deduped). */
    private function collectChildIds(FamilyMember $member, ?int $familyId): \Illuminate\Support\Collection
    {
        $ids = $this->relationsWhereMemberIs('parent', $member)
            ->get()
            ->map(fn ($r) => $r->member1_id === $member->id ? $r->member2_id : $r->member1_id);

        $spouseIds = Relationship::where('relationship_type', 'Spouse')
            ->where(function ($q) use ($member) {
                $q->where('member1_id', $member->id)
                    ->orWhere('member2_id', $member->id);
            })
            ->get()
            ->map(fn ($r) => $r->member1_id === $member->id ? $r->member2_id : $r->member1_id);

        foreach ($spouseIds as $spouseId) {
            $spouse = FamilyMember::when($familyId, fn ($q) => $q->where('family_id', $familyId))->find($spouseId);
            if (! $spouse) {
                continue;
            }
            $ids = $ids->merge(
                $this->relationsWhereMemberIs('parent', $spouse)
                    ->get()
                    ->map(fn ($r) => $r->member1_id === $spouse->id ? $r->member2_id : $r->member1_id)
            );
        }

        return $ids->unique()->values();
    }

    /**
     * Resolve the family ID from the request or user's primary family.
     */
    private function resolveFamilyId(Request $request): ?int
    {
        $familyId = $request->query('family_id') ?? $request->user()->primary_family_id;

        return $familyId ? (int) $familyId : null;
    }

    /**
     * Check if the user can access a member within a specific family context.
     * If no family context is provided, falls back to the member's family.
     */
    private function canAccessMemberInFamily($user, FamilyMember $member, ?int $familyId): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        $accessibleFamilyIds = $user->familyAccess()->pluck('family_id')->all();

        // If no family context provided, use the member's family.
        $effectiveFamilyId = $familyId ?? (int) $member->family_id;

        if (! $effectiveFamilyId) {
            return false;
        }

        if (! in_array($effectiveFamilyId, $accessibleFamilyIds, true)) {
            return false;
        }

        return (int) $member->family_id === $effectiveFamilyId;
    }

    /** Formats a member as a flat data object for the tree */
    private function memberData(FamilyMember $member): array
    {
        return [
            'id' => $member->id,
            'name' => $member->name,
            'chinese_name' => $member->chinese_name,
            'initials' => $member->initials,
            'gender' => $member->gender,
            'dob' => $member->dob?->format('Y'),
            'dod' => $member->dod?->format('Y'),
            'is_living' => is_null($member->dod),
            'photo' => $member->photo,
            'biography' => $member->biography,
            'place_of_birth' => $member->place_of_birth,
            'family_id' => $member->family_id,
        ];
    }
}
