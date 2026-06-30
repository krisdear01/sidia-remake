<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('polygons', function (Blueprint $table) {
            $table->string('layer')->nullable()->index()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('polygons', function (Blueprint $table) {
            $table->dropIndex(['layer']);
            $table->dropColumn('layer');
        });
    }
};
