import React from 'react';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Save,
  FolderOpen,
  Sparkles,
  Layers,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { ProcessManual } from '../types/processManual';

interface HeaderProps {
  activeTab: 'interview' | 'editor' | 'preview';
  setActiveTab: (tab: 'interview' | 'editor' | 'preview') => void;
  hasManual: boolean;
  manual: ProcessManual | null;
  onSaveToStorage: () => void;
  onOpenSavedModal: () => void;
  onExportWord: () => void;
  onPrintPdf: () => void;
  onLoadExample: () => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  hasManual,
  manual,
  onSaveToStorage,
  onOpenSavedModal,
  onExportWord,
  onPrintPdf,
  onLoadExample,
  isSaving,
  hasUnsavedChanges,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-lg no-print">
      {/* Top Bar with Brand & Fast Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Corporate Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-md shadow-orange-500/20 ring-2 ring-orange-400/30">
              <span className="text-xl font-black text-white tracking-wider">C</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-black tracking-tight text-white">CANGURO</span>
                <span className="text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  VENEZUELA
                </span>
                <span className="hidden md:inline-flex items-center text-[10px] uppercase font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  <Sparkles className="w-2.5 h-2.5 mr-1 text-emerald-400" /> Lean Six Sigma Suite
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Automatizador de Entrevistas & Manuales de Procedimientos
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onLoadExample}
              title="Cargar un ejemplo completo para ver la estructura"
              className="hidden lg:flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Ejemplo Tienda / SAT</span>
            </button>

            <button
              onClick={onOpenSavedModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
            >
              <FolderOpen className="w-3.5 h-3.5 text-orange-400" />
              <span>Mis Manuales</span>
            </button>

            {hasManual && (
              <>
                <button
                  onClick={onSaveToStorage}
                  disabled={isSaving}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    hasUnsavedChanges
                      ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                  title={hasUnsavedChanges ? 'Hay cambios sin guardar' : 'Guardado'}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Guardando...' : hasUnsavedChanges ? 'Guardar Cambios' : 'Guardado'}</span>
                </button>

                <button
                  onClick={onExportWord}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg shadow-sm transition active:scale-95"
                  title="Descargar documento Microsoft Word (.docx) formal"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Exportar Word (.docx)</span>
                </button>

                <button
                  onClick={onPrintPdf}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-lg shadow-sm transition active:scale-95"
                  title="Descargar archivo PDF oficial"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Descargar PDF (.pdf)</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-t border-slate-800 pt-1 pb-2 space-x-2 sm:space-x-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('interview')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'interview'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px] font-bold">1</span>
            <span>Levantamiento & Entrevista</span>
          </button>

          <button
            onClick={() => setActiveTab('editor')}
            disabled={!hasManual}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              !hasManual
                ? 'text-slate-600 cursor-not-allowed opacity-50'
                : activeTab === 'editor'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px] font-bold">2</span>
            <span>Editor del Manual Lean Six Sigma</span>
            {hasManual && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30">
                {manual?.codigo}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            disabled={!hasManual}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              !hasManual
                ? 'text-slate-600 cursor-not-allowed opacity-50'
                : activeTab === 'preview'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px] font-bold">3</span>
            <span>Vista Oficial Membretada</span>
            {hasManual && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-1" />}
          </button>
        </div>
      </div>
    </header>
  );
};
