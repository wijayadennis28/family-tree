<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ability extends Model
{
    protected $fillable = [
        'name',
        'label',
        'description',
        'category',
        'sort_order',
    ];

    public function roleAbilities(): HasMany
    {
        return $this->hasMany(RoleAbility::class);
    }
}
