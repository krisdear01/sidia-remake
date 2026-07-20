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
        Schema::create('room_utilizations', function (Blueprint $table) {
            $table->id();
            $table->string('semester'); // e.g. "Genap 2025/2026"
            $table->enum('session', ['pagi', 'malam']);
            $table->string('faculty_name');
            $table->foreignId('faculty_id')->nullable()->constrained()->nullOnDelete();
            $table->string('campus_name');
            $table->foreignId('location_id')->nullable()->constrained()->nullOnDelete();
            $table->string('gedung_name');
            $table->foreignId('building_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('room_count');
            $table->decimal('utilization_percent', 5, 2);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['semester', 'session', 'faculty_name', 'gedung_name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('room_utilizations');
    }
};
