<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'primary_family_id',
        'is_active',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'role' => 'string',
        'primary_family_id' => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * Get the family member associated with the user.
     */
    public function familyMember()
    {
        return $this->hasOne(FamilyMember::class);
    }

    /**
     * The user's primary family.
     */
    public function primaryFamily()
    {
        return $this->belongsTo(Family::class, 'primary_family_id');
    }

    /**
     * All family access records for this user.
     */
    public function familyAccess()
    {
        return $this->hasMany(UserFamilyAccess::class);
    }

    /**
     * Check if the user is a platform super admin.
     */
    public function isSuperAdmin(): bool
    {
        return $this->role === 'Super Admin';
    }

    /**
     * Get the user's role within a specific family.
     */
    public function roleIn(?int $familyId): ?string
    {
        if (!$familyId) {
            return null;
        }

        if ($this->isSuperAdmin()) {
            return 'Admin';
        }

        $access = $this->familyAccess()
            ->where('family_id', $familyId)
            ->first();

        return $access?->role;
    }

    /**
     * Check if the user has at least one of the given roles in a family.
     *
     * @param int|null $familyId
     * @param string|array $roles
     */
    public function hasFamilyRole(?int $familyId, string|array $roles): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        if (!$familyId) {
            return false;
        }

        $roles = is_array($roles) ? $roles : [$roles];
        $role = $this->roleIn($familyId);

        return $role !== null && in_array($role, $roles, true);
    }

    /**
     * Determine if the user can edit the family tree in a given family.
     */
    public function canEditTree(?int $familyId): bool
    {
        return $this->hasFamilyRole($familyId, ['Admin', 'Editor']);
    }

    /**
     * Determine if the user can administer a given family.
     */
    public function canAdminFamily(?int $familyId): bool
    {
        return $this->hasFamilyRole($familyId, ['Admin']);
    }

    /**
     * Check if the user has a specific ability in a given family.
     */
    public function hasAbility(?int $familyId, string $ability): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        $role = $this->roleIn($familyId);

        if (!$role) {
            return false;
        }

        return RoleAbility::where('role', $role)
            ->whereHas('ability', fn ($q) => $q->where('name', $ability))
            ->value('allowed') ?? false;
    }

    /**
     * Get all abilities for the user's role in a given family.
     *
     * @return array<string>
     */
    public function abilitiesIn(?int $familyId): array
    {
        if ($this->isSuperAdmin()) {
            return Ability::pluck('name')->all();
        }

        $role = $this->roleIn($familyId);

        if (!$role) {
            return [];
        }

        return RoleAbility::where('role', $role)
            ->where('allowed', true)
            ->whereHas('ability')
            ->with('ability')
            ->get()
            ->pluck('ability.name')
            ->all();
    }
}
