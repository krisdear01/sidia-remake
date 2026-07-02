export enum RoomStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  MAINTENANCE = 'MAINTENANCE'
}

export interface Asset {
  id: string;
  name: string;
  brand: string;
  quantity: number;
  condition: 'Baik' | 'Rusak' | 'Perbaikan';
}

export interface ScheduleItem {
  id: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  subject: string;
  department: string; // Prodi
  lecturer?: string;
}

export interface Room {
  id: string;
  name: string;
  faculty: string;
  capacity: number;
  status: RoomStatus;
  currentActivity?: string;
  nextAvailableTime?: string;
  assets: Asset[];
  schedule: ScheduleItem[];
}

// =============================================================================
// SIAU Gateway response shapes (mirror siau-gateway/app/Domain/Mapping/*Mapper.php)
// These types describe data fetched from SIAU's backend /api/v1/siau/* proxy.
// =============================================================================

export interface SiauBuilding {
  id: string;
  kode: string;
  nama: string;
  jumlah_lantai: number | null;
  latitude: number | null;
  longitude: number | null;
  luas_gedung: number | null;
  jam_buka: string | null;
  jam_tutup: string | null;
  is_valid: boolean | null;
}

export interface SiauGalleryItem {
  url: string | null;
  caption: string | null;
}

/** Building detail (siau/buildings/{id}) — adds KIB, PDF, and gallery. */
export interface SiauBuildingDetail extends SiauBuilding {
  nomor_kib: string | null;
  file_rincian_gedung: string | null;
  gallery: SiauGalleryItem[];
}

/** Land/tanah record (siau/land/{id}) — mirrors LandMapper. */
export interface SiauLand {
  id: string;
  jenis: 'Tanah';
  bukti_kepemilikan: string | null;
  nomor_kib: string | null;
  luas_total: number | null;
  luas_tidak_terpakai: number | null;
  lokasi: string | null;
  latitude: number | null;
  longitude: number | null;
}

/** Unified global search results (siau/search). */
export interface SiauSearchResults {
  gedung: { id: string; kode: string | null; nama: string | null; nomor_kib: string | null }[];
  ruangan: { id: string; kode_ruangan: string | null; nama: string | null; id_gedung: string | null; gedung_nama: string | null }[];
  tanah: { id: string; nomor_shp: string | null; nomor_kib: string | null; lokasi: string | null }[];
  aset: { id: string; kode_barang: string | null; nama_barang: string | null; merk_type: string | null; id_ruangan: string | null }[];
}

/** Per-feature properties for /api/v1/siau/gedung-polygons (building footprints). */
export interface GedungPolygonProperties {
  asset_type: 'bangunan';
  siisyana_gedung_id: number;
  kode: string | null;
  nama: string | null;
  luas: number | null;
  center: [number, number] | null;
}

/** Per-feature properties emitted by /api/v1/polygons/geojson. */
export interface PolygonFeatureProperties {
  id: number;
  name: string;
  layer: string | null;
  building: string | null;
  faculty: string | null;
  fill_color: string | null;
  stroke_color: string | null;
  fill_opacity: number | null;
  land_area: number | null;
  asset_type: 'bangunan' | 'tanah' | null;
  siisyana_gedung_id: number | null;
  siisyana_tanah_id: number | null;
}

export interface SiauJenisRuangan {
  id: number;
  nama: string;
}

export interface SiauGedungLite {
  id: string;
  kode: string | null;
  nama: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface SiauUnit {
  id: number;
  nama: string | null;
}

export interface SiauRoom {
  id: string;
  kode_ruangan: string;
  nama: string;
  kapasitas: number | null;
  kategori_kapasitas: string;
  kesiapan: string | null;
  jenis_ruangan: SiauJenisRuangan | null;
  gedung: SiauGedungLite | null;
  unit: SiauUnit | null;
  status_validasi: 'validated' | 'pending' | null;
  asset_count: number | null;
  is_public: boolean;
}

export interface DbrAssetRow {
  source: 'siisyana' | 'hibah';
  kode_barang: string;
  no_aset: number | null;
  nama_barang: string;
  merk_type: string | null;
  kuantitas: number | null;
  tanggal_perolehan: string | null;
  tahun_perolehan: number | null;
  kondisi: 'Baik' | 'Rusak Ringan' | 'Rusak Berat' | null;
  kondisi_code: number | null;
  nilai_perolehan: number | null;
  keterangan: string | null;
}

export interface DbrPayload {
  room: {
    id: string;
    kode_ruangan: string;
    nama: string;
    kapasitas: number | null;
    jenis_ruangan: string | null;
    gedung: { kode: string | null; nama: string | null };
    unit: { id: number | null; singkat: string | null; panjang: string | null };
    penanggung_jawab: { nip: string | null; nama: string } | null;
  };
  assets: DbrAssetRow[];
  totals: { count: number; nilai_perolehan: number };
  document: {
    kementerian: string;
    satker: string;
    alamat: string;
    telepon: string;
    laman: string;
    judul: string;
  };
  meta: { generated_at: string; generated_by: string; source: string };
}

export interface SiauAsset {
  id: string;
  kode_barang: string;
  nama_barang: string;
  merk_type: string | null;
  kondisi: 'Baik' | 'Rusak Ringan' | 'Rusak Berat' | null;
  kondisi_code: number | null;
  kuantitas: number | null;
  tanggal_perolehan: string | null;
  id_ruangan: string | null;
  id_unit: number | null;
  /** 'siisyana' for upstream, 'hibah' for locally-created (BETA). */
  source?: 'siisyana' | 'hibah';
}

export interface HibahAssetInput {
  id_ruangan: number;
  nama_barang: string;
  merk_type?: string;
  kondisi?: 'Baik' | 'Rusak Ringan' | 'Rusak Berat';
  kuantitas?: number;
  tanggal_perolehan?: string; // YYYY-MM-DD
}

export interface SiauBooking {
  booking_id: string;
  event_title: string | null;
  start_time: string | null;
  end_time: string | null;
  status: 'approved' | 'rejected' | 'pending' | 'cancelled';
  is_recurring: boolean | null;
}

export interface SiauAvailability {
  available: boolean;
  next_free_slot: string | null;
  next_busy_slot: string | null;
}

export interface SiauPagination {
  limit: number;
  next_cursor: number | null;
}

export interface EnvelopeList<T> {
  data: T[];
  meta: { pagination: SiauPagination; [k: string]: unknown };
  links?: Record<string, string>;
}

export interface EnvelopeOne<T> {
  data: T;
  meta?: Record<string, unknown>;
  links?: Record<string, string>;
}

// =============================================================================
// Admin identity-map shapes (gateway /admin/identity-map/* via the SIDIA proxy)
// =============================================================================

export interface UnmatchedRow {
  siisyana_room_id: number;
  kode_ruangan: string;
  confidence: 'exact' | 'fuzzy' | 'manual';
  last_reconciled_at: string | null;
  note: string | null;
}

export interface UnmatchedListResponse {
  // The gateway returns rows directly inside `data` (an array), not wrapped
  // in `{ rows: [...] }`. Meta and links live at the top level alongside it.
  data: UnmatchedRow[];
  meta: { total_unmatched: number; returned: number; truncated: boolean; source: string };
  links?: Record<string, string>;
}

export interface IdentityMapRow {
  siisyana_room_id: number;
  sipirang_room_id: number | null;
  kode_ruangan: string;
  confidence: 'exact' | 'fuzzy' | 'manual';
  last_reconciled_at: string | null;
  note: string | null;
}
