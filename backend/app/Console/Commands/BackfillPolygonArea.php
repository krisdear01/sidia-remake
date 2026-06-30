<?php

namespace App\Console\Commands;

use App\Models\Polygon;
use App\Support\PolygonAreaCalculator;
use Illuminate\Console\Command;

/**
 * One-shot backfill for polygon land_area on rows that were created before
 * the auto-compute behaviour existed. Idempotent and re-runnable.
 *
 *   php artisan siau:backfill-polygon-area          # only blank rows
 *   php artisan siau:backfill-polygon-area --all    # recompute every row
 *   php artisan siau:backfill-polygon-area --dry    # print would-be changes
 */
class BackfillPolygonArea extends Command
{
    protected $signature = 'siau:backfill-polygon-area
                            {--all : Recompute every polygon, including those with non-zero land_area}
                            {--dry : Print would-be changes without writing}';

    protected $description = 'Compute land_area for polygons from their GeoJSON';

    public function handle(): int
    {
        $query = Polygon::query();
        if (!$this->option('all')) {
            $query->where(function ($q) {
                $q->whereNull('land_area')->orWhere('land_area', '<=', 0);
            });
        }

        $total = (clone $query)->count();
        if ($total === 0) {
            $this->info('No polygons need backfill.');
            return self::SUCCESS;
        }

        $this->info("Processing {$total} polygon(s)" . ($this->option('dry') ? ' (dry run)' : '') . '...');

        $updated = 0;
        $skipped = 0;
        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $query->chunkById(100, function ($chunk) use (&$updated, &$skipped, $bar) {
            foreach ($chunk as $polygon) {
                $area = PolygonAreaCalculator::computeSquareMeters($polygon->geojson);
                if ($area === null || $area <= 0) {
                    $skipped++;
                    $bar->advance();
                    continue;
                }
                if (!$this->option('dry')) {
                    // Avoid triggering the saving() hook's "isBlank" branch
                    // for --all mode: write directly to the DB.
                    Polygon::withoutEvents(function () use ($polygon, $area) {
                        $polygon->land_area = $area;
                        $polygon->save();
                    });
                }
                $updated++;
                $bar->advance();
            }
        });

        $bar->finish();
        $this->newLine();
        $this->info("Updated {$updated} polygon(s), skipped {$skipped} (no parseable geometry).");

        if ($updated > 0 && !$this->option('dry')) {
            $totalArea = (float) Polygon::where('is_active', true)->sum('land_area');
            $this->info('Total active land_area: ' . number_format($totalArea, 2, '.', ',') . ' m²');
        }

        return self::SUCCESS;
    }
}
