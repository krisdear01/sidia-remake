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
        Schema::create('schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->string('subject');
            $table->string('department')->nullable(); // Prodi
            $table->string('lecturer')->nullable();
            $table->date('date');
            $table->time('start_time');
            $table->time('end_time');
            $table->enum('day_of_week', ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'])->nullable();
            $table->boolean('is_recurring')->default(false);
            $table->string('sipirang_id')->nullable(); // ID from SIPIRANG API
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedules');
    }
};
