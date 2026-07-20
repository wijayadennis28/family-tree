<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Family extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'created_by',
        'is_active',
        'is_public',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_public' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (Family $family) {
            if (empty($family->slug)) {
                $family->slug = static::generateSlug($family->name, $family->id);
            }
        });

        static::updating(function (Family $family) {
            if ($family->isDirty('name') && ! $family->isDirty('slug')) {
                $family->slug = static::generateSlug($family->name, $family->id);
            }
        });
    }

    /**
     * Generate a unique slug for a family name.
     */
    public static function generateSlug(string $name, ?int $id = null): string
    {
        $base = Str::slug($name) ?: 'family';
        $slug = $id ? "{$base}-{$id}" : $base;

        if ($id) {
            $exists = static::where('slug', $slug)
                ->when($id, fn ($q) => $q->where('id', '!=', $id))
                ->exists();
            if (! $exists) {
                return $slug;
            }
        }

        $counter = 1;
        $original = $slug;
        while (static::where('slug', $slug)->exists()) {
            $slug = "{$original}-{$counter}";
            $counter++;
        }

        return $slug;
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class);
    }

    public function members(): HasMany
    {
        return $this->hasMany(FamilyMember::class);
    }

    public function activeMembers(): HasMany
    {
        return $this->hasMany(FamilyMember::class)->where('is_active', true);
    }

    public function userAccess(): HasMany
    {
        return $this->hasMany(UserFamilyAccess::class);
    }
}
