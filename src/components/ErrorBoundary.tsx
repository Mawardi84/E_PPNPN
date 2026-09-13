import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      errorMessage: error.message || 'Terjadi kesalahan sistem yang tidak terduga.' 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application component tree:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div 
          role="alert" 
          aria-live="assertive"
          className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans text-center max-w-md mx-auto"
        >
          <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-5 shadow-sm">
            <AlertTriangle className="w-8 h-8" aria-hidden="true" />
          </div>
          
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Terjadi Kendala Sistem
          </h1>
          
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Aplikasi mengalami kendala teknis saat memproses tampilan. Anda dapat mencoba memuat ulang halaman untuk melanjutkan.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={this.handleReload}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-medium shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none transition text-sm"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Muat Ulang Aplikasi
            </button>
            <button
              onClick={this.handleReset}
              className="px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 active:scale-95 focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:outline-none transition text-sm"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
