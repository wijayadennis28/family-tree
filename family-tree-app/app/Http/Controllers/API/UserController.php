<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserFamilyAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class UserController extends Controller
{
    /**
     * Display a listing of users.
     */
    public function index(Request $request)
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $query = User::query();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return response()->json($query->orderBy('name')->paginate(50));
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request)
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'in:Super Admin,Family Admin,Family Member,Viewer',
            'primary_family_id' => 'nullable|exists:families,id',
            'family_roles' => 'nullable|array',
            'family_roles.*.family_id' => 'required_with:family_roles|exists:families,id',
            'family_roles.*.role' => 'required_with:family_roles|in:Admin,Editor,Member,Viewer',
            'family_roles.*.is_primary' => 'boolean',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'] ?? 'Family Member',
            'primary_family_id' => $validated['primary_family_id'] ?? null,
            'is_active' => true,
        ]);

        $this->syncFamilyRoles($user, $validated['family_roles'] ?? []);

        return response()->json($user->load('familyAccess.family'), 201);
    }

    /**
     * Display the specified user with family roles.
     */
    public function show(Request $request, string $id)
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $user = User::with('familyAccess.family')->findOrFail($id);

        return response()->json($user);
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, string $id)
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:8',
            'role' => 'sometimes|in:Super Admin,Family Admin,Family Member,Viewer',
            'primary_family_id' => 'nullable|exists:families,id',
            'is_active' => 'sometimes|boolean',
            'family_roles' => 'nullable|array',
            'family_roles.*.family_id' => 'required_with:family_roles|exists:families,id',
            'family_roles.*.role' => 'required_with:family_roles|in:Admin,Editor,Member,Viewer',
            'family_roles.*.is_primary' => 'boolean',
        ]);

        $update = collect($validated)
            ->only(['name', 'email', 'role', 'primary_family_id', 'is_active'])
            ->toArray();

        if (!empty($validated['password'])) {
            $update['password'] = Hash::make($validated['password']);
        }

        $user->update($update);

        if (array_key_exists('family_roles', $validated)) {
            $this->syncFamilyRoles($user, $validated['family_roles']);
        }

        return response()->json($user->load('familyAccess.family'));
    }

    /**
     * Soft-delete the specified user.
     */
    public function destroy(Request $request, string $id)
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $user = User::findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'User deleted']);
    }

    /**
     * Sync family role assignments for a user.
     *
     * @param array $roles
     *   Each item: { family_id, role, is_primary }
     */
    private function syncFamilyRoles(User $user, array $roles): void
    {
        UserFamilyAccess::where('user_id', $user->id)->delete();

        $primarySet = false;

        foreach ($roles as $item) {
            $isPrimary = !empty($item['is_primary']);

            if ($isPrimary) {
                $primarySet = true;
            }

            UserFamilyAccess::create([
                'user_id' => $user->id,
                'family_id' => $item['family_id'],
                'role' => $item['role'],
                'is_primary' => $isPrimary,
            ]);
        }

        // Ensure at least one family is marked primary if any exist.
        $first = UserFamilyAccess::where('user_id', $user->id)->orderBy('id')->first();
        if ($first && !$primarySet) {
            $first->update(['is_primary' => true]);
            $primarySet = true;
        }

        // Keep users.primary_family_id in sync.
        if ($primarySet && $first) {
            $user->update(['primary_family_id' => $first->family_id]);
        }
    }
}
