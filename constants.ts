import { Room, RoomStatus, SiauRoom } from './types';

// Gateway has no server-side filter for `id_jenis_ruangan`. We pull rooms then
// keep only those whose `jenis_ruangan.nama` matches one of these tokens (case-insensitive).
// Backed by SIISYANA tb_m_jenis_ruangan: id 5 Laboratorium; ids 2/3/4
// Ruang Rapat-Pertemuan / Ruang Sidang / Seminar.
export const LAB_JENIS_RUANGAN = ['lab', 'laboratorium'];
export const MEETING_JENIS_RUANGAN = ['ruang rapat', 'pertemuan', 'ruang sidang', 'seminar', 'meeting'];

// UPT Perpustakaan unit id in SIISYANA (confirmed in PRD). Library rooms are
// scoped by unit, not jenis_ruangan.
export const UPT_PERPUSTAKAAN_UNIT_ID = 21;

const jenisMatches = (room: SiauRoom, tokens: readonly string[]): boolean => {
  const nama = room.jenis_ruangan?.nama?.toLowerCase() ?? '';
  return tokens.some((t) => nama.includes(t));
};

/** Room-category predicates for the academic category map pages. */
export const matchesLab = (room: SiauRoom): boolean => jenisMatches(room, LAB_JENIS_RUANGAN);

export const matchesMeeting = (room: SiauRoom): boolean => jenisMatches(room, MEETING_JENIS_RUANGAN);

export const matchesPerpus = (room: SiauRoom): boolean => {
  if (room.unit?.id === UPT_PERPUSTAKAAN_UNIT_ID) return true;
  const unitNama = room.unit?.nama?.toLowerCase() ?? '';
  const jenisNama = room.jenis_ruangan?.nama?.toLowerCase() ?? '';
  return unitNama.includes('perpusta') || jenisNama.includes('perpusta') || jenisNama.includes('koleksi baca');
};


export const MOCK_ROOMS: Room[] = [
  {
    id: '1',
    name: 'Ruang Kelas 3.01',
    faculty: 'Fakultas Teknik',
    capacity: 40,
    status: RoomStatus.OCCUPIED,
    currentActivity: 'Kuliah Kalkulus II',
    nextAvailableTime: '12:00',
    assets: [
      { id: 'a1', name: 'Proyektor', brand: 'Epson EB-X05', quantity: 1, condition: 'Baik' },
      { id: 'a2', name: 'Papan Tulis', brand: 'Whiteboard 200x100cm', quantity: 2, condition: 'Baik' },
      { id: 'a3', name: 'Kursi Kuliah', brand: 'Chitose DTC-04', quantity: 40, condition: 'Baik' },
      { id: 'a4', name: 'AC Split', brand: 'Daikin 2PK', quantity: 2, condition: 'Baik' },
    ],
    schedule: [
      { id: 's1', startTime: '08:00', endTime: '10:00', subject: 'Kuliah Kalkulus II', department: 'Prodi Teknik Informatika' },
      { id: 's2', startTime: '10:00', endTime: '12:00', subject: 'Praktikum Algoritma', department: 'Prodi Teknik Informatika' },
      { id: 's3', startTime: '13:00', endTime: '15:00', subject: 'Sistem Operasi', department: 'Prodi Teknologi Informasi' },
    ]
  },
  {
    id: '2',
    name: 'Ruang Kelas 3.02',
    faculty: 'Fakultas Teknik',
    capacity: 35,
    status: RoomStatus.AVAILABLE,
    currentActivity: '-',
    nextAvailableTime: '-',
    assets: [
      { id: 'a1', name: 'Proyektor', brand: 'BenQ MX550', quantity: 1, condition: 'Baik' },
      { id: 'a3', name: 'Kursi Kuliah', brand: 'Chitose DTC-04', quantity: 35, condition: 'Baik' },
    ],
    schedule: [
      { id: 's4', startTime: '08:00', endTime: '09:40', subject: 'Bahasa Inggris Teknik', department: 'Prodi Teknik Mesin' },
    ]
  },
  {
    id: '3',
    name: 'Ruang Kelas 2.05',
    faculty: 'Fakultas Ekonomi',
    capacity: 50,
    status: RoomStatus.OCCUPIED,
    currentActivity: 'Kuliah Manajemen Keuangan',
    nextAvailableTime: '14:00',
    assets: [
      { id: 'a5', name: 'Smart TV', brand: 'Samsung 65"', quantity: 1, condition: 'Baik' },
      { id: 'a3', name: 'Meja Seminar', brand: 'Custom', quantity: 25, condition: 'Perbaikan' },
    ],
    schedule: [
      { id: 's5', startTime: '10:00', endTime: '14:00', subject: 'Kuliah Manajemen Keuangan', department: 'Prodi Manajemen' },
    ]
  },
  {
    id: '4',
    name: 'Lab Komputer A',
    faculty: 'Fakultas Ilmu Budaya',
    capacity: 25,
    status: RoomStatus.AVAILABLE,
    currentActivity: '-',
    nextAvailableTime: '-',
    assets: [
      { id: 'pc1', name: 'PC All-in-One', brand: 'Lenovo IdeaCentre', quantity: 25, condition: 'Baik' },
    ],
    schedule: []
  },
  {
    id: '5',
    name: 'Auditorium Widya',
    faculty: 'Rektorat',
    capacity: 200,
    status: RoomStatus.MAINTENANCE,
    currentActivity: 'Perbaikan AC',
    nextAvailableTime: 'Besok',
    assets: [
      { id: 'sound1', name: 'Sound System', brand: 'Yamaha', quantity: 1, condition: 'Baik' },
    ],
    schedule: []
  },
  {
    id: '6',
    name: 'Ruang Sidang 1',
    faculty: 'Fakultas Hukum',
    capacity: 20,
    status: RoomStatus.OCCUPIED,
    currentActivity: 'Sidang Skripsi',
    nextAvailableTime: '11:30',
    assets: [],
    schedule: [
        { id: 's6', startTime: '09:00', endTime: '11:30', subject: 'Sidang Skripsi', department: 'Prodi Ilmu Hukum' },
    ]
  },
  {
    id: '7',
    name: 'Ruang Kelas 1.01',
    faculty: 'Fakultas Kedokteran',
    capacity: 60,
    status: RoomStatus.AVAILABLE,
    currentActivity: '-',
    nextAvailableTime: '-',
    assets: [],
    schedule: [
       { id: 's7', startTime: '13:00', endTime: '15:00', subject: 'Anatomi Dasar', department: 'Prodi Kedokteran Umum' },
    ]
  },
  {
    id: '8',
    name: 'Ruang Baca',
    faculty: 'Perpustakaan Pusat',
    capacity: 100,
    status: RoomStatus.AVAILABLE,
    currentActivity: '-',
    nextAvailableTime: '-',
    assets: [],
    schedule: []
  }
];
