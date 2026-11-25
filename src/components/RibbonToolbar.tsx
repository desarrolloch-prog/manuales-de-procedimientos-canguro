import React, { useState, useRef } from 'react';
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Eraser,
  List,
  ListOrdered,
  Indent,
  Outdent,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  ZoomIn,
  ZoomOut,
  Save,
  FileSpreadsheet,
  Download,
  Loader2,
  Edit3,
  Plus,
  Presentation,
  Users
} from 'lucide-react';

export type SyncStatusType =
  | 'idle'
  | 'pending'
  | 'saving_local'
  | 'syncing_drive'
  | 'saved_local'
  | 'synced_drive'
  | 'error';

interface RibbonToolbarProps {
  signerCount?: number;
  onToggleSignerCount?: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  docZoom: number;
  onZoomChange: (newZoom: number) => void;
  onResetSigners: () => void;
  onSaveManual: () => void;
  hasUnsavedChanges: boolean;
  syncStatus?: SyncStatusType;
  lastSyncTime?: string;
  onExportWord: () => void;
  onExportPdf: () => void;
  isExportingPdf: boolean;
  pdfProgress: string;
  selectedFont: string;
  onFontChange: (font: string) => void;
  selectedFontSize: string;
  onFontSizeChange: (size: string) => void;
  selectedLineHeight: string;
  onLineHeightChange: (height: string) => void;
  isEditing?: boolean;
  onToggleEditing?: () => void;
  onOpenPresentation?: () => void;
}

export const RibbonToolbar: React.FC<RibbonToolbarProps> = ({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  docZoom,
  onZoomChange,
  onSaveManual,
  hasUnsavedChanges,
  syncStatus = 'saved_local',
  lastSyncTime,
  onExportWord,
  onExportPdf,
  isExportingPdf,
  pdfProgress,
  selectedFont,
  onFontChange,
  selectedFontSize,
  onFontSizeChange,
  selectedLineHeight,
  onLineHeightChange,
  isEditing,
  onToggleEditing,
  onOpenPresentation,
  signerCount,
  onToggleSignerCount
}) => {
  const [fontColor, setFontColor] = useState<string>('#000000');
  const [highlightColor, setHighlightColor] = useState<string>('#fed700');
  const [isCaseDropdownOpen, setIsCaseDropdownOpen] = useState<boolean>(false);
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const highlightInputRef = useRef<HTMLInputElement | null>(null);

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    try {
      document.execCommand(command, false, value);
    } catch (e) {
      console.warn('execCommand failed:', e);
    }
  };

  const handleApplyFontFamily = (font: string) => {
    onFontChange(font);
    executeCommand('fontName', font);
  };

  const handleApplyFontSize = (size: string) => {
    onFontSizeChange(size);
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const span = document.createElement('span');
      span.style.fontSize = size;
      const range = selection.getRangeAt(0);
      try {
        range.surroundContents(span);
      } catch {
        executeCommand('fontSize', '3');
      }
    }
  };

  const handleApplyFontColor = (color: string) => {
    setFontColor(color);
    executeCommand('foreColor', color);
  };

  const handleApplyHighlight = (color: string) => {
    setHighlightColor(color);
    executeCommand('hiliteColor', color);
  };

  const handleClearFormat = () => {
    executeCommand('removeFormat');
  };

  const handleChangeCase = (type: 'sentence' | 'lower' | 'upper' | 'title') => {
    setIsCaseDropdownOpen(false);
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    const selectedText = selection.toString();
    if (!selectedText) return;

    let transformed = selectedText;
    if (type === 'lower') {
      transformed = selectedText.toLowerCase();
    } else if (type === 'upper') {
      transformed = selectedText.toUpperCase();
    } else if (type === 'title') {
      transformed = selectedText.toLowerCase().replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());
    } else if (type === 'sentence') {
      transformed = selectedText.charAt(0).toUpperCase() + selectedText.slice(1).toLowerCase();
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(transformed));
  };

  return (
    <div className="no-print bg-white text-zinc-900 select-none py-1">
      <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
        {/* LADO IZQUIERDO: HERRAMIENTAS DE TEXTO COMPACTAS */}
        <div className="flex items-center gap-1 flex-wrap">
          {/* Deshacer / Rehacer */}
          <div className="flex items-center bg-zinc-100 rounded-md p-0.5 border border-zinc-200">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="w-6 h-6 flex items-center justify-center hover:bg-white rounded transition disabled:opacity-30 disabled:pointer-events-none text-zinc-700"
              title="Deshacer (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="w-6 h-6 flex items-center justify-center hover:bg-white rounded transition disabled:opacity-30 disabled:pointer-events-none text-zinc-700"
              title="Rehacer (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-zinc-200" />

          {/* Tipografía y Tamaño */}
          <div className="flex items-center gap-1 bg-zinc-100 rounded-md p-0.5 border border-zinc-200">
            <select
              value={selectedFont}
              onChange={(e) => handleApplyFontFamily(e.target.value)}
              className="h-6 text-[11px] font-semibold bg-white border border-zinc-200 rounded px-1.5 text-zinc-800 outline-none cursor-pointer"
              title="Tipografía"
            >
              <option value="Arial, Helvetica, sans-serif">Arial</option>
              <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica</option>
              <option value="Calibri, sans-serif">Calibri</option>
              <option value="'Times New Roman', serif">Times</option>
            </select>

            <select
              value={selectedFontSize}
              onChange={(e) => handleApplyFontSize(e.target.value)}
              className="h-6 text-[11px] font-mono font-bold bg-white border border-zinc-200 rounded px-1 text-zinc-800 outline-none cursor-pointer"
              title="Tamaño (pt)"
            >
              {['9pt', '10pt', '11pt', '12pt', '13pt', '14pt', '16pt'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="h-4 w-[1px] bg-zinc-200" />

          {/* Formato: B, I, U, S, Aa */}
          <div className="flex items-center bg-zinc-100 rounded-md p-0.5 border border-zinc-200">
            <button
              type="button"
              onClick={() => executeCommand('bold')}
              className="w-6 h-6 flex items-center justify-center hover:bg-white rounded transition text-zinc-800 font-black"
              title="Negrita"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('italic')}
              className="w-6 h-6 flex items-center justify-center hover:bg-white rounded transition text-zinc-800"
              title="Cursiva"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('underline')}
              className="w-6 h-6 flex items-center justify-center hover:bg-white rounded transition text-zinc-800"
              title="Subrayado"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('strikeThrough')}
              className="w-6 h-6 flex items-center justify-center hover:bg-white rounded transition text-zinc-800"
              title="Tachado"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>

            {/* Mayúsculas/Minúsculas */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCaseDropdownOpen(!isCaseDropdownOpen)}
                className="w-6 h-6 flex items-center justify-center hover:bg-white rounded transition text-zinc-800 font-bold text-[10px]"
                title="Cambiar mayúsculas/minúsculas"
              >
                Aa
              </button>
              {isCaseDropdownOpen && (
                <div className="absolute left-0 top-7 z-50 bg-white border border-zinc-200 shadow-md rounded-md py-1 w-32 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleChangeCase('sentence')}
                    className="w-full text-left px-2 py-1 hover:bg-zinc-100"
                  >
                    Tipo oración
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeCase('lower')}
                    className="w-full text-left px-2 py-1 hover:bg-zinc-100"
                  >
                    minúsculas
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeCase('upper')}
                    className="w-full text-left px-2 py-1 hover:bg-zinc-100 font-bold"
                  >
                    MAYÚSCULAS
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeCase('title')}
                    className="w-full text-left px-2 py-1 hover:bg-zinc-100"
                  >
                    Cada Palabra
                  </button>
                </div>
              )}
            </div>

            {/* Color de Fuente */}
            <button
              type="button"
              onClick={() => colorInputRef.current?.click()}
              className="w-6 h-6 flex flex-col items-center justify-center hover:bg-white rounded transition text-zinc-800"
              title="Color de Fuente"
            >
              <span className="font-black text-[11px] leading-none">A</span>
              <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: fontColor }} />
            </button>
            <input
              ref={colorInputRef}
              type="color"
              value={fontColor}
              onChange={(e) => handleApplyFontColor(e.target.value)}
              className="sr-only"
            />

            {/* Resaltador */}
            <button
              type="button"
              onClick={() => highlightInputRef.current?.click()}
              className="w-6 h-6 flex flex-col items-center justify-center hover:bg-white rounded transition text-zinc-800"
              title="Resaltador"
            >
              <Highlighter className="w-3 h-3" />
              <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: highlightColor }} />
            </button>
            <input
              ref={highlightInputRef}
              type="color"
              value={highlightColor}
              onChange={(e) => handleApplyHighlight(e.target.value)}
              className="sr-only"
            />

            {/* Borrar Formato */}
            <button
              type="button"
              onClick={handleClearFormat}
              className="w-6 h-6 flex items-center justify-center hover:bg-white rounded transition text-zinc-500 hover:text-red-600"
              title="Borrar formato"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-zinc-200" />

          {/* Listas, Sangría y Alineación */}
          <div className="flex items-center bg-zinc-100 rounded-md p-0.5 border border-zinc-200">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand('insertUnorderedList');
              }}
              onClick={() => executeCommand('insertUnorderedList')}
              className="w-6 h-6 flex items-center justify-center hover:bg-white rounded transition text-zinc-800"
              title="Viñetas"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand('insertOrderedList');
              }}
              onClick={() => executeCommand('insertOrderedList')}
              className="w-6 h-6 flex items-center justify-center hover:bg-white rounded transition text-zinc-800"
              title="Numeración"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand('outdent');
              }}
              onClick={() => executeCommand('outdent')}
              className="w-6 h-6 flex items-center justify-center hover:bg-white rounded transition text-zinc-800"
              title="Disminuir sangría"
            >
              <Outdent className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand('indent');
              }}
              onClick={() => executeCommand('indent')}
              className="w-6 h-6 flex items-center justify-center hover:bg-white rounded transition text-zinc-800"
              title="Aumentar sangría"
            >
              <Indent className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand('justifyLeft');
              }}
              onClick={() => executeCommand('justifyLeft')}
              className="w-6 h-6 flex items-center justify-center hover:bg-white rounded transition text-zinc-800"
              title="Izquierda"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand('justifyCenter');
              }}
              onClick={() => executeCommand('justifyCenter')}
              className="w-6 h-6 flex items-center justify-center hover:bg-white rounded transition text-zinc-800"
              title="Centrar"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand('justifyRight');
              }}
              onClick={() => executeCommand('justifyRight')}
              className="w-6 h-6 flex items-center justify-center hover:bg-white rounded transition text-zinc-800"
              title="Derecha"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                executeCommand('justifyFull');
              }}
              onClick={() => executeCommand('justifyFull')}
              className="w-6 h-6 flex items-center justify-center hover:bg-white rounded transition text-zinc-800"
              title="Justificar"
            >
              <AlignJustify className="w-3.5 h-3.5" />
            </button>

            {/* Interlineado */}
            <select
              value={selectedLineHeight}
              onMouseDown={(e) => {
                e.stopPropagation();
                // Capturar el elemento activo antes de que el select tome el foco
                const sel = window.getSelection();
                if (sel && sel.rangeCount > 0) {
                  let node: Node | null = sel.anchorNode;
                  if (node && node.nodeType === Node.TEXT_NODE) {
                    node = node.parentElement;
                  }
                  if (node && node instanceof HTMLElement) {
                    const block = (node.closest(
                      '.editable-block, .cargo-block, .glosario-unified-box, p, li, [contenteditable="true"]'
                    ) || node) as HTMLElement;
                    if (block) {
                      (window as any).__lastActiveEditableElement = block;
                    }
                  }
                }
              }}
              onChange={(e) => {
                const newHeight = e.target.value;
                onLineHeightChange(newHeight);
                try {
                  const targetEl = (window as any).__lastActiveEditableElement;
                  if (targetEl && targetEl instanceof HTMLElement) {
                    targetEl.style.lineHeight = newHeight;
                    const childNodes = targetEl.querySelectorAll('p, li, div, span');
                    childNodes.forEach((el) => {
                      (el as HTMLElement).style.lineHeight = newHeight;
                    });
                  }
                  const activeEl = document.activeElement;
                  if (activeEl && activeEl instanceof HTMLElement && activeEl.isContentEditable) {
                    activeEl.style.lineHeight = newHeight;
                  }
                } catch (err) {
                  console.warn('Error applying localized line height:', err);
                }
              }}
              className="h-6 text-[10px] font-semibold bg-white border border-zinc-200 rounded px-1 text-zinc-800 outline-none cursor-pointer"
              title="Interlineado del bloque o selección actual"
            >
              <option value="1.0">1.0 (Compacto)</option>
              <option value="1.15">1.15</option>
              <option value="1.35">1.35 (Estándar)</option>
              <option value="1.5">1.5</option>
              <option value="2.0">2.0</option>
            </select>
          </div>
        </div>

        {/* LADO DERECHO: ZOOM, GUARDAR Y EXPORTAR (ULTRA COMPACTO) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Zoom */}
          <div className="flex items-center bg-zinc-100 rounded-md p-0.5 border border-zinc-200 text-xs">
            <button
              type="button"
              onClick={() => onZoomChange(Math.max(60, docZoom - 10))}
              className="w-5 h-5 flex items-center justify-center hover:bg-white rounded text-zinc-700"
              title="Reducir zoom"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onZoomChange(100)}
              className="font-mono font-bold px-1 text-[10px] text-zinc-800"
              title="Restablecer zoom a 100%"
            >
              {docZoom}%
            </button>
            <button
              type="button"
              onClick={() => onZoomChange(Math.min(140, docZoom + 10))}
              className="w-5 h-5 flex items-center justify-center hover:bg-white rounded text-zinc-700"
              title="Aumentar zoom"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          {/* Botón Presentar con logo minimalista en gris */}
          {onOpenPresentation && (
            <button
              type="button"
              onClick={() => {
                try {
                  if (typeof document !== 'undefined' && document.fullscreenEnabled && !document.fullscreenElement) {
                    const p = document.documentElement.requestFullscreen();
                    if (p && typeof p.catch === 'function') {
                      p.catch(() => {});
                    }
                  }
                } catch {
                  // Safe ignore
                }
                onOpenPresentation();
              }}
              className="w-6 h-6 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/80 transition cursor-pointer"
              title="Presentar (Modo Presentación Pantalla Completa)"
            >
              <Presentation className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-800" />
            </button>
          )}

          {/* Alternar Modo Edición / Modo Lectura */}
          {onToggleEditing && (
            <button
              type="button"
              onClick={onToggleEditing}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-md border transition active:scale-95 cursor-pointer ${
                isEditing
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-400 font-black'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300'
              }`}
              title={isEditing ? 'Cambiar a Modo Lectura' : 'Activar Modo Edición'}
            >
              <Edit3 className="w-3 h-3 text-black" />
              <span>{isEditing ? 'Edición Activa' : 'Modo Lectura'}</span>
            </button>
          )}

          {/* Guardar - Gris neutro corporativo con texto claro y borde sutil */}
          <button
            type="button"
            onClick={onSaveManual}
            className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-md border transition active:scale-95 cursor-pointer ${
              hasUnsavedChanges
                ? 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700 shadow-xs ring-1 ring-zinc-500/40'
                : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100 border-zinc-600'
            }`}
            title="Guardar manual en base de datos"
          >
            <Save className="w-3 h-3 text-zinc-300" />
            <span>{hasUnsavedChanges ? 'Guardar *' : 'Guardar'}</span>
          </button>

          {/* Word (.docx) */}
          <button
            type="button"
            onClick={onExportWord}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-md border border-zinc-200 transition active:scale-95 cursor-pointer"
            title="Descargar Word (.docx) con Manual y Diagnóstico"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
            <span>Word (.docx)</span>
          </button>

          {/* PDF (.pdf) */}
          <button
            type="button"
            onClick={onExportPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-md border border-zinc-200 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Descargar PDF oficial (.pdf)"
          >
            {isExportingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{pdfProgress || 'PDF...'}</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>PDF (.pdf)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
