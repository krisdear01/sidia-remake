<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('admin_audit_log', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('action', 64);          // e.g. 'siau.identity_map.resync'
            $table->string('subject', 128)->nullable(); // siisyana_room_id or null
            // SQLite stores JSON as text — fine. MySQL/Postgres use native JSON.
            $table->json('payload')->nullable();
            $table->string('outcome', 16)->default('pending'); // pending|success|failed
            $table->string('error_code', 64)->nullable();
            $table->string('actor_ip', 64)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['action', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_audit_log');
    }
};
