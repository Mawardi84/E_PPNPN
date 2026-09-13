import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Tag, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { HolidayItem, HolidayType } from '../types';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { motion } from 'motion/react';

const DEFAULT_HOLIDAYS: HolidayItem[] = [
  { id: 'h-1', date: '2026-01-01', title: 'Tahun Baru 2026 Masehi', type: 'national', description: 'Libur Nasional Tahun Baru' },
  { id: 'h-2', date: '2026-01-16', title: 'Isra Mikraj Nabi Muhammad SAW', type: 'religious', description: 'Hari Besar Keagamaan Islam' },
  { id: 'h-3', date: '2026-02-17', title: 'Tahun Baru Imlek 2577 Kongzili', type: 'religious', description: 'Hari Raya Imlek' },
  { id: 'h-4', date: '2026-03-19', title: 'Hari Suci Nyepi (Tahun Baru Saka 1948)', type: 'religious', description: 'Hari Raya Nyepi' },
  { id: 'h-5', date: '2026-03-20', title: 'Hari Raya Idul Fitri 1447 Hijriah (Hari 1)', type: 'religious', description: 'Idul Fitri 1 Syawal 1447H' },
  { id: 'h-6', date: '2026-03-21', title: 'Hari Raya Idul Fitri 1447 Hijriah (Hari 2)', type: 'religious', description: 'Idul Fitri 1447H' },
  { id: 'h-7', date: '2026-03-22', title: 'Cuti Bersama Idul Fitri 1447 H', type: 'joint_leave', description: 'Cuti Bersama' },
  { id: 'h-8', date: '2026-03-23', title: 'Cuti Bersama Idul Fitri 1447 H', type: 'joint_leave', description: 'Cuti Bersama' },
  { id: 'h-9', date: '2026-05-01', title: 'Hari Buruh Internasional', type: 'national', description: 'May Day' },
  { id: 'h-10', date: '2026-05-14', title: 'Kenaikan Isa Almasih', type: 'religious', description: 'Kenaikan Yesus Kristus' },
  { id: 'h-11', date: '2026-05-27', title: 'Hari Raya Idul Adha 1447 Hijriah', type: 'religious', description: 'Idul Adha 10 Dzulhijjah' },
  { id: 'h-12', date: '2026-05-31', title: 'Hari Raya Waisak 2570 BE', type: 'religious', description: 'Hari Raya Waisak' },
  { id: 'h-13', date: '2026-06-01', title: 'Hari Lahir Pancasila', type: 'national', description: 'Hari Kelahiran Pancasila' },
  { id: 'h-14', date: '2026-06-17', title: 'Tahun Baru Islam 1448 Hijriah', type: 'religious', description: '1 Muharram 1448H' },
  { id: 'h-15', date: '2026-08-17', title: 'Hari Kemerdekaan Republik Indonesia', type: 'national', description: 'HUT ke-81 RI' },
  { id: 'h-16', date: '2026-08-25', title: 'Maulid Nabi Muhammad SAW', type: 'religious', description: 'Kelahiran Nabi Muhammad SAW' },
  { id: 'h-17', date: '2026-12-25', title: 'Hari Raya Natal', type: 'religious', description: 'Hari Natal' },
  { id: 'h-18', date: '2026-12-26', title: 'Cuti Bersama Hari Raya Natal', type: 'joint_leave', description: 'Cuti Bersama Natal' },
];

interface HolidayCalendarProps {
  isAdmin: boolean;
}

export function HolidayCalendar({ isAdmin }: HolidayCalendarProps) {
  const [holidays, setHolidays] = useState<HolidayItem[]>(DEFAULT_HOLIDAYS);
  const [filterType, setFilterType] = useState<HolidayType | 'all'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<HolidayType>('national');
  const [newDesc, setNewDesc] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load from Firestore
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const docRef = doc(db, 'settings', 'holidays');
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data().items) {
          setHolidays(snap.data().items as HolidayItem[]);
        }
      } catch (err) {
        console.error('Gagal memuat kalender libur:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHolidays();
  }, []);

  const saveHolidaysToFirestore = async (updated: HolidayItem[]) => {
    try {
      const docRef = doc(db, 'settings', 'holidays');
      await setDoc(docRef, { items: updated });
    } catch (err) {
      console.error('Gagal menyimpan kalender libur ke Firestore:', err);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newTitle) return;

    const newItem: HolidayItem = {
      id: 'h-' + Date.now(),
      date: newDate,
      title: newTitle,
      type: newType,
      description: newDesc || undefined
    };

    const updated = [...holidays, newItem].sort((a, b) => a.date.localeCompare(b.date));
    setHolidays(updated);
    await saveHolidaysToFirestore(updated);

    setNewDate('');
    setNewTitle('');
    setNewDesc('');
    setIsAdding(false);
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus agenda libur ini?')) return;
    const updated = holidays.filter(h => h.id !== id);
    setHolidays(updated);
    await saveHolidaysToFirestore(updated);
  };

  const filteredHolidays = holidays.filter(h => {
    if (filterType === 'all') return true;
    return h.type === filterType;
  });

  const getBadgeStyle = (type: HolidayType) => {
    switch (type) {
      case 'national':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'religious':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'joint_leave':
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const getBadgeLabel = (type: HolidayType) => {
    switch (type) {
      case 'national':
        return 'Libur Nasional';
      case 'religious':
        return 'Hari Keagamaan';
      case 'joint_leave':
        return 'Cuti Bersama';
    }
  };

  const formatDateStr = (dateStr: string) => {
    try {
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateStr).toLocaleDateString('id-ID', options);
    } catch {
      return dateStr;
    }
  };

  // Check if today is a holiday
  const todayStr = new Date().toISOString().split('T')[0];
  const todayHoliday = holidays.find(h => h.date === todayStr);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-6 h-6" />
            <h2 className="text-xl font-bold">Kalender Hari Libur & Cuti Bersama</h2>
          </div>
          <p className="text-blue-100 text-sm max-w-xl">
            Penyesuaian jadwal kalender resmi instansi, hari besar nasional, keagamaan, dan cuti bersama untuk PPNPN.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl shadow-sm text-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {isAdding ? 'Tutup Formulir' : 'Tambah Agenda Libur'}
          </button>
        )}
      </div>

      {/* Today Holiday Alert if applicable */}
      {todayHoliday && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800 shadow-sm">
          <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold text-sm">Hari Ini Adalah Hari Libur / Cuti Bersama!</p>
            <p className="text-xs text-amber-700">{todayHoliday.title} ({todayHoliday.description || getBadgeLabel(todayHoliday.type)})</p>
          </div>
        </div>
      )}

      {/* Add Holiday Modal / Form (Admin Only) */}
      {isAdmin && isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm"
        >
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Tambah Agenda Libur Baru
          </h3>
          <form onSubmit={handleAddHoliday} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Tanggal</label>
              <input
                type="date"
                required
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Kategori</label>
              <select
                value={newType}
                onChange={e => setNewType(e.target.value as HolidayType)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="national">Libur Nasional</option>
                <option value="religious">Hari Keagamaan</option>
                <option value="joint_leave">Cuti Bersama</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">Nama Hari Libur / Acara</label>
              <input
                type="text"
                required
                placeholder="Contoh: Cuti Bersama Hari Raya Idul Fitri"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">Keterangan (Opsional)</label>
              <input
                type="text"
                placeholder="Keterangan tambahan..."
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-sm cursor-pointer"
              >
                Simpan Agenda
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterType === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          Semua Agenda ({holidays.length})
        </button>
        <button
          onClick={() => setFilterType('national')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterType === 'national' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'}`}
        >
          Libur Nasional
        </button>
        <button
          onClick={() => setFilterType('religious')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterType === 'religious' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'}`}
        >
          Hari Keagamaan
        </button>
        <button
          onClick={() => setFilterType('joint_leave')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterType === 'joint_leave' ? 'bg-amber-600 text-white shadow-sm' : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'}`}
        >
          Cuti Bersama
        </button>
      </div>

      {/* Holidays List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Memuat data kalender...</div>
        ) : filteredHolidays.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
            Tidak ada agenda libur pada kategori ini.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredHolidays.map((h) => {
              const isPast = new Date(h.date) < new Date(new Date().toDateString());
              return (
                <div key={h.id} className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${isPast ? 'bg-slate-50/50 opacity-75' : 'hover:bg-slate-50/80'}`}>
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        {new Date(h.date).toLocaleString('id-ID', { month: 'short' })}
                      </span>
                      <span className="text-base font-extrabold text-slate-800">
                        {new Date(h.date).getDate()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${getBadgeStyle(h.type)}`}>
                          {getBadgeLabel(h.type)}
                        </span>
                        {isPast && (
                          <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-medium">
                            Telah Lewat
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">{h.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{formatDateStr(h.date)} {h.description ? `• ${h.description}` : ''}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteHoliday(h.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer self-end sm:self-center"
                      title="Hapus Agenda"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
