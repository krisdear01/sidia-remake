<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Bidder extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    protected $fillable = [
        'name',
        'email',
        'password',
        'nik',
        'npwp',
        'address',
        'ktp_file',
        'npwp_file',
        'verification_status',
        'rejection_reason',
        'email_verified_at',
        'email_verification_token',
        'verified_at',
        'verified_by',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'email_verification_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
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

    public function wonAuctions(): HasMany
    {
        return $this->hasMany(AuctionItem::class, 'winner_bidder_id');
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    // Helpers
    public function isVerified(): bool
    {
        return $this->verification_status === 'verified';
    }

    public function isEmailVerified(): bool
    {
        return $this->email_verified_at !== null;
    }

    public function canBid(): bool
    {
        return $this->is_active && $this->isVerified() && $this->isEmailVerified();
    }

    // Scopes
    public function scopeVerified($query)
    {
        return $query->where('verification_status', 'verified');
    }

    public function scopePending($query)
    {
        return $query->where('verification_status', 'pending');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
