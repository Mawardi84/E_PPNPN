import { MapPin, Clock, ExternalLink, FileText, ShieldCheck, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { AttendanceRecord } from '../types';
import { formatDistance } from '../config';

interface AttendanceCardProps {
  record: AttendanceRecord;
}

export function AttendanceCard({ record }: AttendanceCardProps) {
  const date = new Date(record.timestamp);
  
  const timeString = date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
  
  const dateString = date.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const getBadgeStyle = () => {
    switch (record.type) {
      case 'check-in': return 'bg-emerald-100 text-emerald-700';
      case 'check-out': return 'bg-amber-100 text-amber-700';
      case 'izin': return 'bg-blue-100 text-blue-700';
      case 'sakit': return 'bg-rose-100 text-rose-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getBadgeText = () => {
    switch (record.type) {
      case 'check-in': return 'Masuk';
      case 'check-out': return 'Pulang';
      case 'izin': return 'Izin';
      case 'sakit': return 'Sakit';
      default: return record.type;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-4 items-start hover:shadow-md transition-shadow"
    >
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center shrink-0 border border-gray-200">
        {record.photoUrl ? (
          <img 
            src={record.photoUrl} 
            alt={`Foto bukti absensi ${getBadgeText()} tanggal ${dateString}`} 
            className="w-full h-full object-cover"
          />
        ) : (
          <FileText className="w-8 h-8 text-gray-400" aria-hidden="true" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${getBadgeStyle()}`}>
            {getBadgeText()}
          </span>
          <span className="text-xs text-gray-400 font-medium">{dateString}</span>
        </div>
        
        <div className="flex items-center gap-1.5 mb-1 text-gray-900">
          <Clock className="w-4 h-4 text-gray-400" aria-hidden="true" />
          <span className="font-bold">{timeString} WIB</span>
          {record.isLate && (
            <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
              Telat {record.lateMinutes}m
            </span>
          )}
        </div>
        
        {record.shiftName && (
          <div className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 mb-2 inline-block">
            {record.shiftName}
          </div>
        )}

        {record.notes && (
          <div className="text-sm text-gray-600 mb-2 italic line-clamp-2">
            "{record.notes}"
          </div>
        )}
        
        {record.location && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {record.location.distanceFromOffice !== undefined && (
              <span 
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                  record.location.isInRadius 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {record.location.isInRadius ? (
                  <>
                    <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" aria-hidden="true" />
                    <span>Radius OK ({formatDistance(record.location.distanceFromOffice)})</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" aria-hidden="true" />
                    <span>Luar Radius ({formatDistance(record.location.distanceFromOffice)})</span>
                  </>
                )}
              </span>
            )}

            {/* Anti-Fake GPS Security Tag */}
            {record.isMockGps || record.antiFakeGpsStatus === 'blocked' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                <span>Mock GPS</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-200">
                <ShieldCheck className="w-3 h-3 text-cyan-600" />
                <span>GPS Asli</span>
              </span>
            )}

            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${record.location.latitude},${record.location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Buka koordinat lokasi presensi ${getBadgeText()} di Google Maps (membuka tab baru)`}
              className="inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none transition group bg-gray-50 hover:bg-blue-50 px-2 py-0.5 rounded-md border border-gray-200 hover:border-blue-200"
            >
              <MapPin className="w-3 h-3 text-gray-400 group-hover:text-blue-500" aria-hidden="true" />
              <span className="truncate font-medium">Maps</span>
              <ExternalLink className="w-2.5 h-2.5 text-gray-400 group-hover:text-blue-500" aria-hidden="true" />
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
}
