import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('ErrorBoundary capturó una excepción en renderizado:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] w-full flex items-center justify-center p-6 bg-zinc-50 border border-zinc-200 rounded-2xl my-4 text-center">
          <div className="max-w-md bg-white p-6 rounded-xl shadow-md border border-zinc-200 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-1">
              Recuperación del Visor de Documento
            </h3>
            <p className="text-xs text-zinc-600 mb-4">
              {this.props.fallbackMessage ||
                'Ocurrió una inconsistencia en la estructura del manual al procesar el texto editable. La vista ha sido aislada para evitar el cierre de la aplicación.'}
            </p>
            {this.state.error && (
              <div className="w-full text-left bg-red-50 border border-red-200 p-3 rounded-lg mb-4 text-xs font-mono text-red-800 break-words whitespace-pre-wrap max-h-48 overflow-y-auto">
                <strong>Error:</strong> {this.state.error.message}
                {this.state.error.stack && (
                  <div className="mt-2 text-[10px] text-zinc-500 opacity-80">{this.state.error.stack}</div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-zinc-900 text-xs font-black rounded-lg transition shadow-xs cursor-pointer"
              >
                Restaurar y Continuar
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Recargar Página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
