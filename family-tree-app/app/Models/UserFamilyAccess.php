<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserFamilyAccess extends Model
{
    protected $table = 'user_family_access';

    protected $fillable = [
        'user_id',
        'family_id',
        'role',
        'is_primary',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'role' => 'string',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }
}
