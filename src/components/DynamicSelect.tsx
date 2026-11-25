import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Check, X } from 'lucide-react';

interface DynamicSelectProps {
  label?: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  onAddNew: (newVal: string) => void;
  placeholder?: string;
  addLabel?: string;
  inputClassName?: string;
  helperText?: string;
}

export const DynamicSelect: React.FC<DynamicSelectProps> = ({
  label,
  value,
  options,
  onChange,
  onAddNew,
  placeholder = 'Seleccionar...',
  addLabel = 'Incluir más...',
  inputClassName = '',
  helperText
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newValueInput, setNewValueInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputAddRef = useRef<HTMLInputElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsAdding(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isAdding && inputAddRef.current) {
      inputAddRef.current.focus();
    }
  }, [isAdding]);

  const handleSelect = (opt: string) => {
    onChange(opt);
    setIsOpen(false);
    setIsAdding(false);
  };

  const handleConfirmAdd = () => {
    const trimmed = newValueInput.trim();
    if (trimmed) {
      onAddNew(trimmed);
      onChange(trimmed);
      setNewValueInput('');
      setIsAdding(false);
      setIsOpen(false);
    }
  };

  const handleKeyDownAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmAdd();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsAdding(false);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-bold uppercase text-zinc-600 mb-1">
          {label}
        </label>
      )}

      {/* Botón principal selector */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between py-1.5 px-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 font-bold text-xs outline-none focus:border-amber-400 cursor-pointer transition text-left ${inputClassName}`}
        title={`Seleccionar ${label || ''}`}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 shrink-0 ml-1 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {helperText && (
        <span className="text-[9px] text-zinc-500 font-mono mt-0.5 block truncate">
          {helperText}
        </span>
      )}

      {/* Menú desplegable */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[120px] max-w-[260px] bg-white border border-zinc-200 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in-50 duration-100">
          {/* Lista scrolleable de opciones */}
          <div className="max-h-48 overflow-y-auto divide-y divide-zinc-100">
            {options.map((opt) => {
              const isSelected = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-3 py-1.5 text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-100 text-amber-950 font-bold'
                      : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  <span className="truncate">{opt}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>

          {/* Sección de adición con símbolo '+' minimalista al final */}
          <div className="border-t border-zinc-200 bg-zinc-50 p-1">
            {!isAdding ? (
              <button
                type="button"
                onClick={() => {
                  setIsAdding(true);
                  setNewValueInput('');
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition cursor-pointer"
                title="Añadir un nuevo valor a la lista"
              >
                <Plus className="w-3.5 h-3.5 text-amber-600" />
                <span>{addLabel}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 p-1 bg-white border border-amber-300 rounded-md shadow-xs">
                <input
                  ref={inputAddRef}
                  type="text"
                  value={newValueInput}
                  onChange={(e) => setNewValueInput(e.target.value)}
                  onKeyDown={handleKeyDownAdd}
                  placeholder="Escribir nuevo..."
                  className="flex-1 min-w-0 text-xs px-1.5 py-1 text-zinc-900 font-bold outline-none bg-transparent"
                />
                <button
                  type="button"
                  onClick={handleConfirmAdd}
                  className="p-1 text-green-700 hover:bg-green-100 rounded transition"
                  title="Confirmar"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="p-1 text-zinc-500 hover:bg-zinc-100 rounded transition"
                  title="Cancelar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
