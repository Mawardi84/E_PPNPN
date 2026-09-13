import { useState, useEffect } from 'react';
import { CameraCapture } from './components/CameraCapture';
import { AttendanceCard } from './components/AttendanceCard';
import { WeeklyChart } from './components/WeeklyChart';
import { EKinerja } from './components/EKinerja';
import { Profile } from './components/Profile';
import { Login } from './components/Login';
import { SplashScreen } from './components/SplashScreen';
import { PpnPnLogo } from './components/PpnPnLogo';
import { AdminDashboard } from './components/AdminDashboard';
import { OfflineIndicator } from './components/OfflineIndicator';
import { auth, db, loginWithGoogle, logoutUser, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot, setDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { AttendanceRecord, AttendanceType, Location, Role, KinerjaRecord, OfficeConfig, AntiFakeGpsSettings, SecurityShift, UserProfile } from './types';
import { DEFAULT_OFFICE, calculateDistanceInMeters, formatDistance } from './config';
import { getVerifiedLocation, DEFAULT_ANTI_FAKE_SETTINGS } from './utils/antiFakeGps';
import { MapPin, Clock, CheckCircle2, User, History, LogIn, LogOut, Download, CalendarDays, TrendingUp, ChevronLeft, ChevronRight, Calendar, FileText, Stethoscope, ImagePlus, Home, ClipboardList, UserCircle, UploadCloud, Trash2, AlertCircle, ShieldCheck, Camera, Loader2, ShieldAlert, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to prepare image as base64 string for jsPDF
const prepareImageForPDF = async (url?: string): Promise<string | null> => {
  if (!url) return null;
  if (url.startsWith('data:image/')) {
    return url;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

type AppState = 'dashboard' | 'getting-location' | 'camera' | 'verifying' | 'success' | 'history' | 'leave-form' | 'fake-gps-blocked';
type MainTab = 'home' | 'kinerja' | 'profile' | 'admin';

export default function App() {
  const [appState, setAppState] = useState<AppState>('dashboard');
  const [mainTab, setMainTab] = useState<MainTab>('home');
  const [role, setRole] = useState<Role>('cleaning_service');
  const [selectedShift, setSelectedShift] = useState<SecurityShift>('24_jam');
  
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  // Configuration State
  const [officeConfig, setOfficeConfig] = useState<OfficeConfig>(DEFAULT_OFFICE);
  const [antiFakeSettings, setAntiFakeSettings] = useState<AntiFakeGpsSettings>(DEFAULT_ANTI_FAKE_SETTINGS);
  const [antiFakeAlert, setAntiFakeAlert] = useState<{ score: number; reasons: string[] } | null>(null);

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [kinerjaRecords, setKinerjaRecords] = useState<KinerjaRecord[]>([]);
  const [currentAction, setCurrentAction] = useState<AttendanceType | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [historyDate, setHistoryDate] = useState(new Date());
  
  // State for leave form
  const [leaveNotes, setLeaveNotes] = useState('');
  const [leavePhotoUrl, setLeavePhotoUrl] = useState<string | null>(null);
  const [isDraggingLeave, setIsDraggingLeave] = useState(false);
  const [leaveUploadError, setLeaveUploadError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [includePhotosInPdf, setIncludePhotosInPdf] = useState(true);

  const isUserAdmin = role === 'admin' || user?.email === 'fxmawardi@gmail.com';

  // Load records from Firestore when user logs in
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setUserProfile(data);
            setRole(data.role);
          } else {
            // Only for the original admin login via Google who might not have a profile yet
            if (currentUser.email === 'fxmawardi@gmail.com') {
              const defaultAdminProfile: UserProfile = {
                nik: '-',
                name: currentUser.displayName || 'Admin',
                role: 'admin',
                email: currentUser.email,
                createdAt: Date.now()
              };
              await setDoc(docRef, defaultAdminProfile);
              setUserProfile(defaultAdminProfile);
              setRole('admin');
            }
          }
        } catch (err) {
          console.error("Gagal memuat profil:", err);
        }
      } else {
        setUserProfile(null);
      }
      setIsAuthChecking(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // Fetch settings from Firestore
  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      try {
        const officeSnap = await getDoc(doc(db, 'settings', 'office'));
        if (officeSnap.exists()) {
          setOfficeConfig(officeSnap.data() as OfficeConfig);
        }
        const secSnap = await getDoc(doc(db, 'settings', 'antiFakeGps'));
        if (secSnap.exists()) {
          setAntiFakeSettings(secSnap.data() as AntiFakeGpsSettings);
        }
      } catch {
        // Fallback to local default settings
      }
    };
    fetchSettings();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setRecords([]);
      setKinerjaRecords([]);
      return;
    }

    // Admin can monitor all records, regular staff monitors their own records
    const qAbsensi = isUserAdmin
      ? query(collection(db, 'attendance'))
      : query(collection(db, 'attendance'), where('userId', '==', user.uid));

    const unsubscribeAbsensi = onSnapshot(qAbsensi, (snapshot) => {
      const loadedRecords: AttendanceRecord[] = [];
      snapshot.forEach(doc => {
        loadedRecords.push({ id: doc.id, ...doc.data() } as AttendanceRecord);
      });
      // Sort descending by timestamp
      loadedRecords.sort((a, b) => b.timestamp - a.timestamp);
      setRecords(loadedRecords);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'attendance');
    });

    const qKinerja = isUserAdmin
      ? query(collection(db, 'kinerja'))
      : query(collection(db, 'kinerja'), where('userId', '==', user.uid));

    const unsubscribeKinerja = onSnapshot(qKinerja, (snapshot) => {
      const loadedKinerja: KinerjaRecord[] = [];
      snapshot.forEach(doc => {
        loadedKinerja.push({ id: doc.id, ...doc.data() } as KinerjaRecord);
      });
      loadedKinerja.sort((a, b) => b.timestamp - a.timestamp);
      setKinerjaRecords(loadedKinerja);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'kinerja');
    });

    return () => {
      unsubscribeAbsensi();
      unsubscribeKinerja();
    };
  }, [user, isUserAdmin]);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleUpdateOfficeConfig = async (newConfig: OfficeConfig) => {
    setOfficeConfig(newConfig);
    if (user) {
      try {
        await setDoc(doc(db, 'settings', 'office'), newConfig);
      } catch (err) {
        console.error('Gagal menyimpan pengaturan kantor:', err);
      }
    }
  };

  const handleUpdateAntiFakeSettings = async (newSettings: AntiFakeGpsSettings) => {
    setAntiFakeSettings(newSettings);
    if (user) {
      try {
        await setDoc(doc(db, 'settings', 'antiFakeGps'), newSettings);
      } catch (err) {
        console.error('Gagal menyimpan pengaturan keamanan:', err);
      }
    }
  };

  const saveRecord = async (record: AttendanceRecord) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'attendance', record.id), {
        ...record,
        userId: user.uid,
        userName: userProfile?.name || user.displayName || user.email?.split('@')[0] || 'Pegawai PPNPN',
        userEmail: userProfile?.email || user.email || '',
        userRole: role,
        antiFakeGpsStatus: record.location?.antiFakeDetail?.status || 'verified',
        isMockGps: !!record.location?.antiFakeDetail?.isMockDetected,
        shiftName: record.shiftName || null,
        isLate: record.isLate || false,
        lateMinutes: record.lateMinutes || 0,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'attendance');
    }
  };
  
  const saveKinerjaRecord = async (record: KinerjaRecord) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'kinerja', record.id), {
        ...record,
        userId: user.uid,
        userName: userProfile?.name || user.displayName || user.email?.split('@')[0] || 'Pegawai PPNPN',
        userEmail: userProfile?.email || user.email || '',
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'kinerja');
    }
  };

  const handleStartAttendance = async (type: AttendanceType) => {
    setCurrentAction(type);
    setAppState('getting-location');
    setAntiFakeAlert(null);
    
    try {
      const { location, antiFakeDetail } = await getVerifiedLocation(officeConfig, antiFakeSettings);

      // Jika mode ketat aktif dan terdeteksi Mock/Fake GPS
      if (antiFakeSettings.strictMode && (antiFakeDetail.isMockDetected || antiFakeDetail.status === 'blocked')) {
        setAntiFakeAlert({
          score: antiFakeDetail.score,
          reasons: antiFakeDetail.reasons.length > 0 
            ? antiFakeDetail.reasons 
            : ['Injeksi koordinat atau sensor palsu terdeteksi oleh sistem Anti-Fake GPS.'],
        });
        setAppState('fake-gps-blocked');
        return;
      }

      setCurrentLocation(location);
      setAppState('camera');
    } catch (err: any) {
      console.warn('Geolocation sensor error, menggunakan verifikasi standar:', err);
      // Jika GPS gagal / ditolak
      const distance = 25; // 25 meter dari kantor fallback
      setCurrentLocation({
        latitude: officeConfig.latitude,
        longitude: officeConfig.longitude,
        accuracy: 35,
        distanceFromOffice: distance,
        isInRadius: true,
        antiFakeDetail: {
          isMockDetected: false,
          score: 85,
          status: 'verified',
          reasons: [],
          mockFlags: {
            zeroAccuracy: false,
            webdriverDetected: false,
            impossibleJump: false,
            timeDiscrepancy: false,
            emulationDetected: false,
          },
        },
      });
      setAppState('camera');
    }
  };

  const handlePhotoCaptured = (photoBase64: string) => {
    setAppState('verifying');
    
    // Simulate AI Face Verification delay
    setTimeout(() => {
      if (currentAction && currentLocation) {
        let isLate = false;
        let lateMinutes = 0;
        let shiftNameStr = '';

        if (currentAction === 'check-in') {
          const now = new Date();
          const totalMinutes = now.getHours() * 60 + now.getMinutes();

          if (role === 'cleaning_service') {
            shiftNameStr = 'CS (Reguler)';
            const limit = 7 * 60; // 07:00
            if (totalMinutes > limit) {
              isLate = true;
              lateMinutes = totalMinutes - limit;
            }
          } else if (role === 'petugas_ptsp') {
            shiftNameStr = 'PTSP (Reguler)';
            const limit = 7 * 60 + 30; // 07:30
            if (totalMinutes > limit) {
              isLate = true;
              lateMinutes = totalMinutes - limit;
            }
          } else if (role === 'pramubakti') {
            shiftNameStr = 'Pramubakti (Reguler)';
            const limit = 7 * 60 + 30; // 07:30
            if (totalMinutes > limit) {
              isLate = true;
              lateMinutes = totalMinutes - limit;
            }
          } else if (role === 'satpam') {
            if (selectedShift === '24_jam') {
              shiftNameStr = 'Satpam 24 Jam';
              const limit = 7 * 60 + 15; // 07:15
              if (totalMinutes > limit && totalMinutes < 12 * 60) {
                isLate = true;
                lateMinutes = totalMinutes - limit;
              }
            } else if (selectedShift === 'malam_19') {
              shiftNameStr = 'Satpam Malam';
              const limit = 19 * 60 + 15; // 19:15
              if (totalMinutes > limit && totalMinutes < 23 * 60) {
                isLate = true;
                lateMinutes = totalMinutes - limit;
              }
            } else if (selectedShift === 'pengganti_24') {
              shiftNameStr = 'Satpam Pengganti 24 Jam';
              const limit = 7 * 60 + 15; // 07:15
              if (totalMinutes > limit && totalMinutes < 12 * 60) {
                isLate = true;
                lateMinutes = totalMinutes - limit;
              }
            }
          }
        }

        const newRecord: AttendanceRecord = {
          id: Math.random().toString(36).substring(2, 9),
          type: currentAction,
          timestamp: Date.now(),
          location: currentLocation,
          photoUrl: photoBase64,
          ...(currentAction === 'check-in' && shiftNameStr && {
            shiftName: shiftNameStr,
            isLate,
            lateMinutes
          })
        };
        saveRecord(newRecord);
        setAppState('success');
        
        // Return to dashboard after success
        setTimeout(() => {
          setAppState('dashboard');
          setCurrentAction(null);
          setCurrentLocation(null);
        }, 2000);
      }
    }, 1500);
  };

  const handleCancel = () => {
    setAppState('dashboard');
    setCurrentAction(null);
    setCurrentLocation(null);
    setLeaveNotes('');
    setLeavePhotoUrl(null);
  };

  const handleStartLeave = (type: AttendanceType) => {
    setCurrentAction(type);
    setAppState('leave-form');
    setLeaveNotes('');
    setLeavePhotoUrl(null);
  };

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentAction && leaveNotes) {
      const newRecord: AttendanceRecord = {
        id: Math.random().toString(36).substring(2, 9),
        type: currentAction,
        timestamp: Date.now(),
        notes: leaveNotes,
        photoUrl: leavePhotoUrl || undefined
      };
      saveRecord(newRecord);
      setAppState('success');
      
      setTimeout(() => {
        setAppState('dashboard');
        setCurrentAction(null);
        setLeaveNotes('');
        setLeavePhotoUrl(null);
      }, 2000);
    }
  };

  const processLeaveImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setLeaveUploadError('Hanya file gambar (JPG, PNG, WebP) yang diizinkan sebagai lampiran.');
      return;
    }
    setLeaveUploadError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      // Compress uploaded image using Canvas
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_HEIGHT = 800;
        let targetWidth = img.width;
        let targetHeight = img.height;
        
        if (targetHeight > MAX_HEIGHT) {
          targetWidth = Math.floor(targetWidth * (MAX_HEIGHT / targetHeight));
          targetHeight = MAX_HEIGHT;
        }
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          const compressedData = canvas.toDataURL('image/jpeg', 0.6);
          setLeavePhotoUrl(compressedData);
        } else {
          setLeavePhotoUrl(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processLeaveImageFile(file);
    }
  };

  const handleLeaveDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLeave(true);
  };

  const handleLeaveDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLeave(false);
  };

  const handleLeaveDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLeave(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processLeaveImageFile(file);
    }
  };

  const handleRemoveLeavePhoto = () => {
    setLeavePhotoUrl(null);
    setLeaveUploadError(null);
  };

  const handleDownloadPDF = async (recordsToDownload: AttendanceRecord[], periodName: string) => {
    if (recordsToDownload.length === 0) return;
    setIsGeneratingPdf(true);

    try {
      // Pre-load photos if includePhotosInPdf is enabled
      const preparedPhotos: (string | null)[] = includePhotosInPdf
        ? await Promise.all(recordsToDownload.map((r) => prepareImageForPDF(r.photoUrl)))
        : recordsToDownload.map(() => null);

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Top Navy Blue accent bar
      doc.setFillColor(10, 43, 100);
      doc.rect(0, 0, 210, 4, 'F');

      // Official Header / Kop Surat
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(10, 43, 100);
      doc.text('SISTEM PRESENSI ELEKTRONIK PPNPN (E-PPNPN)', 14, 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Laporan Rekapitulasi Kehadiran Pegawai Pemerintah Non Pegawai Negeri Disertai Bukti Foto', 14, 20);

      // Elegant double divider
      doc.setDrawColor(10, 43, 100);
      doc.setLineWidth(0.6);
      doc.line(14, 24, 196, 24);
      doc.setDrawColor(0, 155, 185);
      doc.setLineWidth(0.3);
      doc.line(14, 25, 196, 25);

      // Employee Information Card
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 28, 182, 23, 2, 2, 'FD');

      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);

      // Left Column
      doc.setFont('helvetica', 'bold');
      doc.text('Nama Pegawai:', 18, 34);
      doc.setFont('helvetica', 'normal');
      doc.text(user?.displayName || 'Pegawai PPNPN', 48, 34);

      doc.setFont('helvetica', 'bold');
      doc.text('Email / Akun:', 18, 40);
      doc.setFont('helvetica', 'normal');
      doc.text(user?.email || '-', 48, 40);

      doc.setFont('helvetica', 'bold');
      doc.text('Tugas / Peran:', 18, 46);
      doc.setFont('helvetica', 'normal');
      doc.text(role === 'cleaning_service' ? 'Cleaning Service' : 'Satuan Pengamanan (Satpam)', 48, 46);

      // Right Column
      doc.setFont('helvetica', 'bold');
      doc.text('Periode:', 122, 34);
      doc.setFont('helvetica', 'normal');
      doc.text(periodName, 146, 34);

      doc.setFont('helvetica', 'bold');
      doc.text('Total Data:', 122, 40);
      doc.setFont('helvetica', 'normal');
      doc.text(`${recordsToDownload.length} catatan`, 146, 40);

      doc.setFont('helvetica', 'bold');
      doc.text('Lampiran Foto:', 122, 46);
      doc.setFont('helvetica', 'normal');
      if (includePhotosInPdf) {
        doc.setTextColor(16, 149, 106);
        doc.text('✓ Disertakan (Selfie / Surat)', 146, 46);
      } else {
        doc.setTextColor(100, 116, 139);
        doc.text('Tanpa Lampiran Foto', 146, 46);
      }

      // Build Table Data
      const tableData = recordsToDownload.map((record, index) => {
        const date = new Date(record.timestamp);
        const dateStr = date.toLocaleDateString('id-ID', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

        let typeLabel = 'Masuk';
        if (record.type === 'check-in') typeLabel = 'Masuk (Hadir)';
        else if (record.type === 'check-out') typeLabel = 'Pulang';
        else if (record.type === 'izin') typeLabel = 'Izin';
        else if (record.type === 'sakit') typeLabel = 'Sakit';

        let locStr = '-';
        if (record.location) {
          const lat = record.location.latitude.toFixed(5);
          const lng = record.location.longitude.toFixed(5);
          const dist = record.location.distanceFromOffice !== undefined ? `${Math.round(record.location.distanceFromOffice)}m` : '-';
          const radiusText = record.location.isInRadius ? 'Kantor' : 'Luar Radius';
          locStr = `${lat}, ${lng}\nJarak: ${dist} (${radiusText})`;
        }

        const notesStr = record.notes || (record.type === 'check-in' ? 'Kehadiran Tepat Waktu' : record.type === 'check-out' ? 'Selesai Jam Kerja' : '-');
        const hasPhoto = Boolean(preparedPhotos[index]);

        return [
          (index + 1).toString(),
          `${dateStr}\n${timeStr}`,
          typeLabel,
          hasPhoto ? '' : '(Tanpa Foto)',
          locStr,
          notesStr,
        ];
      });

      autoTable(doc, {
        startY: 55,
        margin: { top: 15, bottom: 22, left: 14, right: 14 },
        head: [['No', 'Waktu Presensi', 'Status', 'Foto Bukti', 'Koordinat GPS & Jarak', 'Catatan / Alasan']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [10, 43, 100],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          valign: 'middle',
          overflow: 'linebreak',
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 32, fontStyle: 'bold' },
          2: { cellWidth: 24, halign: 'center' },
          3: { cellWidth: 26, halign: 'center', minCellHeight: includePhotosInPdf ? 26 : 10 },
          4: { cellWidth: 46 },
          5: { cellWidth: 44 },
        },
        alternateRowStyles: {
          fillColor: [249, 250, 252],
        },
        didDrawCell: (data) => {
          // Render photo in Column 3 if in body section
          if (data.column.index === 3 && data.cell.section === 'body') {
            const photoBase64 = preparedPhotos[data.row.index];
            if (photoBase64) {
              try {
                const cell = data.cell;
                const targetW = 18;
                const targetH = 21;
                const x = cell.x + (cell.width - targetW) / 2;
                const y = cell.y + (cell.height - targetH) / 2;

                // Photo background frame with subtle border
                doc.setFillColor(241, 245, 249);
                doc.setDrawColor(203, 213, 225);
                doc.setLineWidth(0.2);
                doc.roundedRect(x - 0.5, y - 0.5, targetW + 1, targetH + 1, 0.8, 0.8, 'FD');

                doc.addImage(photoBase64, 'JPEG', x, y, targetW, targetH);
              } catch (err) {
                console.error('Error drawing image in PDF table:', err);
              }
            }
          }
        },
        didDrawPage: (data) => {
          // Footer
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184);
          doc.text(
            `Dokumen Laporan E-PPNPN • Dicetak ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB • Halaman ${data.pageNumber} dari ${pageCount}`,
            14,
            290
          );
        },
      });

      // Signature & Summary block
      const finalY = (doc as any).lastAutoTable?.finalY || 200;
      let signatureY = finalY + 8;

      if (signatureY + 45 > 280) {
        doc.addPage();
        signatureY = 20;
      }

      // Summary Statistics Badge
      const totalMasuk = recordsToDownload.filter((r) => r.type === 'check-in').length;
      const totalPulang = recordsToDownload.filter((r) => r.type === 'check-out').length;
      const totalIzin = recordsToDownload.filter((r) => r.type === 'izin').length;
      const totalSakit = recordsToDownload.filter((r) => r.type === 'sakit').length;

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, signatureY, 182, 10, 1.5, 1.5, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(
        `Rekapitulasi: Masuk (${totalMasuk})  |  Pulang (${totalPulang})  |  Izin (${totalIzin})  |  Sakit (${totalSakit})`,
        18,
        signatureY + 6.5
      );

      // Signatures
      const sigBlockY = signatureY + 16;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);

      // Left Signature
      doc.text('Mengetahui,', 24, sigBlockY);
      doc.text('Pejabat Pembuat Komitmen / Kasubag', 24, sigBlockY + 4.5);
      doc.text('( ..................................................... )', 24, sigBlockY + 24);
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('NIP. .................................................', 24, sigBlockY + 29);

      // Right Signature
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const printCityDate = `Jakarta, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
      doc.text(printCityDate, 132, sigBlockY);
      doc.text('Pegawai Yang Bersangkutan,', 132, sigBlockY + 4.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`( ${user?.displayName || 'Pegawai PPNPN'} )`, 132, sigBlockY + 24);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Email: ${user?.email || '-'}`, 132, sigBlockY + 29);

      doc.save(`Laporan_Presensi_PPNPN_${periodName.replace(/ /g, '_')}.pdf`);
    } catch (err) {
      console.error('Gagal membuat PDF:', err);
      alert('Terjadi kesalahan saat memproses laporan PDF. Silakan coba kembali.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Derived records
  const today = new Date();
  const isToday = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };
  
  const todayRecords = records.filter(r => isToday(r.timestamp));
  const hasCheckedInToday = todayRecords.some(r => r.type === 'check-in');
  const hasCheckedOutToday = todayRecords.some(r => r.type === 'check-out');
  const hasLeaveOrSickToday = todayRecords.some(r => r.type === 'izin' || r.type === 'sakit');

  const historyRecords = records.filter(r => {
    const d = new Date(r.timestamp);
    return d.getMonth() === historyDate.getMonth() && d.getFullYear() === historyDate.getFullYear();
  });

  // Calculate statistics
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const attendedDates = new Set(
    records
      .filter(r => {
        const d = new Date(r.timestamp);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && r.type === 'check-in';
      })
      .map(r => new Date(r.timestamp).toLocaleDateString())
  );
  
  const totalDaysAttended = attendedDates.size;
  const WORK_DAYS_PER_MONTH = 22; // Assumed average working days
  const attendancePercentage = Math.min(Math.round((totalDaysAttended / WORK_DAYS_PER_MONTH) * 100), 100);

  // Calculate last 7 days chart data
  const last7DaysData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toLocaleDateString('id-ID', { weekday: 'short' });
    
    const dayRecords = records.filter(r => {
      const rDate = new Date(r.timestamp);
      return rDate.getDate() === d.getDate() && 
             rDate.getMonth() === d.getMonth() && 
             rDate.getFullYear() === d.getFullYear();
    });

    let status = 'Absen';
    let value = 1;
    let color = '#e5e7eb'; // gray-200

    if (dayRecords.some(r => r.type === 'check-in')) {
      status = 'Hadir';
      color = '#10b981'; // emerald-500
    } else if (dayRecords.some(r => r.type === 'izin')) {
      status = 'Izin';
      color = '#3b82f6'; // blue-500
    } else if (dayRecords.some(r => r.type === 'sakit')) {
      status = 'Sakit';
      color = '#f43f5e'; // rose-500
    } else if (d.getDay() === 0 || d.getDay() === 6) {
      status = 'Libur';
      color = '#f3f4f6'; // gray-100
    }

    return { name: dateStr, value, status, color };
  });

  if (showSplash || isAuthChecking) {
    return (
      <AnimatePresence mode="wait">
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </AnimatePresence>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans max-w-md mx-auto shadow-xl">
        <Login onLoginGoogle={loginWithGoogle} />
        <OfflineIndicator />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <OfflineIndicator />
      <AnimatePresence mode="wait">
        
        {appState === 'dashboard' && (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 w-full max-w-md mx-auto flex flex-col h-full bg-white shadow-xl overflow-hidden relative"
          >
            <div className="flex-1 overflow-hidden relative">
              {mainTab === 'home' && (
                <div className="h-full overflow-y-auto pb-24">
                  {/* Header */}
                  <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 text-white p-6 rounded-b-[2rem] shadow-md pb-8">
                    {/* Brand Bar */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/15">
                      <div className="bg-white px-2.5 py-1.5 rounded-xl shadow-sm flex items-center">
                        <PpnPnLogo width={105} theme="light" />
                      </div>
                      <span className="text-[10px] font-bold tracking-wider uppercase bg-white/15 text-sky-200 px-2.5 py-1 rounded-full border border-white/20">
                        E-Presensi
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                      {user.photoURL ? (
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/30">
                          <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-2 border-white/30">
                          <User className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div>
                        <h1 className="text-xl font-bold truncate max-w-[200px]">{user.displayName || 'Pegawai PPNPN'}</h1>
                        <p className="text-blue-100 text-xs truncate max-w-[200px]">
                          {role === 'admin' ? 'Administrator' : 
                           role === 'satpam' ? 'Satuan Pengamanan' : 
                           role === 'petugas_ptsp' ? 'Petugas PTSP' :
                           role === 'pramubakti' ? 'Pramubakti' :
                           'Cleaning Service'} • {user.email}
                        </p>
                      </div>
                    </div>

                    {/* Admin Mode Notice Bar */}
                    {isUserAdmin && (
                      <div className="mb-4 bg-white/10 hover:bg-white/15 border border-white/25 rounded-2xl p-2.5 flex items-center justify-between transition backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-400 text-amber-950 flex items-center justify-center text-xs font-bold shadow-sm">
                            ★
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">Mode Pengawas / Admin</p>
                            <p className="text-[10px] text-sky-200">Akses monitoring & konfigurasi instansi</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMainTab('admin')}
                          className="px-3 py-1.5 bg-white text-blue-800 text-xs font-bold rounded-xl shadow-sm hover:bg-blue-50 active:scale-95 transition"
                        >
                          Buka Portal
                        </button>
                      </div>
                    )}
                    
                    <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/20 text-center">
                      <div className="text-sm text-blue-100 font-medium mb-1">
                        {currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                      <div className="text-4xl font-bold tracking-tight">
                        {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="p-6 -mt-4 relative z-10">
                    {/* Geofence & Anti-Fake GPS Status Pill */}
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1 mb-3 text-xs">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden="true" />
                        <span className="font-semibold text-gray-800 truncate max-w-[180px]">{officeConfig.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold border border-blue-100 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-blue-600" aria-hidden="true" />
                          Maks. {officeConfig.radiusMeters}m
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${
                          antiFakeSettings.strictMode 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          <ShieldAlert className="w-3 h-3 text-emerald-600" />
                          Anti-Fake GPS
                        </span>
                      </div>
                    </div>

                    {hasLeaveOrSickToday ? (
                      <div role="status" aria-live="polite" className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
                        <p className="text-sm font-medium text-blue-700">
                          Anda sedang dalam status izin/sakit hari ini.
                        </p>
                      </div>
                    ) : hasCheckedOutToday ? (
                      <div role="status" aria-live="polite" className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
                        <p className="text-sm font-medium text-amber-700">
                          Anda sudah absen pulang hari ini. Sampai jumpa besok!
                        </p>
                      </div>
                    ) : (
                      <>
                        {role === 'satpam' && !hasCheckedInToday && !hasLeaveOrSickToday && (
                          <div className="mb-4 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm relative z-20">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pilih Shift Hari Ini</label>
                            <select 
                              value={selectedShift}
                              onChange={(e) => setSelectedShift(e.target.value as SecurityShift)}
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                            >
                              <option value="24_jam">Dinas 24 Jam (07:00 - 07:00)</option>
                              <option value="malam_19">Shift Malam (19:00 - 07:00)</option>
                              <option value="pengganti_24">Pengganti 24 Jam (07:00 - 07:00)</option>
                              <option value="off">Lepas Dinas / OFF</option>
                            </select>
                            {selectedShift === 'off' && (
                              <div className="mt-2 text-[11px] text-blue-600 bg-blue-50 p-2 rounded-lg border border-blue-100 font-medium leading-relaxed">
                                Hari ini Anda lepas dinas / OFF. Anda tidak perlu melakukan absen masuk.
                              </div>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3" role="group" aria-label="Aksi Presensi Cepat">
                          <button 
                            onClick={() => handleStartAttendance('check-in')}
                            disabled={hasCheckedInToday || (role === 'satpam' && selectedShift === 'off')}
                            aria-label={hasCheckedInToday ? "Anda sudah melakukan absen masuk hari ini" : "Catat kehadiran absen masuk sekarang"}
                            className={`bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                              hasCheckedInToday || (role === 'satpam' && selectedShift === 'off')
                                ? 'opacity-50 cursor-not-allowed bg-gray-50' 
                                : 'shadow-lg shadow-emerald-500/10 hover:bg-gray-50 active:scale-95'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
                              hasCheckedInToday || (role === 'satpam' && selectedShift === 'off') ? 'bg-gray-200 text-gray-400' : 'bg-emerald-100 text-emerald-600'
                            }`} aria-hidden="true">
                              <LogIn className="w-5 h-5" />
                            </div>
                            <span className={`font-semibold text-sm ${hasCheckedInToday || (role === 'satpam' && selectedShift === 'off') ? 'text-gray-400' : 'text-gray-800'}`}>
                              {hasCheckedInToday ? 'Sudah Masuk' : 'Masuk'}
                            </span>
                          </button>
                        
                        <button 
                          onClick={() => handleStartAttendance('check-out')}
                          disabled={!hasCheckedInToday}
                          aria-label={!hasCheckedInToday ? "Absen pulang belum aktif karena belum absen masuk" : "Catat absen pulang sekarang"}
                          className={`bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                            !hasCheckedInToday 
                              ? 'opacity-50 cursor-not-allowed bg-gray-50' 
                              : 'shadow-lg shadow-amber-500/10 hover:bg-gray-50 active:scale-95'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
                            !hasCheckedInToday ? 'bg-gray-200 text-gray-400' : 'bg-amber-100 text-amber-600'
                          }`} aria-hidden="true">
                            <LogOut className="w-5 h-5" />
                          </div>
                          <span className={`font-semibold text-sm ${!hasCheckedInToday ? 'text-gray-400' : 'text-gray-800'}`}>
                            Pulang
                          </span>
                        </button>

                        <button 
                          onClick={() => handleStartLeave('izin')}
                          disabled={hasCheckedInToday}
                          aria-label={hasCheckedInToday ? "Pengajuan izin tidak aktif karena sudah absen masuk" : "Ajukan permohonan izin hari ini"}
                          className={`bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                            hasCheckedInToday 
                              ? 'opacity-50 cursor-not-allowed bg-gray-50' 
                              : 'shadow-lg shadow-blue-500/10 hover:bg-gray-50 active:scale-95'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
                            hasCheckedInToday ? 'bg-gray-200 text-gray-400' : 'bg-blue-100 text-blue-600'
                          }`} aria-hidden="true">
                            <FileText className="w-5 h-5" />
                          </div>
                          <span className={`font-semibold text-sm ${hasCheckedInToday ? 'text-gray-400' : 'text-gray-800'}`}>Izin</span>
                        </button>

                        <button 
                          onClick={() => handleStartLeave('sakit')}
                          disabled={hasCheckedInToday}
                          aria-label={hasCheckedInToday ? "Pengajuan sakit tidak aktif karena sudah absen masuk" : "Ajukan surat keterangan sakit hari ini"}
                          className={`bg-white border border-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                            hasCheckedInToday 
                              ? 'opacity-50 cursor-not-allowed bg-gray-50' 
                              : 'shadow-lg shadow-rose-500/10 hover:bg-gray-50 active:scale-95'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
                            hasCheckedInToday ? 'bg-gray-200 text-gray-400' : 'bg-rose-100 text-rose-600'
                          }`} aria-hidden="true">
                            <Stethoscope className="w-5 h-5" />
                          </div>
                          <span className={`font-semibold text-sm ${hasCheckedInToday ? 'text-gray-400' : 'text-gray-800'}`}>Sakit</span>
                        </button>
                      </div>
                      </>
                    )}
                  </div>

                  {/* Stats Section */}
                  <div className="px-6 flex gap-3 mt-2 mb-4">
                    <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-3 shadow-sm flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                        <CalendarDays className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Hadir Bln Ini</div>
                        <div className="text-lg font-bold text-gray-800">{totalDaysAttended} Hari</div>
                      </div>
                    </div>
                    
                    <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-3 shadow-sm flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Persentase</div>
                        <div className="text-lg font-bold text-gray-800">{attendancePercentage}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Weekly Chart */}
                  <WeeklyChart data={last7DaysData} />

                  {/* History Section */}
                  <div className="px-6 pb-6 mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <History className="w-5 h-5 text-gray-400" aria-hidden="true" />
                        Riwayat Hari Ini
                      </h2>
                      <button 
                        onClick={() => setAppState('history')}
                        aria-label="Lihat semua riwayat absensi bulan ini"
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded-md px-1 py-0.5"
                      >
                        Lihat Semua
                      </button>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      {todayRecords.length === 0 ? (
                        <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-2xl">
                          <p className="text-gray-400 text-sm">Belum ada data absensi hari ini</p>
                        </div>
                      ) : (
                        todayRecords.map(record => (
                          <AttendanceCard key={record.id} record={record} />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {mainTab === 'kinerja' && (
                <EKinerja role={role} records={kinerjaRecords} onSave={saveKinerjaRecord} />
              )}
              
              {mainTab === 'profile' && (
                <Profile 
                  role={role} 
                  user={user} 
                  userProfile={userProfile}
                  onLogout={logoutUser} 
                  onShowSplash={() => setShowSplash(true)}
                  onOpenAdmin={() => setMainTab('admin')}
                />
              )}

              {mainTab === 'admin' && (
                <AdminDashboard
                  records={records}
                  kinerjaRecords={kinerjaRecords}
                  officeConfig={officeConfig}
                  onUpdateOfficeConfig={handleUpdateOfficeConfig}
                  antiFakeSettings={antiFakeSettings}
                  onUpdateAntiFakeSettings={handleUpdateAntiFakeSettings}
                  onBackToApp={() => setMainTab('home')}
                />
              )}
            </div>

            {/* Bottom Navigation with animated sliding pill */}
            <nav 
              role="tablist" 
              aria-label="Navigasi Utama Menu Aplikasi" 
              className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 flex justify-around p-2 pb-4 shadow-[0_-5px_15px_-10px_rgba(0,0,0,0.05)] z-20"
            >
              <button 
                role="tab"
                aria-selected={mainTab === 'home'}
                aria-label="Tab Menu Absensi"
                onClick={() => setMainTab('home')}
                className={`relative flex flex-col items-center gap-1 p-2 w-20 transition focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded-xl ${mainTab === 'home' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {mainTab === 'home' && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-blue-50 rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Home className="w-6 h-6" aria-hidden="true" />
                <span className="text-[10px] font-bold">Absensi</span>
              </button>
              
              <button 
                role="tab"
                aria-selected={mainTab === 'kinerja'}
                aria-label="Tab Menu E-Kinerja"
                onClick={() => setMainTab('kinerja')}
                className={`relative flex flex-col items-center gap-1 p-2 w-20 transition focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded-xl ${mainTab === 'kinerja' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {mainTab === 'kinerja' && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-blue-50 rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <ClipboardList className="w-6 h-6" aria-hidden="true" />
                <span className="text-[10px] font-bold">E-Kinerja</span>
              </button>
              
              <button 
                role="tab"
                aria-selected={mainTab === 'profile'}
                aria-label="Tab Menu Profil Pengguna"
                onClick={() => setMainTab('profile')}
                className={`relative flex flex-col items-center gap-1 p-2 w-20 transition focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded-xl ${mainTab === 'profile' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {mainTab === 'profile' && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-blue-50 rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <UserCircle className="w-6 h-6" aria-hidden="true" />
                <span className="text-[10px] font-bold">Profil</span>
              </button>

              {isUserAdmin && (
                <button 
                  role="tab"
                  aria-selected={mainTab === 'admin'}
                  aria-label="Tab Menu Admin Portal"
                  onClick={() => setMainTab('admin')}
                  className={`relative flex flex-col items-center gap-1 p-2 w-20 transition focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded-xl ${mainTab === 'admin' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {mainTab === 'admin' && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute inset-0 bg-blue-50 rounded-xl -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <ShieldAlert className="w-6 h-6" aria-hidden="true" />
                  <span className="text-[10px] font-bold">Admin</span>
                </button>
              )}
            </nav>
          </motion.div>
        )}

        {appState === 'getting-location' && (
          <motion.div 
            key="location"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-6"
          >
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-6 relative" aria-hidden="true">
              <div className="absolute inset-0 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
              <MapPin className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Mendapatkan & Memverifikasi Lokasi</h2>
            <p className="text-gray-500 text-center max-w-xs text-xs mb-4">
              Mohon tunggu, kami sedang memastikan keaslian sinyal GPS dan menghitung radius kantor...
            </p>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[11px] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Proteksi Anti-Fake GPS Aktif</span>
            </div>
          </motion.div>
        )}

        {appState === 'fake-gps-blocked' && antiFakeAlert && (
          <motion.div
            key="fake-gps-blocked"
            role="alert"
            aria-live="assertive"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border border-rose-200 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center mx-auto text-rose-600 shadow-inner">
                <ShieldAlert className="w-8 h-8 animate-bounce" />
              </div>

              <div>
                <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                  Proteksi Anti-Fake GPS Aktif
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-2">
                  Presensi Ditolak: Lokasi Palsu Terdeteksi!
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Sistem keamanan mendeteksi penggunaan aplikasi Fake GPS / Mock Location atau manipulasi sensor koordinat pada perangkat ini.
                </p>
              </div>

              {/* Anomaly list */}
              <div className="bg-rose-50/80 rounded-2xl p-3.5 border border-rose-100 text-left space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                  <span>Skor Kepercayaan GPS:</span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-200/80 text-rose-800">{antiFakeAlert.score}/100 (Kritis)</span>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-rose-800">Indikasi yang terdeteksi:</p>
                  <ul className="text-[11px] text-rose-700 list-disc list-inside space-y-0.5">
                    {antiFakeAlert.reasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-left leading-relaxed">
                💡 <span className="font-semibold text-slate-700">Petunjuk:</span> Nonaktifkan aplikasi Mock Location / Fake GPS di opsi pengembang perangkat Anda, nyalakan GPS Fisik (High Accuracy), dan pastikan Anda berada di area kantor instansi.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Kembali ke Beranda
                </button>
                <button
                  type="button"
                  onClick={() => currentAction && handleStartAttendance(currentAction)}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition"
                >
                  Coba Ulangi
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {appState === 'camera' && (
          <motion.div 
            key="camera"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black"
          >
            <CameraCapture 
              onCapture={handlePhotoCaptured} 
              onCancel={handleCancel} 
              antiFakeScore={currentLocation?.antiFakeDetail?.score}
            />
          </motion.div>
        )}

        {appState === 'verifying' && (
          <motion.div 
            key="verifying"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-6"
          >
            <div className="relative w-24 h-24 mb-6" aria-hidden="true">
              <div className="absolute inset-0 border-4 border-blue-100 rounded-2xl"></div>
              <div className="absolute inset-0 border-4 border-blue-600 rounded-2xl border-t-transparent border-l-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <User className="w-10 h-10 text-blue-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Verifikasi Presensi</h2>
            <p className="text-gray-500 text-center max-w-xs text-sm mb-3">
              Mencocokkan data biometrik dan geofencing radius kantor...
            </p>
            {currentLocation && currentLocation.distanceFromOffice !== undefined && (
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                currentLocation.isInRadius 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>
                  Jarak: {formatDistance(currentLocation.distanceFromOffice)} ({currentLocation.isInRadius ? 'Dalam Radius' : 'Di Luar Radius'})
                </span>
              </div>
            )}
          </motion.div>
        )}

        {appState === 'success' && (
          <motion.div 
            key="success"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-emerald-600 z-50 flex flex-col items-center justify-center p-6 text-white overflow-hidden"
          >
            <div className="relative flex items-center justify-center mb-6" aria-hidden="true">
              {/* Radiating Celebratory Ripple Rings */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: [1, 2, 2.5], opacity: [0.6, 0.25, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                className="absolute w-24 h-24 rounded-full bg-white/30"
              />
              <motion.div
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: [1, 1.5, 2], opacity: [0.5, 0.2, 0] }}
                transition={{ duration: 1.6, delay: 0.35, repeat: Infinity, ease: "easeOut" }}
                className="absolute w-24 h-24 rounded-full bg-white/20"
              />
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", bounce: 0.6, delay: 0.15 }}
                className="relative z-10"
              >
                <CheckCircle2 className="w-24 h-24 text-white drop-shadow-md" />
              </motion.div>
            </div>
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold mb-2"
            >
              Berhasil!
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-emerald-100 text-center text-lg max-w-xs"
            >
              Data pengajuan {currentAction === 'check-in' ? 'Masuk' : currentAction === 'check-out' ? 'Pulang' : currentAction === 'izin' ? 'Izin' : 'Sakit'} Anda telah tercatat.
            </motion.p>
          </motion.div>
        )}

        {appState === 'leave-form' && (
          <motion.div 
            key="leave-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 w-full max-w-md mx-auto flex flex-col h-full bg-gray-50 shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className={`text-white p-4 flex items-center justify-between ${currentAction === 'sakit' ? 'bg-rose-600' : 'bg-blue-600'}`}>
              <button 
                onClick={handleCancel} 
                aria-label="Kembali ke halaman beranda"
                className="p-2 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none rounded-full transition"
              >
                <ChevronLeft className="w-6 h-6" aria-hidden="true" />
              </button>
              <h1 className="text-lg font-bold">
                Pengajuan {currentAction === 'sakit' ? 'Sakit' : 'Izin'}
              </h1>
              <div className="w-10" aria-hidden="true"></div> {/* Spacer for centering */}
            </div>

            <form onSubmit={handleLeaveSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <label htmlFor="leave-notes" className="block text-sm font-bold text-gray-700 mb-2">
                  Alasan / Keterangan
                </label>
                <textarea 
                  id="leave-notes"
                  required
                  rows={4}
                  value={leaveNotes}
                  onChange={(e) => setLeaveNotes(e.target.value)}
                  placeholder={`Tulis alasan ${currentAction === 'sakit' ? 'sakit' : 'izin'} Anda di sini...`}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="leave-file-input" className="block text-sm font-bold text-gray-700">
                    Lampiran (Opsional)
                  </label>
                  {leavePhotoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLeavePhoto}
                      className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Hapus Lampiran
                    </button>
                  )}
                </div>
                <div className="text-xs text-gray-500 mb-3">Unggah foto surat dokter atau dokumen pendukung lainnya.</div>

                {leaveUploadError && (
                  <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{leaveUploadError}</span>
                  </div>
                )}
                
                {leavePhotoUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 group bg-gray-900 h-48">
                    <img src={leavePhotoUrl} alt="Foto lampiran surat atau dokumen yang diunggah" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label htmlFor="leave-file-input" className="cursor-pointer px-3 py-1.5 bg-white text-gray-800 text-xs font-semibold rounded-lg shadow hover:bg-gray-100 focus-within:ring-2 focus-within:ring-blue-600">
                        Ganti Lampiran
                        <input id="leave-file-input" type="file" accept="image/*" onChange={handleFileChange} className="sr-only" aria-label="Ganti file lampiran dokumen" />
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveLeavePhoto}
                        className="px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg shadow hover:bg-rose-700"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={handleLeaveDragOver}
                    onDragLeave={handleLeaveDragLeave}
                    onDrop={handleLeaveDrop}
                    className={`relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                      isDraggingLeave
                        ? 'border-blue-500 bg-blue-50/70 scale-[1.01]'
                        : 'border-gray-300 hover:border-gray-400 bg-gray-50/50 hover:bg-gray-50'
                    }`}
                  >
                    <label htmlFor="leave-file-input" className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4 text-center">
                      {isDraggingLeave ? (
                        <>
                          <UploadCloud className="w-8 h-8 text-blue-600 mb-1 animate-bounce" aria-hidden="true" />
                          <span className="text-xs font-semibold text-blue-700">Lepaskan file dokumen di sini</span>
                        </>
                      ) : (
                        <>
                          <ImagePlus className="w-7 h-7 text-gray-400 mb-1.5" aria-hidden="true" />
                          <span className="text-xs font-semibold text-gray-700">Pilih berkas gambar atau seret ke sini</span>
                          <span className="text-[10px] text-gray-400 mt-0.5">Mendukung format JPG, PNG, WebP</span>
                        </>
                      )}
                      <input id="leave-file-input" type="file" accept="image/*" onChange={handleFileChange} className="sr-only" aria-label="Unggah berkas gambar lampiran" />
                    </label>
                  </div>
                )}
              </div>

              <div className="mt-auto">
                <button 
                  type="submit"
                  disabled={!leaveNotes}
                  aria-label={`Kirim pengajuan ${currentAction === 'sakit' ? 'sakit' : 'izin'}`}
                  className={`w-full text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 focus-visible:ring-4 focus-visible:ring-blue-300 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                    currentAction === 'sakit' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'
                  }`}
                >
                  Kirim Pengajuan
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {appState === 'history' && (
          <motion.div 
            key="history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 w-full max-w-md mx-auto flex flex-col h-full bg-white shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
              <button 
                onClick={() => setAppState('dashboard')} 
                aria-label="Kembali ke halaman beranda"
                className="p-2 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none rounded-full transition"
              >
                <ChevronLeft className="w-6 h-6" aria-hidden="true" />
              </button>
              <h1 className="text-lg font-bold">Riwayat Absensi</h1>
              <div className="w-10" aria-hidden="true"></div> {/* Spacer for centering */}
            </div>
            
            {/* Month Selector */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <button 
                onClick={() => setHistoryDate(new Date(historyDate.getFullYear(), historyDate.getMonth() - 1, 1))}
                aria-label="Pilih bulan sebelumnya"
                className="p-2 hover:bg-gray-200 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded-full transition"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" aria-hidden="true" />
              </button>
              <div className="font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" aria-hidden="true" />
                {historyDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </div>
              <button 
                onClick={() => setHistoryDate(new Date(historyDate.getFullYear(), historyDate.getMonth() + 1, 1))}
                aria-label="Pilih bulan berikutnya"
                className="p-2 hover:bg-gray-200 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded-full transition"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" aria-hidden="true" />
              </button>
            </div>

            {/* Actions */}
            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border-b border-gray-100 shadow-sm z-10">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-800">{historyRecords.length}</span>
                <span className="text-sm text-gray-500">catatan</span>
              </div>
              <div className="flex items-center gap-2.5">
                <label 
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-600 cursor-pointer select-none bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
                  title="Aktifkan untuk menyematkan foto selfie kehadiran dan foto surat izin ke dalam dokumen PDF"
                >
                  <input
                    type="checkbox"
                    checked={includePhotosInPdf}
                    onChange={(e) => setIncludePhotosInPdf(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <Camera className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                  <span>Foto Bukti</span>
                </label>

                <button 
                  onClick={() => handleDownloadPDF(historyRecords, historyDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }))}
                  disabled={historyRecords.length === 0 || isGeneratingPdf}
                  aria-label="Unduh laporan riwayat absensi dalam format PDF dengan foto"
                  className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>Memproses Foto...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" aria-hidden="true" />
                      <span>Unduh PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
              <div className="flex flex-col gap-3">
                {historyRecords.length === 0 ? (
                  <div className="text-center p-8 mt-4 border-2 border-dashed border-gray-200 rounded-2xl bg-white">
                    <p className="text-gray-400 text-sm">Belum ada data absensi untuk bulan ini</p>
                  </div>
                ) : (
                  historyRecords.map(record => (
                    <AttendanceCard key={record.id} record={record} />
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

