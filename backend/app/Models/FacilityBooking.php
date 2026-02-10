<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FacilityBooking extends Model
{
    protected $fillable = [
        'auction_item_id',
        'bidder_id',
        'booking_date',
        'start_time',
        'end_time',
        'purpose',
        'purpose_description',
        'attendees',
        'special_requests',
        'total_price',
        'payment_proof',
        'status',
        'admin_notes',
        'rejection_reason',
        'approved_at',
        'approved_by',
    ];

    protected function casts(): array
    {
        return [
            'booking_date' => 'date',
            'start_time' => 'datetime:H:i',
            'end_time' => 'datetime:H:i',
            'attendees' => 'integer',
            'total_price' => 'decimal:2',
            'approved_at' => 'datetime',
        ];
    }

    // Relationships
    public function facility(): BelongsTo
    {
        return $this->belongsTo(AuctionItem::class, 'auction_item_id');
    }

    public function bidder(): BelongsTo
    {
        return $this->belongsTo(Bidder::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // Helpers
    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isCancelled(): bool
    {
        return $this->status === 'cancelled' || $this->status === 'rejected';
    }

    // Get duration in hours
    public function getDurationHoursAttribute(): float
    {
        $start = \Carbon\Carbon::parse($this->start_time);
        $end = \Carbon\Carbon::parse($this->end_time);
        return $start->diffInMinutes($end) / 60;
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeForFacility($query, $facilityId)
    {
        return $query->where('auction_item_id', $facilityId);
    }

    public function scopeForDate($query, $date)
    {
        return $query->where('booking_date', $date);
    }

    public function scopeUpcoming($query)
    {
        return $query->where('booking_date', '>=', now()->toDateString())
            ->whereIn('status', ['approved', 'pending']);
    }

    // Check if booking conflicts with another
    public function conflictsWith($startTime, $endTime, $date = null): bool
    {
        $date = $date ?? $this->booking_date;

        if ($this->booking_date->toDateString() !== $date) {
            return false;
        }

        $existingStart = \Carbon\Carbon::parse($this->start_time);
        $existingEnd = \Carbon\Carbon::parse($this->end_time);
        $newStart = \Carbon\Carbon::parse($startTime);
        $newEnd = \Carbon\Carbon::parse($endTime);

        return !($newEnd <= $existingStart || $newStart >= $existingEnd);
    }
}
