<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureFamilyRole
{
    /**
     * Handle an incoming request.
     *
     * Usage examples:
     *   ->middleware('family.role:Admin,Editor')
     *
     * The middleware looks for the family id in this order:
     *   1. Route parameter {family}
     *   2. Request input ?family_id=
     *   3. The authenticated user's primary_family_id
     *
     * Super Admins bypass the check entirely.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
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

        if (!$user->hasFamilyRole((int) $familyId, $roles)) {
            return response()->json(['message' => 'Forbidden. Insufficient family role.'], 403);
        }

        return $next($request);
    }
}
