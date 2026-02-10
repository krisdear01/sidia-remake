<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuctionDeposit;
use App\Models\AuctionItem;
use App\Models\Bid;
use App\Models\FacilityBooking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BidController extends Controller
{
    /**
     * Submit deposit for an auction
     */
    public function submitDeposit(Request $request, int $auctionId)
    {
        $bidder = $request->user();

        if (!$bidder->canBid()) {
            return response()->json([
                'message' => 'Akun Anda belum terverifikasi. Silakan lengkapi verifikasi email dan dokumen.'
            ], 403);
        }

        $auction = AuctionItem::findOrFail($auctionId);

        // Check if auction accepts bids
        if (!in_array($auction->status, ['upcoming', 'active'])) {
            return response()->json([
                'message' => 'Lelang ini tidak lagi menerima deposit.'
            ], 400);
        }

        // Check for existing deposit
        $existingDeposit = AuctionDeposit::where('auction_item_id', $auctionId)
            ->where('bidder_id', $bidder->id)
            ->first();

        if ($existingDeposit) {
            return response()->json([
                'message' => 'Anda sudah mengirimkan deposit untuk lelang ini.',
                'deposit' => $existingDeposit,
            ], 400);
        }

        $validated = $request->validate([
            'payment_proof' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        $paymentProof = $request->file('payment_proof')
            ->store('deposits/' . $auctionId, 'public');

        $deposit = AuctionDeposit::create([
            'auction_item_id' => $auctionId,
            'bidder_id' => $bidder->id,
            'amount' => $auction->deposit_amount,
            'payment_proof' => $paymentProof,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Deposit berhasil dikirim. Silakan tunggu verifikasi oleh admin.',
            'deposit' => $deposit,
        ], 201);
    }

    /**
     * Place a bid on an auction
     */
    public function placeBid(Request $request, int $auctionId)
    {
        $bidder = $request->user();

        if (!$bidder->canBid()) {
            return response()->json([
                'message' => 'Akun Anda belum terverifikasi.'
            ], 403);
        }

        $auction = AuctionItem::findOrFail($auctionId);

        // Check if auction is active
        if (!$auction->isActive()) {
            return response()->json([
                'message' => 'Lelang ini tidak aktif.'
            ], 400);
        }

        // Check if bidder has verified deposit
        $deposit = AuctionDeposit::where('auction_item_id', $auctionId)
            ->where('bidder_id', $bidder->id)
            ->where('status', 'verified')
            ->first();

        if (!$deposit) {
            return response()->json([
                'message' => 'Anda harus memiliki deposit yang terverifikasi untuk mengikuti lelang.'
            ], 403);
        }

        $validated = $request->validate([
            'bid_amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:500',
        ]);

        $bidAmount = $validated['bid_amount'];

        // Validate bid amount
        if ($bidAmount < $auction->limit_price) {
            return response()->json([
                'message' => 'Penawaran harus minimal Rp ' . number_format((float) $auction->limit_price, 0, ',', '.'),
            ], 400);
        }

        if ($auction->current_highest_bid && $bidAmount <= $auction->current_highest_bid) {
            return response()->json([
                'message' => 'Penawaran harus lebih tinggi dari penawaran tertinggi saat ini: Rp ' .
                    number_format((float) $auction->current_highest_bid, 0, ',', '.'),
            ], 400);
        }

        // Use transaction for atomicity
        $bid = DB::transaction(function () use ($auction, $bidder, $bidAmount, $validated) {
            $bid = Bid::create([
                'auction_item_id' => $auction->id,
                'bidder_id' => $bidder->id,
                'bid_amount' => $bidAmount,
                'notes' => $validated['notes'] ?? null,
            ]);

            // Update auction highest bid
            $auction->update([
                'current_highest_bid' => $bidAmount,
            ]);

            return $bid;
        });

        return response()->json([
            'message' => 'Penawaran berhasil dikirim!',
            'bid' => [
                'id' => $bid->id,
                'bid_amount' => $bid->bid_amount,
                'created_at' => $bid->created_at,
            ],
            'auction' => [
                'current_highest_bid' => $auction->fresh()->current_highest_bid,
            ]
        ], 201);
    }

    /**
     * Get bidder's bid history
     */
    public function myBids(Request $request)
    {
        $bidder = $request->user();

        $bids = Bid::where('bidder_id', $bidder->id)
            ->with(['auctionItem:id,title,status,current_highest_bid,end_date'])
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($bids);
    }

    /**
     * Get bidder's deposits
     */
    public function myDeposits(Request $request)
    {
        $bidder = $request->user();

        $deposits = AuctionDeposit::where('bidder_id', $bidder->id)
            ->with(['auctionItem:id,title,status,end_date'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($deposits);
    }

    /**
     * Book a facility
     */
    public function bookFacility(Request $request, int $facilityId)
    {
        $bidder = $request->user();

        if (!$bidder->canBid()) {
            return response()->json([
                'message' => 'Akun Anda belum terverifikasi.'
            ], 403);
        }

        $facility = AuctionItem::facilities()->findOrFail($facilityId);

        if ($facility->status !== 'active') {
            return response()->json([
                'message' => 'Fasilitas ini tidak tersedia untuk disewa.'
            ], 400);
        }

        $validated = $request->validate([
            'booking_date' => 'required|date|after_or_equal:today',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'purpose' => 'required|string|max:255',
            'purpose_description' => 'nullable|string|max:1000',
            'attendees' => 'nullable|integer|min:1',
            'special_requests' => 'nullable|string|max:1000',
            'payment_proof' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        // Check for conflicts
        $existingBookings = FacilityBooking::where('auction_item_id', $facilityId)
            ->forDate($validated['booking_date'])
            ->whereIn('status', ['approved', 'pending'])
            ->get();

        foreach ($existingBookings as $booking) {
            if ($booking->conflictsWith($validated['start_time'], $validated['end_time'], $validated['booking_date'])) {
                return response()->json([
                    'message' => 'Jadwal yang dipilih bentrok dengan pemesanan lain.',
                    'conflict' => [
                        'start_time' => $booking->start_time,
                        'end_time' => $booking->end_time,
                    ]
                ], 400);
            }
        }

        // Calculate total price (assuming limit_price is hourly rate)
        $startTime = \Carbon\Carbon::parse($validated['start_time']);
        $endTime = \Carbon\Carbon::parse($validated['end_time']);
        $durationHours = $startTime->diffInMinutes($endTime) / 60;
        $totalPrice = $facility->limit_price * $durationHours;

        $paymentProof = null;
        if ($request->hasFile('payment_proof')) {
            $paymentProof = $request->file('payment_proof')
                ->store('facility-bookings/' . $facilityId, 'public');
        }

        $booking = FacilityBooking::create([
            'auction_item_id' => $facilityId,
            'bidder_id' => $bidder->id,
            'booking_date' => $validated['booking_date'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'purpose' => $validated['purpose'],
            'purpose_description' => $validated['purpose_description'] ?? null,
            'attendees' => $validated['attendees'] ?? null,
            'special_requests' => $validated['special_requests'] ?? null,
            'total_price' => $totalPrice,
            'payment_proof' => $paymentProof,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Pemesanan fasilitas berhasil dikirim. Silakan tunggu persetujuan admin.',
            'booking' => $booking,
        ], 201);
    }

    /**
     * Get bidder's facility bookings
     */
    public function myBookings(Request $request)
    {
        $bidder = $request->user();

        $bookings = FacilityBooking::where('bidder_id', $bidder->id)
            ->with(['facility:id,title,location_name'])
            ->orderBy('booking_date', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($bookings);
    }

    /**
     * Cancel a booking
     */
    public function cancelBooking(Request $request, int $bookingId)
    {
        $bidder = $request->user();

        $booking = FacilityBooking::where('id', $bookingId)
            ->where('bidder_id', $bidder->id)
            ->firstOrFail();

        if (!in_array($booking->status, ['pending', 'approved'])) {
            return response()->json([
                'message' => 'Pemesanan ini tidak dapat dibatalkan.'
            ], 400);
        }

        // Check if booking date has passed
        if (\Carbon\Carbon::parse($booking->booking_date)->isPast()) {
            return response()->json([
                'message' => 'Tidak dapat membatalkan pemesanan yang sudah lewat tanggal.'
            ], 400);
        }

        $booking->update([
            'status' => 'cancelled',
        ]);

        return response()->json([
            'message' => 'Pemesanan berhasil dibatalkan.'
        ]);
    }
}
