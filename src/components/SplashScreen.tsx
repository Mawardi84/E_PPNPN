import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin } from 'lucide-react';
import { PpnPnLogo } from './PpnPnLogo';

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Memuat konfigurasi sistem...');

  useEffect(() => {
    const t1 = setTimeout(() => {
      setProgress(40);
      setStatusText('Menyiapkan modul geolokasi & GPS...');
    }, 450);

    const t2 = setTimeout(() => {
      setProgress(80);
      setStatusText('Menghubungkan database kepegawaian...');
    }, 950);

    const t3 = setTimeout(() => {
      setProgress(100);
      setStatusText('Sistem siap digunakan');
    }, 1450);

    const t4 = setTimeout(() => {
      onFinish();
    }, 1800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onFinish]);

  return (
    <motion.aside
      key="splash-screen"
      role="region"
      aria-label="Layar Pembuka Aplikasi E-PPNPN"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-gradient-to-b from-[#081F4B] via-[#0E2F73] to-[#05112B] text-white p-8 select-none"
    >
      {/* Background Ambience / Glow Rings */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.12, 0.28, 0.12],
          }}
          transition={{ duration: 5, delay: 1, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-600 rounded-full blur-3xl"
        />
      </div>

      {/* Top Spacer for Optical Balance */}
      <div className="relative z-10 pt-4 h-8" aria-hidden="true" />

      {/* Center Branding & Logo */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-xs">
        {/* Animated Brand Card Badge */}
        <div className="relative mb-6">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 250, damping: 20 }}
            className="bg-white px-7 py-5 rounded-2xl shadow-2xl shadow-sky-950/60 flex items-center justify-center border border-white/50"
          >
            <PpnPnLogo width={210} theme="light" />
          </motion.div>

          {/* Subtle Ambient Pulse Ring */}
          <motion.div
            animate={{ scale: [1, 1.06, 1.12], opacity: [0.45, 0.15, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
            className="absolute inset-0 rounded-2xl border border-sky-400/40 -z-10"
          />
        </div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="text-sm font-semibold text-blue-100/90 leading-relaxed mb-2"
        >
          Sistem Presensi Biometrik & E-Kinerja
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex items-center gap-1.5 text-xs text-sky-200/80"
        >
          <MapPin className="w-3.5 h-3.5 text-sky-300" aria-hidden="true" />
          <span>Validasi GPS & Geofencing</span>
        </motion.div>
      </div>

      {/* Bottom Progress */}
      <div className="relative z-10 w-full max-w-xs flex flex-col items-center pb-6">
        {/* Progress Bar */}
        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-2 backdrop-blur-sm">
          <motion.div
            className="h-full bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400 rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ ease: 'easeInOut' }}
          />
        </div>

        {/* Status text */}
        <div className="flex items-center justify-between w-full text-[11px] text-sky-200">
          <span className="font-medium truncate">{statusText}</span>
          <span className="font-mono text-white ml-2">{progress}%</span>
        </div>
      </div>
    </motion.aside>
  );
}
