<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuctionDeposit;
use App\Models\AuctionItem;
use App\Models\Bid;
use App\Models\Bidder;
use App\Models\FacilityBooking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AdminAuctionController extends Controller
{
    // ==================== AUCTION MANAGEMENT ====================

    /**
     * List all auctions (admin)
     */
    public function index(Request $request)
    {
        $query = AuctionItem::query()
            ->with(['winner:id,name', 'creator:id,name']);

        // Filter by auction type
        if ($request->has('type')) {
            $query->where('auction_type', $request->type);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $auctions = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($auctions);
    }

    /**
     * Create new auction item
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'item_type' => 'required|in:land,building,room,facility,other',
            'auction_type' => 'required|in:auction,rent,facility_rent',
            'limit_price' => 'required|numeric|min:0',
            'deposit_percentage' => 'required|integer|min:10|max:100',
            'rent_period_type' => 'nullable|in:hourly,daily,weekly,monthly,yearly',
            'rent_duration' => 'nullable|integer|min:1',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'required|date|after:start_date',
            'bidding_type' => 'nullable|in:open,closed',
            'terms_conditions' => 'nullable|string',
            'facility_rules' => 'nullable|string',
            'location_name' => 'nullable|string|max:255',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'images' => 'nullable|array',
            'images.*' => 'file|mimes:jpg,jpeg,png,webp|max:10240',
        ]);

        // Calculate deposit amount
        $depositAmount = ($validated['limit_price'] * $validated['deposit_percentage']) / 100;

        // Handle image uploads
        $imagePaths = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $imagePaths[] = $image->store('auction-images', 'public');
            }
        }

        $auction = AuctionItem::create([
            ...$validated,
            'deposit_amount' => $depositAmount,
            'images' => $imagePaths,
            'status' => 'draft',
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Lelang berhasil dibuat.',
            'auction' => $auction,
        ], 201);
    }

    /**
     * Update auction item
     */
    public function update(Request $request, int $id)
    {
        $auction = AuctionItem::findOrFail($id);

        // Don't allow editing active auctions with bids
        if ($auction->status === 'active' && $auction->bids()->count() > 0) {
            return response()->json([
                'message' => 'Tidak dapat mengubah lelang yang sudah memiliki penawaran.'
            ], 400);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'item_type' => 'sometimes|in:land,building,room,facility,other',
            'auction_type' => 'sometimes|in:auction,rent,facility_rent',
            'limit_price' => 'sometimes|numeric|min:0',
            'deposit_percentage' => 'sometimes|integer|min:10|max:100',
            'rent_period_type' => 'nullable|in:hourly,daily,weekly,monthly,yearly',
            'rent_duration' => 'nullable|integer|min:1',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after:start_date',
            'bidding_type' => 'nullable|in:open,closed',
            'terms_conditions' => 'nullable|string',
            'facility_rules' => 'nullable|string',
            'location_name' => 'nullable|string|max:255',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'new_images' => 'nullable|array',
            'new_images.*' => 'file|mimes:jpg,jpeg,png,webp|max:10240',
            'remove_images' => 'nullable|array',
        ]);

        // Handle new image uploads
        if ($request->hasFile('new_images')) {
            $existingImages = $auction->images ?? [];
            foreach ($request->file('new_images') as $image) {
                $existingImages[] = $image->store('auction-images', 'public');
            }
            $validated['images'] = $existingImages;
        }

        // Handle image removals
        if ($request->has('remove_images')) {
            $existingImages = $auction->images ?? [];
            foreach ($request->remove_images as $imagePath) {
                Storage::disk('public')->delete($imagePath);
                $existingImages = array_filter($existingImages, fn($img) => $img !== $imagePath);
            }
            $validated['images'] = array_values($existingImages);
        }

        // Recalculate deposit if price or percentage changed
        if (isset($validated['limit_price']) || isset($validated['deposit_percentage'])) {
            $price = $validated['limit_price'] ?? $auction->limit_price;
            $percentage = $validated['deposit_percentage'] ?? $auction->deposit_percentage;
            $validated['deposit_amount'] = ($price * $percentage) / 100;
        }

        unset($validated['new_images'], $validated['remove_images']);

        $auction->update($validated);

        return response()->json([
            'message' => 'Lelang berhasil diperbarui.',
            'auction' => $auction->fresh(),
        ]);
    }

    /**
     * Update auction status
     */
    public function updateStatus(Request $request, int $id)
    {
        $auction = AuctionItem::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:draft,upcoming,active,ended,cancelled',
        ]);

        $newStatus = $validated['status'];

        // Validate status transitions
        $allowedTransitions = [
            'draft' => ['upcoming', 'cancelled'],
            'upcoming' => ['active', 'cancelled'],
            'active' => ['ended', 'cancelled'],
            'ended' => [],
            'cancelled' => [],
        ];

        if (!in_array($newStatus, $allowedTransitions[$auction->status])) {
            return response()->json([
                'message' => "Tidak dapat mengubah status dari '{$auction->status}' ke '{$newStatus}'."
            ], 400);
        }

        $auction->update(['status' => $newStatus]);

        return response()->json([
            'message' => 'Status lelang berhasil diperbarui.',
            'auction' => $auction->fresh(),
        ]);
    }

    /**
     * Delete auction
     */
    public function destroy(int $id)
    {
        $auction = AuctionItem::findOrFail($id);

        if ($auction->bids()->count() > 0) {
            return response()->json([
                'message' => 'Tidak dapat menghapus lelang yang sudah ada penawarannya.'
            ], 400);
        }

        // Delete associated images
        if ($auction->images) {
            foreach ($auction->images as $image) {
                Storage::disk('public')->delete($image);
            }
        }

        $auction->delete();

        return response()->json([
            'message' => 'Lelang berhasil dihapus.'
        ]);
    }

    /**
     * Determine auction winner
     */
    public function determineWinner(Request $request, int $id)
    {
        $auction = AuctionItem::findOrFail($id);

        if ($auction->auction_type !== 'auction') {
            return response()->json([
                'message' => 'Penentuan pemenang hanya untuk tipe lelang.'
            ], 400);
        }

        if ($auction->winner_bidder_id) {
            return response()->json([
                'message' => 'Pemenang sudah ditentukan sebelumnya.'
            ], 400);
        }

        // Get highest bid
        $highestBid = $auction->bids()
            ->orderBy('bid_amount', 'desc')
            ->first();

        if (!$highestBid) {
            return response()->json([
                'message' => 'Tidak ada penawaran untuk lelang ini.'
            ], 400);
        }

        DB::transaction(function () use ($auction, $highestBid) {
            // Mark winning bid
            $highestBid->update(['is_winning_bid' => true]);

            // Update auction
            $auction->update([
                'winner_bidder_id' => $highestBid->bidder_id,
                'status' => 'ended',
            ]);
        });

        return response()->json([
            'message' => 'Pemenang lelang berhasil ditentukan.',
            'winner' => [
                'bidder' => $highestBid->bidder->only(['id', 'name', 'email']),
                'winning_bid' => $highestBid->bid_amount,
            ],
        ]);
    }

    // ==================== BIDDER MANAGEMENT ====================

    /**
     * List all bidders
     */
    public function bidders(Request $request)
    {
        $query = Bidder::query();

        if ($request->has('status')) {
            $query->where('verification_status', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('nik', 'like', "%{$search}%");
            });
        }

        $bidders = $query->withCount(['bids', 'deposits', 'bookings'])
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($bidders);
    }

    /**
     * Get bidder detail
     */
    public function bidderShow(int $id)
    {
        $bidder = Bidder::with(['verifiedBy:id,name'])
            ->withCount(['bids', 'deposits', 'bookings', 'wonAuctions'])
            ->findOrFail($id);

        // Get file URLs
        $bidder->ktp_file_url = $bidder->ktp_file ? Storage::url($bidder->ktp_file) : null;
        $bidder->npwp_file_url = $bidder->npwp_file ? Storage::url($bidder->npwp_file) : null;

        return response()->json($bidder);
    }

    /**
     * Verify bidder
     */
    public function verifyBidder(Request $request, int $id)
    {
        $bidder = Bidder::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:verified,rejected',
            'rejection_reason' => 'required_if:status,rejected|nullable|string|max:500',
        ]);

        $bidder->update([
            'verification_status' => $validated['status'],
            'rejection_reason' => $validated['status'] === 'rejected' ? $validated['rejection_reason'] : null,
            'verified_at' => $validated['status'] === 'verified' ? now() : null,
            'verified_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => $validated['status'] === 'verified'
                ? 'Bidder berhasil diverifikasi.'
                : 'Bidder ditolak.',
            'bidder' => $bidder->fresh(),
        ]);
    }

    // ==================== DEPOSIT MANAGEMENT ====================

    /**
     * List deposits
     */
    public function deposits(Request $request)
    {
        $query = AuctionDeposit::query()
            ->with(['auctionItem:id,title', 'bidder:id,name,email']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('auction_id')) {
            $query->where('auction_item_id', $request->auction_id);
        }

        $deposits = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($deposits);
    }

    /**
     * Verify deposit
     */
    public function verifyDeposit(Request $request, int $id)
    {
        $deposit = AuctionDeposit::findOrFail($id);

        if ($deposit->status !== 'pending') {
            return response()->json([
                'message' => 'Deposit ini sudah diverifikasi sebelumnya.'
            ], 400);
        }

        $validated = $request->validate([
            'status' => 'required|in:verified,forfeited',
            'admin_notes' => 'nullable|string|max:500',
        ]);

        $deposit->update([
            'status' => $validated['status'],
            'admin_notes' => $validated['admin_notes'] ?? null,
            'verified_at' => now(),
            'verified_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Deposit berhasil diverifikasi.',
            'deposit' => $deposit->fresh(),
        ]);
    }

    /**
     * Process deposit refund
     */
    public function refundDeposit(Request $request, int $id)
    {
        $deposit = AuctionDeposit::findOrFail($id);

        if ($deposit->status !== 'verified') {
            return response()->json([
                'message' => 'Hanya deposit terverifikasi yang dapat di-refund.'
            ], 400);
        }

        $validated = $request->validate([
            'refund_proof' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'admin_notes' => 'nullable|string|max:500',
        ]);

        $refundProof = null;
        if ($request->hasFile('refund_proof')) {
            $refundProof = $request->file('refund_proof')->store('refunds', 'public');
        }

        $deposit->update([
            'status' => 'refunded',
            'refund_proof' => $refundProof,
            'refunded_at' => now(),
            'admin_notes' => $validated['admin_notes'] ?? $deposit->admin_notes,
        ]);

        return response()->json([
            'message' => 'Refund berhasil diproses.',
            'deposit' => $deposit->fresh(),
        ]);
    }

    // ==================== FACILITY BOOKING MANAGEMENT ====================

    /**
     * List facility bookings
     */
    public function facilityBookings(Request $request)
    {
        $query = FacilityBooking::query()
            ->with(['facility:id,title,location_name', 'bidder:id,name,email']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('facility_id')) {
            $query->where('auction_item_id', $request->facility_id);
        }

        if ($request->has('date')) {
            $query->whereDate('booking_date', $request->date);
        }

        $bookings = $query->orderBy('booking_date', 'desc')
            ->orderBy('start_time')
            ->paginate($request->get('per_page', 20));

        return response()->json($bookings);
    }

    /**
     * Approve/reject facility booking
     */
    public function updateBookingStatus(Request $request, int $id)
    {
        $booking = FacilityBooking::findOrFail($id);

        if ($booking->status !== 'pending') {
            return response()->json([
                'message' => 'Pemesanan ini sudah diproses sebelumnya.'
            ], 400);
        }

        $validated = $request->validate([
            'status' => 'required|in:approved,rejected',
            'admin_notes' => 'nullable|string|max:500',
            'rejection_reason' => 'required_if:status,rejected|nullable|string|max:500',
        ]);

        $booking->update([
            'status' => $validated['status'],
            'admin_notes' => $validated['admin_notes'] ?? null,
            'rejection_reason' => $validated['status'] === 'rejected' ? $validated['rejection_reason'] : null,
            'approved_at' => $validated['status'] === 'approved' ? now() : null,
            'approved_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => $validated['status'] === 'approved'
                ? 'Pemesanan disetujui.'
                : 'Pemesanan ditolak.',
            'booking' => $booking->fresh(),
        ]);
    }

    /**
     * Mark booking as completed
     */
    public function completeBooking(int $id)
    {
        $booking = FacilityBooking::findOrFail($id);

        if ($booking->status !== 'approved') {
            return response()->json([
                'message' => 'Hanya pemesanan yang disetujui yang dapat diselesaikan.'
            ], 400);
        }

        $booking->update(['status' => 'completed']);

        return response()->json([
            'message' => 'Pemesanan berhasil diselesaikan.',
            'booking' => $booking->fresh(),
        ]);
    }
}
