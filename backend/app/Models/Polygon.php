<?php

namespace App\Models;

use App\Support\PolygonAreaCalculator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Polygon extends Model
{
    protected $fillable = [
        'name',
        'layer',
        'building_id',
        'faculty_id',
        'location_id',
        'siisyana_gedung_id',
        'siisyana_tanah_id',
        'asset_type',
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

    /**
     * Auto-compute land_area from GeoJSON whenever the polygon is saved
     * UNLESS the admin has explicitly provided a non-zero value. This way
     * imports + first-creation get a sensible default; manual overrides
     * stick.
     */
    protected static function booted(): void
    {
        static::saving(function (Polygon $polygon) {
            // Only fill in when blank (null or 0). If the admin typed a
            // positive number, respect their choice.
            $current = $polygon->land_area;
            $isBlank = $current === null || (float) $current <= 0.0;
            if (!$isBlank) {
                return;
            }
            if (!$polygon->geojson) {
                return;
            }
            $area = PolygonAreaCalculator::computeSquareMeters($polygon->geojson);
            if ($area !== null && $area > 0) {
                $polygon->land_area = $area;
            }
        });
    }

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
