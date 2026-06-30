<?php

namespace App\Http\Controllers\Admin;

use App\Support\JsonEnvelope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

/**
 * Daftar Barang Ruangan (DBR) — read-only assembly of SIISYANA room +
 * asset data + hibah assets, in the shape needed by the BMN printable
 * DBR. Admin-only (sensitive: contains nilai_perolehan).
 *
 * SIISYANA connection is enforced read-only at the PDO layer; this
 * controller only issues SELECTs.
 */
class RoomDbrController extends Controller
{
    public function show(string $id, Request $request): JsonResponse
    {
        if (!ctype_digit($id)) {
            return JsonEnvelope::validation('id must be a positive integer', $request->path());
        }
        $roomId = (int) $id;

        // ---- Room + building + unit + jenis + responsible lecturer -------
        $rows = DB::connection('siisyana_ro')->select(
            'SELECT r.id, r.kode_ruangan, r.nama, r.max_kapasitas, r.id_dosen_penanggung_jawab, '
            . 'g.kode_gedung AS g_kode, g.nama AS g_nama, '
            . 'u.id_unit AS u_id, u.nama_unit_singkat AS u_singkat, u.nama_unit_panjang AS u_panjang, '
            . 'jr.jenis_ruangan AS jr_nama, '
            . 'd.nip AS d_nip, d.nama AS d_nama, d.gelar_depan AS d_gd, d.gelar_belakang AS d_gb '
            . 'FROM tb_m_ruangan r '
            . 'LEFT JOIN tb_m_gedung g ON g.id = r.id_gedung AND g.is_deleted = 0 '
            . 'LEFT JOIN m_unit u ON u.id_unit = r.id_unit '
            . 'LEFT JOIN tb_m_jenis_ruangan jr ON jr.id = r.id_jenis_ruangan '
            . 'LEFT JOIN m_dosen d ON d.id_dosen = r.id_dosen_penanggung_jawab '
            . 'WHERE r.id = ? AND r.is_deleted = 0 LIMIT 1',
            [$roomId]
        );
        if (empty($rows)) {
            return JsonEnvelope::notFound('ROOM_NOT_FOUND', "No room with id {$id}.", $request->path());
        }
        $r = $rows[0];

        // ---- SIISYANA assets currently placed in this room ---------------
        // Latest barang_ruangan_histories per id_barang pointing at this
        // room, intersected with non-deleted barangs_latest.
        $assetsRaw = DB::connection('siisyana_ro')->select(
            'SELECT b.id, b.kode_barang, b.no_aset, b.nama_barang, b.merk_type, '
            . 'b.kuantitas, b.tanggal_perolehan, b.kondisi_terakhir, '
            . 'b.nilai_perolehan, b.keterangan '
            . 'FROM barangs_latest b '
            . 'INNER JOIN barang_ruangan_histories brh ON brh.id_barang = b.id '
            . 'INNER JOIN (SELECT id_barang, MAX(id) AS max_id FROM barang_ruangan_histories GROUP BY id_barang) latest '
            . 'ON brh.id = latest.max_id '
            . 'WHERE b.dihapus = 0 AND brh.id_ruangan = ? '
            . 'ORDER BY b.kode_barang ASC, b.no_aset ASC',
            [$roomId]
        );

        // ---- Hibah assets (gateway-local) --------------------------------
        $hibahRaw = DB::connection('gateway')->table('hibah_assets')
            ->where('id_ruangan', $roomId)
            ->orderBy('kode_barang')
            ->get();

        $kondisiMap = [1 => 'Baik', 2 => 'Rusak Ringan', 3 => 'Rusak Berat'];
        $kondisiCodeMap = ['Baik' => 1, 'Rusak Ringan' => 2, 'Rusak Berat' => 3];

        $assets = [];
        $totalPerolehan = 0.0;
        foreach ($assetsRaw as $row) {
            $nilai = $row->nilai_perolehan !== null ? (float) $row->nilai_perolehan : null;
            if ($nilai !== null) $totalPerolehan += $nilai;
            $assets[] = [
                'source' => 'siisyana',
                'kode_barang' => $row->kode_barang,
                'no_aset' => $row->no_aset !== null ? (int) $row->no_aset : null,
                'nama_barang' => $row->nama_barang,
                'merk_type' => $row->merk_type,
                'kuantitas' => $row->kuantitas !== null ? (float) $row->kuantitas : null,
                'tanggal_perolehan' => $row->tanggal_perolehan,
                'tahun_perolehan' => $row->tanggal_perolehan
                    ? (int) substr((string) $row->tanggal_perolehan, 0, 4)
                    : null,
                'kondisi' => isset($kondisiMap[(int) $row->kondisi_terakhir]) ? $kondisiMap[(int) $row->kondisi_terakhir] : null,
                'kondisi_code' => $row->kondisi_terakhir !== null ? (int) $row->kondisi_terakhir : null,
                'nilai_perolehan' => $nilai,
                'keterangan' => $row->keterangan,
            ];
        }
        foreach ($hibahRaw as $row) {
            // Hibah records don't carry nilai_perolehan in this schema;
            // emit as null so the row still prints with a dash.
            $assets[] = [
                'source' => 'hibah',
                'kode_barang' => $row->kode_barang,
                'no_aset' => null,
                'nama_barang' => $row->nama_barang,
                'merk_type' => $row->merk_type,
                'kuantitas' => $row->kuantitas !== null ? (float) $row->kuantitas : null,
                'tanggal_perolehan' => $row->tanggal_perolehan,
                'tahun_perolehan' => $row->tanggal_perolehan
                    ? (int) substr((string) $row->tanggal_perolehan, 0, 4)
                    : null,
                'kondisi' => $row->kondisi,
                'kondisi_code' => isset($kondisiCodeMap[$row->kondisi]) ? $kondisiCodeMap[$row->kondisi] : null,
                'nilai_perolehan' => null,
                'keterangan' => null,
            ];
        }

        $penanggungJawab = null;
        if ($r->d_nama !== null) {
            $name = trim(($r->d_gd ? $r->d_gd . ' ' : '') . $r->d_nama . ($r->d_gb ? ', ' . $r->d_gb : ''));
            $penanggungJawab = [
                'nip' => $r->d_nip,
                'nama' => $name,
            ];
        }

        $generatedBy = $request->header('X-Siau-Admin-User') ?: 'admin';

        return JsonEnvelope::ok(
            [
                'room' => [
                    'id' => (string) $r->id,
                    'kode_ruangan' => $r->kode_ruangan,
                    'nama' => $r->nama,
                    'kapasitas' => $r->max_kapasitas !== null ? (int) $r->max_kapasitas : null,
                    'jenis_ruangan' => $r->jr_nama,
                    'gedung' => [
                        'kode' => $r->g_kode,
                        'nama' => $r->g_nama,
                    ],
                    'unit' => [
                        'id' => $r->u_id !== null ? (int) $r->u_id : null,
                        'singkat' => $r->u_singkat,
                        'panjang' => $r->u_panjang,
                    ],
                    'penanggung_jawab' => $penanggungJawab,
                ],
                'assets' => $assets,
                'totals' => [
                    'count' => count($assets),
                    'nilai_perolehan' => $totalPerolehan,
                ],
                'document' => [
                    // KOP per official Unud letterhead.
                    'kementerian' => 'Kementerian Pendidikan Tinggi, Sains, dan Teknologi',
                    'satker' => 'Universitas Udayana',
                    'alamat' => 'Jalan Raya Kampus Unud, Jimbaran, Badung, Bali 80361',
                    'telepon' => 'Telepon (0361) 701954, 701797, 701812',
                    'laman' => 'Laman: www.unud.ac.id',
                    'judul' => 'Daftar Barang Ruangan (DBR)',
                ],
                'meta' => [
                    'generated_at' => now()->toAtomString(),
                    'generated_by' => $generatedBy,
                    'source' => 'siisyana+hibah',
                ],
            ]
        );
    }
}
