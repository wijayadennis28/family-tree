<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    /**
     * Register a new user.
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role ?? 'Family Member',
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'User registered successfully',
            'user' => $user
        ], 201);
    }

    /**
     * Login user and create token.
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        if (!auth()->attempt($request->only('email', 'password'))) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $user = auth()->user();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'user' => $user,
            'family_roles' => $this->familyRolesFor($user),
            'primary_family' => $user->primaryFamily,
            'ability_matrix' => $this->abilityMatrix(),
            'token' => $token
        ], 200);
    }

    /**
     * Logout user (revoke token).
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out'], 200);
    }

    /**
     * Get the authenticated user profile.
     */
    public function profile(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'user' => $user,
            'family_roles' => $this->familyRolesFor($user),
            'primary_family' => $user->primaryFamily,
            'ability_matrix' => $this->abilityMatrix(),
        ], 200);
    }

    /**
     * Update the authenticated user's profile.
     *
     * Currently supports updating the primary (default) family.
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'primary_family_id' => 'nullable|exists:families,id',
        ]);

        $familyId = $validated['primary_family_id'] ?? null;

        // Ensure the user actually has access to the selected family.
        if ($familyId && !$user->isSuperAdmin()) {
            $hasAccess = $user->familyAccess()->where('family_id', $familyId)->exists();
            if (!$hasAccess) {
                return response()->json(['message' => 'You do not have access to that family.'], 403);
            }
        }

        // Prevent setting primary family to a family the user cannot access.
        if ($familyId && $user->isSuperAdmin()) {
            $familyExists = \App\Models\Family::where('id', $familyId)->exists();
            if (!$familyExists) {
                return response()->json(['message' => 'Family not found.'], 404);
            }
        }

        $user->update(['primary_family_id' => $familyId]);

        return response()->json([
            'message' => 'Profile updated',
            'user' => $user,
            'family_roles' => $this->familyRolesFor($user),
            'primary_family' => $user->primaryFamily,
            'ability_matrix' => $this->abilityMatrix(),
        ]);
    }

    /**
     * Build the global ability matrix.
     */
    private function abilityMatrix(): array
    {
        $matrix = [];

        foreach (['Admin', 'Editor', 'Member', 'Viewer'] as $role) {
            $matrix[$role] = \App\Models\RoleAbility::where('role', $role)
                ->where('allowed', true)
                ->whereHas('ability')
                ->with('ability')
                ->get()
                ->pluck('ability.name')
                ->all();
        }

        return $matrix;
    }

    /**
     * Build the family roles payload for a user.
     */
    private function familyRolesFor($user): array
    {
        if ($user->isSuperAdmin()) {
            return \App\Models\Family::all()->map(fn ($family) => [
                'family_id' => $family->id,
                'family_name' => $family->name,
                'role' => 'Admin',
                'is_primary' => $user->primary_family_id === $family->id,
            ])->toArray();
        }

        return $user->familyAccess()
            ->with('family')
            ->get()
            ->map(fn ($access) => [
                'family_id' => $access->family_id,
                'family_name' => $access->family?->name,
                'role' => $access->role,
                'is_primary' => (bool) $access->is_primary,
            ])
            ->toArray();
    }
}
