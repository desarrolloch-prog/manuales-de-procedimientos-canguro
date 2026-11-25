import React from 'react';
import { Trash2 } from 'lucide-react';

export interface DeleteDirectionConfirmModalProps {
  isOpen: boolean;
  directionName: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const DeleteDirectionConfirmModal: React.FC<DeleteDirectionConfirmModalProps> = ({
  isOpen,
  directionName,
  onConfirm,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-zinc-950 uppercase">
              ¿Seguro que quieres eliminar esta dirección?
            </h3>
            <p className="text-xs text-zinc-500">
              Se removerá de la lista desplegable de direcciones adscritas.
            </p>
          </div>
        </div>

        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs">
          <span className="text-[11px] font-bold text-zinc-500 uppercase block">Dirección a eliminar:</span>
          <strong className="text-zinc-900 font-extrabold text-xs block mt-0.5">
            {directionName}
          </strong>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition cursor-pointer"
          >
            No, Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition cursor-pointer"
          >
            Sí, Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};
