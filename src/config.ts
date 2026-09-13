import { OfficeConfig } from './types';

// Konfigurasi Lokasi Kantor Resmi PPNPN
// Koordinat default mengacu pada pusat instansi perkantoran
export const DEFAULT_OFFICE: OfficeConfig = {
  name: 'Kantor Pusat PPNPN',
  latitude: -6.1754,
  longitude: 106.8272,
  radiusMeters: 150, // Radius maksimal toleransi presensi (150 meter)
};

/**
 * Menghitung jarak antara dua koordinat GPS dalam satuan meter menggunakan rumus Haversine.
 */
export function calculateDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Radius bumi dalam satuan meter
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Format jarak menjadi representasi teks yang ramah pengguna (misal "45 m" atau "1.2 km").
 */
export function formatDistance(meters?: number): string {
  if (meters === undefined || meters === null) return '-';
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}
