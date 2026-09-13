import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { motion } from 'motion/react';

interface CameraCaptureProps {
  onCapture: (photoBase64: string) => void;
  onCancel: () => void;
  antiFakeScore?: number;
}

export function CameraCapture({ onCapture, onCancel, antiFakeScore }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        activeStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError('Akses kamera ditolak atau tidak tersedia. Pastikan Anda telah memberikan izin.');
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Target max dimension to save space
      const MAX_HEIGHT = 640;
      let targetWidth = video.videoWidth;
      let targetHeight = video.videoHeight;
      
      if (targetHeight > MAX_HEIGHT) {
        targetWidth = Math.floor(targetWidth * (MAX_HEIGHT / targetHeight));
        targetHeight = MAX_HEIGHT;
      }
      
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the current video frame onto the canvas
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        // Convert to base64 with lower quality to save localStorage space
        const photoData = canvas.toDataURL('image/jpeg', 0.6);
        onCapture(photoData);
      }
    }
  };

  if (error) {
    return (
      <div 
        role="alert"
        aria-live="assertive"
        className="flex flex-col items-center justify-center p-6 text-center bg-gray-50 rounded-xl border border-red-200"
      >
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={onCancel}
          aria-label="Kembali ke beranda"
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none transition"
        >
          Batal
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          aria-label="Tampilan kamera langsung untuk verifikasi wajah"
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
        
        {/* Face scanning overlay graphic with biometric laser motion */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" aria-hidden="true">
          {/* Top Instruction Pill & Anti-Fake GPS indicator */}
          <div className="mb-6 flex flex-col items-center gap-1.5 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-medium tracking-wide shadow-lg"
            >
              Posisikan wajah di dalam bingkai
            </motion.div>

            {antiFakeScore !== undefined && (
              <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-3 py-0.5 rounded-full border border-emerald-400/30 backdrop-blur-md">
                🛡️ GPS Asli Terverifikasi ({antiFakeScore}/100)
              </span>
            )}
          </div>

          <div className="relative w-64 h-72 rounded-full overflow-hidden border-2 border-blue-400/80 shadow-[0_0_25px_rgba(59,130,246,0.5)] flex items-center justify-center">
            {/* Outer subtle rotating dashed ring */}
            <div className="absolute inset-0 border-2 border-dashed border-white/30 rounded-full animate-spin-slow"></div>

            {/* Corner Target Accents */}
            <div className="absolute top-2 left-6 w-4 h-4 border-t-2 border-l-2 border-blue-400"></div>
            <div className="absolute top-2 right-6 w-4 h-4 border-t-2 border-r-2 border-blue-400"></div>
            <div className="absolute bottom-2 left-6 w-4 h-4 border-b-2 border-l-2 border-blue-400"></div>
            <div className="absolute bottom-2 right-6 w-4 h-4 border-b-2 border-r-2 border-blue-400"></div>

            {/* Sweeping Laser Scan Line */}
            <motion.div
              initial={{ y: -140 }}
              animate={{ y: 140 }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
              }}
              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8]"
            >
              <div className="w-full h-8 -mt-4 bg-gradient-to-b from-cyan-400/15 to-transparent"></div>
            </motion.div>
          </div>

          <motion.div 
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="mt-6 text-[11px] text-cyan-300 font-mono tracking-wider uppercase"
          >
            • Biometric Face Detection Active •
          </motion.div>
        </div>
      </div>

      <div className="bg-black p-6 flex items-center justify-between pb-12">
        <button
          onClick={onCancel}
          aria-label="Batalkan kamera dan kembali ke beranda"
          className="text-white bg-gray-800 px-5 py-3 rounded-full hover:bg-gray-700 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none transition"
        >
          Batal
        </button>
        <button
          onClick={handleCapture}
          aria-label="Ambil foto absensi wajah sekarang"
          className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-4 border-gray-300 active:bg-gray-200 focus-visible:ring-4 focus-visible:ring-blue-500 focus-visible:outline-none transition shadow-lg"
        >
          <Camera className="w-8 h-8 text-black" aria-hidden="true" />
        </button>
        <div className="w-12" aria-hidden="true"></div> {/* Spacer to center the capture button */}
      </div>
    </div>
  );
}
