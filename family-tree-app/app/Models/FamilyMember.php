<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FamilyMember extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'chinese_name',
        'gender',
        'dob',
        'dod',
        'photo',
        'address',
        'phone',
        'email',
        'biography',
        'place_of_birth',
        'place_of_death',
        'is_active',
    ];

    protected $casts = [
        'dob' => 'date',
        'dod' => 'date',
        'is_active' => 'boolean',
    ];

    // Relationships
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // A member can be on either side of a relationship
    public function relationshipsAsMember1(): HasMany
    {
        return $this->hasMany(Relationship::class, 'member1_id');
    }

    public function relationshipsAsMember2(): HasMany
    {
        return $this->hasMany(Relationship::class, 'member2_id');
    }

    // Many‑to‑many with Branches (via family_member_branches)
    public function branches()
    {
        return $this->belongsToMany(Branch::class, 'family_member_branches', 'member_id', 'branch_id')
                    ->withPivot('is_primary')
                    ->withTimestamps();
    }

    // Many‑to‑many with Events (via event_members)
    public function events()
    {
        return $this->belongsToMany(Event::class, 'event_members')
                    ->withPivot('role')
                    ->withTimestamps();
    }

    // Photos where this member is the subject
    public function photos()
    {
        return $this->hasMany(Photo::class, 'member_id');
    }
}
