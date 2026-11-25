import React, { useLayoutEffect, useState, useMemo } from 'react';
import { ManualData, CargoData, CriterioData, GlosarioItem, ProcessMetadata, IntermediatePage, sanitizeCargoTitle } from '../types/processManual';
import { formatDirectionWithPrefix, parseEmbeddedVinetas } from '../components/ManualPageRenderer';

// ============================================================================
// CONSTANTES DE GEOMETRÍA Y ALTURA VISIO A4 HORIZONTAL (1122 x 794 px)
// ============================================================================
export const PAGE_WIDTH_PX = 1122;
export const PAGE_HEIGHT_PX = 794;
export const HEADER_HEIGHT_PX = 74;
export const FOOTER_HEIGHT_PX = 82;
export const PAGE_PADDING_V_PX = 36; // 18px top + 18px bottom
export const SECTION_BANNER_HEIGHT_PX = 34; // Píldora amarilla + márgenes
export const BOX_PADDING_V_PX = 24; // Padding vertical de la caja blanca redondeada

// Altura central de contenido útil neta (586px exactos según el presupuesto innegociable)
export const PAGE_USABLE_HEIGHT_PX = 586;

// ============================================================================
// DEFINICIÓN DE BLOQUES ATÓMICOS DE CONTENIDO
// ============================================================================
import { toTitleCase } from './markdownUtils';

export type ContentBlockType =
  | 'glosario_item'
  | 'normas_dueno'
  | 'normas_seguridad'
  | 'normas_estructura_intro'
  | 'normas_estructura_continuation'
  | 'cargo'
  | 'criterio';

export interface ContentBlock {
  id: string;
  sectionNumber: '8' | '9' | '10' | string;
  sectionTitle: string;
  type: ContentBlockType;
  // Datos del bloque
  glosarioItem?: GlosarioItem;
  cargo?: CargoData;
  criterio?: CriterioData;
  normasDueno?: {
    owner: string;
    direction: string;
    processName?: string;
    updates: string[];
  };
  normasSeguridad?: {
    processName: string;
    confidentiality: string;
    access: string;
    channels: string[];
  };
  normasEstructuraIntro?: {
    direction: string;
    owner: string;
  };
  continuationLabel?: string;
  // Estimación previa de altura para renderizado inicial antes de medición DOM
  estimatedHeight: number;
}

export interface PageSectionGroup {
  sectionNumber: string;
  sectionTitle: string;
  blocks: ContentBlock[];
}

export interface PaginatedPage {
  pageNumber: number;
  totalPages: number;
  type: 'portada' | 'herramientas_derogados' | 'content' | 'intermediate';
  pageKey: string;
  sections?: PageSectionGroup[];
  heightOccupied?: number;
  occupancyPercent?: number;
  intermediateData?: IntermediatePage;
}

// ============================================================================
// CONSTRUCCIÓN DE LA SECUENCIA DE BLOQUES ATÓMICOS
// ============================================================================
export function buildContentBlocks(
  manualData: ManualData,
  meta: ProcessMetadata,
  selectedLineHeight: number = 1.3
): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const lineFactor = selectedLineHeight / 1.3;

  // 1. SECCIÓN 8: GLOSARIO DE TÉRMINOS
  if (Array.isArray(manualData.glosario) && manualData.glosario.length > 0) {
    manualData.glosario.forEach((item, idx) => {
      const linesEst = Math.max(1, Math.ceil((item.termino.length + item.definicion.length) / 110));
      const estH = Math.round((linesEst * 16 + 8) * lineFactor);
      blocks.push({
        id: `glosario-${idx}`,
        sectionNumber: '8',
        sectionTitle: 'GLOSARIO DE TERMINOS',
        type: 'glosario_item',
        glosarioItem: item,
        estimatedHeight: estH
      });
    });
  }

  // 2. SECCIÓN 9: NORMAS DEL PROCESO
  const owner = meta.owner || manualData.cargos?.[1]?.titulo || 'Gerencia Responsable';
  const direction = meta.direction || 'Dirección de Operaciones';
  const formattedDirection = formatDirectionWithPrefix(direction);

  // 2.1. Dueño del Proceso y Gobernanza Documental (Atómico)
  blocks.push({
    id: 'normas-dueno',
    sectionNumber: '9',
    sectionTitle: 'NORMAS DEL PROCESO',
    type: 'normas_dueno',
    normasDueno: {
      owner,
      direction: formattedDirection,
      processName: meta.processName,
      updates: [
        `Cambios en la estructura organizacional de la ${formattedDirection} o en las descripciones de cargo asociadas.`,
        'Reestructuración de los flujos operativos y metodologías de trabajo.',
        'Modificaciones en las reglas de parametrización del ERP Odoo.',
        'Incorporación de nuevas herramientas tecnológicas autorizadas o cambios en políticas de auditoría.'
      ]
    },
    estimatedHeight: Math.round(135 * lineFactor)
  });

  // 2.2. Seguridad de la Información, Confidencialidad y Canales (Atómico)
  blocks.push({
    id: 'normas-seguridad',
    sectionNumber: '9',
    sectionTitle: 'NORMAS DEL PROCESO',
    type: 'normas_seguridad',
    normasSeguridad: {
      processName: meta.processName,
      confidentiality: `Toda la información manejada en el proceso de ${meta.processName} tiene carácter ESTRICTAMENTE CONFIDENCIAL Y DE USO INTERNO EXCLUSIVO de Districueros El Canguro C.A.`,
      access: 'Las credenciales de acceso a las plataformas habilitadoras (ERP Odoo, Google Drive corporativo y cuentas asociadas) son personales e intransferibles. Queda expresamente prohibido ceder accesos, compartir contraseñas o divulgar información operativa a personal no autorizado o terceros ajenos a la organización.',
      channels: [
        'ERP Odoo: Registro obligatorio de transacciones, validación de stock, albaranes, facturación y consumos.',
        'WhatsApp: Envío inmediato de reportes de turno, coordinación operativa y notificaciones autorizadas.',
        'Email: Canal formal para comunicaciones oficiales, actas y notificaciones interdepartamentales.',
        'Google Drive: Resguardo de matrices de control, expedientes digitales y trazabilidad documental.'
      ]
    },
    estimatedHeight: Math.round(145 * lineFactor)
  });

  // 2.3. Introducción a Estructura Organizacional
  blocks.push({
    id: 'normas-estructura-intro',
    sectionNumber: '9',
    sectionTitle: 'NORMAS DEL PROCESO',
    type: 'normas_estructura_intro',
    normasEstructuraIntro: {
      direction: formattedDirection,
      owner
    },
    estimatedHeight: Math.round(48 * lineFactor)
  });

  // 2.4. Cargos de la Estructura Organizacional (Cada cargo es un Bloque Atómico que nunca se parte ni omite)
  if (Array.isArray(manualData.cargos)) {
    manualData.cargos.forEach((cargo, idx) => {
      const cleanTitle = sanitizeCargoTitle(cargo.titulo);
      const cleanNivel = cargo.nivel || `3.${idx + 1}`;
      const sanitizedCargo: CargoData = {
        ...cargo,
        nivel: cleanNivel,
        titulo: cleanTitle
      };
      const respCount = sanitizedCargo.responsabilidades?.length || 3;
      const estH = Math.round((55 + respCount * 17) * lineFactor);
      blocks.push({
        id: `cargo-${idx}`,
        sectionNumber: '9',
        sectionTitle: 'NORMAS DEL PROCESO',
        type: 'cargo',
        cargo: sanitizedCargo,
        estimatedHeight: estH
      });
    });
  }

  // 2.5. Criterios Técnicos del Proceso (Cada criterio es un Bloque Atómico)
  if (Array.isArray(manualData.criterios)) {
    manualData.criterios.forEach((criterio, idx) => {
      if (!criterio) return;
      let lines = Math.max(1, Math.ceil(((criterio.texto?.length) || 80) / 105));
      if (Array.isArray(criterio.vinetas) && criterio.vinetas.length > 0) {
        criterio.vinetas.forEach((v) => {
          if (!v) return;
          const vLen = ((v.etiqueta?.length) || 0) + ((v.detalle?.length) || 0);
          lines += Math.max(1, Math.ceil(vLen / 100));
        });
      }
      const estH = Math.round((28 + lines * 16) * lineFactor);
      blocks.push({
        id: `criterio-${idx}`,
        sectionNumber: '9',
        sectionTitle: 'NORMAS DEL PROCESO',
        type: 'criterio',
        criterio,
        estimatedHeight: estH
      });
    });
  }

  return blocks;
}

// ============================================================================
// ALGORITMO CANÓNICO DE PAGINACIÓN SEGÚN EL ESTÁNDAR VISIO CANGURO (ESTILO WORD)
// ============================================================================
export function paginateBlocks(
  blocks: ContentBlock[],
  measuredHeights: Record<string, number> = {},
  usableHeight: number = PAGE_USABLE_HEIGHT_PX,
  intermediatePages: IntermediatePage[] = [],
  continuationLabel?: string
): PaginatedPage[] {
  // 1. Clasificar bloques atómicos
  const glosarioBlocks = blocks.filter((b) => b.type === 'glosario_item');
  const duenoBlock = blocks.find((b) => b.type === 'normas_dueno');
  const segBlock = blocks.find((b) => b.type === 'normas_seguridad');
  const introBlock = blocks.find((b) => b.type === 'normas_estructura_intro');
  const cargoBlocks = blocks.filter((b) => b.type === 'cargo');
  const criterioBlocks = blocks.filter((b) => b.type === 'criterio');

  const contentPages: { sections: PageSectionGroup[]; heightOccupied: number }[] = [];

  // --------------------------------------------------------------------------
  // PÁGINA 3 CANÓNICA: [8] GLOSARIO DE TÉRMINOS (100% EN 1 SOLA PÁGINA)
  // Permite hasta 10 términos de alta densidad analítica sin saltos erróneos.
  // --------------------------------------------------------------------------
  contentPages.push({
    sections: [
      {
        sectionNumber: '8',
        sectionTitle: 'GLOSARIO DE TERMINOS',
        blocks: glosarioBlocks.length > 0 ? glosarioBlocks : [
          {
            id: 'glo-default-1',
            sectionNumber: '8',
            sectionTitle: 'GLOSARIO DE TERMINOS',
            type: 'glosario_item',
            glosarioItem: { termino: 'ERP Odoo', definicion: 'Plataforma corporativa para el registro, control y trazabilidad de operaciones.' },
            estimatedHeight: 32
          },
          {
            id: 'glo-default-2',
            sectionNumber: '8',
            sectionTitle: 'GLOSARIO DE TERMINOS',
            type: 'glosario_item',
            glosarioItem: { termino: 'Trazabilidad', definicion: 'Capacidad de auditar el historial de registros, responsables y acciones en sistema.' },
            estimatedHeight: 32
          }
        ]
      }
    ],
    heightOccupied: 430
  });

  // --------------------------------------------------------------------------
  // PÁGINA 4 CANÓNICA: [9] NORMAS DEL PROCESO
  // Incluye: 1. DUEÑO DEL PROCESO, 2. SEGURIDAD DE LA INFORMACIÓN,
  // y el inicio de 3. ESTRUCTURA ORGANIZACIONAL con el primer cargo (3.1 Director).
  // --------------------------------------------------------------------------
  const p4Blocks: ContentBlock[] = [];
  if (duenoBlock) p4Blocks.push(duenoBlock);
  if (segBlock) p4Blocks.push(segBlock);
  if (introBlock) p4Blocks.push(introBlock);

  // Si existen cargos, el primer cargo (3.1 Director) va en la Página 4
  const hasFirstCargo = cargoBlocks.length > 0;
  if (hasFirstCargo) {
    p4Blocks.push(cargoBlocks[0]);
  }

  contentPages.push({
    sections: [
      {
        sectionNumber: '9',
        sectionTitle: 'NORMAS DEL PROCESO',
        blocks: p4Blocks
      }
    ],
    heightOccupied: hasFirstCargo ? 480 : 350
  });

  // --------------------------------------------------------------------------
  // PÁGINA 5 EN ADELANTE: [9] NORMAS DEL PROCESO — RESTO DE LA ESTRUCTURA ORGANIZACIONAL
  // Los cargos restantes (desde el 3.2 en adelante) se agrupan en bloques de 3 por página.
  // --------------------------------------------------------------------------
  const remainingCargos = hasFirstCargo ? cargoBlocks.slice(1) : [];
  const CARGOS_PER_PAGE = 3;

  if (remainingCargos.length > 0) {
    for (let cIdx = 0; cIdx < remainingCargos.length; cIdx += CARGOS_PER_PAGE) {
      const chunk = remainingCargos.slice(cIdx, cIdx + CARGOS_PER_PAGE);

      const pageOrgBlocks: ContentBlock[] = [];
      // Subtítulo indicador formal de continuación en páginas subsiguientes de cargos
      pageOrgBlocks.push({
        id: `normas-estructura-cont-${cIdx}`,
        sectionNumber: '9',
        sectionTitle: 'NORMAS DEL PROCESO',
        type: 'normas_estructura_continuation',
        continuationLabel,
        estimatedHeight: 28
      });

      pageOrgBlocks.push(...chunk);

      contentPages.push({
        sections: [
          {
            sectionNumber: '9',
            sectionTitle: 'NORMAS DEL PROCESO',
            blocks: pageOrgBlocks
          }
        ],
        heightOccupied: 430
      });
    }
  }

  // --------------------------------------------------------------------------
  // PÁGINAS SUBSIGUIENTES: 4. CRITERIOS TÉCNICOS DEL PROCESO
  // Inicia inmediatamente en la hoja siguiente a la finalización de la Estructura Organizacional.
  // Aprovecha el 100% del margen útil de la página (525px).
  // Alberga hasta 5 criterios continuos (4.1 a 4.5) en la misma hoja junto a su encabezado.
  // Únicamente realiza salto de página si existen 6 o más criterios analizados.
  // --------------------------------------------------------------------------
  if (criterioBlocks.length > 0) {
    const getBlockHeight = (b: ContentBlock) => {
      const measured = measuredHeights[b.id];
      if (typeof measured === 'number' && measured > 15) return measured;
      return b.estimatedHeight || 75;
    };

    let currentPageBlocks: ContentBlock[] = [];
    let currentOccupiedHeight = 30; // Overhead del encabezado formal de Sección 4
    let isFirstCritPage = true;

    for (let i = 0; i < criterioBlocks.length; i++) {
      const block = criterioBlocks[i];
      const bHeight = getBlockHeight(block);
      const maxAllowedHeight = 525;

      // Garantía estricta: si hay 5 o menos criterios, TODOS se mantienen juntos en la misma página aprovechando el margen útil
      const isMandatoryTogether = isFirstCritPage && criterioBlocks.length <= 5 && currentPageBlocks.length < 5;

      if (isMandatoryTogether || currentPageBlocks.length === 0 || (currentOccupiedHeight + bHeight <= maxAllowedHeight)) {
        currentPageBlocks.push(block);
        currentOccupiedHeight += bHeight;
      } else {
        // Cierre de página de criterios e inicio de página de continuación (solo para 6 o más criterios)
        contentPages.push({
          sections: [
            {
              sectionNumber: '9',
              sectionTitle: 'NORMAS DEL PROCESO',
              blocks: currentPageBlocks
            }
          ],
          heightOccupied: currentOccupiedHeight + 70
        });
        currentPageBlocks = [block];
        currentOccupiedHeight = bHeight;
        isFirstCritPage = false;
      }
    }

    if (currentPageBlocks.length > 0) {
      contentPages.push({
        sections: [
          {
            sectionNumber: '9',
            sectionTitle: 'NORMAS DEL PROCESO',
            blocks: currentPageBlocks
          }
        ],
        heightOccupied: currentOccupiedHeight + 70
      });
    }
  }

  // ==========================================================================
  // ENSAMBLAJE FINAL DE PÁGINAS FORMALES VISIO CON SOPORTE DE PÁGINAS INTERMEDIAS
  // ==========================================================================
  const basePages: PaginatedPage[] = [];

  // PÁGINA 1: Portada Oficial
  basePages.push({
    pageNumber: 1,
    totalPages: 0,
    type: 'portada',
    pageKey: 'page-portada',
    occupancyPercent: 100
  });

  // PÁGINA 2: Herramientas Tecnológicas y Documentos Derogados
  basePages.push({
    pageNumber: 2,
    totalPages: 0,
    type: 'herramientas_derogados',
    pageKey: 'page-herramientas',
    occupancyPercent: 100
  });

  // PÁGINAS 3 A N: Contenido Canónico Paginado
  contentPages.forEach((cp, idx) => {
    basePages.push({
      pageNumber: idx + 3,
      totalPages: 0,
      type: 'content',
      pageKey: `page-content-${idx + 1}`,
      sections: cp.sections,
      heightOccupied: cp.heightOccupied,
      occupancyPercent: 100
    });
  });

  // Interpolar páginas intermedias configuradas por el usuario entre páginas
  const assembledPages: PaginatedPage[] = [...basePages];
  if (Array.isArray(intermediatePages) && intermediatePages.length > 0) {
    intermediatePages.forEach((intPage) => {
      let targetIdx = -1;
      if (intPage.afterPageKey) {
        targetIdx = assembledPages.findIndex((p) => p.pageKey === intPage.afterPageKey);
      }
      if (targetIdx === -1 && typeof intPage.afterPageNumber === 'number') {
        targetIdx = assembledPages.findIndex((p) => p.pageNumber === intPage.afterPageNumber);
      }
      const insertIndex = targetIdx !== -1 ? targetIdx + 1 : assembledPages.length;
      assembledPages.splice(insertIndex, 0, {
        pageNumber: 0,
        totalPages: 0,
        type: 'intermediate',
        pageKey: `page-intermediate-${intPage.id}`,
        intermediateData: intPage,
        occupancyPercent: 100
      });
    });
  }

  // Asignar numeración canónica final a todas las páginas (Página X de Total)
  const finalTotalPages = assembledPages.length;
  assembledPages.forEach((p, idx) => {
    p.pageNumber = idx + 1;
    p.totalPages = finalTotalPages;
  });

  return assembledPages;
}

// ============================================================================
// HOOK DE REACT PARA MEDICIÓN DOM REAL Y PAGINACIÓN DETERMINISTA
// ============================================================================
export function usePaginatedManual(
  manualData: ManualData,
  meta: ProcessMetadata,
  config: { lineHeight?: number; fontSize?: string; font?: string } = {}
) {
  const selectedLineHeight = config.lineHeight ?? 1.35;
  const [measuredHeights, setMeasuredHeights] = useState<Record<string, number>>({});
  const [isMeasured, setIsMeasured] = useState(false);

  const rawBlocks = useMemo(() => {
    return buildContentBlocks(manualData, meta, selectedLineHeight);
  }, [manualData, meta, selectedLineHeight]);

  useLayoutEffect(() => {
    let cancelled = false;

    const measureDOM = async () => {
      // Esperar a que las fuentes web estén completamente listas
      if (document.fonts) {
        await document.fonts.ready;
      }

      if (cancelled) return;

      const newHeights: Record<string, number> = {};
      let anyFound = false;

      rawBlocks.forEach((b) => {
        const el = document.getElementById(`measure-block-${b.id}`);
        if (el) {
          anyFound = true;
          // Medir offsetHeight real del nodo montado en DOM oculto
          newHeights[b.id] = el.offsetHeight;
        }
      });

      if (anyFound) {
        setMeasuredHeights(newHeights);
        setIsMeasured(true);
      }
    };

    measureDOM();

    return () => {
      cancelled = true;
    };
  }, [rawBlocks, selectedLineHeight, config.fontSize, config.font]);

  const pages = useMemo(() => {
    return paginateBlocks(rawBlocks, measuredHeights, PAGE_USABLE_HEIGHT_PX, manualData.intermediatePages || [], manualData.continuationLabel);
  }, [rawBlocks, measuredHeights, manualData.intermediatePages, manualData.continuationLabel]);

  return {
    pages,
    totalPages: pages.length,
    rawBlocks,
    isMeasuring: !isMeasured
  };
}

// ============================================================================
// CONVERTIDOR DE TEXTO MARKDOWN ANTIGUO A MANUALDATA ESTRUCTURADO
// (Para compatibilidad con manuales preexistentes en localStorage o base de datos)
// ============================================================================
export function parseLegacyMarkdownToManualData(
  rawMarkdown: string,
  meta: ProcessMetadata
): ManualData {
  if (!rawMarkdown) {
    return createEmptyManualData(meta);
  }

  // 1. Objetivo
  let objetivo = '';
  const objMatch = rawMarkdown.match(/##\s*\[?1\]?\s*OBJETIVO[\s\S]*?\n([^\n#=][\s\S]*?)(?=\n##|\n===|$)/i);
  if (objMatch && objMatch[1]) {
    objetivo = objMatch[1].trim();
  }

  // 2. Alcance
  let alcance = '';
  const alcMatch = rawMarkdown.match(/##\s*\[?2\]?\s*ALCANCE[\s\S]*?\n([^\n#=][\s\S]*?)(?=\n##|\n===|$)/i);
  if (alcMatch && alcMatch[1]) {
    alcance = alcMatch[1].trim();
  }

  // 3. Flujo
  let flujo: string[] = [];
  const flujoMatch = rawMarkdown.match(/##\s*\[?5\]?\s*VISI[OÓ]N EXTENDIDA[\s\S]*?\n([^\n#=][\s\S]*?)(?=\n##|\n===|$)/i);
  if (flujoMatch && flujoMatch[1]) {
    flujo = flujoMatch[1]
      .split(/\s*(?:➔|-->|->|→)\s*/)
      .map((s) => s.replace(/\*\*/g, '').trim())
      .filter((s) => s && s.toLowerCase() !== 'inicio' && s.toLowerCase() !== 'fin');
  }
  if (flujo.length === 0) {
    flujo = ['Recepción y Verificación', 'Diagnóstico Técnico', 'Registro en Odoo', 'Conciliación y Cierre'];
  }

  // 4. Herramientas
  let herramientas: string[] = [];
  const toolsMatch = rawMarkdown.match(/##\s*\[?7\]?\s*HERRAMIENTAS[\s\S]*?\n([^\n#=][\s\S]*?)(?=\n##|\n===|$)/i);
  if (toolsMatch && toolsMatch[1]) {
    herramientas = toolsMatch[1]
      .split('\n')
      .map((l) => l.replace(/^[•\-\*]\s*/, '').replace(/\s*\([^)]*\)/g, '').replace(/:$/, '').trim())
      .filter(Boolean);
  }
  if (herramientas.length === 0) {
    herramientas = ['ERP Odoo', 'Google Drive', 'WhatsApp Business', 'Email Corporativo'];
  }

  // 5. Documentos Derogados
  let documentosDerogados: string[] = ['N/A'];
  const derMatch = rawMarkdown.match(/##\s*\[?8\]?\s*DOCUMENTOS DEROGADOS[\s\S]*?\n([^\n#=][\s\S]*?)(?=\n##|\n===|$)/i);
  if (derMatch && derMatch[1]) {
    const lines = derMatch[1].split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0 && lines[0] !== 'N/A') {
      documentosDerogados = lines.map((l) => l.replace(/^[•\-\*]\s*/, ''));
    }
  }

  // 6. Glosario (Soporta Sección [8] oficial y [9] legado)
  const glosario: GlosarioItem[] = [];
  const gloMatch = rawMarkdown.match(/##\s*\[?[89]\]?\s*GLOSARIO[\s\S]*?\n([^\n#=][\s\S]*?)(?=\n##|\n===|$)/i);
  if (gloMatch && gloMatch[1]) {
    const lines = gloMatch[1].split('\n');
    lines.forEach((line) => {
      const trimmed = line.trim();
      const m = trimmed.match(/^[•\-\*]\s*\*{0,2}([^:*]+)\*{0,2}:\s*(.*)$/);
      if (m) {
        glosario.push({
          termino: m[1].trim(),
          definicion: m[2].trim()
        });
      }
    });
  }

  // 7. Cargos
  const cargos: CargoData[] = [];
  const estMatch = rawMarkdown.match(/###\s*3\.\s*ESTRUCTURA ORGANIZACIONAL[\s\S]*?(?=###\s*4\.\s*CRITERIOS|===|$)/i);
  if (estMatch && estMatch[0]) {
    const rawEst = estMatch[0];
    const cargoChunks = rawEst.split(/(?=\n\s*(?:-\s*)?\*{0,2}3\.\d+\b)/i);
    cargoChunks.forEach((chunk) => {
      const headerMatch = chunk.match(/(?:-\s*)?\*{0,2}(3\.\d+)\.?\s*([^:\n*]+)\*{0,2}/i);
      if (headerMatch) {
        const nivel = headerMatch[1].trim();
        const titulo = sanitizeCargoTitle(headerMatch[2]);

        let objetivoCargo = '';
        const objCargoMatch = chunk.match(/Objetivo\s*(?:del\s*Cargo)?\s*:\s*([^\n]+)/i);
        if (objCargoMatch) {
          objetivoCargo = objCargoMatch[1].trim();
        }

        const responsabilidades: string[] = [];
        const respSection = chunk.substring(chunk.search(/Responsabilidades\s*:/i) + 18);
        const respLines = respSection.split('\n');
        respLines.forEach((rl) => {
          const cl = rl.trim();
          if (cl.startsWith('•') || cl.startsWith('-') || cl.startsWith('*')) {
            responsabilidades.push(cl.replace(/^[•\-\*]\s*/, '').trim());
          }
        });

        cargos.push({
          nivel,
          titulo,
          objetivoCargo,
          responsabilidades: responsabilidades.length > 0 ? responsabilidades : [
            'Asegurar el cumplimiento estricto del protocolo operativo.',
            'Registrar y validar transacciones en ERP Odoo.',
            'Custodiar los activos y reportar contingencias de inmediato.'
          ]
        });
      }
    });
  }

  // 8. Criterios Técnicos
  const criterios: CriterioData[] = [];
  const critMatch = rawMarkdown.match(/###\s*4\.\s*CRITERIOS T[EÉ]CNICOS[\s\S]*?(?=\n#|===|$)/i);
  if (critMatch && critMatch[0]) {
    const critChunks = critMatch[0].split(/(?=\n\s*(?:-\s*)?\*{0,2}4\.\d+\b)/i);
    critChunks.forEach((chunk) => {
      const cMatch = chunk.match(/(?:-\s*)?\*{0,2}(4\.\d+)\.?\s*([^:\n*]+)\*{0,2}:?\s*([\s\S]*)/i);
      if (cMatch) {
        const rawBody = cMatch[3].trim();
        const bodyLines = rawBody.split('\n').map((l) => l.trim()).filter(Boolean);
        const bulletLines = bodyLines.filter((l) => l.startsWith('•') || l.startsWith('-') || l.startsWith('*'));

        if (bulletLines.length > 0) {
          const introLines = bodyLines.filter((l) => !l.startsWith('•') && !l.startsWith('-') && !l.startsWith('*'));
          const vinetas = bulletLines.map((bl) => {
            const clean = bl.replace(/^[•\-\*]\s*/, '').trim();
            const colonIdx = clean.indexOf(':');
            if (colonIdx > 0 && colonIdx < 50) {
              return {
                etiqueta: clean.substring(0, colonIdx).replace(/\*\*/g, '').trim(),
                detalle: clean.substring(colonIdx + 1).replace(/\*\*/g, '').trim()
              };
            }
            return { detalle: clean.replace(/\*\*/g, '').trim() };
          });

          const rawIntro = introLines.join(' ').trim();
          const isDupIntro = vinetas.some((v) => {
            const vDet = (v.detalle || '').toLowerCase();
            const vEt = (v.etiqueta || '').toLowerCase();
            const iNorm = rawIntro.toLowerCase();
            return (
              (vDet && iNorm.includes(vDet.slice(0, 20))) ||
              (vEt && iNorm.includes(vEt)) ||
              (vDet && vDet.includes(iNorm.slice(0, 20)))
            );
          });

          criterios.push({
            numero: cMatch[1].trim(),
            titulo: cMatch[2].replace(/\*\*/g, '').trim(),
            texto: isDupIntro || !rawIntro ? undefined : rawIntro,
            vinetas
          });
        } else {
          const rawFlat = rawBody.replace(/\n+/g, ' ').trim();
          const embedded = parseEmbeddedVinetas(rawFlat);
          if (embedded && embedded.length > 0) {
            criterios.push({
              numero: cMatch[1].trim(),
              titulo: cMatch[2].replace(/\*\*/g, '').trim(),
              vinetas: embedded
            });
          } else {
            criterios.push({
              numero: cMatch[1].trim(),
              titulo: cMatch[2].replace(/\*\*/g, '').trim(),
              texto: rawFlat
            });
          }
        }
      }
    });
  }

  return {
    objetivo: objetivo || `Establecer de forma técnica y estandarizada los criterios de actuación que rigen el proceso de ${meta.processName}.`,
    alcance: alcance || `El alcance abarca la totalidad del ciclo operativo y administrativo de la ${meta.owner}.`,
    versionDesc: meta.version === '01' ? 'Nuevo' : `Actualización v${meta.version}`,
    clasificacion: meta.classification || 'Crítico.',
    flujo,
    areasAprobadoras: (Array.isArray(meta.approvalAreas) && meta.approvalAreas.length > 0)
      ? meta.approvalAreas.map((a) => ({ name: a.name, role: a.role || (a.isOwner ? 'Dueño del proceso' : 'Participante'), isOwner: a.isOwner }))
      : [
          { name: meta.owner, role: 'Dueño del proceso', isOwner: true },
          { name: `Dirección de ${meta.direction}`, role: 'Participante' },
          { name: 'Gerencia de Formación y Desarrollo', role: 'Participante' }
        ],
    herramientas,
    documentosDerogados,
    glosario: glosario.length > 0 ? glosario : [
      { termino: 'ERP Odoo', definicion: 'Sistema integrado corporativo para el registro transaccional y control de inventarios.' },
      { termino: 'Trazabilidad', definicion: 'Capacidad de reconstruir el historial operativo de cada activo en la cadena.' }
    ],
    cargos: cargos.length > 0 ? cargos : [
      {
        nivel: '3.1',
        titulo: `Director de ${meta.direction}`,
        objetivoCargo: 'Definir lineamientos directivos, presupuestos y políticas estratégicas del área.',
        responsabilidades: [
          'Aprobar las políticas operativas y lineamientos rectores del área.',
          'Validar y autorizar operaciones extraordinarias de alto impacto corporativo.',
          'Asignar los recursos técnicos y humanos indispensables para la operatividad.'
        ]
      },
      {
        nivel: '3.2',
        titulo: meta.owner,
        objetivoCargo: 'Liderar y coordinar la ejecución integral diaria de las actividades del proceso.',
        responsabilidades: [
          'Monitorear el apego estricto a los flujos operativos y tiempos de ciclo del departamento.',
          'Auditar la conciliación física versus los registros oficiales en ERP Odoo.',
          'Emitir informes periódicos sobre el desempeño operativo y administrativo.'
        ]
      }
    ],
    criterios: criterios.length > 0 ? criterios : [
      {
        numero: '4.1',
        titulo: 'Validación Previa y Recepción',
        texto: 'Es mandatorio efectuar la verificación física y documental inmediata de cada requerimiento antes de iniciar cualquier operación técnica en el sistema.'
      },
      {
        numero: '4.2',
        titulo: 'Registro Transaccional en ERP Odoo',
        texto: 'Todo movimiento de inventario, cambio de estado o ajuste debe quedar registrado sincrónicamente en ERP Odoo sin excepción.'
      }
    ],
    continuationLabel: ''
  };
}

export function createEmptyManualData(meta: ProcessMetadata): ManualData {
  return {
    objetivo: `Establecer de forma técnica y estandarizada los criterios de actuación que rigen el proceso de ${meta.processName} en Districueros El Canguro C.A.`,
    alcance: `El alcance abarca la totalidad del ciclo operativo y administrativo de la ${meta.owner}.`,
    versionDesc: meta.version === '01' ? 'Nuevo' : `Actualización v${meta.version}`,
    clasificacion: meta.classification || 'Crítico.',
    flujo: ['Recepción y Verificación', 'Diagnóstico Técnico', 'Registro en Odoo', 'Conciliación y Cierre'],
    areasAprobadoras: [
      { name: meta.owner, role: 'Dueño del proceso', isOwner: true },
      { name: `Dirección de ${meta.direction}`, role: 'Participante' },
      { name: 'Gerencia de Formación y Desarrollo', role: 'Participante' }
    ],
    herramientas: ['ERP Odoo', 'Google Drive', 'WhatsApp', 'Email'],
    documentosDerogados: ['N/A'],
    glosario: [],
    cargos: [],
    criterios: [],
    continuationLabel: ''
  };
}

export const buildDefaultManualData = createEmptyManualData;

// ============================================================================
// CONVERTIDOR DE MANUALDATA A MARKDOWN DETERMINISTA
// ============================================================================
export function manualDataToMarkdown(data: ManualData, meta: ProcessMetadata): string {
  const emisionVal = meta.emisionDate || meta.today;
  const actualizacionVal = meta.actualizacionDate || meta.today;

  const headerTable = `| Fecha de Emisión | Fecha de Actualización | Versión | Código | Clasificación del Proceso |\n| :--- | :--- | :--- | :--- | :--- |\n| ${emisionVal} | ${actualizacionVal} | ${meta.version} | ${meta.code} | ${data.clasificacion || meta.classification} |`;

  const rawFlow = Array.isArray(data.flujo) ? data.flujo : [];
  const cleanFlow = rawFlow.filter(
    (f) => typeof f === 'string' && f.trim().toLowerCase() !== 'inicio' && f.trim().toLowerCase() !== 'fin'
  );
  const flowLine = cleanFlow.map((f) => `**${f}**`).join(' ➔ ');
  const areasLines = (Array.isArray(data.areasAprobadoras) ? data.areasAprobadoras : [])
    .map((a) => `| ${a.name} | ${a.role || 'Participante'} |`)
    .join('\n');

  const toolsLines = (Array.isArray(data.herramientas) ? data.herramientas : []).map((h) => `• ${h}`).join('\n');
  const derLines = (Array.isArray(data.documentosDerogados) && data.documentosDerogados.length > 0
    ? data.documentosDerogados
    : ['N/A']
  ).map((d) => (d === 'N/A' ? 'N/A' : `• ${d}`)).join('\n');

  const glosarioLines = (Array.isArray(data.glosario) ? data.glosario : [])
    .map((g) => `• **${g.termino}:** ${g.definicion}`)
    .join('\n');

  const cargosLines = (Array.isArray(data.cargos) ? data.cargos : [])
    .map((c, idx) => {
      const cleanTitle = sanitizeCargoTitle(c.titulo);
      const nivel = c.nivel || `3.${idx + 1}`;
      const resps = (Array.isArray(c.responsabilidades) ? c.responsabilidades : []).map((r) => `• ${r}`).join('\n');
      return `**${nivel}. ${cleanTitle}**\nObjetivo del Cargo: ${c.objetivoCargo}\nResponsabilidades:\n${resps}`;
    })
    .join('\n\n');

  const criteriosLines = (Array.isArray(data.criterios) ? data.criterios : [])
    .map((cr) => {
      let content = cr?.texto ? `${cr.texto}` : '';
      if (Array.isArray(cr?.vinetas) && cr.vinetas.length > 0) {
        const rawT = (typeof cr.texto === 'string' ? cr.texto : '').trim();
        const tNorm = rawT.toLowerCase();
        const isDuplicate = Boolean(
          rawT &&
          cr.vinetas.some((v: any) => {
            if (!v) return false;
            const vDet = (typeof v.detalle === 'string' ? v.detalle : '').toLowerCase();
            const vEt = (typeof v.etiqueta === 'string' ? v.etiqueta : '').toLowerCase();
            return (
              (vDet && tNorm.includes(vDet.slice(0, 20))) ||
              (vEt && tNorm.includes(vEt)) ||
              (vDet && vDet.includes(tNorm.slice(0, 20)))
            );
          })
        );
        const effectiveTexto = isDuplicate ? '' : rawT;
        const vLines = cr.vinetas.map((v) => `• ${v?.etiqueta ? `**${v.etiqueta}:** ` : ''}${v?.detalle || ''}`).join('\n');
        content = effectiveTexto ? `${effectiveTexto}\n${vLines}` : vLines;
      }
      return `**${cr?.numero || '4'}. ${cr?.titulo || 'Criterio'}:**\n${content}`;
    })
    .join('\n\n');

  return `# MANUAL DE PROCEDIMIENTOS - ${meta.processName.toUpperCase()}

${headerTable}

## [1] OBJETIVO
${data.objetivo}

## [2] ALCANCE
${data.alcance}

## [3] CONTROL DE VERSIONES
- **Descripción:** ${data.versionDesc}

## [4] CLASIFICACIÓN
- **Clasificación del Proceso:** ${data.clasificacion}

## [5] VISIÓN EXTENDIDA DEL PROCESO
**Inicio** ➔ ${flowLine} ➔ **Fin**

## [6] ÁREAS APROBADORAS
| Área / Dirección / Gerencia | Rol en el Proceso |
| :--- | :--- |
${areasLines}

## [7] HERRAMIENTAS TECNOLÓGICAS
${toolsLines}

## [8] DOCUMENTOS DEROGADOS
${derLines}

## [8] GLOSARIO DE TÉRMINOS
${glosarioLines}

## [9] NORMAS DEL PROCESO

### 1. DUEÑO DEL PROCESO Y GOBERNANZA DOCUMENTAL
Para la presente documentación, queda definida formalmente como Dueño del Proceso la **${meta.owner}**, adscrita a la **${formatDirectionWithPrefix(meta.direction)}** bajo la responsabilidad directa del Gerente de ${toTitleCase(meta.processName || meta.owner.replace(/^gerencia\s+de\s+/i, ''))}.

**1.1. Obligatoriedad de Actualización:** La actualización del manual será de carácter obligatorio e inmediato ante los siguientes eventos:
• Cambios en la estructura organizacional de la ${formatDirectionWithPrefix(meta.direction)} o en las descripciones de cargo asociadas.
• Reestructuración de los flujos operativos.
• Modificaciones en las reglas de parametrización del ERP Odoo.
• Incorporación de nuevas herramientas tecnológicas autorizadas.

### 2. SEGURIDAD DE LA INFORMACIÓN, CONFIDENCIALIDAD Y USO DE HERRAMIENTAS
**2.1. Confidencialidad:** Toda la información manejada en el proceso de ${meta.processName} tiene carácter ESTRICTAMENTE CONFIDENCIAL Y DE USO INTERNO EXCLUSIVO de Districueros El Canguro C.A.

**2.2. Custodia de Accesos:** Las credenciales de acceso a las plataformas habilitadoras son personales e intransferibles. Queda expresamente prohibido ceder accesos o divulgar información a terceros.

**2.3. Canales Oficiales de Transmisión:**
• **ERP Odoo:** Registro obligatorio de transacciones y control de inventarios.
• **WhatsApp:** Envío de reportes inmediatos y coordinación operativa.
• **Email:** Comunicaciones formales y notificaciones.
• **Google Drive:** Resguardo de matrices y expedientes digitales.

### 3. ESTRUCTURA ORGANIZACIONAL
En estricto apego al Organigrama Corporativo de la **Dirección de ${meta.direction}** y las descripciones de cargo aprobadas, la estructura de la **${meta.owner}** se conforma de la siguiente manera:

${cargosLines}

### 4. CRITERIOS TÉCNICOS DEL PROCESO DE ${meta.processName.toUpperCase()}
${criteriosLines}
`;
}
