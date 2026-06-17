<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FamilyMemberBranch extends Model
{
    protected $table = 'family_member_branches';

    protected $fillable = [
        'member_id',
        'branch_id',
        'is_primary',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
    ];

    public function member(): BelongsTo
    {
        return $this->belongsTo(FamilyMember::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}