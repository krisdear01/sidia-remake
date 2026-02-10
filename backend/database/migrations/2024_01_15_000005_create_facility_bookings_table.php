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
        Schema::create('facility_bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('auction_item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('bidder_id')->constrained()->cascadeOnDelete();

            // Booking schedule
            $table->date('booking_date');
            $table->time('start_time');
            $table->time('end_time');

            // Booking details
            $table->string('purpose');
            $table->text('purpose_description')->nullable();
            $table->integer('attendees')->nullable();
            $table->text('special_requests')->nullable();

            // Pricing
            $table->decimal('total_price', 15, 2);
            $table->string('payment_proof')->nullable();

            // Status
            $table->enum('status', ['pending', 'approved', 'rejected', 'completed', 'cancelled'])->default('pending');
            $table->text('admin_notes')->nullable();
            $table->text('rejection_reason')->nullable();

            // Admin actions
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            // Index for availability checking
            $table->index(['auction_item_id', 'booking_date', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('facility_bookings');
    }
};
