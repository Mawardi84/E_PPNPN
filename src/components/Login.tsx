import { useState } from 'react';
import { AlertCircle, Loader2, User, Lock, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PpnPnLogo } from './PpnPnLogo';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

interface LoginProps {
  onLoginGoogle: () => Promise<unknown>;
}

export function Login({ onLoginGoogle }: LoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [nik, setNik] = useState('');
  const [password, setPassword] = useState('');

  const handleSignInGoogle = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await onLoginGoogle();
    } catch (err: unknown) {
      const errorStr = String(err);
      if (errorStr.includes('popup-closed-by-user')) {
        setErrorMessage('Jendela masuk Google ditutup sebelum proses selesai.');
      } else {
        setErrorMessage('Terjadi kendala saat masuk dengan Google. Silakan periksa koneksi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleNikSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nik || !password) {
      setErrorMessage('Silakan isi NIK dan Kata Sandi.');
      return;
    }
    
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // Map NIK to internal email domain
      const email = `${nik.trim()}@absensi.local`;
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      console.error(err);
      const errorStr = String(err);
      if (errorStr.includes('auth/invalid-credential') || errorStr.includes('auth/user-not-found') || errorStr.includes('auth/wrong-password')) {
        setErrorMessage('NIK atau kata sandi tidak ditemukan atau salah.');
      } else if (errorStr.includes('network-request-failed')) {
        setErrorMessage('Koneksi internet terputus.');
      } else {
        setErrorMessage('Gagal masuk. Silakan hubungi admin.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col h-full bg-white justify-center px-6 py-12" aria-labelledby="login-heading">
      <div className="flex flex-col items-center text-center">
        {/* Official PPNPN Logo (BUMN concept) */}
        <div className="mb-6 p-2">
          <PpnPnLogo width={200} theme="light" />
        </div>

        <h1 id="login-heading" className="text-xl font-bold text-gray-900 mb-2">
          Portal Presensi & E-Kinerja
        </h1>
        <p className="text-gray-500 mb-8 text-sm max-w-xs leading-relaxed">
          Silakan masuk menggunakan NIK dan kata sandi yang telah didaftarkan oleh admin.
        </p>

        <AnimatePresence>
          {errorMessage && (
            <motion.div
              role="alert"
              aria-live="assertive"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="w-full mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-left flex items-start gap-3 shadow-sm"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-rose-800 mb-0.5">Gagal Masuk</p>
                <p className="text-xs text-rose-700 leading-relaxed">{errorMessage}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleNikSignIn} className="w-full max-w-sm mb-8 space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5" htmlFor="nik">NIK Pegawai</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="nik"
                type="text"
                value={nik}
                onChange={(e) => setNik(e.target.value)}
                placeholder="Masukkan 16 digit NIK"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5" htmlFor="password">Kata Sandi</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                required
                disabled={isLoading}
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl font-bold transition shadow-sm focus-visible:ring-4 focus-visible:ring-blue-100 focus-visible:outline-none ${
              isLoading
                ? 'bg-blue-300 text-blue-50 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-5 h-5" />
                <span>Masuk Aplikasi</span>
              </>
            )}
          </button>
        </form>

        <div className="relative w-full max-w-sm mb-8 flex items-center justify-center">
          <div className="absolute inset-x-0 border-t border-gray-200"></div>
          <span className="bg-white px-4 text-xs font-medium text-gray-400 relative z-10">Atau untuk Admin</span>
        </div>

        <button
          onClick={handleSignInGoogle}
          disabled={isLoading}
          type="button"
          aria-label="Masuk sebagai Administrator dengan Google"
          className="w-full max-w-sm flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition active:scale-[0.98]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="text-sm">Login Admin (Google)</span>
        </button>
      </div>
    </main>
  );
}
