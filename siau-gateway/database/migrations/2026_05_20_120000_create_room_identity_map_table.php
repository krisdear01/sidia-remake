<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('gateway')->create('room_identity_map', function (Blueprint $t) {
            $t->unsignedBigInteger('siisyana_room_id')->primary();
            $t->unsignedBigInteger('sipirang_room_id')->nullable()->unique();
            $t->string('kode_ruangan', 64);
            $t->enum('confidence', ['exact', 'fuzzy', 'manual'])->default('exact');
            $t->timestamp('last_reconciled_at')->useCurrent();
            $t->text('note')->nullable();
            $t->index('kode_ruangan');
        });
    }

    public function down(): void
    {
        Schema::connection('gateway')->dropIfExists('room_identity_map');
    }
};
