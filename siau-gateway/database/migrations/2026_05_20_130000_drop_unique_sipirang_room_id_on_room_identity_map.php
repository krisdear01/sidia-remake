<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The PRD §6.5 schema declares sipirang_room_id UNIQUE, but in live data
     * multiple SIISYANA rooms can share a kode_ruangan that resolves to a
     * single SIPIRANG room (e.g. when SIPIRANG has merged duplicates).
     * We keep an index for lookup speed but drop uniqueness.
     */
    public function up(): void
    {
        Schema::connection('gateway')->table('room_identity_map', function (Blueprint $t) {
            $t->dropUnique(['sipirang_room_id']);
            $t->index('sipirang_room_id');
        });
    }

    public function down(): void
    {
        Schema::connection('gateway')->table('room_identity_map', function (Blueprint $t) {
            $t->dropIndex(['sipirang_room_id']);
            $t->unique('sipirang_room_id');
        });
    }
};
