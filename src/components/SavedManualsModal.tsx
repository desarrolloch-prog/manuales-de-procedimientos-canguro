import React from 'react';
import {
  X,
  FileText,
  Trash2,
  ExternalLink,
  Copy,
  Calendar,
  Building2,
  FolderOpen
} from 'lucide-react';
import { ProcessManual } from '../types/processManual';

interface SavedManualsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedManuals: ProcessManual[];
  onSelectManual: (manual: ProcessManual) => void;
  onDeleteManual: (id: string) => void;
  onDuplicateManual: (manual: ProcessManual) => void;
}

export const SavedManualsModal: React.FC<SavedManualsModalProps> = ({
  isOpen,
  onClose,
  savedManuals,
  onSelectManual,
  onDeleteManual,
  onDuplicateManual,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <FolderOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Catálogo de Manuales Guardados</h3>
              <p className="text-xs text-slate-400">
                Levantamientos y procedimientos archivados localmente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {savedManuals.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-700">No hay manuales guardados todavía</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Genera tu primer manual o carga un ejemplo para guardarlo aquí y tener acceso inmediato.
              </p>
            </div>
          ) : (
            savedManuals.map((m, idx) => (
              <div
                key={`${m.id || 'manual'}-${idx}`}
                className="p-4 rounded-xl border border-slate-200 hover:border-orange-300 bg-slate-50/50 hover:bg-white transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">
                      {m.codigo}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      v{m.version}
                    </span>
                    <span className="text-xs text-slate-500 font-medium truncate max-w-xs">
                      {m.gerencia}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{m.nombre}</h4>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {m.fechaEmision || 'Sin fecha'}
                    </span>
                    <span>• {m.pasosProcedimiento?.length || 0} pasos</span>
                    <span>• {m.gobernanza?.matrizRaci?.length || 0} filas RACI</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => {
                      onSelectManual(m);
                      onClose();
                    }}
                    className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-lg shadow-sm transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir</span>
                  </button>

                  <button
                    onClick={() => onDuplicateManual(m)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg transition"
                    title="Duplicar como plantilla"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onDeleteManual(m.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 bg-white border border-slate-200 rounded-lg transition"
                    title="Eliminar de almacenamiento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>{savedManuals.length} manuales en total</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
