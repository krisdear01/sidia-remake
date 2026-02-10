<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('auction_items', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();

            // Item type: what is being auctioned/rented
            $table->enum('item_type', ['land', 'building', 'room', 'facility', 'other']);
            $table->string('itemable_type')->nullable(); // Polymorphic type
            $table->unsignedBigInteger('itemable_id')->nullable(); // Polymorphic ID

            // Auction type
            $table->enum('auction_type', ['auction', 'rent', 'facility_rent']);

            // Pricing
            $table->decimal('limit_price', 15, 2); // Minimum bid/rent price
            $table->decimal('current_highest_bid', 15, 2)->nullable();
            $table->decimal('deposit_amount', 15, 2);
            $table->integer('deposit_percentage')->default(20);

            // For rentals - period configuration
            $table->enum('rent_period_type', ['hourly', 'daily', 'weekly', 'monthly', 'yearly'])->nullable();
            $table->integer('rent_duration')->nullable();

            // Schedule
            $table->datetime('start_date');
            $table->datetime('end_date');

            // Settings
            $table->enum('bidding_type', ['open', 'closed'])->default('open');
            $table->enum('status', ['draft', 'upcoming', 'active', 'ended', 'cancelled', 'rented'])->default('draft');

            // Winner
            $table->foreignId('winner_bidder_id')->nullable()->constrained('bidders')->nullOnDelete();

            // Media & terms
            $table->json('images')->nullable();
            $table->text('terms_conditions')->nullable();
            $table->text('facility_rules')->nullable(); // For public facilities

            // Location info (for display)
            $table->string('location_name')->nullable();
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();

            // Admin
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            // Index for polymorphic relation
            $table->index(['itemable_type', 'itemable_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('auction_items');
    }
};
