<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Relationship extends Model
{
    protected $fillable = [
        'member1_id',
        'member2_id',
        'relationship_type',
        'status',
        'start_date',
        'end_date',
        'notes',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    // Relationships
    public function member1(): BelongsTo
    {
        return $this->belongsTo(FamilyMember::class, 'member1_id');
    }

    public function member2(): BelongsTo
    {
        return $this->belongsTo(FamilyMember::class, 'member2_id');
    }
}