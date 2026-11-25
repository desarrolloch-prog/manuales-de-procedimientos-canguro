import React from 'react';
import { Plus, X } from 'lucide-react';

export interface AddDirectionModalProps {
  isOpen: boolean;
  directionName: string;
  directorName: string;
  onDirectionNameChange: (value: string) => void;
  onDirectorNameChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export const AddDirectionModal: React.FC<AddDirectionModalProps> = ({
  isOpen,
  directionName,
  directorName,
  onDirectionNameChange,
  onDirectorNameChange,
  onSave,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
          <h3 className="text-sm font-black text-zinc-950 uppercase tracking-tight flex items-center gap-2">
            <Plus className="w-4 h-4 text-amber-500" />
            <span>Registrar Nueva Dirección Adscrita</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-700 mb-1">
              Nombre de la Dirección
            </label>
            <input
              type="text"
              autoFocus
              value={directionName}
              onChange={(e) => onDirectionNameChange(e.target.value)}
              placeholder="Ej: FINANZAS Y ADMINISTRACIÓN"
              className="w-full p-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 font-bold text-xs outline-none focus:border-amber-400 uppercase"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-700 mb-1">
              Director Titular Sugerido (Opcional)
            </label>
            <input
              type="text"
              value={directorName}
              onChange={(e) => onDirectorNameChange(e.target.value)}
              placeholder="Ej: Carlos Mendoza"
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSave();
              }}
              className="w-full p-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 font-semibold text-xs outline-none focus:border-amber-400"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-bold text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            className="px-4 py-2 text-xs font-black text-zinc-950 bg-[#fed700] hover:bg-yellow-400 rounded-xl shadow-xs transition cursor-pointer"
          >
            Guardar e Incluir
          </button>
        </div>
      </div>
    </div>
  );
};
