<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FamilyMember extends Model
{
    protected $fillable = [
        'user_id',
        'family_id',
        'branch_id',
        'name',
        'chinese_name',
        'initials',
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

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
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
