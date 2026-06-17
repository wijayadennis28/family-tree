<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventMember extends Model
{
    protected $table = 'event_members';

    protected $fillable = [
        'event_id',
        'member_id',
        'role',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(FamilyMember::class);
    }
}