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
