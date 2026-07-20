import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { normalizeCampusName, parseSummarySheet } from './RoomUtilizationPage';

// Regression: found during manual /qa of the Room Utilities import flow —
// the source xlsx mixes campus casing ("Jimbaran" vs "JIMBARAN"), which
// fragmented the rollup table and campus filter into 4 buckets instead of 2.
describe('normalizeCampusName', () => {
    it('collapses mixed-case campus names to a single canonical form', () => {
        expect(normalizeCampusName('JIMBARAN')).toBe('Jimbaran');
        expect(normalizeCampusName('Jimbaran')).toBe('Jimbaran');
        expect(normalizeCampusName('jimbaran')).toBe('Jimbaran');
        expect(normalizeCampusName('DENPASAR')).toBe('Denpasar');
    });

    it('trims surrounding whitespace before normalizing', () => {
        expect(normalizeCampusName('  Jimbaran  ')).toBe('Jimbaran');
    });
});

describe('parseSummarySheet', () => {
    // Mirrors the real "Persentase Utilitas Pagi/Malam" sheet layout: 5 header
    // rows, then data rows where faculty (col B) and campus (col C) are only
    // populated on the first row of a merged-cell group.
    function buildSheet(rows: any[][]) {
        return XLSX.utils.aoa_to_sheet(rows);
    }

    const HEADER_ROWS: any[][] = [
        ['UTILITAS PER FAKULTAS DAN GEDUNG'],
        ['SEMESTER GENAP 2025/2026'],
        ['NO', 'LOKASI', 'GEDUNG', '', 'JUMLAH RUANG KULIAH', '', 'TOTAL', 'CATATAN'],
        ['', '', 'Lokasi', 'Nama Gedung', 'Jumlah Ruang Kuliah', 'Rata Rata % Utilitas'],
        [],
    ];

    it('forward-fills faculty and campus across merged-cell rows', () => {
        const sheet = buildSheet([
            ...HEADER_ROWS,
            ['', 'Fakultas Kedokteran', 'Jimbaran', 'DEKANAT JIMBARAN', 35, 0.844, '', 'note a'],
            ['', '', '', 'RSGM Jimbaran', 2, 0.27, '', 'note b'],
        ]);

        const result = parseSummarySheet(sheet);

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
            faculty_name: 'Fakultas Kedokteran',
            campus_name: 'Jimbaran',
            gedung_name: 'DEKANAT JIMBARAN',
            room_count: 35,
            utilization_percent: 84.4,
        });
        // Second row has no faculty/campus of its own — must inherit from the row above.
        expect(result[1]).toMatchObject({
            faculty_name: 'Fakultas Kedokteran',
            campus_name: 'Jimbaran',
            gedung_name: 'RSGM Jimbaran',
            room_count: 2,
            utilization_percent: 27,
        });
    });

    it('normalizes inconsistent campus casing within the same sheet', () => {
        const sheet = buildSheet([
            ...HEADER_ROWS,
            ['', 'Fakultas Ilmu Budaya', 'JIMBARAN', 'DEKANAT JIMBARAN', 10, 0.619],
            ['', '', 'DENPASAR', 'GORIS', 18, 0.646],
        ]);

        const result = parseSummarySheet(sheet);

        expect(result.map(r => r.campus_name)).toEqual(['Jimbaran', 'Denpasar']);
    });

    it('skips the trailing totals row', () => {
        const sheet = buildSheet([
            ...HEADER_ROWS,
            ['', 'Fakultas Hukum', 'Jimbaran', 'GEDUNG HG', 6, 0.203],
            ['Jumlah Ruangan dan Rata Rata Persentase', '', '', '', 560, 0.70],
        ]);

        const result = parseSummarySheet(sheet);

        expect(result).toHaveLength(1);
        expect(result[0].gedung_name).toBe('GEDUNG HG');
    });

    it('skips rows with no room count or non-numeric utilization', () => {
        const sheet = buildSheet([
            ...HEADER_ROWS,
            ['', 'Fakultas Teknik', 'Denpasar', 'GEDUNG A', 0, 0.51],
            ['', '', '', 'GEDUNG B', 3, 'n/a'],
            ['', '', '', 'GEDUNG C', 7, 0.474],
        ]);

        const result = parseSummarySheet(sheet);

        expect(result).toHaveLength(1);
        expect(result[0].gedung_name).toBe('GEDUNG C');
    });

    it('converts the 0-1 fraction to a percentage rounded to 1 decimal', () => {
        const sheet = buildSheet([
            ...HEADER_ROWS,
            ['', 'Fakultas Kedokteran', 'Denpasar', 'KD', 60, 0.988245614],
        ]);

        const result = parseSummarySheet(sheet);

        expect(result[0].utilization_percent).toBe(98.8);
    });
});
