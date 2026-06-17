<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Branch extends Model
{
    protected $fillable = [
        'name',
        'description',
        'created_by',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // Relationships
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Many‑to‑many with Family Members (via family_member_branches)
    public function members()
    {
        return $this->belongsToMany(FamilyMember::class, 'family_member_branches')
                    ->withPivot('is_primary')
                    ->withTimestamps();
    }

    // Many‑to‑many with Users (via user_branch_access)
    public function users()
    {
        return $this->belongsToMany(User::class, 'user_branch_access')
                    ->withPivot('is_primary')
                    ->withTimestamps();
    }
}