<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Schedule extends Model
{
    protected $fillable = [
        'room_id',
        'subject',
        'department',
        'lecturer',
        'date',
        'start_time',
        'end_time',
        'day_of_week',
        'is_recurring',
        'sipirang_id',
    ];

    protected $casts = [
        'date' => 'date',
        'start_time' => 'datetime:H:i',
        'end_time' => 'datetime:H:i',
        'is_recurring' => 'boolean',
    ];

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    // Check if schedule is currently active
    public function isActive(): bool
    {
        $now = now();
        return $this->date->isToday()
            && $now->format('H:i:s') >= $this->start_time->format('H:i:s')
            && $now->format('H:i:s') < $this->end_time->format('H:i:s');
    }
}
