<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Building extends Model
{
    protected $fillable = [
        'name',
        'code',
        'faculty_id',
        'location_id',
        'category_id',
        'floors',
        'land_area',
        'building_area',
        'year_built',
        'condition',
        'description',
        'image',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'land_area' => 'decimal:2',
        'building_area' => 'decimal:2',
    ];

    public function faculty(): BelongsTo
    {
        return $this->belongsTo(Faculty::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function rooms(): HasMany
    {
        return $this->hasMany(Room::class);
    }

    public function assets(): HasMany
    {
        return $this->hasMany(Asset::class);
    }

    public function polygon(): HasOne
    {
        return $this->hasOne(Polygon::class);
    }
}
