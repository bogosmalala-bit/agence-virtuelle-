import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

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

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h1 className="text-lg font-bold text-white mb-2">
            Fanavaozana ny Rindranasa (Actualisation requise)
          </h1>
          <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
            Misy fifandraisana vaovao nampidirina. Tsindrio ny bokotra eto ambany mba hamerenana ny pejy sy hampisehoana ny sehatra rehetra.
          </p>
          <button
            onClick={this.handleReload}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all active:scale-95"
          >
            <RotateCw className="h-4 w-4" />
            <span>Havaozy ny Pejy (Recharger)</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
