/**
 * Utilidades para serializar elementos DOM contentEditable a sintaxis Markdown limpia,
 * preservando negritas (**texto**), cursivas (*texto*) y estructuras en línea.
 */

export function domToMarkdown(node: Node | null): string {
  if (!node) return '';

  // Nodo de texto simple
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }

  // Nodo elemento
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();

    // Ignorar elementos marcados como no imprimibles o botones auxiliares
    if (el.classList.contains('no-print') || tagName === 'button') {
      return '';
    }

    // Salto de línea
    if (tagName === 'br') {
      return '\n';
    }

    // Procesar hijos recursivamente
    let childrenText = '';
    el.childNodes.forEach((child) => {
      childrenText += domToMarkdown(child);
    });

    // Detectar si el elemento tiene estilo o etiqueta de negrita
    const isBoldTag = tagName === 'b' || tagName === 'strong';
    const hasBoldStyle =
      el.style.fontWeight === 'bold' ||
      el.style.fontWeight === '700' ||
      el.style.fontWeight === '800' ||
      el.style.fontWeight === '900' ||
      parseInt(el.style.fontWeight, 10) >= 600;

    // Detectar si el elemento tiene estilo o etiqueta de cursiva
    const isItalicTag = tagName === 'i' || tagName === 'em';
    const hasItalicStyle = el.style.fontStyle === 'italic';

    let result = childrenText;

    if (isBoldTag || hasBoldStyle) {
      const trimmed = result.trim();
      if (trimmed.length > 0 && !trimmed.startsWith('**') && !trimmed.endsWith('**')) {
        // Preservar espacios externos
        const leadingSpace = result.match(/^\s*/)?.[0] || '';
        const trailingSpace = result.match(/\s*$/)?.[0] || '';
        result = `${leadingSpace}**${trimmed}**${trailingSpace}`;
      }
    }

    if (isItalicTag || hasItalicStyle) {
      const trimmed = result.trim();
      if (trimmed.length > 0 && !trimmed.startsWith('*') && !trimmed.endsWith('*')) {
        const leadingSpace = result.match(/^\s*/)?.[0] || '';
        const trailingSpace = result.match(/\s*$/)?.[0] || '';
        result = `${leadingSpace}*${trimmed}*${trailingSpace}`;
      }
    }

    // Código en línea
    if (tagName === 'code') {
      const trimmed = result.trim();
      if (trimmed.length > 0) {
        result = `\`${trimmed}\``;
      }
    }

    return result;
  }

  return '';
}

/**
 * Convierte un elemento contentEditable completo en una línea de Markdown limpia,
 * normalizando espacios redundantes y preservando etiquetas Markdown.
 */
export function domToMarkdownLine(element: HTMLElement | null): string {
  if (!element) return '';
  const md = domToMarkdown(element);
  return md
    .replace(/\u00A0/g, ' ') // Reemplazar &nbsp; por espacio normal
    .replace(/[ \t]+/g, ' ')  // Colapsar espacios múltiples sin tocar saltos
    .trim();
}

export { toTitleCase } from '../shared';

/**
 * Elimina sintaxis Markdown (**texto**, *texto*, `código`) dejando texto plano limpio.
 */
export function stripMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\*\*/g, '')
    .trim();
}

/**
 * Convierte Markdown en línea (**negrita**, *cursiva*, `código`, saltos de línea)
 * en HTML seguro y estilizado sin dejar asteriscos '**' visibles.
 */
export function formatInline(text: any): string {
  if (text === null || text === undefined) return '';
  const str = typeof text === 'string' ? text : String(text);
  if (!str) return '';

  // Escapar HTML no deseado primero para seguridad XSS
  const escaped = str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    // Convertir **etiqueta:** o **etiqueta**: con dos puntos
    .replace(/\*\*\s*([^*]+?)\s*:\s*\*\*/g, '<strong>$1:</strong>')
    .replace(/\*\*\s*([^*]+?)\s*\*\*:/g, '<strong>$1:</strong>')
    // Convertir **texto** general
    .replace(/\*\*\s*([^*]+?)\s*\*\*/g, '<strong>$1</strong>')
    // Convertir *texto* cursiva
    .replace(/(?<!\*)\*\s*([^*]+?)\s*\*(?!\*)/g, '<em>$1</em>')
    // Convertir `código`
    .replace(/`([^`]+)`/g, '<code class="bg-zinc-100 text-black px-1 py-0.5 rounded font-mono text-[11px]">$1</code>')
    // Eliminar asteriscos dobles huérfanos residuales para garantizar cero asteriscos visibles
    .replace(/\*\*/g, '')
    // Reemplazar saltos de línea codificados
    .replace(/&lt;br\s*\/?&gt;/gi, '<br/>')
    .replace(/\\n/g, '<br/>');
}

/**
 * Identifica si una página o sección está vacía o contiene únicamente un encabezado sin contenido sustancial
 */
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

/**
 * Limpia líneas espurias de firmas o pies de página alucinados por la IA
 */
export function cleanSpuriousSignaturesAndFooters(text: string): string {
  if (!text) return '';
  return text
    .split('\n')
    .filter((rawLine) => {
      const line = rawLine.trim();
      if (!line) return true;

      // 1. Coincidencia combinada de número de página con firmas o sellos
      if (/\[?\bP[aá]gina\s+\d+\s+de\s+\d+\]?/i.test(line) && /FIRMA/i.test(line)) {
        return false;
      }

      // 2. Líneas aisladas de paginación textual
      if (/^\[?\s*P[aá]g(?:ina)?\.?\s+\d+\s+de\s+\d+\s*\]?$/i.test(line)) {
        return false;
      }

      // 3. Líneas de firmas manuales o textuales
      if (/(?:^|\|)\s*FIRMA\s+(?:AUTORIZADA|SUPERVISI[OÓ]N|DIRECCI[OÓ]N|RESPONSABLE|REVISADA|ELABORADA|APROBADA|DE\s+REVISI[OÓ]N)/i.test(line)) {
        return false;
      }

      // 4. Líneas de firmas con subrayados
      if (/\bFIRMA\b.*?:?\s*_{2,}/i.test(line)) {
        return false;
      }

      // 5. Líneas que solo contienen subrayados continuos para firma manual
      if (/^_{3,}\s*$/.test(line)) {
        return false;
      }

      return true;
    })
    .join('\n');
}
