<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Hibah ("donated") assets — locally-created asset records that augment the
 * read-only SIISYANA inventory. These belong to the gateway and never touch
 * c1db_siisyana or c10simpr. `id_ruangan` is a soft reference to
 * tb_m_ruangan.id (SIISYANA) — no DB-level FK because that table lives on a
 * different (read-only) connection.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('gateway')->create('hibah_assets', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->unsignedBigInteger('id_ruangan')->index();
            $t->string('kode_barang', 64)->unique();
            $t->string('nama_barang', 255);
            $t->string('merk_type', 255)->nullable();
            $t->enum('kondisi', ['Baik', 'Rusak Ringan', 'Rusak Berat'])->nullable();
            $t->decimal('kuantitas', 12, 2)->nullable();
            $t->date('tanggal_perolehan')->nullable();
            $t->string('created_by_email', 255)->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::connection('gateway')->dropIfExists('hibah_assets');
    }
};
