import { AntiFakeGpsDetail, AntiFakeGpsStatus, AntiFakeGpsSettings, Location, OfficeConfig } from '../types';
import { calculateDistanceInMeters } from '../config';

// Penyimpanan koordinat pembacaan sebelumnya untuk analisis teleportasi (in-memory)
let lastKnownPosition: { latitude: number; longitude: number; timestamp: number } | null = null;

export const DEFAULT_ANTI_FAKE_SETTINGS: AntiFakeGpsSettings = {
  strictMode: true, // Blokir presensi jika terdeteksi Fake GPS
  maxAccuracyThreshold: 250, // Akurasi GPS maksimal dalam meter
  detectWebdriver: true,
  detectEmulation: true,
};

/**
 * Menganalisis data posisi GPS dari browser dan mendeteksi anomali Mock Location / Fake GPS
 */
export function analyzeAntiFakeGps(
  position: GeolocationPosition,
  settings: AntiFakeGpsSettings = DEFAULT_ANTI_FAKE_SETTINGS
): AntiFakeGpsDetail {
  const coords = position.coords;
  const reasons: string[] = [];
  let score = 100;

  const mockFlags = {
    zeroAccuracy: false,
    webdriverDetected: false,
    impossibleJump: false,
    timeDiscrepancy: false,
    emulationDetected: false,
  };

  // 1. Pemeriksaan Akurasi Nol / Artifisial
  // Sebagian besar aplikasi Fake GPS Android/iOS menginjeksi nilai akurasi 0 atau < 1 meter
  if (coords.accuracy === 0) {
    mockFlags.zeroAccuracy = true;
    score -= 60;
    reasons.push('Akurasi koordinat 0 meter (Ciri khas injeksi Fake GPS APK / Mock Provider).');
  } else if (coords.accuracy < 1.0) {
    mockFlags.zeroAccuracy = true;
    score -= 40;
    reasons.push('Akurasi satelit artifisial di bawah 1 meter (tidak wajar untuk sensor GPS fisik).');
  } else if (coords.accuracy > settings.maxAccuracyThreshold) {
    score -= 20;
    reasons.push(`Sinyal GPS lemah atau tidak akurat (akurasi ±${Math.round(coords.accuracy)}m, batas ±${settings.maxAccuracyThreshold}m).`);
  }

  // 2. Pemeriksaan Webdriver / Headless / Otomasi
  if (settings.detectWebdriver && typeof navigator !== 'undefined') {
    const isWebdriver = (navigator as unknown as { webdriver?: boolean }).webdriver;
    if (isWebdriver) {
      mockFlags.webdriverDetected = true;
      score -= 50;
      reasons.push('Terdeteksi peramban otomasi/Webdriver (indikasi pengujian otomatis/spoofing).');
    }
  }

  // 3. Pemeriksaan Emulasi DevTools / Konsistensi Sensor
  if (settings.detectEmulation && typeof navigator !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    const isMobileUa = /android|iphone|ipad|ipod/.test(ua);
    const hasTouch = navigator.maxTouchPoints && navigator.maxTouchPoints > 0;

    // Jika User Agent mengaku perangkat seluler tapi tidak memiliki touch support sama sekali
    if (isMobileUa && !hasTouch) {
      mockFlags.emulationDetected = true;
      score -= 30;
      reasons.push('Inkonsistensi profil sensor perangkat (Indikasi simulasi Chrome DevTools).');
    }
  }

  // 4. Pemeriksaan Sinkronisasi Waktu Sinyal GPS
  if (position.timestamp) {
    const now = Date.now();
    const diffMs = Math.abs(now - position.timestamp);
    // Jika selisih waktu GPS hardware dengan jam perangkat lebih dari 45 detik
    if (diffMs > 45000) {
      mockFlags.timeDiscrepancy = true;
      score -= 25;
      reasons.push('Waktu paket koordinat GPS tidak sinkron dengan waktu sistem.');
    }
  }

  // 5. Pemeriksaan Lompatan Koordinat Ekstrem (Anti-Teleportasi)
  if (lastKnownPosition) {
    const timeDeltaSec = (Date.now() - lastKnownPosition.timestamp) / 1000;
    if (timeDeltaSec > 0 && timeDeltaSec < 120) {
      const distanceMoved = calculateDistanceInMeters(
        lastKnownPosition.latitude,
        lastKnownPosition.longitude,
        coords.latitude,
        coords.longitude
      );
      // Kecepatan dalam km/jam
      const speedKmH = (distanceMoved / timeDeltaSec) * 3.6;
      if (distanceMoved > 500 && speedKmH > 150) {
        mockFlags.impossibleJump = true;
        score -= 50;
        reasons.push(`Lompatan lokasi ekstrim terdeteksi (${distanceMoved}m dalam ${Math.round(timeDeltaSec)}s = ${Math.round(speedKmH)} km/jam).`);
      }
    }
  }

  // Perbarui posisi terakhir
  lastKnownPosition = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    timestamp: Date.now(),
  };

  score = Math.max(0, Math.min(100, score));

  let status: AntiFakeGpsStatus = 'verified';
  const isMockDetected = mockFlags.zeroAccuracy || mockFlags.impossibleJump || score < 55;

  if (isMockDetected) {
    status = 'blocked';
  } else if (score < 80 || reasons.length > 0) {
    status = 'suspicious';
  }

  return {
    isMockDetected,
    score,
    status,
    reasons,
    mockFlags,
  };
}

/**
 * Mendapatkan lokasi perangkat dengan verifikasi keamanan Anti-Fake GPS secara mendalam
 */
export async function getVerifiedLocation(
  office: OfficeConfig,
  settings: AntiFakeGpsSettings = DEFAULT_ANTI_FAKE_SETTINGS
): Promise<{ location: Location; antiFakeDetail: AntiFakeGpsDetail }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Perangkat atau peramban tidak mendukung Geolocation GPS.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        const altitude = position.coords.altitude;
        const speed = position.coords.speed;

        const distance = calculateDistanceInMeters(lat, lon, office.latitude, office.longitude);
        const inRadius = distance <= office.radiusMeters;

        // Jalankan analisa Anti Fake GPS
        const antiFakeDetail = analyzeAntiFakeGps(position, settings);

        const location: Location = {
          latitude: lat,
          longitude: lon,
          accuracy,
          altitude,
          speed,
          distanceFromOffice: distance,
          isInRadius: inRadius,
          isMockGps: antiFakeDetail.isMockDetected,
          antiFakeDetail,
        };

        resolve({ location, antiFakeDetail });
      },
      (error) => {
        let msg = 'Gagal mengakses GPS perangkat.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Izin lokasi GPS ditolak oleh pengguna. Silakan aktifkan izin lokasi di peramban Anda.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Sinyal GPS tidak tersedia saat ini. Pastikan GPS perangkat aktif.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Waktu permintaan lokasi GPS habis (timeout). Silakan coba lagi.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  });
}
