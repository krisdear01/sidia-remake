<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Room extends Model
{
    protected $fillable = [
        'name',
        'code',
        'building_id',
        'category_id',
        'floor',
        'capacity',
        'area',
        'status',
        'current_activity',
        'description',
        'image',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'area' => 'decimal:2',
    ];

    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class);
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(Schedule::class);
    }

    // Get today's schedules
    public function todaySchedules(): HasMany
    {
        return $this->hasMany(Schedule::class)->whereDate('date', today());
    }

    // Check if room is currently occupied
    public function isOccupied(): bool
    {
        return $this->status === 'OCCUPIED';
    }

    // Get next available time
    public function getNextAvailableTimeAttribute(): ?string
    {
        if ($this->status !== 'OCCUPIED') {
            return null;
        }

        $currentSchedule = $this->schedules()
            ->whereDate('date', today())
            ->where('start_time', '<=', now()->format('H:i:s'))
            ->where('end_time', '>', now()->format('H:i:s'))
            ->first();

        return $currentSchedule?->end_time?->format('H:i');
    }
}
