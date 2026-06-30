<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Bid extends Model
{
    protected $fillable = [
        'auction_item_id',
        'bidder_id',
        'bid_amount',
        'is_winning_bid',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'bid_amount' => 'decimal:2',
            'is_winning_bid' => 'boolean',
        ];
    }

    // Relationships
    public function auctionItem(): BelongsTo
    {
        return $this->belongsTo(AuctionItem::class);
    }

    public function bidder(): BelongsTo
    {
        return $this->belongsTo(Bidder::class);
    }

    // Scopes
    public function scopeForAuction($query, $auctionItemId)
    {
        return $query->where('auction_item_id', $auctionItemId);
    }

    public function scopeHighestFirst($query)
    {
        return $query->orderBy('bid_amount', 'desc');
    }

    public function scopeLatestFirst($query)
    {
        return $query->orderBy('created_at', 'desc');
    }

    public function scopeWinning($query)
    {
        return $query->where('is_winning_bid', true);
    }
}
