export type AttendanceType = 'check-in' | 'check-out' | 'izin' | 'sakit';
export type Role = 'cleaning_service' | 'petugas_ptsp' | 'pramubakti' | 'satpam' | 'admin';
export type SecurityShift = '24_jam' | 'malam_19' | 'pengganti_24' | 'off';
export type AntiFakeGpsStatus = 'verified' | 'suspicious' | 'blocked';

export interface AntiFakeGpsDetail {
  isMockDetected: boolean;
  score: number; // 0-100 score (100 = hardware asli terverifikasi)
  status: AntiFakeGpsStatus;
  reasons: string[];
  mockFlags: {
    zeroAccuracy: boolean;
    webdriverDetected: boolean;
    impossibleJump: boolean;
    timeDiscrepancy: boolean;
    emulationDetected: boolean;
  };
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  speed?: number | null;
  distanceFromOffice?: number; // Dalam satuan meter
  isInRadius?: boolean;
  isMockGps?: boolean;
  antiFakeDetail?: AntiFakeGpsDetail;
}

export interface OfficeConfig {
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface AttendanceRecord {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: Role;
  type: AttendanceType;
  timestamp: number;
  location?: Location;
  photoUrl?: string;
  notes?: string;
  antiFakeGpsStatus?: AntiFakeGpsStatus;
  isMockGps?: boolean;
  shiftName?: string;
  isLate?: boolean;
  lateMinutes?: number;
}

export interface KinerjaTask {
  id: string;
  name: string;
  completed: boolean;
  photoUrl?: string;
}

export interface KinerjaRecord {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  timestamp: number;
  role: Role;
  tasks: KinerjaTask[];
  notes?: string;
  photoUrl?: string;
}

export interface AntiFakeGpsSettings {
  strictMode: boolean; // Jika true, presensi ditolak jika terdeteksi Fake GPS
  maxAccuracyThreshold: number; // Toleransi akurasi GPS maksimal (meter)
  detectWebdriver: boolean;
  detectEmulation: boolean;
}

export interface UserProfile {
  id?: string;
  nik: string;
  name: string;
  role: Role;
  email: string;
  createdAt: number;
}

export type HolidayType = 'national' | 'religious' | 'joint_leave';

export interface HolidayItem {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: HolidayType;
  description?: string;
}
