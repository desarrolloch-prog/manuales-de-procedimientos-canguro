import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Trash2,
  Plus,
  X,
  RotateCcw,
  Upload,
  Image,
  FileText,
  Check,
  UserCheck
} from 'lucide-react';
import { formatDateToSlash, getTodayFormatted } from '../../utils/dateUtils';
import { formatInline, stripMarkdown, toTitleCase, domToMarkdownLine, domToMarkdown } from '../../utils/markdownUtils';
import { SectionPillBanner, formatDirectionWithPrefix } from '../ManualPageRenderer';
import { getOfficialSignatureFallback } from '../../utils/officialSignatures';
import type { SignerSlot } from '../../types/processManual';
import type { ApprovalAreaRecord as ApprovalArea } from '../../shared';

export const renderFormattedIntermediateContent = (rawText: string) => {
  if (!rawText || !rawText.trim()) {
    return <p className="italic text-zinc-400">Página intermedia sin contenido normativo.</p>;
  }
  const lines = rawText.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={lIdx} className="h-1.5" />;
        if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
          const clean = trimmed.replace(/^[•\-\*]\s*/, '');
          const colonIdx = clean.indexOf(':');
          if (colonIdx > 0 && colonIdx < 50) {
            const tag = clean.substring(0, colonIdx);
            const rest = clean.substring(colonIdx + 1);
            const cleanTag = tag.replace(/\*\*/g, '').trim();
            return (
              <div key={lIdx} className="flex items-start gap-1.5 pl-3 text-justify">
                <span className="font-bold select-none">•</span>
                <div>
                  <span className="font-bold">{cleanTag}:</span>{' '}
                  <span dangerouslySetInnerHTML={{ __html: formatInline(rest) }} />
                </div>
              </div>
            );
          }
          return (
            <div key={lIdx} className="flex items-start gap-1.5 pl-3 text-justify">
              <span className="font-bold select-none">•</span>
              <span dangerouslySetInnerHTML={{ __html: formatInline(clean) }} />
            </div>
          );
        }
        return (
          <p
            key={lIdx}
            className="text-justify m-0"
            dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
          />
        );
      })}
    </div>
  );
};

export function HeaderTable({
  pageNumber,
  totalPages,
  code,
  version,
  processName,
  direction,
  emisionDate,
  actualizacionDate
}: {
  pageNumber: number;
  totalPages: number;
  code: string;
  version: string;
  classification?: string;
  processName: string;
  direction: string;
  emisionDate: string;
  actualizacionDate: string;
}) {
  const displayEmision = formatDateToSlash(emisionDate) || getTodayFormatted();
  const displayActualizacion = formatDateToSlash(actualizacionDate) || displayEmision;
  const displayName = (processName || direction || 'PROCESO OPERATIVO').toUpperCase();

  return (
    <div className="header-table-container border border-black rounded-xl overflow-hidden bg-white text-black avoid-break shadow-xs flex shrink-0 h-[74px] box-border">
      {/* Columna Izquierda: Logo Oficial Canguro */}
      <div className="w-[130px] shrink-0 border-r border-black p-1 flex items-center justify-center bg-white h-full">
        <img
          src="/assets/aistudio/images_5a52e549.png"
          alt="Logo Canguro"
          className="max-h-[50px] max-w-[110px] w-auto h-auto object-contain mix-blend-multiply"
        />
      </div>

      {/* Columna Derecha: Matriz Oficial de Metadatos */}
      <div className="flex-1 flex flex-col justify-between">
        <table className="w-full text-center border-collapse h-[72px]">
          <tbody>
            {/* Fila 1: Metadatos en 5 celdas */}
            <tr className="border-b border-black text-[9px] leading-tight h-[36px]">
              <td className="px-1 py-0.5 border-r border-black font-medium bg-white text-black w-[20%]">
                <span className="font-bold block text-[8.5px]">Fecha de Emisión:</span>
                <span className="text-[9px]">{displayEmision}</span>
              </td>
              <td className="px-1 py-0.5 border-r border-black font-medium bg-white text-black w-[20%]">
                <span className="font-bold block text-[8.5px]">Fecha de Actualización:</span>
                <span className="text-[9px]">{displayActualizacion}</span>
              </td>
              <td className="px-1 py-0.5 border-r border-black font-medium bg-white text-black w-[15%]">
                <span className="font-bold block text-[8.5px]">Versión:</span>
                <span className="font-mono text-[9px]">{version || '01'}</span>
              </td>
              <td className="px-1 py-0.5 border-r border-black font-medium bg-white text-black w-[25%]">
                <span className="font-bold block text-[8.5px]">Código:</span>
                <span className="font-mono text-[9px]">{code}</span>
              </td>
              <td className="px-1 py-0.5 font-medium bg-white text-black w-[20%]">
                <span className="font-bold block text-[8.5px]">Página:</span>
                <span className="text-[9px]">{pageNumber} de {totalPages || 6}</span>
              </td>
            </tr>

            {/* Fila 2: Título y Clasificación */}
            <tr className="text-[9px] leading-tight h-[36px]">
              <td colSpan={3} className="px-2 py-0.5 border-r border-black font-black uppercase text-center bg-white text-black tracking-wide text-[11px] truncate">
                MANUAL DE PROCEDIMIENTOS – {displayName}
              </td>
              <td colSpan={2} className="px-1 py-0.5 text-center bg-white text-black font-medium text-[8.5px]">
                <span className="font-bold block text-[8px]">Clasificación del Proceso:</span>
                <span>Uso Interno</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Layout Editable In-Situ de la Página 1 (586px exactos: Fila 1: 270px, Fila 2: 162px, Fila 3: 138px con gaps de 8px)
export function Page1EditableLayout({
  doc,
  approvalAreas,
  isEditing,
  onUpdateField,
  onAddStep,
  onRemoveStep,
  onUpdateStep,
  onAddApprovalArea,
  onRemoveApprovalArea,
  onUpdateApprovalArea
}: {
  doc: {
    objetivo: string;
    alcance: string;
    versionDesc: string;
    clasificacion: string;
    flowSteps: string[];
    ownerArea: string;
    directionArea: string;
    trainingArea: string;
  };
  approvalAreas: ApprovalArea[];
  isEditing: boolean;
  onUpdateField: (field: string, value: any) => void;
  onAddStep: () => void;
  onRemoveStep: (idx: number) => void;
  onUpdateStep: (idx: number, text: string) => void;
  onAddApprovalArea: () => void;
  onRemoveApprovalArea: (id: string) => void;
  onUpdateApprovalArea: (id: string, field: 'name' | 'role', value: string) => void;
}) {
  // Filtrar pasos intermedios excluyendo 'inicio' y 'fin' para el diagrama horizontal Visio (máximo 8 actividades)
  const rawIntermediateSteps = (doc.flowSteps || []).filter((s) => {
    const lower = (s || '').trim().toLowerCase();
    return lower !== 'inicio' && lower !== 'fin';
  });
  const intermediateSteps = rawIntermediateSteps.slice(0, 8);

  return (
    <div className="flex flex-col justify-between h-[586px] text-black overflow-hidden box-border">
      {/* FILA 1 (Secciones 1, 2, 3 y 4 — Grid 12 columnas): height: 270px; flex-shrink: 0; */}
      <div className="h-[270px] shrink-0 grid grid-cols-12 gap-2 overflow-hidden box-border">
        {/* Columna Izquierda (8 cols, flex flex-col gap-2 h-full): [1] OBJETIVO y [2] ALCANCE */}
        <div className="col-span-8 flex flex-col gap-2 h-full overflow-hidden">
          {/* [1] OBJETIVO: height: 118px; overflow: hidden; */}
          <div className="h-[118px] flex flex-col overflow-hidden shrink-0">
            <SectionPillBanner number="1" title="OBJETIVO" />
            <div
              contentEditable={isEditing}
              suppressContentEditableWarning
              onBlur={(e) => onUpdateField('objetivo', domToMarkdownLine(e.currentTarget))}
              className="border border-black rounded-[14px] p-[8px_12px] bg-white text-black text-[11.5px] leading-[1.32] text-justify outline-none shadow-2xs flex-1 overflow-hidden box-border"
              title={isEditing ? 'Haz clic para editar el objetivo' : undefined}
            >
              <span dangerouslySetInnerHTML={{ __html: formatInline(doc.objetivo) }} />
            </div>
          </div>

          {/* [2] ALCANCE: height: 144px; overflow: hidden; */}
          <div className="h-[144px] flex flex-col overflow-hidden shrink-0">
            <SectionPillBanner number="2" title="ALCANCE" />
            <div
              contentEditable={isEditing}
              suppressContentEditableWarning
              onBlur={(e) => onUpdateField('alcance', domToMarkdownLine(e.currentTarget))}
              className="border border-black rounded-[14px] p-[8px_12px] bg-white text-black text-[11.5px] leading-[1.32] text-justify outline-none shadow-2xs flex-1 overflow-hidden box-border"
              title={isEditing ? 'Haz clic para editar el alcance' : undefined}
            >
              <span dangerouslySetInnerHTML={{ __html: formatInline(doc.alcance) }} />
            </div>
          </div>
        </div>

        {/* Columna Derecha (4 cols, flex flex-col gap-2 h-full): [3] CONTROL DE VERSIONES y [4] CLASIFICACIÓN */}
        <div className="col-span-4 flex flex-col gap-2 h-full overflow-hidden">
          {/* [3] CONTROL DE VERSIONES: height: 118px; */}
          <div className="h-[118px] flex flex-col overflow-hidden shrink-0">
            <SectionPillBanner number="3" title="CONTROL DE VERSIONES" />
            <div className="border border-black rounded-[14px] p-[8px_12px] bg-white text-black text-[11.5px] leading-[1.32] flex-1 flex items-center shadow-2xs overflow-hidden box-border">
              <p className="w-full">
                <strong className="text-black">Descripción:</strong>{' '}
                <span
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={(e) => onUpdateField('versionDesc', domToMarkdownLine(e.currentTarget))}
                  className="outline-none"
                >
                  <span dangerouslySetInnerHTML={{ __html: formatInline(doc.versionDesc || 'Nuevo') }} />
                </span>
              </p>
            </div>
          </div>

          {/* [4] CLASIFICACIÓN: height: 144px; */}
          <div className="h-[144px] flex flex-col overflow-hidden shrink-0">
            <SectionPillBanner number="4" title="CLASIFICACIÓN" />
            <div className="border border-black rounded-[14px] p-[8px_12px] bg-white text-black text-[11.5px] leading-[1.32] flex-1 flex items-center shadow-2xs overflow-hidden box-border">
              <p className="w-full">
                <strong className="text-black">Clasificación del Proceso:</strong>{' '}
                <span
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={(e) => onUpdateField('clasificacion', domToMarkdownLine(e.currentTarget))}
                  className="outline-none"
                >
                  <span dangerouslySetInnerHTML={{ __html: formatInline(doc.clasificacion || 'Crítico.') }} />
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FILA 2 (Sección 5 — VISIÓN EXTENDIDA DEL PROCESO): height: 162px; flex-shrink: 0; */}
      <div className="h-[162px] shrink-0 flex flex-col overflow-hidden box-border">
        <div className="flex items-center justify-between gap-2 shrink-0 mb-1">
          <div className="flex-1 min-w-0">
            <SectionPillBanner number="5" title="VISIÓN EXTENDIDA DEL PROCESO" />
          </div>
          {isEditing && (
            <button
              type="button"
              disabled={intermediateSteps.length >= 8}
              onClick={onAddStep}
              className={`no-print text-[11px] font-bold ${
                intermediateSteps.length >= 8
                  ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed border-zinc-300'
                  : 'bg-[#fed700] hover:bg-yellow-300 text-black border-black cursor-pointer'
              } px-3 py-1 rounded-md border flex items-center gap-1.5 transition shadow-xs shrink-0 z-10`}
              title={intermediateSteps.length >= 8 ? 'Máximo 8 actividades permitidas' : 'Agregar nuevo paso intermedio al diagrama'}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Paso ({intermediateSteps.length}/8)</span>
            </button>
          )}
        </div>

        {/* Contenedor con borde 1px solid #000 y fila horizontal de flujo */}
        <div className="border border-black rounded-[14px] bg-white flex-1 overflow-hidden box-border">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '4px',
              padding: '10px 12px',
              width: '100%',
              height: 'calc(100% - 2px)',
              boxSizing: 'border-box'
            }}
          >
            {/* Píldora Inicio */}
            <div
              style={{
                width: '64px',
                flexShrink: 0,
                backgroundColor: '#ffffff',
                border: '1.5px solid #000000',
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: '11px',
                textAlign: 'center',
                padding: '6px 0',
                color: '#000000'
              }}
            >
              Inicio
            </div>

            {/* Flecha hacia la primera etapa */}
            <span style={{ fontSize: intermediateSteps.length >= 7 ? '12px' : '14px', fontWeight: 900, color: '#000000', flexShrink: 0, userSelect: 'none' }}>
              →
            </span>

            {/* Etapas Intermedias (máximo 8 actividades, garantizando legibilidad y ancho adecuado) */}
            {intermediateSteps.map((step, idx) => {
              const count = intermediateSteps.length;
              const stepFontSize = count >= 7 ? '9.5px' : count >= 5 ? '10.5px' : '11px';

              return (
                <React.Fragment key={idx}>
                  <div
                    style={{
                      flex: '1 1 0%',
                      minWidth: 0,
                      height: '92px',
                      border: '1.5px solid #000000',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      padding: '4px 6px',
                      fontSize: stepFontSize,
                      lineHeight: '1.22',
                      fontWeight: 500,
                      wordBreak: 'normal',
                      overflowWrap: 'break-word',
                      hyphens: 'none',
                      overflow: 'hidden',
                      borderRadius: '8px',
                      boxSizing: 'border-box',
                      color: '#000000',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                    }}
                    className="relative group transition-all"
                  >
                    <div
                      contentEditable={isEditing}
                      suppressContentEditableWarning
                      onBlur={(e) => onUpdateStep(idx + 1, e.currentTarget.innerText)}
                      className="outline-none w-full max-h-full overflow-hidden text-center flex items-center justify-center select-text"
                      style={{ hyphens: 'none', wordBreak: 'normal' }}
                      title={isEditing ? 'Haz clic para editar la etapa' : undefined}
                    >
                      {step}
                    </div>

                    {isEditing && intermediateSteps.length > 2 && (
                      <button
                        type="button"
                        onClick={() => onRemoveStep(idx + 1)}
                        className="no-print absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center opacity-90 hover:opacity-100 transition shadow-xs hover:scale-110 cursor-pointer z-10"
                        title="Eliminar este paso"
                      >
                        <X className="w-2.5 h-2.5 text-white" />
                      </button>
                    )}
                  </div>

                  <span style={{ fontSize: count >= 7 ? '12px' : '14px', fontWeight: 900, color: '#000000', flexShrink: 0, userSelect: 'none' }}>
                    →
                  </span>
                </React.Fragment>
              );
            })}

            {/* Píldora Fin */}
            <div
              style={{
                width: '64px',
                flexShrink: 0,
                backgroundColor: '#ffffff',
                border: '1.5px solid #000000',
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: '11px',
                textAlign: 'center',
                padding: '6px 0',
                color: '#000000'
              }}
            >
              Fin
            </div>
          </div>
        </div>
      </div>

      {/* FILA 3 (Sección 6 — ÁREAS APROBADORAS): height: 138px; flex-shrink: 0; */}
      <div className="h-[138px] shrink-0 flex flex-col overflow-hidden box-border">
        <div className="flex items-center justify-between gap-2 shrink-0 mb-1">
          <div className="flex-1 min-w-0">
            <SectionPillBanner number="6" title="ÁREAS APROBADORAS" />
          </div>
          {isEditing && (
            <button
              type="button"
              onClick={onAddApprovalArea}
              className="no-print text-[11px] font-bold bg-[#fed700] hover:bg-yellow-300 text-black px-3 py-1 rounded-md border border-black flex items-center gap-1.5 transition shadow-xs cursor-pointer shrink-0 z-10"
              title="Agregar nueva área aprobadora participante"
            >
              <Plus className="w-3.5 h-3.5 text-black" />
              <span>Agregar Área</span>
            </button>
          )}
        </div>

        {/* Contenedor con borde 1px solid #000, mostrando las tarjetas de áreas aprobadoras en grid oficial (hasta 3 columnas x 2 filas) */}
        <div className="border border-black rounded-[14px] bg-white flex-1 p-2 flex items-center justify-center overflow-hidden box-border">
          <div
            className={`w-full h-full gap-2 items-center ${
              approvalAreas.length <= 3
                ? 'flex justify-between'
                : 'grid grid-cols-3'
            }`}
          >
            {approvalAreas.map((area) => (
              <div
                key={area.id}
                className="flex-1 h-full border border-black rounded-lg p-1.5 bg-white flex flex-col justify-center text-center relative group min-h-0"
              >
                {/* Nombre de la Gerencia / Dirección */}
                <div
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={(e) => onUpdateApprovalArea(area.id || '', 'name', e.currentTarget.innerText.trim())}
                  className="font-bold text-black text-[10.5px] uppercase leading-tight outline-none truncate"
                  title={isEditing ? 'Haz clic para editar el nombre del área' : undefined}
                >
                  {area.name}
                </div>

                {/* Rol (Dueño del proceso / Participante) */}
                <div
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={(e) => onUpdateApprovalArea(area.id || '', 'role', e.currentTarget.innerText.trim())}
                  className="italic text-zinc-800 text-[9.5px] mt-0.5 outline-none truncate"
                  title={isEditing ? 'Haz clic para editar el rol' : undefined}
                >
                  {area.role}
                </div>

                {/* Botón para eliminar área */}
                {isEditing && approvalAreas.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveApprovalArea(area.id || '')}
                    className="no-print absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center opacity-90 hover:opacity-100 transition shadow-xs hover:scale-110 cursor-pointer z-10"
                    title="Eliminar esta área"
                  >
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Subcomponente para renderizar y editar Página 2 (Herramientas Tecnológicas y Documentos Derogados)
export function Page2EditableBlock({
  content = '',
  herramientas: propHerramientas,
  documentosDerogados: propDerogados,
  isEditing,
  onUpdateHerramientas,
  onUpdateDerogados,
  onUpdateContent
}: {
  content?: string;
  herramientas?: string[];
  documentosDerogados?: string[];
  isEditing: boolean;
  onUpdateHerramientas?: (tools: string[]) => void;
  onUpdateDerogados?: (derogados: string[]) => void;
  onUpdateContent?: (newContent: string) => void;
}) {
  // Extraer herramientas y derogados si se pasa como prop o desde markdown
  let defaultTools = ['ERP Odoo', 'Google Drive', 'WhatsApp', 'Email'];
  let defaultDerogados = ['N/A'];

  if (Array.isArray(propHerramientas) && propHerramientas.length > 0) {
    defaultTools = propHerramientas;
  } else if (content) {
    const hMatch = content.match(/##\s*\[?7\]?[^\n]*HERRAMIENTAS[^\n]*\n([\s\S]*?)(?=##\s*\[?8\]?|##\s*DOCUMENTOS\s*DEROGADOS|$)/i);
    if (hMatch && hMatch[1]) {
      const parsed = hMatch[1]
        .split('\n')
        .map((l) => l.replace(/^[•\-\*]\s*/, '').trim())
        .filter(Boolean);
      if (parsed.length > 0) defaultTools = parsed;
    }
  }

  if (Array.isArray(propDerogados) && propDerogados.length > 0) {
    defaultDerogados = propDerogados;
  } else if (content) {
    const dMatch = content.match(/##\s*(?:\[?8\]?)?[^\n]*DEROGADOS[^\n]*\n([\s\S]*?)$/i);
    if (dMatch && dMatch[1]) {
      const parsed = dMatch[1]
        .split('\n')
        .map((l) => l.replace(/^[•\-\*]\s*/, '').trim())
        .filter(Boolean);
      if (parsed.length > 0) defaultDerogados = parsed;
    }
  }

  const [localTools, setLocalTools] = useState<string[]>(defaultTools);
  const [localDerogados, setLocalDerogados] = useState<string[]>(defaultDerogados);
  const toolsEditorRef = useRef<HTMLDivElement | null>(null);
  const derEditorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (propHerramientas && propHerramientas.length > 0) {
      setLocalTools(propHerramientas);
    }
  }, [propHerramientas]);

  useEffect(() => {
    if (propDerogados && propDerogados.length > 0) {
      setLocalDerogados(propDerogados);
    }
  }, [propDerogados]);

  const commitChanges = (tools: string[], derogados: string[]) => {
    if (onUpdateHerramientas) {
      onUpdateHerramientas(tools);
    }
    if (onUpdateDerogados) {
      onUpdateDerogados(derogados);
    }
    if (onUpdateContent) {
      const tLines = tools.map((t) => `• ${t}`).join('\n');
      const dLines = derogados.map((d) => (d === 'N/A' ? 'N/A' : `• ${d}`)).join('\n');
      onUpdateContent(`## [7] HERRAMIENTAS TECNOLÓGICAS\n${tLines}\n\n## [8] DOCUMENTOS DEROGADOS\n${dLines}`);
    }
  };

  const isDerogadosNA =
    localDerogados.length === 0 ||
    (localDerogados.length === 1 && (/^n\/?a$/i.test(localDerogados[0].trim()) || localDerogados[0].trim() === ''));

  const handleAddTool = () => {
    const updated = [...localTools, 'Nueva Herramienta Tecnológica'];
    setLocalTools(updated);
    commitChanges(updated, localDerogados);
  };

  return (
    <div className="flex flex-col justify-between min-h-[500px] h-full space-y-4 text-black">
      {/* SECCIÓN 7: HERRAMIENTAS TECNOLÓGICAS */}
      <div className="flex flex-col flex-1">
        <div className="flex items-center justify-between gap-2.5">
          <SectionPillBanner number="7" title="HERRAMIENTAS TECNOLOGICAS" />
          {isEditing && (
            <div className="no-print flex items-center gap-1.5 ml-2">
              <button
                type="button"
                onClick={handleAddTool}
                className="text-[11px] font-bold bg-[#fed700] hover:bg-yellow-400 text-black px-2.5 py-0.5 rounded border border-black transition cursor-pointer flex items-center gap-1 shadow-2xs"
                title="Agregar herramienta tecnológica"
              >
                <Plus className="w-3 h-3 text-black" />
                <span>Agregar</span>
              </button>
            </div>
          )}
        </div>

        <div className="mt-1 flex-1 border border-black rounded-[14px] bg-white p-4 sm:p-5 min-h-[170px] flex flex-col justify-start">
          {isEditing ? (
            <div
              ref={toolsEditorRef}
              contentEditable={true}
              suppressContentEditableWarning
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const sel = window.getSelection();
                  if (sel && sel.rangeCount > 0) {
                    const range = sel.getRangeAt(0);
                    range.deleteContents();
                    const textNode = document.createTextNode('\n• ');
                    range.insertNode(textNode);
                    range.setStartAfter(textNode);
                    range.setEndAfter(textNode);
                    sel.removeAllRanges();
                    sel.addRange(range);
                  } else {
                    document.execCommand('insertText', false, '\n• ');
                  }
                }
              }}
              onBlur={() => {
                if (!toolsEditorRef.current) return;
                const lines = toolsEditorRef.current.innerText
                  .split('\n')
                  .map((l) => l.replace(/^[•\-\*]\s*/, '').trim())
                  .filter(Boolean);
                const updated = lines.length > 0 ? lines : ['ERP Odoo'];
                setLocalTools(updated);
                commitChanges(updated, localDerogados);
              }}
              className="flex-1 w-full min-h-[140px] outline-none p-2 rounded text-black text-xs sm:text-[13px] border border-amber-300/80 bg-amber-50/20 hover:bg-amber-50/40 transition whitespace-pre-wrap leading-relaxed cursor-text"
            >
              {localTools.map((t) => `• ${t}`).join('\n')}
            </div>
          ) : (
            <div className="space-y-1 text-black text-xs sm:text-[13px] leading-relaxed">
              {localTools.map((tool, idx) => {
                const cleanTool = tool.replace(/\s*\([^)]*\)/g, '').trim();
                return (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="font-bold select-none leading-relaxed">•</span>
                    <span
                      className="leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: formatInline(cleanTool) }}
                    />
                  </div>
                );
              })}
              {localTools.length === 0 && (
                <div className="text-zinc-400 italic text-xs sm:text-[13px]">
                  No hay herramientas registradas.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN 8: DOCUMENTOS DEROGADOS */}
      <div className="flex flex-col flex-1">
        <SectionPillBanner number="8" title="DOCUMENTOS DEROGADOS" />

        <div className="mt-1 flex-1 border border-black rounded-[14px] bg-white p-4 sm:p-5 min-h-[170px] flex flex-col justify-start">
          {isEditing ? (
            <div
              ref={derEditorRef}
              contentEditable={true}
              suppressContentEditableWarning
              onBlur={() => {
                if (!derEditorRef.current) return;
                const text = derEditorRef.current.innerText.trim();
                const lines =
                  text === '' || /^n\/?a$/i.test(text)
                    ? ['N/A']
                    : text.split('\n').map((l) => l.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean);
                const updated = lines.length > 0 ? lines : ['N/A'];
                setLocalDerogados(updated);
                commitChanges(localTools, updated);
              }}
              className="outline-none flex-1 min-h-[140px] p-2 rounded text-xs sm:text-[13px] leading-relaxed border border-amber-300/80 bg-amber-50/20 hover:bg-amber-50/40 transition whitespace-pre-wrap cursor-text text-black"
            >
              {localDerogados.join('\n')}
            </div>
          ) : isDerogadosNA ? (
            <div className="text-zinc-400 italic text-xs sm:text-[13px] select-none p-1">
              N/A
            </div>
          ) : (
            <div className="space-y-1 text-black text-xs sm:text-[13px] leading-relaxed">
              {localDerogados.map((doc, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="font-bold select-none leading-relaxed">•</span>
                  <span
                    className="leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatInline(doc) }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SubsequentGenericPage({
  content,
  isEditing,
  onUpdateContent
}: {
  content: string;
  isEditing: boolean;
  onUpdateContent: (newContent: string) => void;
}) {
  const handleUpdateLine = (lineIdx: number, newText: string) => {
    const lines = content.split('\n');
    if (lines[lineIdx] !== undefined) {
      lines[lineIdx] = newText;
      onUpdateContent(lines.join('\n'));
    }
  };

  const handleInsertLine = (afterLineIdx: number, newText: string) => {
    const lines = content.split('\n');
    lines.splice(afterLineIdx + 1, 0, newText);
    onUpdateContent(lines.join('\n'));
  };

  const handleDeleteLine = (lineIdx: number) => {
    const lines = content.split('\n');
    if (lines.length > 1) {
      lines.splice(lineIdx, 1);
      onUpdateContent(lines.join('\n'));
    }
  };

  const handleAddBulletAtEnd = () => {
    const lines = content.split('\n');
    lines.push('• **Nuevo concepto o norma:** Especificación técnica.');
    onUpdateContent(lines.join('\n'));
  };

  useEffect(() => {
    const handleGlobalAddBullet = () => {
      if (isEditing) {
        handleAddBulletAtEnd();
      }
    };
    window.addEventListener('app-add-bullet-requested', handleGlobalAddBullet);
    return () => window.removeEventListener('app-add-bullet-requested', handleGlobalAddBullet);
  }, [isEditing, content]);

  return (
    <div className="relative outline-none leading-relaxed min-h-[580px] flex flex-col justify-between">
      <RenderPageMarkdown
        text={content}
        isEditing={isEditing}
        onUpdateLine={handleUpdateLine}
        onInsertLine={handleInsertLine}
        onDeleteLine={handleDeleteLine}
      />
    </div>
  );
}

export function SubsequentPageEditable({
  pageIndex,
  content,
  isEditing,
  onUpdateContent
}: {
  pageIndex: number;
  content: string;
  isEditing: boolean;
  onUpdateContent: (newContent: string) => void;
}) {
  // PÁGINA 2: Estructura corporativa vertical apilada (uno debajo del otro):
  // Superior: (7) HERRAMIENTAS TECNOLÓGICAS
  // Inferior: (8) DOCUMENTOS DEROGADOS (N/A)
  if (pageIndex === 0) {
    return (
      <Page2EditableBlock
        content={content}
        isEditing={isEditing}
        onUpdateContent={onUpdateContent}
      />
    );
  }

  return (
    <SubsequentGenericPage
      key={`subsequent-page-${pageIndex}`}
      content={content}
      isEditing={isEditing}
      onUpdateContent={onUpdateContent}
    />
  );
}

// Cuadro de Firmas Oficial con distribución horizontal lado a lado (82px fijos exactos)
export function OfficialSignaturesFooter({
  signers,
  isEditing,
  onUpdateSigner,
  onUploadSignature,
  onResetSigner,
  onRemoveSigner,
  onAddFifthSigner
}: {
  signers: SignerSlot[];
  isEditing: boolean;
  onUpdateSigner: (index: number, field: 'name' | 'position', value: string) => void;
  onUploadSignature: (index: number, file: File) => void;
  onResetSigner: (index: number) => void;
  onRemoveSigner?: (index: number) => void;
  onAddFifthSigner?: () => void;
}) {
  return (
    <div className="signatures-footer-container relative shrink-0">
      {/* Controles de gestión de firmantes visibles en modo edición (flotante exterior no-print) */}
      {isEditing && (
        <div className="no-print absolute -top-6 right-0 bg-zinc-50 border border-black/30 px-2 py-0.5 rounded flex items-center justify-between text-[8.5px] text-zinc-700 shadow-2xs z-20">
          <div className="flex items-center gap-1.5 font-bold mr-2">
            <Users className="w-3 h-3 text-amber-600" />
            <span>Firmantes: {signers.length}</span>
          </div>
          {signers.length > 4 && onRemoveSigner ? (
            <button
              type="button"
              onClick={() => onRemoveSigner(signers.length - 1)}
              className="text-red-700 hover:text-red-900 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              title="Eliminar el 5º cuadro de firma (usar 4 firmantes)"
            >
              <Trash2 className="w-2.5 h-2.5 text-red-600" />
              <span>Eliminar 1 (4 firmantes)</span>
            </button>
          ) : signers.length === 4 && onAddFifthSigner ? (
            <button
              type="button"
              onClick={onAddFifthSigner}
              className="text-amber-950 font-black flex items-center gap-1 bg-amber-300 hover:bg-amber-400 px-1.5 py-0.5 rounded shadow-2xs cursor-pointer transition"
              title="Restaurar el 5º puesto de firma"
            >
              <Plus className="w-2.5 h-2.5" />
              <span>5º Firmante</span>
            </button>
          ) : null}
        </div>
      )}

      {/* Contenedor oficial innegociable de 82px */}
      <div
        className="border border-black bg-white text-black avoid-break shadow-xs shrink-0 w-full grid divide-x divide-black"
        style={{
          height: '82px',
          minHeight: '82px',
          maxHeight: '82px',
          gridTemplateColumns: `repeat(${signers.length}, minmax(0, 1fr))`,
          boxSizing: 'border-box'
        }}
      >
        {signers.map((signer, idx) => {
          const signatureSrc = signer.signatureUrl || getOfficialSignatureFallback(signer.name, signer.id);
          const cleanRoleLabel = (signer.roleLabel || 'Firmante').replace(/[:\s]+$/, '').trim();

          return (
            <div
              key={signer.id || `signer-${idx}`}
              className="flex flex-row items-center justify-between p-[4px_6px] relative overflow-hidden bg-white group gap-1"
              style={{ height: '80px', boxSizing: 'border-box' }}
            >
              {/* Lado Izquierdo (Texto): Rol, Nombre, Cargo */}
              <div className="flex-1 min-w-0 flex flex-col justify-center z-[2] relative">
                <div className="flex items-center gap-1">
                  {isEditing && (
                    <label
                      className="cursor-pointer text-zinc-600 hover:text-black transition shrink-0 p-0.5 rounded hover:bg-zinc-100"
                      title="Haz clic para subir la firma gráfica"
                    >
                      <UserCheck className="w-2.5 h-2.5 text-zinc-700 hover:text-black" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) onUploadSignature(idx, file);
                        }}
                      />
                    </label>
                  )}
                  <span className="block font-bold text-black uppercase tracking-wider text-[8.5px] leading-[1.1] truncate">
                    {cleanRoleLabel}:
                  </span>
                </div>
                <div
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={(e) => onUpdateSigner(idx, 'name', e.currentTarget.innerText.trim())}
                  className="font-bold text-black text-[9px] leading-[1.15] mt-0.5 outline-none truncate"
                  title={isEditing ? 'Haz clic para editar el nombre' : undefined}
                >
                  {signer.name}
                </div>
                <div
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={(e) => onUpdateSigner(idx, 'position', e.currentTarget.innerText.trim())}
                  className="font-normal text-black text-[8px] leading-[1.15] mt-0.5 outline-none line-clamp-2"
                  title={isEditing ? 'Haz clic para editar el cargo' : undefined}
                >
                  {signer.position}
                </div>
              </div>

              {/* Lado Derecho (Lateral): Imagen de Firma Gráfica oficial */}
              <div className="w-[62px] sm:w-[70px] h-full shrink-0 flex items-center justify-center overflow-hidden z-[1] pl-0.5">
                {signatureSrc ? (
                  <img
                    src={signatureSrc}
                    alt={`Firma ${signer.name}`}
                    className="max-h-[52px] max-w-[68px] w-auto h-auto object-contain select-none pointer-events-none"
                  />
                ) : (
                  <div className="h-[40px] w-full" />
                )}
              </div>

            {/* Hover overlay para editar firma */}
            {isEditing && (
              <div className="no-print absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 rounded z-10">
                <label className="cursor-pointer bg-[#fed700] hover:bg-yellow-300 text-black text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 shadow-xs transition">
                  <Upload className="w-2.5 h-2.5 text-black" />
                  <span>Subir</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUploadSignature(idx, file);
                    }}
                  />
                </label>
                {signer.signatureUrl !== signer.defaultSignatureUrl && (
                  <button
                    type="button"
                    onClick={() => onResetSigner(idx)}
                    className="bg-white hover:bg-zinc-100 text-black text-[8px] font-bold px-1.5 py-0.5 rounded shadow-xs transition"
                    title="Restablecer firma por defecto"
                  >
                    Restablecer
                  </button>
                )}
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}

// Identifica si una página o sección está vacía o contiene únicamente un encabezado sin contenido sustancial
export function isBlankOrHeaderOnlyPage(pageText: string): boolean {
  if (!pageText || !pageText.trim()) return true;
  const stripped = pageText
    .replace(/^#+\s*[^\n]*/gm, '') // eliminar encabezados markdown (#, ##, ###)
    .replace(/\[\d+\]\s*[^\n]*/g, '') // eliminar tags como [10] NORMAS DEL PROCESO
    .replace(/NORMAS\s+DEL\s+PROCESO/gi, '')
    .replace(/ESTRUCTURA\s+ORGANIZACIONAL/gi, '')
    .replace(/CRITERIOS\s+T[EÉ]CNICOS[^\n]*/gi, '')
    .replace(/\s+/g, '') // eliminar todo espacio en blanco
    .trim();
  return stripped.length < 25;
}

// Limpia líneas espurias de firmas o pies de página alucinados por la IA
export function cleanSpuriousSignaturesAndFooters(text: string): string {
  if (!text) return '';
  return text
    .split('\n')
    .filter((rawLine) => {
      const line = rawLine.trim();
      if (!line) return true;

      // 1. Coincidencia combinada de número de página con firmas o sellos
      // ej: [Página 4 de 6] | FIRMA AUTORIZADA: GABRIEL SAAVEDRA (DIRECCIÓN) | FIRMA SUPERVISIÓN: ___
      if (/\[?\bP[aá]gina\s+\d+\s+de\s+\d+\]?/i.test(line) && /FIRMA/i.test(line)) {
        return false;
      }

      // 2. Líneas aisladas de paginación textual
      // ej: [Página 4 de 6], Página 4 de 6, Pág. 4 de 6
      if (/^\[?\s*P[aá]g(?:ina)?\.?\s+\d+\s+de\s+\d+\s*\]?$/i.test(line)) {
        return false;
      }

      // 3. Líneas de firmas manuales o textuales
      // ej: FIRMA AUTORIZADA: ..., FIRMA SUPERVISIÓN: ..., FIRMA DIRECCIÓN: ..., FIRMA RESPONSABLE: ...
      if (/(?:^|\|)\s*FIRMA\s+(?:AUTORIZADA|SUPERVISI[OÓ]N|DIRECCI[OÓ]N|RESPONSABLE|REVISADA|ELABORADA|APROBADA|DE\s+REVISI[OÓ]N)/i.test(line)) {
        return false;
      }

      // 4. Líneas de firmas con subrayados
      // ej: FIRMA: ____, Firma: ___
      if (/\bFIRMA\b.*?:?\s*_{2,}/i.test(line)) {
        return false;
      }

      // 5. Líneas que solo contienen subrayados continuos para firma manual
      // ej: _________
      if (/^_{3,}\s*$/.test(line)) {
        return false;
      }

      return true;
    })
    .join('\n');
}

// Limpia negritas excesivas en los prefijos de responsabilidades de la estructura organizacional
export function cleanResponsibilityBolds(text: string): string {
  if (!text) return '';
  return text.replace(
    /(###\s*3\.\s*ESTRUCTURA[\s\S]*?)(?=###\s*4\.\s*CRITERIOS|===PAGINA_6===|$)/i,
    (match) => {
      // 1. Si viene con prefijo como • **Supervisión Estratégica:** Supervisar... o • Supervisión Estratégica: Supervisar...
      // Donde el prefijo es redundante antes de un verbo de acción en infinitivo:
      let cleaned = match.replace(
        /(^[•\-\*]\s*)(?:\*\*)?([A-ZÁÉÍÓÚ][a-záéíóú\s]+)(?:\*\*)?:\s+([A-ZÁÉÍÓÚ][a-z]+(?:ar|er|ir)\b)/gm,
        '$1$3'
      );
      // 2. Para cualquier otra viñeta con negrita inicial en la estructura, remover las negritas
      cleaned = cleaned.replace(
        /(^[•\-\*]\s*)\*\*([^*:\n]+?)(?::)?\*\*\s*(?::\s*)?/gm,
        (_m, bullet, label) => {
          return `${bullet}${label.trim()}: `;
        }
      );
      // 3. Limpiar prefijos genéricos en los títulos de los cargos 3.3 y 3.4
      cleaned = cleaned.replace(
        /(\*{0,2}3\.3\.\s*)(?:Supervisor\s+del\s+Proceso\s*(?:\/|\()\s*([^)\n]+)\)?)(?:\*{0,2})/gi,
        (_m, prefix, roleName) => `${prefix}${roleName.trim()}**`
      );
      cleaned = cleaned.replace(
        /(\*{0,2}3\.4\.\s*)(?:Analista\s*(?:\/|y)?\s*Especialista\s+Operativo\s*(?:\/|\()\s*([^)\n]+)\)?)(?:\*{0,2})/gi,
        (_m, prefix, roleName) => `${prefix}${roleName.trim()}**`
      );
      return cleaned;
    }
  );
}

// Subcomponente para renderizar el contenido Markdown con píldoras limpias,
// cajas Visio estandarizadas (borde negro, esquinas redondeadas r=14px) y edición WYSIWYG
export function RenderPageMarkdown({
  text,
  isEditing = false,
  onUpdateLine,
  onInsertLine,
  onDeleteLine
}: {
  text: string;
  isEditing?: boolean;
  onUpdateLine?: (lineIdx: number, newText: string) => void;
  onInsertLine?: (afterLineIdx: number, newText: string) => void;
  onDeleteLine?: (lineIdx: number) => void;
}) {
  if (!text) return null;

  const lines = text.split('\n');

  interface SectionGroup {
    header?: { number: string; title: string };
    elements: React.ReactNode[];
  }

  const sectionGroups: SectionGroup[] = [];
  let currentGroup: SectionGroup = { elements: [] };

  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = (key: number) => {
    if (tableRows.length > 0) {
      const header = tableRows[0];
      const rows = tableRows.slice(1);
      currentGroup.elements.push(
        <div key={`table-${key}`} className="my-2 overflow-x-auto border border-black rounded-sm">
          <table className="w-full text-left text-xs border-collapse text-black">
            <thead className="bg-[#fed700] text-black font-black border-b border-black">
              <tr>
                {header.map((col, idx) => (
                  <th key={idx} className="p-2 border-r border-black last:border-r-0">
                    <span dangerouslySetInnerHTML={{ __html: col }} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}>
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      contentEditable={isEditing}
                      suppressContentEditableWarning
                      className="p-2 border-r border-black last:border-r-0 text-black outline-none"
                    >
                      <span dangerouslySetInnerHTML={{ __html: cell }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
    }
    inTable = false;
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();

    // Table parsing
    if (line.startsWith('|') && line.endsWith('|')) {
      if (/^\|[\s\-:|]+\|$/.test(line)) {
        inTable = true;
        return;
      }
      inTable = true;
      const cells = line.slice(1, -1).split('|').map((c) => formatInline(c.trim()));
      tableRows.push(cells);
      return;
    } else if (inTable) {
      flushTable(idx);
    }

    if (!line || line === '---') return;

    // Filtro estricto: suprimir líneas de firmas o pie de página alucinados
    if (
      (/\[?\bP[aá]gina\s+\d+\s+de\s+\d+\]?/i.test(line) && /FIRMA/i.test(line)) ||
      /^\[?\s*P[aá]g(?:ina)?\.?\s+\d+\s+de\s+\d+\s*\]?$/i.test(line) ||
      /(?:^|\|)\s*FIRMA\s+(?:AUTORIZADA|SUPERVISI[OÓ]N|DIRECCI[OÓ]N|RESPONSABLE|REVISADA|ELABORADA|APROBADA|DE\s+REVISI[OÓ]N)/i.test(line) ||
      /\bFIRMA\b.*?:?\s*_{2,}/i.test(line) ||
      /^_{3,}\s*$/.test(line)
    ) {
      return;
    }

    // Headings
    if (line.startsWith('# ')) {
      return;
    } else if (line.startsWith('## ')) {
      if (currentGroup.header || currentGroup.elements.length > 0) {
        sectionGroups.push(currentGroup);
      }
      const title = line.replace('## ', '').replace(/\*\*/g, '');
      const numMatch = title.match(/\[(\d+)\]/);
      const number = numMatch ? numMatch[1] : '';
      const cleanTitle = title
        .replace(/\[\d+\]\s*/, '')
        .replace(/\s*\((?:CONTINUACI[OÓ]N|CONTINUACION)[^)]*\)/gi, '')
        .trim();
      currentGroup = {
        header: { number, title: cleanTitle },
        elements: []
      };
    } else if (line.startsWith('### ')) {
      const rawSubtitle = line.replace('### ', '').replace(/\*\*/g, '');
      const subtitle = rawSubtitle
        .replace(/\s*\((?:CONTINUACI[OÓ]N|CONTINUACION)[^)]*\)/gi, '')
        .trim();
      currentGroup.elements.push(
        <h3
          key={idx}
          contentEditable={isEditing}
          suppressContentEditableWarning
          onBlur={(e) => {
            const curText = domToMarkdownLine(e.currentTarget);
            if (onUpdateLine) onUpdateLine(idx, `### ${curText}`);
          }}
          className="text-xs sm:text-[13px] font-black text-black border-b border-black/30 pb-1 mt-3 mb-2 uppercase outline-none"
        >
          <span dangerouslySetInnerHTML={{ __html: formatInline(subtitle) }} />
        </h3>
      );
    } else if (line.includes('➔') || line.includes('-->') || line.includes('->') || line.includes('→')) {
      const steps = line.split(/\s*(?:→|-->|->|➔)\s*/).map((s) => s.trim().replace(/\*\*/g, ''));
      currentGroup.elements.push(
        <div key={idx} className="my-2.5 flex flex-nowrap overflow-x-auto items-center gap-1.5 py-1">
          {steps.map((st, sIdx) => (
            <React.Fragment key={sIdx}>
              <div
                className={`px-3 py-1.5 rounded text-xs font-bold border border-black shadow-xs shrink-0 ${
                  st.toLowerCase() === 'inicio' || st.toLowerCase() === 'fin'
                    ? 'bg-zinc-950 text-white'
                    : 'bg-white text-black'
                }`}
              >
                {st}
              </div>
              {sIdx < steps.length - 1 && (
                <span className="text-black font-black text-sm shrink-0">➔</span>
              )}
            </React.Fragment>
          ))}
        </div>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      const itemText = line.replace(/^[-*•]\s+/, '');
      const nextNonEmpty = lines.slice(idx + 1).find((l) => l.trim() !== '' && l.trim() !== '---');
      const isEndOfBulletList =
        !nextNonEmpty ||
        (!nextNonEmpty.trim().startsWith('- ') &&
          !nextNonEmpty.trim().startsWith('* ') &&
          !nextNonEmpty.trim().startsWith('• '));

      currentGroup.elements.push(
        <div key={idx} className="my-1">
          <li
            contentEditable={isEditing}
            suppressContentEditableWarning
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const curText = domToMarkdownLine(e.currentTarget).replace(/^[•\-*]\s*/, '');
                if (onUpdateLine) onUpdateLine(idx, `• ${curText}`);
                if (onInsertLine) onInsertLine(idx, '• ');
              } else if (
                e.key === 'Backspace' &&
                (e.currentTarget.innerText.trim() === '' || e.currentTarget.innerText.trim() === '•')
              ) {
                e.preventDefault();
                if (onDeleteLine) onDeleteLine(idx);
              }
            }}
            onBlur={(e) => {
              const curText = domToMarkdownLine(e.currentTarget).replace(/^[•\-*]\s*/, '');
              if (onUpdateLine) onUpdateLine(idx, `• ${curText}`);
            }}
            className="ml-4 list-disc text-black text-xs sm:text-[13px] leading-relaxed outline-none hover:bg-amber-50/40 rounded px-1 transition"
          >
            <span dangerouslySetInnerHTML={{ __html: formatInline(itemText) }} />
          </li>

          {isEditing && isEndOfBulletList && (
            <div className="no-print mt-1 mb-0.5 flex items-center">
              <button
                type="button"
                onClick={() => {
                  if (onInsertLine) onInsertLine(idx, '• ');
                }}
                className="w-5 h-5 rounded border border-zinc-300 hover:border-black bg-zinc-50 hover:bg-[#fed700] text-zinc-500 hover:text-black flex items-center justify-center transition active:scale-90 shadow-none cursor-pointer"
                title="Añadir viñeta"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>
      );
    } else {
      const isNumberedLine = /^\d+(\.\d+)*\.?\s+/.test(line);
      const nextNonEmpty = lines.slice(idx + 1).find((l) => l.trim() !== '' && l.trim() !== '---');
      const isEndOfNumberedList =
        isNumberedLine && (!nextNonEmpty || !/^\d+(\.\d+)*\.?\s+/.test(nextNonEmpty.trim()));

      currentGroup.elements.push(
        <div key={idx} className="my-1.5">
          <p
            contentEditable={isEditing}
            suppressContentEditableWarning
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const curText = domToMarkdownLine(e.currentTarget);
                if (onUpdateLine) onUpdateLine(idx, curText);
                const numMatch = curText.match(/^(\d+(?:\.\d+)*)\.?\s+/);
                let nextPrefix = '• ';
                if (numMatch) {
                  const parts = numMatch[1].split('.');
                  const lastNum = parseInt(parts[parts.length - 1], 10);
                  if (!isNaN(lastNum)) {
                    parts[parts.length - 1] = String(lastNum + 1);
                    nextPrefix = `${parts.join('.')}. `;
                  }
                }
                if (onInsertLine) onInsertLine(idx, nextPrefix);
              }
            }}
            onBlur={(e) => {
              const curText = domToMarkdownLine(e.currentTarget);
              if (onUpdateLine) onUpdateLine(idx, curText);
            }}
            className="text-black text-xs sm:text-[13px] leading-relaxed text-justify outline-none hover:bg-amber-50/40 rounded px-1 transition"
          >
            <span dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
          </p>

          {isEditing && isEndOfNumberedList && (
            <div className="no-print mt-1 mb-0.5 flex items-center">
              <button
                type="button"
                onClick={() => {
                  const numMatch = line.match(/^(\d+(?:\.\d+)*)\.?\s+/);
                  let nextPrefix = '• ';
                  if (numMatch) {
                    const parts = numMatch[1].split('.');
                    const lastNum = parseInt(parts[parts.length - 1], 10);
                    if (!isNaN(lastNum)) {
                      parts[parts.length - 1] = String(lastNum + 1);
                      nextPrefix = `${parts.join('.')}. `;
                    }
                  }
                  if (onInsertLine) onInsertLine(idx, nextPrefix);
                }}
                className="w-5 h-5 rounded border border-zinc-300 hover:border-black bg-zinc-50 hover:bg-[#fed700] text-zinc-500 hover:text-black flex items-center justify-center transition active:scale-90 shadow-none cursor-pointer"
                title="Añadir punto siguiente"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>
      );
    }
  });

  if (inTable) {
    flushTable(lines.length);
  }

  if (currentGroup.header || currentGroup.elements.length > 0) {
    sectionGroups.push(currentGroup);
  }

  return (
    <div className="flex-1 flex flex-col justify-start">
      {sectionGroups.map((group, gIdx) => (
        <div key={gIdx} className="flex-1 flex flex-col mb-1.5 last:mb-0">
          {group.header && (
            <SectionPillBanner number={group.header.number} title={group.header.title} />
          )}
          <div className="border border-black rounded-[14px] bg-white p-3.5 sm:p-4 my-1 flex-1 flex flex-col justify-start shadow-2xs">
            {group.elements.length > 0 ? (
              group.elements
            ) : (
              <div className="text-zinc-400 italic text-xs sm:text-[13px] select-none">
                N/A
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Subcomponente para renderizar Diagnóstico