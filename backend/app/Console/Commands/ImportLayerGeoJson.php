<?php

namespace App\Console\Commands;

use App\Models\Faculty;
use App\Models\Polygon;
use Illuminate\Console\Command;

/**
 * Import the project's two map layers from GeoJSON files on disk:
 *   - ZONA/                (layer: "zona")
 *   - Sebaran Fakultas/    (layer: "sebaran_fakultas")
 *
 *   php artisan siau:import-layers
 *   php artisan siau:import-layers --fresh   # delete existing rows in each layer first
 */
class ImportLayerGeoJson extends Command
{
    protected $signature = 'siau:import-layers
                            {--fresh : Delete existing polygons in each target layer before import}';

    protected $description = 'Import ZONA and Sebaran Fakultas GeoJSON folders as two distinct map layers';

    // Map feature "Name" -> faculty code in the faculties table.
    // Unmapped names get faculty_id = null.
    private const FACULTY_NAME_TO_CODE = [
        'FEB' => 'FEB',
        'FMIPA' => 'FMIPA',
        'FT' => 'FT',
        'FH' => 'FH',
        'FIB' => 'FIB',
        'FIB/KUI' => 'FIB',
        'FPertanian' => 'FP',
        'Fakultas Kedokteran' => 'FK',
    ];

    // Per-feature colors, modeled on the Universitas Udayana master plan
    // reference legends. [fill, stroke].
    private const ZONA_COLORS = [
        'Kawasan Inti'                => ['#d97706', '#92400e'], // orange
        'Kawasan Penyangga'           => ['#65a30d', '#365314'], // olive-green
        'Kawasan Hunian'              => ['#eab308', '#854d0e'], // yellow/gold
        'Kawasan Komersil'            => ['#0ea5e9', '#075985'], // sky blue
        'Kawasan Pelayanan Kesehatan' => ['#b91c1c', '#7f1d1d'], // red
    ];

    private const FAKULTAS_COLORS = [
        'FEB'                  => ['#166534', '#14532d'], // Ekonomi - dark green
        'FMIPA'                => ['#ec4899', '#9d174d'], // MIPA - magenta
        'FT'                   => ['#f97316', '#9a3412'], // Teknik - orange
        'FTP'                  => ['#84cc16', '#3f6212'], // Teknologi Pertanian - lime
        'FH'                   => ['#dc2626', '#7f1d1d'], // Hukum - red
        'FIB'                  => ['#facc15', '#854d0e'], // Ilmu Budaya - yellow
        'FIB/KUI'              => ['#fde68a', '#a16207'], // Kantor Urusan Internasional - cream
        'FKH'                  => ['#fda4af', '#9f1239'], // Kedokteran Hewan - salmon
        'FKP'                  => ['#c4b5fd', '#5b21b6'], // Kelautan & Perikanan - lavender
        'FPertanian'           => ['#1e3a8a', '#172554'], // Pertanian - dark blue
        'Fakultas Kedokteran'  => ['#86efac', '#15803d'], // Kedokteran & RS - light green
        'Fapet'                => ['#7f1d1d', '#450a0a'], // Peternakan - maroon
        'Fisip'                => ['#06b6d4', '#155e75'], // Sosial & Politik - cyan
        'Fpar'                 => ['#9333ea', '#581c87'], // Pariwisata - purple
        'Lecture Building'     => ['#ef4444', '#7f1d1d'], // bright red
        'Perpustakaan'         => ['#a16207', '#713f12'], // Rektorat/LPPM/Perpus - olive
        'Poliklinik'           => ['#bbf7d0', '#15803d'], // bagian RS Unud - mint
    ];

    public function handle(): int
    {
        $root = base_path('..');

        $layers = [
            'zona' => [
                'dir' => $root . DIRECTORY_SEPARATOR . 'ZONA',
                'fill' => '#9ca3af',
                'stroke' => '#4b5563',
                'opacity' => 0.5,
                'colors' => self::ZONA_COLORS,
            ],
            'sebaran_fakultas' => [
                'dir' => $root . DIRECTORY_SEPARATOR . 'Sebaran Fakultas',
                'fill' => '#9ca3af',
                'stroke' => '#4b5563',
                'opacity' => 0.55,
                'colors' => self::FAKULTAS_COLORS,
            ],
        ];

        if ($this->option('fresh')) {
            foreach (array_keys($layers) as $layer) {
                $deleted = Polygon::where('layer', $layer)->delete();
                $this->info("Cleared {$deleted} existing rows from layer '{$layer}'.");
            }
        }

        $facultyIdByCode = Faculty::pluck('id', 'code')->all();
        $grandTotal = 0;

        foreach ($layers as $layer => $cfg) {
            if (!is_dir($cfg['dir'])) {
                $this->warn("Skipping '{$layer}': directory not found at {$cfg['dir']}");
                continue;
            }

            $files = glob($cfg['dir'] . DIRECTORY_SEPARATOR . '*.geojson') ?: [];
            $this->info("Layer '{$layer}': found " . count($files) . ' file(s).');

            $layerCount = 0;
            foreach ($files as $file) {
                $raw = file_get_contents($file);
                $data = json_decode($raw, true);
                if (!is_array($data) || ($data['type'] ?? null) !== 'FeatureCollection') {
                    $this->warn('  Skipping ' . basename($file) . ': not a FeatureCollection.');
                    continue;
                }

                $sourceName = pathinfo($file, PATHINFO_FILENAME);
                $fileCount = 0;

                foreach ($data['features'] ?? [] as $i => $feature) {
                    $geometry = $feature['geometry'] ?? null;
                    if (empty($geometry)) {
                        continue;
                    }
                    $props = $feature['properties'] ?? [];
                    $featureName = $props['Name'] ?? $props['name'] ?? ($sourceName . ' ' . ($i + 1));

                    $facultyId = null;
                    if ($layer === 'sebaran_fakultas') {
                        $code = self::FACULTY_NAME_TO_CODE[$featureName] ?? null;
                        $facultyId = $code ? ($facultyIdByCode[$code] ?? null) : null;
                    }

                    [$fill, $stroke] = $cfg['colors'][$featureName] ?? [$cfg['fill'], $cfg['stroke']];

                    Polygon::create([
                        'name' => $featureName,
                        'layer' => $layer,
                        'faculty_id' => $facultyId,
                        'geojson' => $geometry,
                        'fill_color' => $fill,
                        'stroke_color' => $stroke,
                        'fill_opacity' => $cfg['opacity'],
                        'description' => 'Imported from ' . basename($file),
                        'is_active' => true,
                    ]);
                    $fileCount++;
                }

                $this->line('  ' . basename($file) . ": {$fileCount} feature(s) imported.");
                $layerCount += $fileCount;
            }

            $this->info("Layer '{$layer}' total: {$layerCount} polygon(s).");
            $grandTotal += $layerCount;
        }

        $this->info("Done. Imported {$grandTotal} polygon(s) across all layers.");
        return self::SUCCESS;
    }
}
