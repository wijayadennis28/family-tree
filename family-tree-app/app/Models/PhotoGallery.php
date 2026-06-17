<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PhotoGallery extends Model
{
    protected $fillable = [
        'name',
        'description',
        'created_by',
        'is_public',
    ];

    protected $casts = [
        'is_public' => 'boolean',
    ];

    // Relationships
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function photos()
    {
        return $this->hasMany(Photo::class, 'gallery_id');
    }
}