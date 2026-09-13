import { useState, useEffect } from 'react';
import { CheckSquare, Square, ImagePlus, FileText, Trash2, UploadCloud, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Role, KinerjaRecord, KinerjaTask } from '../types';

const CS_TASKS = [
  'Menyapu Area Dalam & Luar', 
  'Mengepel Lantai Area Publik', 
  'Membersihkan Toilet', 
  'Membuang Sampah ke TPS', 
  'Membersihkan Kaca & Jendela',
  'Membantu Administrasi Kantor',
  'Menyiram Taman Halaman Depan',
  'Menyiram Taman Halaman Tengah',
  'Menyiram Taman Halaman Belakang',
  'Membersihkan Selokan',
  'Membersihkan Tangga'
];

const SATPAM_TASKS = [
  'Apel Pergantian Shift', 
  'Patroli Keliling Area Pagi/Sore', 
  'Cek Kendaraan Keluar/Masuk', 
  'Mengecek Buku Tamu', 
  'Monitoring CCTV',
  'Membantu Administrasi Kantor'
];

const PTSP_TASKS = [
  'Pelayanan Tamu/Pengunjung',
  'Pengelolaan Dokumen Surat Masuk PTSP',
  'Pemberian Informasi Pelayanan',
  'Menjaga Kerapihan Area PTSP',
  'Membantu Administrasi Kantor'
];

const PRAMUBAKTI_TASKS = [
  'Mempersiapkan Ruangan Pimpinan',
  'Melayani Kebutuhan Rapat',
  'Pengelolaan Surat Menyurat Internal',
  'Pengecekan Fasilitas Ruang Tunggu',
  'Membantu Administrasi Kantor'
];

interface EKinerjaProps {
  role: Role;
  records: KinerjaRecord[];
  onSave: (record: KinerjaRecord) => void;
}

export function EKinerja({ role, records, onSave }: EKinerjaProps) {
  let defaultTasks = CS_TASKS;
  if (role === 'satpam') defaultTasks = SATPAM_TASKS;
  else if (role === 'petugas_ptsp') defaultTasks = PTSP_TASKS;
  else if (role === 'pramubakti') defaultTasks = PRAMUBAKTI_TASKS;
  else if (role === 'admin') defaultTasks = ['Monitoring Pekerjaan'];
  
  const [tasks, setTasks] = useState<KinerjaTask[]>(
    defaultTasks.map(name => ({ id: Math.random().toString(), name, completed: false }))
  );
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    setTasks(defaultTasks.map(name => ({ id: Math.random().toString(), name, completed: false })));
    setNotes('');
    setPhotoUrl(null);
    setUploadError(null);
  }, [role]);

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Hanya file gambar (JPG, PNG, WebP) yang diizinkan.');
      return;
    }
    setUploadError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
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
          setPhotoUrl(canvas.toDataURL('image/jpeg', 0.6));
        } else {
          setPhotoUrl(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl(null);
    setUploadError(null);
  };

  const handleSubmit = () => {
    const record: KinerjaRecord = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      role,
      tasks,
      notes,
      photoUrl: photoUrl || undefined
    };
    onSave(record);
    
    setTasks(defaultTasks.map(name => ({ id: Math.random().toString(), name, completed: false })));
    setNotes('');
    setPhotoUrl(null);
    alert('Laporan E-Kinerja berhasil disimpan!');
  };

  const todayRecords = records.filter(r => {
    const d = new Date(r.timestamp);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() && r.role === role;
  });

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-24 overflow-y-auto">
      <div className="bg-blue-600 text-white p-6 rounded-b-[2rem] shadow-md mb-4">
        <h1 className="text-xl font-bold">Laporan E-Kinerja</h1>
        <p className="text-blue-100 text-sm">
          Tugas Harian - {role === 'cleaning_service' ? 'Cleaning Service' : 'Satuan Pengamanan'}
        </p>
      </div>

      <div className="px-6 space-y-6">
        <section aria-labelledby="tasks-heading" className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 id="tasks-heading" className="font-bold text-gray-800 mb-4">Daftar Pekerjaan</h2>
          <div className="space-y-3" role="group" aria-labelledby="tasks-heading">
            {tasks.map(task => (
              <motion.button 
                key={task.id}
                role="checkbox"
                whileTap={{ scale: 0.98 }}
                aria-checked={task.completed}
                aria-label={`${task.name}, status: ${task.completed ? 'selesai dikerjakan' : 'belum dikerjakan'}`}
                onClick={() => toggleTask(task.id)}
                className={`flex items-center gap-3 w-full text-left p-2.5 rounded-xl border transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                  task.completed ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-transparent hover:bg-gray-50'
                }`}
              >
                {task.completed ? (
                  <motion.div
                    initial={{ scale: 0.7 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  >
                    <CheckSquare className="w-6 h-6 text-emerald-600 shrink-0" aria-hidden="true" />
                  </motion.div>
                ) : (
                  <Square className="w-6 h-6 text-gray-300 shrink-0" aria-hidden="true" />
                )}
                <span className={`text-sm font-medium transition-colors ${task.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                  {task.name}
                </span>
              </motion.button>
            ))}
          </div>
        </section>

        <section aria-labelledby="evidence-heading" className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 id="evidence-heading" className="sr-only">Bukti dan Catatan</h2>
          <label htmlFor="ekinerja-notes" className="block text-sm font-bold text-gray-700 mb-2">
            Catatan Tambahan
          </label>
          <textarea 
            id="ekinerja-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ada kendala atau laporan khusus hari ini?"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
          />
          
          <div className="flex items-center justify-between mt-4 mb-2">
            <label htmlFor="ekinerja-photo" className="text-sm font-bold text-gray-700">
              Foto Bukti Pekerjaan
            </label>
            {photoUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                Hapus Foto
              </button>
            )}
          </div>

          {uploadError && (
            <div className="mb-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{uploadError}</span>
            </div>
          )}

          {photoUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-gray-200 group h-36 bg-gray-900">
              <img src={photoUrl} alt="Foto bukti pekerjaan yang diunggah" className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition flex items-center justify-center gap-2">
                <label htmlFor="ekinerja-photo" className="cursor-pointer px-3 py-1.5 bg-white text-gray-800 text-xs font-semibold rounded-lg shadow hover:bg-gray-100 focus-within:ring-2 focus-within:ring-blue-600">
                  Ganti Foto
                  <input id="ekinerja-photo" type="file" accept="image/*" onChange={handleFileChange} className="sr-only" aria-label="Ganti foto bukti pekerjaan" />
                </label>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg shadow hover:bg-rose-700"
                >
                  Hapus
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50/70 scale-[1.01]' 
                  : 'border-gray-300 hover:border-gray-400 bg-gray-50/50 hover:bg-gray-50'
              }`}
            >
              <label htmlFor="ekinerja-photo" className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4 text-center">
                {isDragging ? (
                  <>
                    <UploadCloud className="w-7 h-7 text-blue-600 mb-1 animate-bounce" aria-hidden="true" />
                    <span className="text-xs font-semibold text-blue-700">Lepaskan file gambar di sini</span>
                  </>
                ) : (
                  <>
                    <ImagePlus className="w-6 h-6 text-gray-400 mb-1" aria-hidden="true" />
                    <span className="text-xs font-semibold text-gray-700">Pilih berkas foto atau seret ke sini</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">Mendukung format JPG, PNG, WebP</span>
                  </>
                )}
                <input id="ekinerja-photo" type="file" accept="image/*" onChange={handleFileChange} className="sr-only" aria-label="Unggah foto bukti pekerjaan" />
              </label>
            </div>
          )}
        </section>

        <button 
          onClick={handleSubmit}
          disabled={!tasks.some(t => t.completed)}
          aria-label="Kirimkan Laporan Kinerja Harian"
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/25 hover:bg-blue-700 active:scale-95 focus-visible:ring-4 focus-visible:ring-blue-300 focus-visible:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Kirim Laporan Kinerja
        </button>

        {todayRecords.length > 0 && (
          <div className="mt-8">
            <h3 className="font-bold text-gray-800 mb-4">Laporan Terkirim Hari Ini</h3>
            <div className="space-y-3">
              {todayRecords.map(record => (
                <div key={record.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
                   <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center shrink-0 border border-gray-200">
                    {record.photoUrl ? (
                      <img src={record.photoUrl} alt="Lampiran" className="w-full h-full object-cover" />
                    ) : (
                      <FileText className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                        {record.tasks.filter(t => t.completed).length} / {record.tasks.length} Selesai
                      </span>
                      <span className="text-[10px] font-bold text-gray-400">
                        {new Date(record.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {record.notes && (
                      <p className="text-xs text-gray-600 mt-2 line-clamp-2">"{record.notes}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
