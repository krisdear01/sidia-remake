<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Polygon extends Model
{
    protected $fillable = [
        'name',
        'building_id',
        'faculty_id',
        'location_id',
        'geojson',
        'fill_color',
        'stroke_color',
        'fill_opacity',
        'land_area',
        'description',
        'is_active',
    ];

    protected $casts = [
        'geojson' => 'array',
        'is_active' => 'boolean',
        'fill_opacity' => 'float',
        'land_area' => 'decimal:2',
    ];

    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }

    public function faculty(): BelongsTo
    {
        return $this->belongsTo(Faculty::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }
}
