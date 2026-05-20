<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('gateway')->create('admin_audit_log', function (Blueprint $t) {
            $t->id();
            $t->string('action', 64);
            $t->string('subject', 128)->nullable();
            $t->json('payload')->nullable();
            $t->string('actor_ip', 64);
            $t->timestamp('created_at')->useCurrent();
            $t->index('action');
            $t->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::connection('gateway')->dropIfExists('admin_audit_log');
    }
};
