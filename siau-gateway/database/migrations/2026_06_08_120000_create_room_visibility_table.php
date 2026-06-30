<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('gateway')->create('room_visibility', function (Blueprint $t) {
            $t->unsignedBigInteger('siisyana_room_id')->primary();
            $t->boolean('is_public')->default(true);
            $t->string('updated_by', 128)->nullable();
            $t->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::connection('gateway')->dropIfExists('room_visibility');
    }
};
