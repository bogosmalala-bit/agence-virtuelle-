import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCw, Trash2, ArrowRight } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  private handleIgnoreError = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            Fanavaozana ny Rindranasa (Actualisation requise)
          </h1>
          <p className="text-xs text-slate-300 max-w-md mb-4 leading-relaxed">
            Misy fanitsiana vaovao nampidirina mba hampandeha tsara ny sehatra. Tsindrio ny bokotra eto ambany mba hampisehoana ny sehatra rehetra :
          </p>

          {this.state.error && (
            <div className="mb-6 max-w-md w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-left">
              <span className="text-[10px] font-mono text-rose-400 font-bold block mb-1">
                Antsipiriany :
              </span>
              <p className="text-[11px] font-mono text-slate-400 break-all">
                {this.state.error.message || String(this.state.error)}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center w-full max-w-md">
            <button
              onClick={this.handleResetCache}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all active:scale-95 cursor-pointer"
            >
              <RotateCw className="h-4 w-4" />
              <span>Diovy ny Cache & Havaozy (Recharger)</span>
            </button>

            <button
              onClick={this.handleIgnoreError}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-3 text-xs font-semibold text-slate-200 border border-slate-700 transition-all cursor-pointer"
            >
              <ArrowRight className="h-4 w-4" />
              <span>Sokafy ny Sehatra</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
