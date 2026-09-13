import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc } from 'firebase/firestore';
import { db, FIREBASE_API_KEY } from '../firebase';
import { UserProfile } from '../types';

// Then in the AdminDashboard component, near the state declarations:
// const [employees, setEmployees] = useState<UserProfile[]>([]);
// const [isAddingEmployee, setIsAddingEmployee] = useState(false);
// const [newEmployeeNik, setNewEmployeeNik] = useState('');
// const [newEmployeeName, setNewEmployeeName] = useState('');
// const [newEmployeeRole, setNewEmployeeRole] = useState<Role>('cleaning_service');
// const [newEmployeePassword, setNewEmployeePassword] = useState('');
// const [addEmployeeLoading, setAddEmployeeLoading] = useState(false);
// const [addEmployeeError, setAddEmployeeError] = useState<string | null>(null);

// Inside the useEffect that fetches records or when tab changes:
// useEffect(() => { if (activeTab === 'employees') fetchEmployees(); }, [activeTab]);
import { 
  AttendanceRecord, 
  KinerjaRecord, 
  Role, 
  OfficeConfig, 
  AntiFakeGpsSettings 
} from '../types';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  MapPin, 
  Clock, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Sliders, 
  Building, 
  Briefcase, 
  User, 
  Calendar, 
  ClipboardList, 
  Eye, 
  X, 
  RefreshCw, 
  Lock,
  Layers
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AdminDashboardProps {
  records: AttendanceRecord[];
  kinerjaRecords: KinerjaRecord[];
  officeConfig: OfficeConfig;
  onUpdateOfficeConfig: (newConfig: OfficeConfig) => void;
  antiFakeSettings: AntiFakeGpsSettings;
  onUpdateAntiFakeSettings: (newSettings: AntiFakeGpsSettings) => void;
  onBackToApp: () => void;
}

export function AdminDashboard({
  records,
  kinerjaRecords,
  officeConfig,
  onUpdateOfficeConfig,
  antiFakeSettings,
  onUpdateAntiFakeSettings,
  onBackToApp,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'attendance' | 'kinerja' | 'geofence' | 'security' | 'employees'>('attendance');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | Role>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'check-in' | 'check-out' | 'izin' | 'sakit'>('all');
  const [filterSecurity, setFilterSecurity] = useState<'all' | 'verified' | 'suspicious'>('all');
  
  // Selected photo modal
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

  // Form State for Geofencing
  const [geoName, setGeoName] = useState(officeConfig.name);
  const [geoLat, setGeoLat] = useState(officeConfig.latitude.toString());
  const [geoLng, setGeoLng] = useState(officeConfig.longitude.toString());
  const [geoRadius, setGeoRadius] = useState(officeConfig.radiusMeters.toString());
  const [isGettingCurrentPos, setIsGettingCurrentPos] = useState(false);
  const [geoSaveMessage, setGeoSaveMessage] = useState<string | null>(null);

  // Test Anti-Fake GPS State
  const [isTestingGps, setIsTestingGps] = useState(false);
  const [gpsTestResult, setGpsTestResult] = useState<{
    score: number;
    accuracy: number;
    status: string;
    reasons: string[];
    isMock: boolean;
  } | null>(null);

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Employee Management State
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [newEmployeeNik, setNewEmployeeNik] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeRole, setNewEmployeeRole] = useState<Role>('cleaning_service');
  const [newEmployeePassword, setNewEmployeePassword] = useState('');
  const [addEmployeeLoading, setAddEmployeeLoading] = useState(false);
  const [addEmployeeError, setAddEmployeeError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'employees') {
      const fetchEmployees = async () => {
        try {
          const q = query(collection(db, 'users'));
          const snapshot = await getDocs(q);
          const empList: UserProfile[] = [];
          snapshot.forEach(doc => {
            empList.push(doc.data() as UserProfile);
          });
          setEmployees(empList.sort((a, b) => b.createdAt - a.createdAt));
        } catch (err) {
          console.error("Gagal mengambil data pegawai", err);
        }
      };
      fetchEmployees();
    }
  }, [activeTab]);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmployeeNik.length !== 16) {
      setAddEmployeeError("NIK harus 16 digit.");
      return;
    }
    if (newEmployeePassword.length < 6) {
      setAddEmployeeError("Kata sandi minimal 6 karakter.");
      return;
    }

    setAddEmployeeLoading(true);
    setAddEmployeeError(null);
    try {
      const email = `${newEmployeeNik}@absensi.local`;
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: newEmployeePassword, returnSecureToken: false })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error?.message || "Gagal membuat akun Auth");
      }

      const localId = data.localId;
      const newProfile: UserProfile = {
        nik: newEmployeeNik,
        name: newEmployeeName,
        role: newEmployeeRole,
        email: email,
        createdAt: Date.now()
      };

      await setDoc(doc(db, 'users', localId), newProfile);
      
      setEmployees(prev => [newProfile, ...prev]);
      setIsAddingEmployee(false);
      setNewEmployeeNik('');
      setNewEmployeeName('');
      setNewEmployeePassword('');
      
    } catch (err: unknown) {
      const msg = String(err);
      if (msg.includes('EMAIL_EXISTS')) {
        setAddEmployeeError("NIK ini sudah terdaftar.");
      } else {
        setAddEmployeeError("Gagal menambahkan pegawai. Periksa koneksi atau coba lagi.");
      }
    } finally {
      setAddEmployeeLoading(false);
    }
  };

  // Filter records
  const filteredRecords = records.filter((rec) => {
    const nameMatch = !searchQuery || 
      (rec.userName && rec.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (rec.userEmail && rec.userEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (rec.notes && rec.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const roleMatch = filterRole === 'all' || rec.userRole === filterRole;
    const statusMatch = filterStatus === 'all' || rec.type === filterStatus;
    
    let securityMatch = true;
    if (filterSecurity === 'verified') {
      securityMatch = !rec.isMockGps && (!rec.antiFakeGpsStatus || rec.antiFakeGpsStatus === 'verified');
    } else if (filterSecurity === 'suspicious') {
      securityMatch = rec.isMockGps || rec.antiFakeGpsStatus === 'suspicious' || rec.antiFakeGpsStatus === 'blocked';
    }

    return nameMatch && roleMatch && statusMatch && securityMatch;
  });

  // Calculate Metrics
  const totalRecords = records.length;
  const countMasuk = records.filter(r => r.type === 'check-in').length;
  const countPulang = records.filter(r => r.type === 'check-out').length;
  const countIzinSakit = records.filter(r => r.type === 'izin' || r.type === 'sakit').length;
  const countMockDetected = records.filter(r => r.isMockGps || r.antiFakeGpsStatus === 'blocked' || r.antiFakeGpsStatus === 'suspicious').length;

  const handleSaveGeofence = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(geoLat);
    const lng = parseFloat(geoLng);
    const radius = parseInt(geoRadius, 10);

    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
      setGeoSaveMessage('Format koordinat atau radius tidak valid.');
      return;
    }

    const updated: OfficeConfig = {
      name: geoName.trim() || 'Kantor Pusat PPNPN',
      latitude: lat,
      longitude: lng,
      radiusMeters: radius > 0 ? radius : 150,
    };

    onUpdateOfficeConfig(updated);
    setGeoSaveMessage('Pengaturan lokasi kantor & radius berhasil diperbarui!');
    setTimeout(() => setGeoSaveMessage(null), 3000);
  };

  const handleDetectCurrentPosition = () => {
    if (!navigator.geolocation) {
      alert('Perangkat tidak mendukung geolocation');
      return;
    }
    setIsGettingCurrentPos(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLat(pos.coords.latitude.toFixed(6));
        setGeoLng(pos.coords.longitude.toFixed(6));
        setIsGettingCurrentPos(false);
      },
      (err) => {
        setIsGettingCurrentPos(false);
        alert('Gagal mengambil koordinat: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleRunGpsDiagnostic = () => {
    if (!navigator.geolocation) {
      alert('Perangkat tidak mendukung geolocation');
      return;
    }
    setIsTestingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsTestingGps(false);
        const acc = pos.coords.accuracy;
        const reasons: string[] = [];
        let score = 100;
        let isMock = false;

        if (acc === 0) {
          reasons.push('Akurasi 0 meter terdeteksi (Ciri Fake GPS APK).');
          score -= 60;
          isMock = true;
        } else if (acc < 1) {
          reasons.push('Akurasi artifisial < 1 meter.');
          score -= 40;
        } else if (acc > antiFakeSettings.maxAccuracyThreshold) {
          reasons.push(`Sinyal lemah (> ${antiFakeSettings.maxAccuracyThreshold}m).`);
          score -= 20;
        }

        const isWebdriver = (navigator as unknown as { webdriver?: boolean }).webdriver;
        if (isWebdriver) {
          reasons.push('Otomasi browser / webdriver aktif.');
          score -= 50;
          isMock = true;
        }

        score = Math.max(0, Math.min(100, score));

        setGpsTestResult({
          score,
          accuracy: Math.round(acc),
          status: isMock || score < 55 ? 'Terindikasi Fake GPS' : score < 80 ? 'Perlu Diwaspadai' : 'Hardware GPS Asli & Aman',
          reasons,
          isMock,
        });
      },
      (err) => {
        setIsTestingGps(false);
        alert('Gagal membaca sinyal GPS: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Export PDF Admin
  const handleExportAdminPDF = async () => {
    if (filteredRecords.length === 0) return;
    setIsDownloadingPdf(true);

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Navy bar
      doc.setFillColor(10, 43, 100);
      doc.rect(0, 0, 297, 4, 'F');

      // Kop
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(10, 43, 100);
      doc.text('REKAPITULASI PRESENSI & AUDIT ANTI-FAKE GPS PPNPN', 14, 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Dicetak oleh Administrator • Kantor: ${officeConfig.name} • Total Data: ${filteredRecords.length}`, 14, 21);

      doc.setDrawColor(10, 43, 100);
      doc.setLineWidth(0.5);
      doc.line(14, 24, 283, 24);

      const tableData = filteredRecords.map((r, i) => {
        const d = new Date(r.timestamp);
        const timeStr = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
                        d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

        const roleName = r.userRole === 'satpam' ? 'Satpam' : r.userRole === 'cleaning_service' ? 'Cleaning Service' : 'Pegawai';
        const typeStr = r.type === 'check-in' ? 'Masuk' : r.type === 'check-out' ? 'Pulang' : r.type === 'izin' ? 'Izin' : 'Sakit';
        
        let locText = '-';
        if (r.location) {
          locText = `${r.location.latitude.toFixed(4)}, ${r.location.longitude.toFixed(4)} (${r.location.isInRadius ? 'Dalam Radius' : 'Luar Radius'})`;
        }

        const gpsSecurity = r.isMockGps || r.antiFakeGpsStatus === 'blocked' 
          ? '⚠ Terindikasi Mock GPS' 
          : r.antiFakeGpsStatus === 'suspicious' 
          ? 'Perlu Audit' 
          : '✓ Terverifikasi Asli';

        return [
          (i + 1).toString(),
          r.userName || r.userEmail || 'Pegawai',
          roleName,
          timeStr,
          typeStr,
          locText,
          gpsSecurity,
          r.notes || '-'
        ];
      });

      autoTable(doc, {
        startY: 28,
        margin: { top: 15, bottom: 20, left: 14, right: 14 },
        head: [['No', 'Nama Pegawai', 'Peran', 'Waktu', 'Tipe', 'Lokasi & Status Radius', 'Verifikasi Anti-Fake GPS', 'Catatan']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [10, 43, 100],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center',
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          valign: 'middle',
        },
      });

      doc.save(`Rekap_Admin_PPNPN_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Gagal membuat laporan PDF');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800 overflow-y-auto pb-20">
      {/* Header Admin */}
      <header className="bg-gradient-to-r from-[#0A2B64] to-[#0A3D8F] text-white p-5 shadow-lg">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Portal Admin PPNPN</h1>
                <span className="text-[11px] font-semibold bg-cyan-400/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-400/30">
                  Pengawas
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Dashboard Monitoring Presensi, E-Kinerja & Deteksi Anti-Fake GPS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onBackToApp}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium backdrop-blur transition border border-white/20"
            >
              <Briefcase className="w-4 h-4" />
              <span>Buka Menu Pegawai</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav aria-label="Menu Admin" className="max-w-6xl mx-auto mt-6 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'bg-white text-[#0A2B64] shadow-sm'
                : 'text-blue-100 hover:bg-white/10'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Monitoring Presensi ({records.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('kinerja')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'kinerja'
                ? 'bg-white text-[#0A2B64] shadow-sm'
                : 'text-blue-100 hover:bg-white/10'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Log E-Kinerja ({kinerjaRecords.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('employees')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'employees'
                ? 'bg-white text-[#0A2B64] shadow-sm'
                : 'text-blue-100 hover:bg-white/10'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Data Pegawai</span>
          </button>

          <button
            onClick={() => setActiveTab('geofence')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'geofence'
                ? 'bg-white text-[#0A2B64] shadow-sm'
                : 'text-blue-100 hover:bg-white/10'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Lokasi Kantor & Radius</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-white text-[#0A2B64] shadow-sm'
                : 'text-blue-100 hover:bg-white/10'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Keamanan Anti-Fake GPS</span>
            {countMockDetected > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            )}
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto w-full p-4 md:p-6 space-y-6">
        {/* Metric Cards */}
        <section aria-label="Statistik Presensi" className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500">Absen Masuk</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-emerald-600">{countMasuk}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">Hadir</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500">Absen Pulang</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-blue-600">{countPulang}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">Selesai</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-medium text-slate-500">Izin / Sakit</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-amber-600">{countIzinSakit}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">Dispensasi</span>
            </div>
          </div>

          <div className={`bg-white p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${
            countMockDetected > 0 ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200/80'
          }`}>
            <span className="text-xs font-medium text-slate-500">Anti-Fake GPS Alert</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold ${countMockDetected > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                {countMockDetected}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                countMockDetected > 0 ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-slate-100 text-slate-600'
              }`}>
                {countMockDetected > 0 ? 'Anomali' : 'Aman'}
              </span>
            </div>
          </div>
        </section>

        {/* TAB 1: ATTENDANCE MONITORING */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama pegawai, email, atau catatan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                {/* PDF Export Button */}
                <button
                  onClick={handleExportAdminPDF}
                  disabled={filteredRecords.length === 0 || isDownloadingPdf}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloadingPdf ? 'Membuat Rekap...' : 'Ekspor Laporan (PDF)'}</span>
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-400 flex items-center gap-1 font-medium mr-1">
                  <Filter className="w-3.5 h-3.5" /> Filter:
                </span>

                {/* Role Filter */}
                <select
                  aria-label="Filter Peran"
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value as 'all' | Role)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:ring-1 focus:ring-blue-500 text-xs"
                >
                  <option value="all">Semua Peran</option>
                  <option value="cleaning_service">Cleaning Service</option>
                  <option value="satpam">Satuan Pengamanan</option>
                </select>

                {/* Status Filter */}
                <select
                  aria-label="Filter Status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'all' | 'check-in' | 'check-out' | 'izin' | 'sakit')}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:ring-1 focus:ring-blue-500 text-xs"
                >
                  <option value="all">Semua Status</option>
                  <option value="check-in">Masuk (Hadir)</option>
                  <option value="check-out">Pulang</option>
                  <option value="izin">Izin</option>
                  <option value="sakit">Sakit</option>
                </select>

                {/* Anti-Fake GPS Filter */}
                <select
                  aria-label="Filter Keamanan GPS"
                  value={filterSecurity}
                  onChange={(e) => setFilterSecurity(e.target.value as 'all' | 'verified' | 'suspicious')}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:ring-1 focus:ring-blue-500 text-xs"
                >
                  <option value="all">Semua Keamanan GPS</option>
                  <option value="verified">✓ Terverifikasi Asli</option>
                  <option value="suspicious">⚠ Terindikasi Mock / Fake GPS</option>
                </select>

                {(searchQuery || filterRole !== 'all' || filterStatus !== 'all' || filterSecurity !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterRole('all');
                      setFilterStatus('all');
                      setFilterSecurity('all');
                    }}
                    className="text-xs text-rose-600 hover:underline ml-auto font-medium"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>

            {/* Attendance List */}
            <div className="space-y-3">
              {filteredRecords.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-700">Tidak ada catatan presensi</h2>
                  <p className="text-xs text-slate-400">
                    Belum ada data yang sesuai dengan kriteria filter saat ini.
                  </p>
                </div>
              ) : (
                filteredRecords.map((rec) => {
                  const d = new Date(rec.timestamp);
                  const isMock = rec.isMockGps || rec.antiFakeGpsStatus === 'blocked' || rec.antiFakeGpsStatus === 'suspicious';
                  const isInside = rec.location?.isInRadius;

                  return (
                    <div
                      key={rec.id}
                      className={`bg-white p-4 rounded-2xl border transition hover:shadow-md ${
                        isMock ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200/90'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Employee & Status info */}
                        <div className="flex items-start gap-3">
                          {/* Photo Thumbnail */}
                          {rec.photoUrl ? (
                            <button
                              type="button"
                              onClick={() => setPreviewPhoto({
                                url: rec.photoUrl!,
                                title: rec.userName || 'Foto Bukti Pegawai',
                                subtitle: `${d.toLocaleDateString('id-ID')} • ${rec.type.toUpperCase()}`
                              })}
                              className="relative group shrink-0 w-12 h-14 rounded-xl overflow-hidden border border-slate-200 shadow-xs focus:ring-2 focus:ring-blue-500"
                            >
                              <img
                                src={rec.photoUrl}
                                alt="Foto selfie absensi"
                                className="w-full h-full object-cover group-hover:scale-110 transition"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                                <Eye className="w-3.5 h-3.5" />
                              </div>
                            </button>
                          ) : (
                            <div className="shrink-0 w-12 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                              <User className="w-5 h-5" />
                            </div>
                          )}

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-sm text-slate-900">
                                {rec.userName || 'Pegawai PPNPN'}
                              </h3>
                              <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                                rec.userRole === 'satpam'
                                  ? 'bg-amber-100 text-amber-800'
                                  : rec.userRole === 'admin'
                                  ? 'bg-slate-100 text-slate-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {rec.userRole === 'satpam' ? 'Satpam' : 
                                 rec.userRole === 'petugas_ptsp' ? 'PTSP' : 
                                 rec.userRole === 'pramubakti' ? 'Pramubakti' : 
                                 rec.userRole === 'admin' ? 'Admin' : 'CS'}
                              </span>

                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                rec.type === 'check-in'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : rec.type === 'check-out'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {rec.type}
                              </span>

                              {rec.isLate && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800">
                                  Telat {rec.lateMinutes}m
                                </span>
                              )}
                              
                              {rec.shiftName && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md font-medium border border-blue-200 text-blue-800 bg-blue-50">
                                  {rec.shiftName}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} • {d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                            </p>

                            {rec.notes && (
                              <p className="text-xs text-slate-600 mt-1 italic bg-slate-50 px-2 py-1 rounded border border-slate-100 inline-block">
                                "{rec.notes}"
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Location & Anti-Fake GPS Status */}
                        <div className="flex flex-col sm:items-end gap-1 text-xs">
                          {/* Anti-Fake GPS Badge */}
                          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium border ${
                            isMock
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {isMock ? (
                              <>
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                                <span className="font-bold">Terdeteksi Fake GPS</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>GPS Asli Terverifikasi</span>
                              </>
                            )}
                          </div>

                          {/* Coordinates & Geofencing status */}
                          {rec.location ? (
                            <div className="text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span className={`w-2 h-2 rounded-full ${isInside ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              <span>
                                Jarak: {rec.location.distanceFromOffice !== undefined ? `${Math.round(rec.location.distanceFromOffice)}m` : '-'}
                                ({isInside ? 'Dalam Radius' : 'Luar Radius'})
                              </span>
                              <a
                                href={`https://www.google.com/maps?q=${rec.location.latitude},${rec.location.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:text-blue-800 ml-1 inline-flex items-center"
                                title="Buka titik koordinat di Google Maps"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-slate-400">Tanpa data lokasi</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: E-KINERJA MONITORING */}
        {activeTab === 'kinerja' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Laporan Aktivitas Harian Pegawai</h2>
                <p className="text-xs text-slate-500">
                  Total {kinerjaRecords.length} laporan checklist pekerjaan yang telah disubmit
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {kinerjaRecords.length === 0 ? (
                <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center">
                  <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Belum ada laporan E-Kinerja yang tersimpan.</p>
                </div>
              ) : (
                kinerjaRecords.map((kinerja) => {
                  const d = new Date(kinerja.timestamp);
                  const completedCount = kinerja.tasks.filter((t) => t.completed).length;

                  return (
                    <div key={kinerja.id} className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">{kinerja.userName || 'Pegawai PPNPN'}</h3>
                          <p className="text-xs text-slate-500">
                            {d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                          kinerja.role === 'satpam' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {kinerja.role === 'satpam' ? 'Satpam' : 'Cleaning Service'}
                        </span>
                      </div>

                      {/* Task checklist summary */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                          <span>Checklist Tugas Diselesaikan</span>
                          <span className="text-blue-600">{completedCount} / {kinerja.tasks.length}</span>
                        </div>
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                          {kinerja.tasks.map((task) => (
                            <div key={task.id} className="flex items-center gap-2 text-xs text-slate-600">
                              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${task.completed ? 'text-emerald-600' : 'text-slate-300'}`} />
                              <span className={task.completed ? 'text-slate-800' : 'line-through text-slate-400'}>
                                {task.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {kinerja.notes && (
                        <p className="text-xs text-slate-600 italic bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                          Catatan: "{kinerja.notes}"
                        </p>
                      )}

                      {kinerja.photoUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewPhoto({
                            url: kinerja.photoUrl!,
                            title: `Dokumentasi Kerja - ${kinerja.userName || 'Pegawai'}`,
                            subtitle: d.toLocaleDateString('id-ID')
                          })}
                          className="w-full flex items-center justify-center gap-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat Foto Dokumentasi Pekerjaan</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2.5: DATA PEGAWAI */}
        {activeTab === 'employees' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Manajemen Data Pegawai
                </h2>
                <button
                  onClick={() => setIsAddingEmployee(!isAddingEmployee)}
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 font-bold text-xs rounded-lg border border-blue-200 hover:bg-blue-100 transition"
                >
                  {isAddingEmployee ? 'Batal Tambah' : '+ Tambah Pegawai'}
                </button>
              </div>

              {isAddingEmployee && (
                <form onSubmit={handleAddEmployee} className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  <h3 className="text-sm font-bold text-slate-800">Tambah Akun Pegawai Baru</h3>
                  
                  {addEmployeeError && (
                    <div className="p-2.5 bg-rose-50 text-rose-700 text-xs font-semibold rounded border border-rose-200">
                      {addEmployeeError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">NIK (16 Digit)</label>
                      <input
                        type="text"
                        maxLength={16}
                        value={newEmployeeNik}
                        onChange={(e) => setNewEmployeeNik(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Contoh: 3171234567890123"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap</label>
                      <input
                        type="text"
                        value={newEmployeeName}
                        onChange={(e) => setNewEmployeeName(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Nama Pegawai"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Peran / Jabatan</label>
                      <select
                        value={newEmployeeRole}
                        onChange={(e) => setNewEmployeeRole(e.target.value as Role)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="cleaning_service">Cleaning Service</option>
                        <option value="satpam">Satpam</option>
                        <option value="petugas_ptsp">Petugas PTSP</option>
                        <option value="pramubakti">Pramubakti</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Kata Sandi</label>
                      <input
                        type="password"
                        value={newEmployeePassword}
                        onChange={(e) => setNewEmployeePassword(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Minimal 6 karakter"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={addEmployeeLoading}
                    className="w-full py-2 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {addEmployeeLoading ? 'Menyimpan...' : 'Simpan Pegawai'}
                  </button>
                </form>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-2.5 px-4 font-bold">NIK</th>
                      <th className="py-2.5 px-4 font-bold">Nama Pegawai</th>
                      <th className="py-2.5 px-4 font-bold">Peran</th>
                      <th className="py-2.5 px-4 font-bold">Email Sistem</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {employees.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                          Belum ada data pegawai yang terdaftar.
                        </td>
                      </tr>
                    ) : (
                      employees.map((emp) => (
                        <tr key={emp.nik} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium text-slate-900">{emp.nik || '-'}</td>
                          <td className="py-3 px-4 text-slate-700 font-semibold">{emp.name}</td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                emp.role === 'satpam' ? 'bg-amber-100 text-amber-800' : 
                                emp.role === 'admin' ? 'bg-slate-100 text-slate-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                              {emp.role === 'satpam' ? 'Satpam' : 
                               emp.role === 'petugas_ptsp' ? 'PTSP' : 
                               emp.role === 'pramubakti' ? 'Pramubakti' : 
                               emp.role === 'admin' ? 'Admin' : 'CS'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-xs">{emp.email}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GEOFENCING CONFIGURATION */}
        {activeTab === 'geofence' && (
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/90 shadow-sm max-w-2xl mx-auto space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                Konfigurasi Titik Kantor & Radius Presensi
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Atur titik koordinat GPS kantor instansi dan batas toleransi jarak kehadiran pegawai.
              </p>
            </div>

            {geoSaveMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{geoSaveMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveGeofence} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Kantor / Gedung</label>
                <input
                  type="text"
                  value={geoName}
                  onChange={(e) => setGeoName(e.target.value)}
                  placeholder="Contoh: Kantor Wilayah PPNPN"
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Latitude</label>
                  <input
                    type="text"
                    value={geoLat}
                    onChange={(e) => setGeoLat(e.target.value)}
                    placeholder="-6.175400"
                    required
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Longitude</label>
                  <input
                    type="text"
                    value={geoLng}
                    onChange={(e) => setGeoLng(e.target.value)}
                    placeholder="106.827200"
                    required
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleDetectCurrentPosition}
                disabled={isGettingCurrentPos}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition flex items-center justify-center gap-2 border border-slate-200"
              >
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>{isGettingCurrentPos ? 'Membaca Sensor GPS...' : 'Ambil Titik Koordinat Posisi Saya Saat Ini'}</span>
              </button>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Radius Geofencing (Toleransi Jarak: {geoRadius} meter)
                </label>
                <input
                  type="range"
                  min="30"
                  max="500"
                  step="10"
                  value={geoRadius}
                  onChange={(e) => setGeoRadius(e.target.value)}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>Ketat (30m)</span>
                  <span>Standar (150m)</span>
                  <span>Luas (500m)</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition"
                >
                  Simpan Konfigurasi Kantor
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 4: ANTI-FAKE GPS SECURITY */}
        {activeTab === 'security' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            {/* Overview Card */}
            <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white p-5 md:p-6 rounded-2xl shadow-md space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Teknologi Proteksi Anti-Fake GPS</h2>
                  <p className="text-xs text-blue-200">
                    Mencegah manipulasi lokasi melalui aplikasi Mock Location APK, DevTools, dan injeksi GPS palsu
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
                <div className="bg-white/10 p-3 rounded-xl border border-white/10 backdrop-blur-xs">
                  <p className="font-bold text-cyan-300">Deteksi Akurasi 0m</p>
                  <p className="text-slate-300 text-[11px] mt-1">
                    Fake GPS Android selalu menginjeksi akurasi persis 0 meter, terdeteksi seketika.
                  </p>
                </div>
                <div className="bg-white/10 p-3 rounded-xl border border-white/10 backdrop-blur-xs">
                  <p className="font-bold text-cyan-300">Anti-Teleportasi</p>
                  <p className="text-slate-300 text-[11px] mt-1">
                    Menganalisa lompatan koordinat instan berkecepatan di luar batas fisika wajar.
                  </p>
                </div>
                <div className="bg-white/10 p-3 rounded-xl border border-white/10 backdrop-blur-xs">
                  <p className="font-bold text-cyan-300">Sensor Discrepancy</p>
                  <p className="text-slate-300 text-[11px] mt-1">
                    Mendeteksi manipulasi Chrome DevTools sensor override dan Webdriver.
                  </p>
                </div>
              </div>
            </div>

            {/* Settings Card */}
            <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Kebijakan Penegakan Anti-Fake GPS</h3>

              <div className="space-y-3">
                {/* Strict mode toggle */}
                <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition">
                  <div className="pr-4">
                    <p className="text-xs font-bold text-slate-800">Mode Penegakan Ketat (Strict Enforcement)</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tolak proses presensi otomatis jika perangkat terindikasi menggunakan Fake GPS / Mock Location
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={antiFakeSettings.strictMode}
                    onChange={(e) => onUpdateAntiFakeSettings({
                      ...antiFakeSettings,
                      strictMode: e.target.checked
                    })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </label>

                {/* Webdriver toggle */}
                <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition">
                  <div className="pr-4">
                    <p className="text-xs font-bold text-slate-800">Deteksi Peramban Otomasi / Webdriver</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Identifikasi peramban yang dijalankan script bot atau emulator otomatis
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={antiFakeSettings.detectWebdriver}
                    onChange={(e) => onUpdateAntiFakeSettings({
                      ...antiFakeSettings,
                      detectWebdriver: e.target.checked
                    })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </label>

                {/* DevTools emulation toggle */}
                <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition">
                  <div className="pr-4">
                    <p className="text-xs font-bold text-slate-800">Deteksi Emulasi Sensor DevTools</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Mendeteksi simulasi sensor koordinat palsu dari konsol inspeksi Chrome
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={antiFakeSettings.detectEmulation}
                    onChange={(e) => onUpdateAntiFakeSettings({
                      ...antiFakeSettings,
                      detectEmulation: e.target.checked
                    })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>

            {/* Diagnostic / Simulation Card */}
            <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Uji Diagnostik GPS Perangkat Saat Ini</h3>
                  <p className="text-xs text-slate-500">
                    Jalankan analisis sensor seketika untuk melihat skor kepercayaan sinyal GPS Anda
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunGpsDiagnostic}
                  disabled={isTestingGps}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition border border-blue-200"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingGps ? 'animate-spin' : ''}`} />
                  <span>{isTestingGps ? 'Menganalisis...' : 'Jalankan Diagnostik'}</span>
                </button>
              </div>

              {gpsTestResult && (
                <div className={`p-4 rounded-xl border ${
                  gpsTestResult.isMock
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {gpsTestResult.isMock ? (
                        <ShieldAlert className="w-5 h-5 text-rose-600" />
                      ) : (
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      )}
                      <span className="font-bold text-xs">{gpsTestResult.status}</span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/70">
                      Skor Kepercayaan: {gpsTestResult.score}/100
                    </span>
                  </div>

                  <p className="text-xs">
                    Toleransi Akurasi Hardware: ±{gpsTestResult.accuracy} meter
                  </p>

                  {gpsTestResult.reasons.length > 0 && (
                    <ul className="mt-2 space-y-1 text-[11px] list-disc list-inside">
                      {gpsTestResult.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal Preview Photo */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold">{previewPhoto.title}</h4>
                {previewPhoto.subtitle && <p className="text-[10px] text-slate-300">{previewPhoto.subtitle}</p>}
              </div>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-slate-100 flex items-center justify-center max-h-[75vh] overflow-hidden">
              <img
                src={previewPhoto.url}
                alt="Pratinjau Foto"
                className="max-h-[65vh] w-auto object-contain rounded-lg border border-slate-300 shadow-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
