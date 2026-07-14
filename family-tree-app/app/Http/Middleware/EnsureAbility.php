<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAbility
{
    /**
     * Handle an incoming request.
     *
     * Usage:
     *   ->middleware('ability:edit_tree')
     *
     * The middleware resolves the family id in this order:
     *   1. Route parameter {family}
     *   2. Request input ?family_id=
     *   3. The authenticated user's primary_family_id
     *
     * Super Admins bypass the check entirely.
     */
    public function handle(Request $request, Closure $next, string $ability): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        $familyId = $request->route('family')
            ?? $request->input('family_id')
            ?? $user->primary_family_id;

        if (!$familyId) {
            return response()->json(['message' => 'Forbidden. No family context provided.'], 403);
        }

        if (!$user->hasAbility((int) $familyId, $ability)) {
            return response()->json(['message' => 'Forbidden. Missing ability: ' . $ability], 403);
        }

        return $next($request);
    }
}
