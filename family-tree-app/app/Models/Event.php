<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Event extends Model
{
    protected $fillable = [
        'title',
        'description',
        'event_date',
        'event_type',
        'location',
        'is_public',
        'created_by',
    ];

    protected $casts = [
        'event_date' => 'date',
        'is_public' => 'boolean',
    ];

    // Relationships
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Many‑to‑many with Family Members (via event_members)
    public function members()
    {
        return $this->belongsToMany(FamilyMember::class, 'event_members')
                    ->withPivot('role')
                    ->withTimestamps();
    }

    // Photos associated with this event
    public function photos()
    {
        return $this->hasMany(Photo::class, 'event_id');
    }
}