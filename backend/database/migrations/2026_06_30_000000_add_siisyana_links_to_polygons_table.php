<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('polygons', function (Blueprint $table) {
            // Links a map polygon to its live SIISYANA record so the public map
            // can pull KIB / room / gallery enrichment via the siau-gateway.
            // Nullable: an unlinked polygon still renders, it just has no detail.
            $table->unsignedBigInteger('siisyana_gedung_id')->nullable()->index()->after('location_id');
            $table->unsignedBigInteger('siisyana_tanah_id')->nullable()->index()->after('siisyana_gedung_id');
            // Discriminator: 'bangunan' resolves via siisyana_gedung_id,
            // 'tanah' via siisyana_tanah_id. Null = unmapped.
            $table->string('asset_type', 16)->nullable()->after('siisyana_tanah_id');
        });
    }

    public function down(): void
    {
        Schema::table('polygons', function (Blueprint $table) {
            $table->dropIndex(['siisyana_gedung_id']);
            $table->dropIndex(['siisyana_tanah_id']);
            $table->dropColumn(['siisyana_gedung_id', 'siisyana_tanah_id', 'asset_type']);
        });
    }
};
