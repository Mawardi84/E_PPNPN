import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsReconnecting(true);
      setTimeout(() => {
        setIsOffline(false);
        setIsReconnecting(false);
      }, 1500); // Tampilkan status reconnect sebentar
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !isReconnecting) return null;

  return (
    <div className={`fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 transform`}>
      <div className={`
        flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg border backdrop-blur-md font-bold text-sm
        ${isReconnecting 
          ? 'bg-emerald-500/90 text-white border-emerald-400' 
          : 'bg-rose-500/90 text-white border-rose-400'}
      `}>
        {isReconnecting ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Koneksi Pulih, Menyegarkan...</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>Anda sedang offline. Mode terbatas aktif.</span>
          </>
        )}
      </div>
    </div>
  );
};
