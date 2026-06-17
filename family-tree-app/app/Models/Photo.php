<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Photo extends Model
{
    protected $fillable = [
        'gallery_id',
        'member_id',
        'event_id',
        'photo_path',
        'caption',
        'upload_date',
        'uploaded_by',
    ];

    protected $casts = [
        'upload_date' => 'datetime',
    ];

    // Relationships
    public function gallery(): BelongsTo
    {
        return $this->belongsTo(PhotoGallery::class, 'gallery_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(FamilyMember::class, 'member_id');
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}