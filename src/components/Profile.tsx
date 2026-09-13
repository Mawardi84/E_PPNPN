import { User as UserIcon, Shield, Briefcase, LogOut, Sparkles, ShieldCheck, SlidersHorizontal, KeyRound } from 'lucide-react';
import { Role, UserProfile } from '../types';
import { User } from 'firebase/auth';

interface ProfileProps {
  role: Role;
  user: User;
  userProfile: UserProfile | null;
  onLogout: () => void;
  onShowSplash?: () => void;
  onOpenAdmin?: () => void;
}

export function Profile({ role, user, userProfile, onLogout, onShowSplash, onOpenAdmin }: ProfileProps) {
  const isEligibleAdmin = role === 'admin' || user.email === 'fxmawardi@gmail.com';
  
  const getRoleName = () => {
    switch(role) {
      case 'admin': return 'Administrator / Pengawas';
      case 'satpam': return 'Satuan Pengamanan';
      case 'petugas_ptsp': return 'Petugas PTSP';
      case 'pramubakti': return 'Pramubakti';
      case 'cleaning_service': return 'Cleaning Service';
      default: return 'Pegawai';
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-24 overflow-y-auto">
      <div className="bg-blue-600 text-white p-6 pb-12 rounded-b-[2rem] shadow-md flex flex-col items-center text-center">
        {user.photoURL ? (
          <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-white/30">
            <img src={user.photoURL} alt={`Foto profil akun ${userProfile?.name || user.displayName || 'Pegawai'}`} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm mb-4 border-4 border-white/30">
            <UserIcon className="w-12 h-12 text-white" aria-hidden="true" />
          </div>
        )}
        <h1 className="text-2xl font-bold">{userProfile?.name || user.displayName || 'Pegawai PPNPN'}</h1>
        <p className="text-blue-100">{userProfile?.nik ? `NIK: ${userProfile.nik}` : user.email}</p>
        <span className="mt-2 text-xs font-semibold px-3 py-1 rounded-full bg-white/20 border border-white/30">
          {getRoleName()}
        </span>
      </div>

      <div className="px-6 -mt-6 space-y-4">
        {/* Admin Quick Action Card */}
        {isEligibleAdmin && onOpenAdmin && (
          <section className="bg-gradient-to-r from-[#0A2B64] to-[#0A3D8F] text-white rounded-2xl p-4 shadow-md border border-blue-900/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-400/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold">Portal Administrator</h2>
                  <p className="text-xs text-blue-200">Monitoring & Manajemen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenAdmin}
                className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-xs rounded-xl transition shadow-xs"
              >
                Buka Admin
              </button>
            </div>
          </section>
        )}

        <section aria-labelledby="role-heading" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
          <h2 id="role-heading" className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-2">Informasi Pekerjaan</h2>
          
          <div className="p-4 flex items-center gap-4 bg-blue-50 border border-blue-100 rounded-xl">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-blue-600 text-white" aria-hidden="true">
              {role === 'admin' ? <ShieldCheck className="w-5 h-5" /> : 
               role === 'satpam' ? <Shield className="w-5 h-5" /> : 
               <Briefcase className="w-5 h-5" />}
            </div>
            <div className="text-left">
              <div className="font-bold text-blue-700">{getRoleName()}</div>
              <div className="text-xs text-gray-500">Peran telah ditetapkan oleh sistem</div>
            </div>
          </div>
        </section>

        {onShowSplash && (
          <button
            type="button"
            onClick={onShowSplash}
            className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:bg-gray-50 transition text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Layar Pembuka (Splash Screen)</p>
                <p className="text-xs text-gray-400">Putar ulang animasi intro aplikasi</p>
              </div>
            </div>
            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2.5 py-1 rounded-lg">
              Pratinjau
            </span>
          </button>
        )}
        
        <button 
          onClick={onLogout}
          aria-label="Keluar dari akun aplikasi"
          className="w-full flex items-center justify-center gap-2 p-4 bg-white border border-rose-100 text-rose-600 font-bold rounded-2xl shadow-sm hover:bg-rose-50 focus-visible:ring-4 focus-visible:ring-rose-200 focus-visible:outline-none transition active:scale-95"
        >
          <LogOut className="w-5 h-5" aria-hidden="true" />
          Keluar Akun
        </button>
      </div>
    </div>
  );
}
