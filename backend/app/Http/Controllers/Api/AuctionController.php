<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuctionItem;
use App\Models\Bid;
use Illuminate\Http\Request;

class AuctionController extends Controller
{
    /**
     * List all published auctions/rentals (public)
     */
    public function index(Request $request)
    {
        $query = AuctionItem::query()
            ->with(['winner:id,name', 'creator:id,name'])
            ->published();

        // Filter by auction type
        if ($request->has('type')) {
            $type = $request->type;
            if ($type === 'auction') {
                $query->auctions();
            } elseif ($type === 'rent') {
                $query->rentals();
            } elseif ($type === 'facility') {
                $query->facilities();
            }
        }

        // Filter by item type
        if ($request->has('item_type')) {
            $query->where('item_type', $request->item_type);
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
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('location_name', 'like', "%{$search}%");
            });
        }

        // Sort
        $sortBy = $request->get('sort_by', 'start_date');
        $sortDir = $request->get('sort_dir', 'asc');
        $query->orderBy($sortBy, $sortDir);

        $auctions = $query->paginate($request->get('per_page', 12));

        return response()->json($auctions);
    }

    /**
     * Get single auction details (public)
     */
    public function show(int $id)
    {
        $auction = AuctionItem::with(['winner:id,name', 'creator:id,name'])
            ->findOrFail($id);

        // Get bid count and highest bid info
        $bidCount = $auction->bids()->count();
        $highestBid = $auction->highestBid();

        return response()->json([
            'auction' => $auction,
            'stats' => [
                'bid_count' => $bidCount,
                'highest_bid' => $highestBid ? $highestBid->bid_amount : null,
                'is_active' => $auction->isActive(),
                'has_ended' => $auction->hasEnded(),
            ]
        ]);
    }

    /**
     * Get bid history for an auction (public for open bidding)
     */
    public function bids(int $id)
    {
        $auction = AuctionItem::findOrFail($id);

        // Only show bid history for open bidding
        if ($auction->bidding_type !== 'open') {
            return response()->json([
                'message' => 'Bid history tidak tersedia untuk closed bidding.'
            ], 403);
        }

        $bids = Bid::where('auction_item_id', $id)
            ->with('bidder:id,name')
            ->orderBy('bid_amount', 'desc')
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->map(function ($bid) {
                return [
                    'id' => $bid->id,
                    'bidder_name' => $this->maskName($bid->bidder->name),
                    'bid_amount' => $bid->bid_amount,
                    'is_winning_bid' => $bid->is_winning_bid,
                    'created_at' => $bid->created_at,
                ];
            });

        return response()->json([
            'bids' => $bids,
            'total_bids' => Bid::where('auction_item_id', $id)->count(),
        ]);
    }

    /**
     * List facilities available for rent (public)
     */
    public function facilities(Request $request)
    {
        $query = AuctionItem::query()
            ->facilities()
            ->published()
            ->with('creator:id,name');

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('location_name', 'like', "%{$search}%");
            });
        }

        $facilities = $query->orderBy('title')->get();

        return response()->json($facilities);
    }

    /**
     * Check facility availability for a date
     */
    public function facilityAvailability(Request $request, int $id)
    {
        $request->validate([
            'date' => 'required|date|after_or_equal:today',
        ]);

        $facility = AuctionItem::facilities()->findOrFail($id);
        $date = $request->date;

        // Get existing bookings for this date
        $bookings = $facility->bookings()
            ->forDate($date)
            ->whereIn('status', ['approved', 'pending'])
            ->select('id', 'start_time', 'end_time', 'status')
            ->orderBy('start_time')
            ->get();

        return response()->json([
            'facility_id' => $id,
            'date' => $date,
            'bookings' => $bookings,
            'price_per_hour' => $facility->limit_price, // Assuming limit_price is hourly rate
        ]);
    }

    /**
     * Mask bidder name for privacy
     */
    private function maskName(string $name): string
    {
        $parts = explode(' ', $name);
        $masked = [];

        foreach ($parts as $part) {
            if (strlen($part) <= 2) {
                $masked[] = $part;
            } else {
                $masked[] = substr($part, 0, 1) . str_repeat('*', strlen($part) - 2) . substr($part, -1);
            }
        }

        return implode(' ', $masked);
    }
}
