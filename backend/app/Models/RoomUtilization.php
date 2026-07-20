<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoomUtilization extends Model
{
    protected $fillable = [
        'semester',
        'session',
        'faculty_name',
        'faculty_id',
        'campus_name',
        'location_id',
        'gedung_name',
        'building_id',
        'room_count',
        'utilization_percent',
        'notes',
    ];

    protected $casts = [
        'room_count' => 'integer',
        'utilization_percent' => 'decimal:2',
    ];

    public function faculty(): BelongsTo
    {
        return $this->belongsTo(Faculty::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }
}
