import React from 'react';
import {
  ContentBlock,
  PaginatedPage,
  PageSectionGroup
} from '../utils/paginate';
import { ManualData, CargoData, CriterioData, CriterioVineta, GlosarioItem, sanitizeCargoTitle } from '../types/processManual';
import { formatInline, stripMarkdown, toTitleCase } from '../utils/markdownUtils';

export function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper para garantizar que la Dirección siempre lleve el prefijo formal "Dirección de "
export function formatDirectionWithPrefix(direction: string): string {
  if (!direction) return 'Dirección de Operaciones';
  const trimmed = direction.trim();
  if (/^direcci[oó]n\s+de\b/i.test(trimmed)) {
    return trimmed;
  }
  return `Dirección de ${trimmed}`;
}

// Banner Oficial Canguro: Cápsula / Píldora redondeada dorada con número a la izquierda + Barra cápsula con título centrado
export function SectionPillBanner({ number, title }: { number?: string; title: string }) {
  let rawNumber = (number || '').replace(/[()\[\]•]/g, '').trim();
  let cleanTitle = (title || '')
    .replace(/\s*\([Cc][Oo][Nn][Tt][Ii][Nn][Uu][Aa][Cc][Ii][OÓ][Nn]\)/gi, '')
    .trim();

  // Si el título viene con el número al inicio (ej. "8. GLOSARIO DE TERMINOS"), separarlo
  const matchNum = cleanTitle.match(/^(\d+)[.\-:\s]+(.*)$/);
  if (matchNum) {
    if (!rawNumber) rawNumber = matchNum[1];
    cleanTitle = matchNum[2].trim();
  } else if (rawNumber) {
    const stripRegex = new RegExp(`^${rawNumber}[.\\-:\\s]+`, 'i');
    cleanTitle = cleanTitle.replace(stripRegex, '').trim();
  }

  // Eliminar cualquier mención de continuación por estándar oficial
  cleanTitle = cleanTitle
    .replace(/\s*\([Cc][Oo][Nn][Tt][Ii][Nn][Uu][Aa][Cc][Ii][OÓ][Nn]\)/gi, '')
    .trim();

  return (
    <div
      contentEditable={false}
      style={{ userSelect: 'none' }}
      className="canguro-section-header flex items-center gap-2 w-full mb-1 shrink-0 select-none"
    >
      {rawNumber ? (
        <div className="canguro-header-number-badge h-[26px] min-w-[34px] px-2 rounded-full bg-[#f59e0b] border-[1.5px] border-black flex items-center justify-center font-bold text-[11px] text-black shrink-0">
          {rawNumber}
        </div>
      ) : null}
      <div className="canguro-header-title-bar h-[26px] flex-1 px-4 rounded-full bg-[#f59e0b] border-[1.5px] border-black flex items-center justify-center font-bold text-[11px] text-black uppercase tracking-wider truncate">
        {cleanTitle}
      </div>
    </div>
  );
}

// Bloque Atómico de Cargo en Organigrama con Interlineado Configurable y Selección Continua
export function CargoBlockView({
  cargo,
  index,
  isEditing = false,
  selectedLineHeight = '1.35',
  onUpdateCargo
}: {
  cargo: CargoData;
  index: number;
  isEditing?: boolean;
  selectedLineHeight?: string;
  onUpdateCargo?: (idx: number, updated: CargoData) => void;
}) {
  if (!cargo) return null;
  const safeCargoTitle = sanitizeCargoTitle(cargo.titulo || '');
  const responsabilidades = Array.isArray(cargo.responsabilidades) ? cargo.responsabilidades : [];

  const handleTitleBlur = (e: React.FocusEvent<HTMLSpanElement>) => {
    if (!onUpdateCargo) return;
    const cleanTitle = e.currentTarget.textContent?.trim() || cargo.titulo;
    onUpdateCargo(index, { ...cargo, titulo: cleanTitle });
  };

  const handleObjetivoBlur = (e: React.FocusEvent<HTMLSpanElement>) => {
    if (!onUpdateCargo) return;
    const cleanObj = e.currentTarget.textContent?.trim() || '';
    onUpdateCargo(index, { ...cargo, objetivoCargo: cleanObj });
  };

  const handleRespBlur = (rIdx: number, text: string) => {
    if (!onUpdateCargo) return;
    const clean = text.trim();
    const updated = [...responsabilidades];
    if (clean) {
      updated[rIdx] = clean;
    } else {
      updated.splice(rIdx, 1);
    }
    onUpdateCargo(index, { ...cargo, responsabilidades: updated });
  };

  return (
    <div
      className="cargo-block text-black text-[11px] mb-1.5 last:mb-0"
      style={{ lineHeight: selectedLineHeight }}
    >
      <div className="p-1 rounded">
        <div className="font-bold text-black mb-0.5 text-[11.5px]">
          <span>{cargo.nivel ? `${cargo.nivel}. ` : ''}</span>
          {isEditing ? (
            <span
              contentEditable={true}
              suppressContentEditableWarning
              onBlur={handleTitleBlur}
              className="outline-dashed outline-1 outline-amber-400 px-1 bg-amber-50/40 cursor-text rounded transition"
            >
              {safeCargoTitle}
            </span>
          ) : (
            <span dangerouslySetInnerHTML={{ __html: formatInline(safeCargoTitle) }} />
          )}
        </div>
        <div className="text-black mb-0.5" style={{ lineHeight: selectedLineHeight }}>
          <span className="font-bold">Objetivo del Cargo: </span>
          {isEditing ? (
            <span
              contentEditable={true}
              suppressContentEditableWarning
              onBlur={handleObjetivoBlur}
              className="outline-dashed outline-1 outline-amber-400 px-1 bg-amber-50/30 cursor-text rounded transition"
            >
              {cargo.objetivoCargo || ''}
            </span>
          ) : (
            <span dangerouslySetInnerHTML={{ __html: formatInline(cargo.objetivoCargo || '') }} />
          )}
        </div>
        <div className="font-bold text-black mb-0.5">
          Responsabilidades:
        </div>
        <ul className="list-disc pl-5 text-black flex flex-col gap-0.5" style={{ lineHeight: selectedLineHeight }}>
          {responsabilidades.map((resp, rIdx) => (
            <li key={rIdx}>
              {isEditing ? (
                <span
                  contentEditable={true}
                  suppressContentEditableWarning
                  onBlur={(e) => handleRespBlur(rIdx, e.currentTarget.textContent || '')}
                  className="outline-dashed outline-1 outline-amber-400 px-1 bg-amber-50/30 cursor-text rounded transition"
                >
                  {resp}
                </span>
              ) : (
                <span dangerouslySetInnerHTML={{ __html: formatInline(resp) }} />
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Función de recuperación para extraer viñetas estructuradas con negrita si el texto fue aplastado
export function parseEmbeddedVinetas(raw: string): CriterioVineta[] | null {
  if (!raw || typeof raw !== 'string') return null;

  // Caso 1: Texto con viñetas explícitas (•, -, *)
  if (/(?:^|\n)\s*[•\-\*]/.test(raw)) {
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
    const bullets = lines.filter((l) => /^[•\-\*]/.test(l));
    if (bullets.length > 0) {
      return bullets
        .map((b) => {
          const clean = b.replace(/^[•\-\*]\s*/, '').trim();
          const colon = clean.indexOf(':');
          if (colon > 0 && colon < 60) {
            return {
              etiqueta: clean.substring(0, colon).replace(/\*\*/g, '').trim(),
              detalle: clean.substring(colon + 1).replace(/\*\*/g, '').trim()
            };
          }
          return { detalle: clean.replace(/\*\*/g, '').trim() };
        })
        .filter((v) => Boolean(v.detalle));
    }
  }

  // Caso 2: Párrafo aplastado con etiquetas en mayúscula y dos puntos (ej: "Planificación: ... Lapsos Operativos: ...")
  const regex = /(?:^|\. |\n)([A-ZÁÉÍÓÚ][A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s]{2,45}):\s*/g;
  const matches: Array<{ index: number; matchLength: number; tag: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    matches.push({ index: m.index, matchLength: m[0].length, tag: m[1].trim() });
  }

  if (matches.length > 0) {
    const vinetas: CriterioVineta[] = [];
    for (let i = 0; i < matches.length; i++) {
      const cur = matches[i];
      const startIndex = cur.index + cur.matchLength;
      const nextIndex = i + 1 < matches.length ? matches[i + 1].index : raw.length;
      let d = raw.substring(startIndex, nextIndex).trim();

      // Limpiar etiquetas repetidas por concatenación (ej: "Lapsos Operativos: Lapsos Operativos: Del día 1...")
      const repRegex = new RegExp('^' + cur.tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':?\\s*', 'i');
      d = d.replace(repRegex, '').trim();

      if (!d.endsWith('.') && i === matches.length - 1 && raw.endsWith('.')) {
        d += '.';
      }
      if (d || cur.tag) {
        vinetas.push({ etiqueta: cur.tag, detalle: d });
      }
    }
    if (vinetas.length > 0) {
      return vinetas;
    }
  }

  return null;
}

// Bloque Atómico de Criterio Técnico con Edición Modular e Inmunidad a Aplastamiento
export function CriterioBlockView({
  crit,
  index,
  isEditing = false,
  selectedLineHeight = '1.35',
  onUpdateCriterio
}: {
  crit: CriterioData;
  index: number;
  isEditing?: boolean;
  selectedLineHeight?: string;
  onUpdateCriterio?: (idx: number, updated: CriterioData) => void;
}) {
  if (!crit) return null;

  const safeStr = (s: any): string => (typeof s === 'string' ? s.trim() : '');

  // 1. Normalizar viñetas existentes o recuperar automáticamente viñetas aplastadas en crit.texto
  let validVinetas: CriterioVineta[] = [];

  if (Array.isArray(crit?.vinetas) && crit.vinetas.length > 0) {
    validVinetas = crit.vinetas
      .map((v: any) => {
        if (!v) return null;
        if (typeof v === 'string') {
          const clean = v.replace(/^[•\-\*]\s*/, '').trim();
          const colon = clean.indexOf(':');
          if (colon > 0 && colon < 60) {
            const rawEt = clean.substring(0, colon).replace(/\*\*/g, '').trim();
            const rawDet = clean.substring(colon + 1).replace(/\*\*/g, '').trim();
            return {
              etiqueta: rawEt.toLowerCase() === 'etiqueta' ? undefined : rawEt,
              detalle: rawDet
            };
          }
          return { detalle: clean.replace(/\*\*/g, '').trim() };
        }
        let d = safeStr(v.detalle || v.text || v.descripcion || '');
        let et = v.etiqueta ? safeStr(v.etiqueta).replace(/\*\*/g, '').replace(/:$/, '').trim() : undefined;

        // Si la etiqueta es literalmente "Etiqueta" o "Nuevo Parámetro", descartarla
        if (et && (et.toLowerCase() === 'etiqueta' || et.toLowerCase() === 'nuevo parámetro')) {
          et = undefined;
        }

        // Si no tiene etiqueta pero el detalle contiene "Etiqueta: Detalle"
        if (!et && d) {
          const colon = d.indexOf(':');
          if (colon > 0 && colon < 60) {
            const candidateTag = d.substring(0, colon).replace(/\*\*/g, '').trim();
            if (candidateTag.toLowerCase() !== 'etiqueta') {
              et = candidateTag;
              d = d.substring(colon + 1).replace(/\*\*/g, '').trim();
            }
          }
        }

        // Limpiar duplicado de la etiqueta en el detalle
        if (et && d) {
          const repRegex = new RegExp('^' + et.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':?\\s*', 'i');
          d = d.replace(repRegex, '').trim();
        }

        if (!d && !et) return null;
        return {
          etiqueta: et,
          detalle: d
        };
      })
      .filter((v): v is CriterioVineta => Boolean(v && (v.detalle || v.etiqueta)));
  }

  // Si no tenía viñetas pero crit.texto contiene viñetas aplastadas, recuperarlas automáticamente
  if (validVinetas.length === 0 && crit?.texto) {
    const embedded = parseEmbeddedVinetas(safeStr(crit.texto));
    if (embedded && embedded.length > 0) {
      validVinetas = embedded;
    }
  }

  const hasVinetas = validVinetas.length > 0;
  const rawTexto = safeStr(crit?.texto);
  const textHasBullets = Boolean(rawTexto && /(?:^|\n)\s*[•\-\*]/.test(rawTexto));

  // Comprobar si el texto introductorio es solo duplicado de las viñetas
  const isDuplicateOfVinetas = hasVinetas && Boolean(
    rawTexto &&
    validVinetas.some((v) => {
      const vDetalle = safeStr(v.detalle).toLowerCase();
      const vEtiqueta = safeStr(v.etiqueta).toLowerCase();
      const tNorm = rawTexto.toLowerCase();
      return (
        (vDetalle && tNorm.includes(vDetalle.slice(0, 20))) ||
        (vEtiqueta && tNorm.includes(vEtiqueta)) ||
        (vDetalle && vDetalle.includes(tNorm.slice(0, 20)))
      );
    })
  );

  const showIntroTexto = Boolean(rawTexto && !textHasBullets && !isDuplicateOfVinetas);

  // Manejador de actualización de título
  const handleTitleBlur = (e: React.FocusEvent<HTMLSpanElement>) => {
    if (!onUpdateCriterio) return;
    const newTitle = e.currentTarget.textContent?.trim().replace(/:$/, '') || crit.titulo || 'Criterio Técnico';
    if (newTitle !== crit.titulo) {
      onUpdateCriterio(index, {
        ...crit,
        titulo: newTitle
      });
    }
  };

  // Manejador de actualización de texto introductorio
  const handleIntroBlur = (e: React.FocusEvent<HTMLParagraphElement>) => {
    if (!onUpdateCriterio) return;
    const newText = e.currentTarget.textContent?.trim();
    onUpdateCriterio(index, {
      ...crit,
      texto: newText || undefined
    });
  };

  // Manejador unificado y seguro de actualización de viñeta completa
  const handleVinetaFullTextBlur = (vIdx: number, newFullText: string) => {
    if (!onUpdateCriterio) return;
    const clean = safeStr(newFullText);
    const updated = [...validVinetas];
    if (updated[vIdx]) {
      if (!clean) {
        // Al vaciar el texto de la viñeta, se elimina naturalmente
        const filtered = updated.filter((_, idx) => idx !== vIdx);
        onUpdateCriterio(index, {
          ...crit,
          vinetas: filtered.length > 0 ? filtered : undefined,
          texto: filtered.length === 0 ? (crit.texto || undefined) : (isDuplicateOfVinetas ? undefined : crit.texto)
        });
        return;
      }

      // Separar etiqueta en negrita si contiene dos puntos
      const colon = clean.indexOf(':');
      let et: string | undefined = undefined;
      let det = clean;
      if (colon > 0 && colon < 60) {
        const possibleEt = clean.substring(0, colon).replace(/\*\*/g, '').trim();
        if (possibleEt.toLowerCase() !== 'etiqueta') {
          et = possibleEt;
          det = clean.substring(colon + 1).replace(/\*\*/g, '').trim();
        }
      }

      updated[vIdx] = {
        etiqueta: et,
        detalle: det
      };
      onUpdateCriterio(index, {
        ...crit,
        vinetas: updated,
        texto: isDuplicateOfVinetas ? undefined : crit.texto
      });
    }
  };

  // Agregar una nueva viñeta limpia sin etiquetas ficticias
  const handleAddVineta = () => {
    if (!onUpdateCriterio) return;
    const updated = [
      ...validVinetas,
      {
        detalle: 'Nueva directriz operativa o técnica correspondiente.'
      }
    ];
    onUpdateCriterio(index, {
      ...crit,
      vinetas: updated,
      texto: isDuplicateOfVinetas ? undefined : crit.texto
    });
  };

  const numeroText = crit.numero ? `${crit.numero}. ` : '';
  const tituloText = crit.titulo || 'Criterio Técnico';

  return (
    <div className="my-1.5 text-black text-[11px]" style={{ lineHeight: selectedLineHeight }}>
      {/* Encabezado del Criterio: Número + Título */}
      <div className="font-bold text-black mb-1 text-[11.5px] flex items-center gap-1">
        <span className="select-none">{numeroText}</span>
        <span
          contentEditable={isEditing}
          suppressContentEditableWarning
          onBlur={handleTitleBlur}
          className={`outline-none transition rounded ${
            isEditing
              ? 'outline-dashed outline-1 outline-amber-400 px-1 bg-amber-50/50 hover:bg-amber-100/60 cursor-text'
              : ''
          }`}
          title={isEditing ? 'Haz clic para editar el título del criterio' : undefined}
        >
          {tituloText}
        </span>
        <span className="select-none">:</span>
      </div>

      {/* Párrafo introductorio si existe */}
      {showIntroTexto && (
        isEditing ? (
          <p
            contentEditable={true}
            suppressContentEditableWarning
            onBlur={handleIntroBlur}
            style={{ lineHeight: selectedLineHeight }}
            className="text-justify mb-1.5 outline-none rounded transition outline-dashed outline-1 outline-amber-400 px-1 bg-amber-50/30 hover:bg-amber-50/60 cursor-text"
          >
            {rawTexto}
          </p>
        ) : (
          <p
            style={{ lineHeight: selectedLineHeight }}
            className="text-justify mb-1.5 outline-none rounded"
            dangerouslySetInnerHTML={{ __html: formatInline(rawTexto) }}
          />
        )
      )}

      {/* Viñetas estructuradas: Cada una aislada para edición natural sin 'x' ni colisiones de DOM */}
      {hasVinetas ? (
        <ul className="list-disc pl-5 my-1 flex flex-col gap-1 text-black" style={{ lineHeight: selectedLineHeight }}>
          {validVinetas.map((v, vIdx) => {
            if (!v) return null;
            const cleanTag = (v.etiqueta || '').replace(/\*\*/g, '').trim();
            return (
              <li key={`vineta-${index}-${vIdx}`} className="text-justify">
                {isEditing ? (
                  <div
                    contentEditable={true}
                    suppressContentEditableWarning
                    onBlur={(e) => handleVinetaFullTextBlur(vIdx, e.currentTarget.textContent || '')}
                    className="outline-dashed outline-1 outline-amber-400 px-1 rounded bg-amber-50/30 hover:bg-amber-100/40 cursor-text inline-block w-full"
                    title="Edita el texto o la etiqueta en negrita con dos puntos (ej: Parámetro: Descripción)"
                    dangerouslySetInnerHTML={{
                      __html: cleanTag
                        ? `<b>${escapeHtml(cleanTag)}:</b> ${escapeHtml(v.detalle)}`
                        : escapeHtml(v.detalle)
                    }}
                  />
                ) : (
                  <div>
                    {cleanTag && (
                      <span className="font-bold select-text mr-1">
                        {cleanTag}:
                      </span>
                    )}
                    <span
                      className="select-text"
                      dangerouslySetInnerHTML={{ __html: formatInline(v.detalle) }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        /* Si no tiene viñetas, renderizar el texto normativo continuo */
        rawTexto && (
          isEditing ? (
            <p
              contentEditable={true}
              suppressContentEditableWarning
              onBlur={handleIntroBlur}
              style={{ lineHeight: selectedLineHeight }}
              className="text-justify mb-1.5 outline-none rounded transition outline-dashed outline-1 outline-amber-400 px-1 bg-amber-50/30 hover:bg-amber-50/60 cursor-text"
            >
              {rawTexto}
            </p>
          ) : (
            <p
              style={{ lineHeight: selectedLineHeight }}
              className="text-justify mb-1.5 outline-none rounded"
              dangerouslySetInnerHTML={{ __html: formatInline(rawTexto) }}
            />
          )
        )
      )}

      {/* Botón para agregar nueva viñeta al criterio cuando se está en modo edición */}
      {isEditing && (
        <div className="no-print mt-1.5 flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddVineta}
            className="text-[10.5px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded px-2 py-0.5 flex items-center gap-1 transition cursor-pointer shadow-2xs"
            title="Agregar nueva viñeta a este criterio"
          >
            <span className="font-black text-xs">+</span>
            <span>Agregar Viñeta</span>
          </button>
        </div>
      )}
    </div>
  );
}

// Renderizador Universal de Bloque Atómico Individual
export function RenderBlockView({
  block,
  isEditing = false,
  selectedLineHeight = '1.35',
  continuationLabel,
  onUpdateCargo,
  onUpdateCriterio,
  onUpdateGlosario,
  onUpdateContinuationLabel
}: {
  block: ContentBlock;
  isEditing?: boolean;
  selectedLineHeight?: string;
  continuationLabel?: string;
  onUpdateCargo?: (idx: number, updated: CargoData) => void;
  onUpdateCriterio?: (idx: number, updated: CriterioData) => void;
  onUpdateGlosario?: (idx: number, updated: GlosarioItem) => void;
  onUpdateContinuationLabel?: (label: string) => void;
}) {
  switch (block.type) {
    case 'glosario_item': {
      const item = block.glosarioItem!;
      const idx = parseInt(block.id.replace('glosario-', ''), 10) || 0;
      const cleanTerm = (item.termino || '').replace(/\*\*/g, '').trim();
      return (
        <div className="my-1 text-black text-[11.5px]" style={{ lineHeight: selectedLineHeight }}>
          <div
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={(e) => {
              if (!onUpdateGlosario) return;
              const text = e.currentTarget.innerText.trim();
              const m = text.match(/^(?:•\s*)?([^:]+):\s*(.*)$/);
              if (m) {
                onUpdateGlosario(idx, { termino: m[1].trim(), definicion: m[2].trim() });
              }
            }}
            className={`p-1 rounded outline-none transition ${isEditing ? 'editable-block hover:bg-amber-50/40' : ''}`}
          >
            <span className="font-bold select-none">• </span>
            <span className="font-bold">{cleanTerm}: </span>
            {isEditing ? (
              <span>{item.definicion}</span>
            ) : (
              <span dangerouslySetInnerHTML={{ __html: formatInline(item.definicion) }} />
            )}
          </div>
        </div>
      );
    }

    case 'normas_dueno': {
      if (!block.normasDueno) return null;
      const dueno = block.normasDueno;
      const formattedDirection = formatDirectionWithPrefix(dueno.direction);
      const cleanProcess = dueno.processName
        ? toTitleCase(dueno.processName.trim())
        : toTitleCase(dueno.owner.replace(/^gerencia\s+de\s+/i, '').trim());
      const gerenteTitle = `Gerente de ${cleanProcess}`;
      return (
        <div
          style={{ lineHeight: selectedLineHeight }}
          className="my-2 text-black text-[11.5px] p-1 rounded"
        >
          <h3 className="font-black text-black border-b border-black/30 pb-0.5 mb-1.5 uppercase text-[11.5px]">
            1. DUEÑO DEL PROCESO Y GOBERNANZA DOCUMENTAL
          </h3>
          <p className="mb-1.5 text-justify" style={{ lineHeight: selectedLineHeight }}>
            Para la presente documentación, queda definida formalmente como Dueño del Proceso la{' '}
            <strong>{dueno.owner}</strong>, adscrita a la <strong>{formattedDirection}</strong> bajo la responsabilidad directa del <strong>{gerenteTitle}</strong>.
          </p>
          <div className="mt-1" style={{ lineHeight: selectedLineHeight }}>
            <span className="font-bold">1.1. Obligatoriedad de Actualización:</span> La actualización de este manual será de carácter obligatorio e inmediato ante los siguientes eventos:
            <ul className="list-disc pl-5 mt-1 flex flex-col gap-1" style={{ lineHeight: selectedLineHeight }}>
              {(Array.isArray(dueno.updates) ? dueno.updates : []).map((u, uIdx) => (
                <li key={uIdx}>{u}</li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    case 'normas_seguridad': {
      if (!block.normasSeguridad) return null;
      const seg = block.normasSeguridad;
      return (
        <div
          style={{ lineHeight: selectedLineHeight }}
          className="my-2 text-black text-[11.5px] p-1 rounded"
        >
          <h3 className="font-black text-black border-b border-black/30 pb-0.5 mb-1.5 uppercase text-[11.5px]">
            2. SEGURIDAD DE LA INFORMACIÓN, CONFIDENCIALIDAD Y USO DE HERRAMIENTAS
          </h3>
          <p className="mb-1 text-justify" style={{ lineHeight: selectedLineHeight }}>
            <span className="font-bold">2.1. Confidencialidad:</span> {seg.confidentiality}
          </p>
          <p className="mb-1 text-justify" style={{ lineHeight: selectedLineHeight }}>
            <span className="font-bold">2.2. Custodia de Accesos:</span> {seg.access}
          </p>
          <div className="mt-1" style={{ lineHeight: selectedLineHeight }}>
            <span className="font-bold">2.3. Canales Oficiales de Transmisión:</span>
            <ul className="list-disc pl-5 mt-1 flex flex-col gap-1" style={{ lineHeight: selectedLineHeight }}>
              {(Array.isArray(seg.channels) ? seg.channels : []).map((ch, cIdx) => (
                <li key={cIdx}>{ch}</li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    case 'normas_estructura_intro': {
      if (!block.normasEstructuraIntro) return null;
      const intro = block.normasEstructuraIntro;
      const formattedDirection = formatDirectionWithPrefix(intro.direction);
      return (
        <div
          style={{ lineHeight: selectedLineHeight }}
          className="my-1 text-black text-[11px] p-1 rounded"
        >
          <h3 className="font-black text-black border-b border-black/30 pb-0.5 mb-1.5 uppercase text-[11.5px]">
            3. ESTRUCTURA ORGANIZACIONAL
          </h3>
          <p className="mb-2 text-justify" style={{ lineHeight: selectedLineHeight }}>
            En estricto apego al Organigrama Corporativo de la <strong>{formattedDirection}</strong> y las descripciones de cargo aprobadas, la estructura de la <strong>{intro.owner}</strong> se conforma de la siguiente manera:
          </p>
        </div>
      );
    }

    case 'normas_estructura_continuation': {
      const activeCont = continuationLabel !== undefined ? continuationLabel : (block.continuationLabel || '');
      const suffix = activeCont && activeCont.trim() ? ` ${activeCont.trim()}` : '';
      return (
        <div
          style={{ lineHeight: selectedLineHeight }}
          className="my-1 text-black text-[11px]"
        >
          <h3
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={(e) => {
              if (onUpdateContinuationLabel) {
                const text = e.currentTarget.textContent || '';
                const match = text.match(/3\.\s*ESTRUCTURA\s*ORGANIZACIONAL\s*(.*)/i);
                if (match && match[1] !== undefined) {
                  onUpdateContinuationLabel(match[1].trim());
                } else {
                  onUpdateContinuationLabel(text.trim());
                }
              }
            }}
            className={`font-black text-black border-b border-black/30 pb-0.5 mb-1.5 uppercase text-[11.5px] tracking-wide transition ${
              isEditing ? 'outline-dashed outline-1 outline-amber-500 rounded px-1 cursor-text bg-amber-50/40' : ''
            }`}
            title={isEditing ? 'Haz clic para modificar el texto de continuación' : undefined}
          >
            3. ESTRUCTURA ORGANIZACIONAL{suffix}
          </h3>
        </div>
      );
    }

    case 'cargo': {
      if (!block.cargo) return null;
      const cargo = block.cargo;
      const idx = parseInt((block.id || '').replace('cargo-', ''), 10) || 0;
      return (
        <CargoBlockView
          cargo={cargo}
          index={idx}
          isEditing={isEditing}
          selectedLineHeight={selectedLineHeight}
          onUpdateCargo={onUpdateCargo}
        />
      );
    }

    case 'criterio': {
      if (!block.criterio) return null;
      const crit = block.criterio;
      const idx = parseInt((block.id || '').replace('criterio-', ''), 10) || 0;
      return (
        <CriterioBlockView
          crit={crit}
          index={idx}
          isEditing={isEditing}
          selectedLineHeight={selectedLineHeight}
          onUpdateCriterio={onUpdateCriterio}
        />
      );
    }


    default:
      return null;
  }
}

// Cuadro Único Unificado Oficial de Glosario de Términos (Sección 9)
export function UnifiedGlosarioBox({
  items,
  isEditing = false,
  selectedLineHeight = '1.35',
  onUpdateAllGlosario
}: {
  items: GlosarioItem[];
  isEditing?: boolean;
  selectedLineHeight?: string;
  onUpdateAllGlosario?: (updated: GlosarioItem[]) => void;
}) {
  const editorRef = React.useRef<HTMLDivElement | null>(null);

  // Formatear items a texto continuo con viñetas
  const formatItemsToText = (glosario: GlosarioItem[]): string => {
    return glosario
      .map((item) => `• ${item.termino}: ${item.definicion}`)
      .join('\n');
  };

  // Convertir texto editado a GlosarioItem[]
  const parseTextToItems = (text: string): GlosarioItem[] => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const result: GlosarioItem[] = [];

    lines.forEach((line) => {
      const clean = line.replace(/^[•\-\*]\s*/, '').trim();
      if (!clean) return;
      const colonIdx = clean.indexOf(':');
      if (colonIdx !== -1) {
        result.push({
          termino: clean.substring(0, colonIdx).replace(/\*\*/g, '').trim(),
          definicion: clean.substring(colonIdx + 1).replace(/\*\*/g, '').trim()
        });
      } else {
        result.push({
          termino: clean.replace(/\*\*/g, '').trim(),
          definicion: ''
        });
      }
    });

    return result;
  };

  // Sincronizar el contenido editable al montar o si cambian los items desde afuera
  React.useEffect(() => {
    if (editorRef.current && isEditing) {
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerText = formatItemsToText(items);
      }
    }
  }, [items, isEditing]);

  const handleBlur = () => {
    if (!onUpdateAllGlosario || !editorRef.current) return;
    const text = editorRef.current.innerText || '';
    const parsed = parseTextToItems(text);
    if (parsed.length > 0) {
      onUpdateAllGlosario(parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Insertar salto de línea con viñeta continua •
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
  };

  const handleAddTerm = () => {
    const updated = [
      ...items,
      {
        termino: 'Nuevo Término',
        definicion: 'Descripción técnica y operativa del concepto dentro del proceso.'
      }
    ];
    if (onUpdateAllGlosario) {
      onUpdateAllGlosario(updated);
    }
  };

  return (
    <div className="border border-black rounded-[14px] bg-white p-3.5 my-0.5 flex-1 flex flex-col justify-start shadow-2xs overflow-hidden">
      {isEditing && (
        <div className="no-print flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-200 shrink-0">
          <span className="text-[11px] font-bold text-zinc-600">
            Cuadro Único de Glosario (Enter para nueva viñeta, reordena cortando y pegando líneas):
          </span>
          <button
            type="button"
            onClick={handleAddTerm}
            className="text-[11px] font-bold bg-[#fed700] hover:bg-yellow-400 text-black px-2.5 py-0.5 rounded border border-black transition cursor-pointer flex items-center gap-1 shadow-2xs"
            title="Agregar nuevo término al glosario"
          >
            <span className="font-black text-xs">+</span>
            <span>Agregar Término</span>
          </button>
        </div>
      )}

      {isEditing ? (
        <div
          ref={editorRef}
          contentEditable={true}
          suppressContentEditableWarning
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          style={{ lineHeight: selectedLineHeight }}
          className="glosario-unified-box flex-1 w-full min-h-[460px] outline-none p-2 rounded text-black text-[11px] sm:text-[11.5px] font-sans border border-amber-300/80 bg-amber-50/20 hover:bg-amber-50/40 transition whitespace-pre-wrap leading-relaxed cursor-text overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: escapeHtml(formatItemsToText(items)) }}
        />
      ) : (
        <div
          className="space-y-0.5 text-black text-[11px] sm:text-[11.5px] overflow-hidden"
          style={{ lineHeight: selectedLineHeight }}
        >
          {items.map((item, idx) => (
            <div key={`glosario-item-${idx}`} className="flex items-start gap-1.5 text-justify my-0.5">
              <span className="font-bold select-none">•</span>
              <p className="flex-1 m-0">
                <span className="font-bold">{item.termino}: </span>
                <span>{item.definicion}</span>
              </p>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-zinc-400 italic text-[11px] p-2">
              No hay términos registrados en el glosario.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Renderizador de Secciones Agrupadas dentro de una Hoja de Contenido
export function PaginatedContentSections({
  sections = [],
  isEditing = false,
  selectedLineHeight = '1.35',
  processName = '',
  continuationLabel,
  onUpdateCargo,
  onUpdateCriterio,
  onUpdateGlosario,
  onUpdateAllGlosario,
  onUpdateContinuationLabel
}: {
  sections: PageSectionGroup[];
  isEditing?: boolean;
  selectedLineHeight?: string;
  processName?: string;
  continuationLabel?: string;
  onUpdateCargo?: (idx: number, updated: CargoData) => void;
  onUpdateCriterio?: (idx: number, updated: CriterioData) => void;
  onUpdateGlosario?: (idx: number, updated: GlosarioItem) => void;
  onUpdateAllGlosario?: (items: GlosarioItem[]) => void;
  onUpdateContinuationLabel?: (label: string) => void;
}) {
  if (!Array.isArray(sections) || sections.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col justify-start h-full overflow-hidden">
      {sections.map((secGroup, sIdx) => {
        if (!secGroup || !Array.isArray(secGroup.blocks)) return null;
        const isGlosarioSection =
          /glosario/i.test(secGroup.sectionTitle || '') || secGroup.blocks.some((b) => b?.type === 'glosario_item');

        if (isGlosarioSection) {
          const glosarioItems = secGroup.blocks
            .map((b) => b?.glosarioItem)
            .filter((g): g is GlosarioItem => Boolean(g));

          return (
            <div
              key={`section-group-${sIdx}`}
              className="flex-1 flex flex-col mb-1.5 last:mb-0 h-full overflow-hidden"
            >
              <SectionPillBanner number={secGroup.sectionNumber || '8'} title={secGroup.sectionTitle || 'GLOSARIO DE TERMINOS'} />
              <UnifiedGlosarioBox
                items={glosarioItems}
                isEditing={isEditing}
                selectedLineHeight={selectedLineHeight}
                onUpdateAllGlosario={onUpdateAllGlosario}
              />
            </div>
          );
        }

        return (
          <div
            key={`section-group-${sIdx}`}
            className="flex-1 flex flex-col mb-1.5 last:mb-0 h-full overflow-hidden"
          >
            {/* Encabezado Oficial Visio de Sección (Óvalo número + Barra amarilla) */}
            <SectionPillBanner number={secGroup.sectionNumber || '9'} title={secGroup.sectionTitle || 'NORMAS DEL PROCESO'} />

            {/* Caja Blanca Redondeada Oficial Visio (r=14px, borde negro fino) */}
            <div className="border border-black rounded-[14px] bg-white p-3.5 my-0.5 flex-1 flex flex-col justify-start shadow-2xs overflow-hidden">
              {secGroup.blocks.map((block, bIdx) => {
                if (!block) return null;
                const isFirstCriterioOnThisPage =
                  block.type === 'criterio' &&
                  bIdx === secGroup.blocks.findIndex((b) => b && b.type === 'criterio');
                const isRoot41Criterio =
                  block.type === 'criterio' &&
                  (block.id === 'criterio-0' || block.criterio?.numero === '4.1');

                const critContText = continuationLabel !== undefined ? continuationLabel.trim() : '';
                const critSuffix = !isRoot41Criterio && critContText ? ` ${critContText}` : '';

                return (
                  <React.Fragment key={block.id || `block-${bIdx}`}>
                    {/* El título rector de Sección 4 se vincula con 4.1 o con la continuación de página */}
                    {isFirstCriterioOnThisPage && (
                      <h3
                        contentEditable={isEditing && !isRoot41Criterio}
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          if (onUpdateContinuationLabel && !isRoot41Criterio) {
                            const text = e.currentTarget.textContent || '';
                            const prefix = `4. CRITERIOS TÉCNICOS DEL PROCESO DE ${(processName || 'OPERACIONES').toUpperCase()}`;
                            if (text.toUpperCase().includes(prefix.toUpperCase())) {
                              const extra = text.slice(text.toUpperCase().indexOf(prefix.toUpperCase()) + prefix.length).trim();
                              onUpdateContinuationLabel(extra);
                            } else {
                              onUpdateContinuationLabel(text.trim());
                            }
                          }
                        }}
                        className={`font-black text-black border-b border-black/30 pb-0.5 mb-1.5 uppercase text-[11.5px] transition ${
                          isEditing && !isRoot41Criterio ? 'outline-dashed outline-1 outline-amber-500 rounded px-1 cursor-text bg-amber-50/40' : ''
                        }`}
                        title={isEditing && !isRoot41Criterio ? 'Haz clic para modificar el texto de continuación' : undefined}
                      >
                        4. CRITERIOS TÉCNICOS DEL PROCESO DE {(processName || 'OPERACIONES').toUpperCase()}
                        {critSuffix}
                      </h3>
                    )}

                    <RenderBlockView
                      block={block}
                      isEditing={isEditing}
                      selectedLineHeight={selectedLineHeight}
                      continuationLabel={continuationLabel}
                      onUpdateCargo={onUpdateCargo}
                      onUpdateCriterio={onUpdateCriterio}
                      onUpdateGlosario={onUpdateGlosario}
                      onUpdateContinuationLabel={onUpdateContinuationLabel}
                    />
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
