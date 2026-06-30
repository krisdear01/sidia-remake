<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuctionDeposit extends Model
{
    protected $fillable = [
        'auction_item_id',
        'bidder_id',
        'amount',
        'payment_proof',
        'status',
        'admin_notes',
        'verified_at',
        'verified_by',
        'refunded_at',
        'refund_proof',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'verified_at' => 'datetime',
            'refunded_at' => 'datetime',
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

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    // Helpers
    public function isVerified(): bool
    {
        return $this->status === 'verified';
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isRefunded(): bool
    {
        return $this->status === 'refunded';
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeVerified($query)
    {
        return $query->where('status', 'verified');
    }

    public function scopeForAuction($query, $auctionItemId)
    {
        return $query->where('auction_item_id', $auctionItemId);
    }

    public function scopeForBidder($query, $bidderId)
    {
        return $query->where('bidder_id', $bidderId);
    }
}
