import React from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmNewManualModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmNewManualModal: React.FC<ConfirmNewManualModalProps> = ({
  isOpen,
  onConfirm,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-zinc-950 uppercase">
              ¿Crear un nuevo manual en blanco?
            </h3>
            <p className="text-xs text-zinc-500">
              Tienes cambios sin guardar en el manual actual. Al iniciar uno nuevo se descartará el contenido no guardado.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-black text-zinc-950 bg-[#fed700] hover:bg-yellow-400 rounded-xl shadow-xs transition cursor-pointer"
          >
            Sí, Crear Nuevo Manual
          </button>
        </div>
      </div>
    </div>
  );
};
