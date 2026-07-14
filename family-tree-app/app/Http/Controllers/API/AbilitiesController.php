<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Ability;
use App\Models\RoleAbility;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class AbilitiesController extends Controller
{
    /**
     * Get the full abilities matrix.
     */
    public function index()
    {
        $abilities = Ability::orderBy('sort_order')->orderBy('label')->get();

        $matrix = [];
        foreach (['Admin', 'Editor', 'Member', 'Viewer'] as $role) {
            $matrix[$role] = RoleAbility::where('role', $role)
                ->where('allowed', true)
                ->pluck('ability_id')
                ->all();
        }

        return response()->json([
            'abilities' => $abilities,
            'matrix' => $matrix,
        ]);
    }

    /**
     * Update the abilities matrix.
     *
     * Payload: { matrix: { Admin: [1,2,...], Editor: [...], ... } }
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'matrix' => 'required|array',
            'matrix.*' => 'array',
            'matrix.*.*' => 'integer|exists:abilities,id',
        ]);

        foreach (['Admin', 'Editor', 'Member', 'Viewer'] as $role) {
            $allowedIds = $validated['matrix'][$role] ?? [];

            RoleAbility::where('role', $role)->update(['allowed' => false]);

            if (!empty($allowedIds)) {
                RoleAbility::where('role', $role)
                    ->whereIn('ability_id', $allowedIds)
                    ->update(['allowed' => true]);
            }
        }

        Cache::forget('ability_matrix');

        return response()->json(['message' => 'Abilities matrix updated']);
    }

    /**
     * Get the current user's abilities for a specific family.
     */
    public function forFamily(Request $request, int $familyId)
    {
        $user = $request->user();

        return response()->json([
            'abilities' => $user->abilitiesIn($familyId),
        ]);
    }
}
