<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoleAbility extends Model
{
    protected $table = 'role_abilities';

    protected $fillable = [
        'role',
        'ability_id',
        'allowed',
    ];

    protected $casts = [
        'allowed' => 'boolean',
    ];

    public function ability(): BelongsTo
    {
        return $this->belongsTo(Ability::class);
    }
}
