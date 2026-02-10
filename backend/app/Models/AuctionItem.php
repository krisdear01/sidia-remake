<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class AuctionItem extends Model
{
    protected $fillable = [
        'title',
        'description',
        'item_type',
        'itemable_type',
        'itemable_id',
        'auction_type',
        'limit_price',
        'current_highest_bid',
        'deposit_amount',
        'deposit_percentage',
        'rent_period_type',
        'rent_duration',
        'start_date',
        'end_date',
        'bidding_type',
        'status',
        'winner_bidder_id',
        'images',
        'terms_conditions',
        'facility_rules',
        'location_name',
        'latitude',
        'longitude',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'limit_price' => 'decimal:2',
            'current_highest_bid' => 'decimal:2',
            'deposit_amount' => 'decimal:2',
            'deposit_percentage' => 'integer',
            'rent_duration' => 'integer',
            'start_date' => 'datetime',
            'end_date' => 'datetime',
            'images' => 'array',
            'latitude' => 'decimal:8',
            'longitude' => 'decimal:8',
        ];
    }

    // Polymorphic relationship to the actual item
    public function itemable(): MorphTo
    {
        return $this->morphTo();
    }

    // Relationships
    public function bids(): HasMany
    {
        return $this->hasMany(Bid::class);
    }

    public function deposits(): HasMany
    {
        return $this->hasMany(AuctionDeposit::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(FacilityBooking::class);
    }

    public function winner(): BelongsTo
    {
        return $this->belongsTo(Bidder::class, 'winner_bidder_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Get highest bid
    public function highestBid()
    {
        return $this->bids()->orderBy('bid_amount', 'desc')->first();
    }

    // Get total bid count
    public function getBidCountAttribute(): int
    {
        return $this->bids()->count();
    }

    // Check if auction is active
    public function isActive(): bool
    {
        return $this->status === 'active' &&
            now()->between($this->start_date, $this->end_date);
    }

    // Check if auction has ended
    public function hasEnded(): bool
    {
        return $this->status === 'ended' || now()->isAfter($this->end_date);
    }

    // Check if this is a facility rental
    public function isFacilityRental(): bool
    {
        return $this->auction_type === 'facility_rent';
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active')
            ->where('start_date', '<=', now())
            ->where('end_date', '>=', now());
    }

    public function scopeUpcoming($query)
    {
        return $query->where('status', 'upcoming')
            ->orWhere(function ($q) {
                $q->where('status', 'active')
                    ->where('start_date', '>', now());
            });
    }

    public function scopeAuctions($query)
    {
        return $query->where('auction_type', 'auction');
    }

    public function scopeRentals($query)
    {
        return $query->where('auction_type', 'rent');
    }

    public function scopeFacilities($query)
    {
        return $query->where('auction_type', 'facility_rent');
    }

    public function scopePublished($query)
    {
        return $query->whereIn('status', ['upcoming', 'active']);
    }
}
