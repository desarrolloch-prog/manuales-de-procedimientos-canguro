import { jsPDF } from 'jspdf';
import { toPng, toJpeg } from 'html-to-image';
import { getOfficialSignatureFallback } from './officialSignatures';

export interface ExportPdfOptions {
  filename?: string;
  onProgress?: (current: number, total: number, message?: string) => void;
}

/**
 * Captura todos los contenedores `.page-sheet` del manual en el DOM
 * utilizando clonación en un contenedor aislado fuera de pantalla (1:1 sin zoom ni distorsión)
 * con `html-to-image` (toJpeg) altamente optimizado (1458 x 1032 px nítidos A4, compresión 88%)
 * para una generación ultra-rápida (menos de 2 segundos) y un tamaño de archivo liviano ideal para Google Drive.
 */
export interface ExportPdfResult {
  pdf: jsPDF;
  blob: Blob;
  filename: string;
}

/**
 * Espera determinista hasta que todas las fuentes del documento estén listas
 * y todas las imágenes dentro de un contenedor estén completamente cargadas y decodificadas
 * mediante img.decode(), garantizando que firmas, logos y tipografías estén listos antes de capturar el canvas.
 */
async function waitForFontsAndImages(container: HTMLElement | Document = document): Promise<void> {
  // 1. Espera determinista de fuentes tipográficas
  if (document.fonts) {
    await document.fonts.ready;
  }

  // 2. Espera determinista de decodificación de todas las imágenes
  const imgs = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    imgs.map(async (img) => {
      try {
        if ('decode' in img && typeof img.decode === 'function') {
          await img.decode();
        } else if (!img.complete) {
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
        }
      } catch {
        if (!img.complete) {
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
        }
      }
    })
  );
}

export async function generateManualPdf(
  filename: string = 'Manual_de_Procedimientos.pdf',
  onProgress?: (current: number, total: number, message?: string) => void
): Promise<ExportPdfResult> {
  // Asegurar que no queden focos activos ni cursor de edición antes de capturar
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  // Espera determinista de fuentes y decodificación de imágenes antes de empezar
  await waitForFontsAndImages(document.body);

  const allSheets = Array.from(document.querySelectorAll<HTMLElement>('.page-sheet'));
  // Filtrar hojas visibles o montadas en el DOM
  let pageSheets = allSheets.filter((sheet) => {
    return sheet.offsetHeight > 0;
  });

  // Si están en el DOM pero temporalmente en contenedor offscreen o en transición, usar todas las disponibles
  if (pageSheets.length === 0 && allSheets.length > 0) {
    pageSheets = allSheets;
  }

  if (pageSheets.length === 0) {
    throw new Error('No se encontraron hojas del manual en el sistema. Asegúrate de tener un manual seleccionado.');
  }

  // 1. Crear contenedor temporal invisible fuera de pantalla (aislado 1:1, sin zoom ni transforms)
  const isolatedContainer = document.createElement('div');
  isolatedContainer.id = 'pdf-export-isolated-host';
  isolatedContainer.style.position = 'fixed';
  isolatedContainer.style.top = '0';
  isolatedContainer.style.left = '0';
  isolatedContainer.style.width = '1122px';
  isolatedContainer.style.height = '794px';
  isolatedContainer.style.zIndex = '-99999';
  isolatedContainer.style.pointerEvents = 'none';
  isolatedContainer.style.overflow = 'hidden';
  isolatedContainer.style.backgroundColor = '#ffffff';
  isolatedContainer.style.transform = 'none';
  isolatedContainer.style.setProperty('zoom', '1');
  document.body.appendChild(isolatedContainer);

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const total = pageSheets.length;

  try {
    for (let i = 0; i < total; i++) {
      const originalSheet = pageSheets[i];

      if (onProgress) {
        onProgress(i + 1, total, `Procesando hoja ${i + 1} de ${total}...`);
      }

      // Limpiar contenedor y clonar la página actual
      isolatedContainer.innerHTML = '';
      const clone = originalSheet.cloneNode(true) as HTMLElement;

      // Eliminar elementos interactivos no imprimibles
      clone.querySelectorAll('.no-print').forEach((el) => el.remove());
      clone.querySelectorAll('[contenteditable]').forEach((el) => {
        el.removeAttribute('contenteditable');
      });

      // Forzar dimensiones y estilos canónicos A4 Landscape en el clon
      clone.style.width = '1122px';
      clone.style.height = '794px';
      clone.style.minWidth = '1122px';
      clone.style.minHeight = '794px';
      clone.style.maxWidth = '1122px';
      clone.style.maxHeight = '794px';
      clone.style.transform = 'none';
      clone.style.margin = '0';
      clone.style.boxShadow = 'none';
      clone.style.border = 'none';
      clone.style.borderRadius = '0';
      clone.style.overflow = 'hidden';
      clone.style.boxSizing = 'border-box';
      clone.style.padding = '18px 22px';
      clone.style.backgroundColor = '#ffffff';

      // Asegurar que todas las firmas y logos en el clon tengan data URLs síncronos y sin blend-mode glitches
      const originalImgs = Array.from(originalSheet.querySelectorAll('img'));
      const cloneImgs = Array.from(clone.querySelectorAll('img'));

      cloneImgs.forEach((cImg, imgIdx) => {
        // Remover clases de mezcla que puedan ser ignoradas o dar fallas en canvas SVG foreignObject
        cImg.classList.remove('mix-blend-multiply');
        cImg.style.mixBlendMode = 'normal';

        // Si es una firma y no tiene data URL o está vacía, hidratar con fallback oficial
        const alt = cImg.alt || '';
        if (alt.includes('Firma') || cImg.src.includes('firma_')) {
          if (!cImg.src.startsWith('data:image/')) {
            const fallback = getOfficialSignatureFallback(alt);
            if (fallback) {
              cImg.src = fallback;
            }
          }
        }

        // Si el elemento original ya estaba cargado, convertir a data URL síncrono para toJpeg
        const origImg = originalImgs[imgIdx];
        if (origImg && origImg.complete && origImg.naturalWidth > 0 && !cImg.src.startsWith('data:image/')) {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = origImg.naturalWidth;
            canvas.height = origImg.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(origImg, 0, 0);
              cImg.src = canvas.toDataURL('image/png');
            }
          } catch {
            // Ignorar si hay restricción cross-origin
          }
        }
      });

      isolatedContainer.appendChild(clone);

      // Espera determinista de fuentes y decodificación de todas las imágenes del clon (firmas, logos)
      await waitForFontsAndImages(clone);

      // Captura de alta velocidad y fidelidad (1458 x 1032 px nítidos A4 a 88% de compresión JPEG)
      // Genera el manual en ~1-2 segundos con un PDF liviano de ~2MB
      let imgData: string;
      try {
        imgData = await toJpeg(clone, {
          width: 1122,
          height: 794,
          canvasWidth: 1458, // 1122 * 1.3
          canvasHeight: 1032, // 794 * 1.3
          quality: 0.88,
          pixelRatio: 1.3,
          backgroundColor: '#ffffff',
          skipFonts: true,
          filter: (node: Node) => {
            if (node.nodeType === 1 && (node as HTMLElement).classList?.contains('no-print')) {
              return false;
            }
            return true;
          }
        });
      } catch (cloneErr) {
        console.warn('Fallback a captura directa de hoja original:', cloneErr);
        imgData = await toJpeg(originalSheet, {
          width: 1122,
          height: 794,
          canvasWidth: 1458,
          canvasHeight: 1032,
          quality: 0.88,
          pixelRatio: 1.3,
          backgroundColor: '#ffffff',
          skipFonts: true,
          filter: (node: Node) => {
            if (node.nodeType === 1 && (node as HTMLElement).classList?.contains('no-print')) {
              return false;
            }
            return true;
          }
        });
      }

      if (i > 0) {
        pdf.addPage('a4', 'landscape');
      }

      // Ocupa exactamente toda la hoja A4 apaisada (0, 0 a 297, 210 mm)
      // ya que el clon de 1122x794 px ya incluye el margen Visio exacto de 18px/22px
      pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
    }
  } finally {
    // Eliminar el contenedor temporal del DOM
    if (isolatedContainer.parentNode) {
      isolatedContainer.parentNode.removeChild(isolatedContainer);
    }
  }

  const blob = pdf.output('blob');
  return { pdf, blob, filename };
}

/**
 * Exporta y descarga directamente el manual en el equipo del usuario.
 */
export async function exportManualToPdf(
  filename: string = 'Manual_de_Procedimientos.pdf',
  onProgress?: (current: number, total: number, message?: string) => void
): Promise<boolean> {
  const { pdf } = await generateManualPdf(filename, onProgress);
  pdf.save(filename);
  return true;
}

/**
 * Genera el archivo PDF y retorna su Blob binario para sincronización en Google Drive o almacenamiento.
 */
export async function exportManualToPdfBlob(
  filename: string = 'Manual_de_Procedimientos.pdf',
  onProgress?: (current: number, total: number, message?: string) => void
): Promise<{ blob: Blob; filename: string }> {
  const result = await generateManualPdf(filename, onProgress);
  return { blob: result.blob, filename: result.filename };
}

/**
 * Captura y exporta el Informe Ejecutivo de Auditoría y Diagnóstico Operativo
 * a un archivo PDF (A4 vertical) con alta resolución y compresión JPEG liviana (<500 KB).
 */
export async function exportDiagnosticToPdf(
  elementId: string = 'diagnostic-report-content',
  filename: string = 'Informe_Diagnostico_Operativo.pdf',
  onProgress?: (current: number, total: number) => void
): Promise<boolean> {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`No se encontró el contenedor del diagnóstico #${elementId}.`);
  }

  // Espera determinista de fuentes y decodificación de imágenes del informe
  await waitForFontsAndImages(element);

  if (onProgress) onProgress(1, 1);

  // Captura optimizada en JPEG 0.82 con pixelRatio 1.6
  const imgData = await toJpeg(element, {
    quality: 0.82,
    pixelRatio: 1.6,
    backgroundColor: '#ffffff',
    skipFonts: true,
    filter: (node: HTMLElement) => {
      if (node.nodeType === 1 && (node as HTMLElement).classList) {
        if ((node as HTMLElement).classList.contains('no-print')) {
          return false;
        }
      }
      return true;
    }
  });

  const img = new Image();
  img.src = imgData;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Error al decodificar imagen del informe'));
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginMm = 10;
  const targetWidth = pageWidth - marginMm * 2; // 190 mm
  const targetHeight = pageHeight - marginMm * 2; // 277 mm

  const imgRatio = img.height / img.width;
  const totalImgHeightMm = targetWidth * imgRatio;

  let heightLeft = totalImgHeightMm;
  let pageIndex = 0;

  while (heightLeft > 0) {
    if (pageIndex > 0) {
      pdf.addPage('a4', 'portrait');
    }

    const position = marginMm - (pageIndex * targetHeight);
    pdf.addImage(imgData, 'JPEG', marginMm, position, targetWidth, totalImgHeightMm, `diag_${pageIndex}`, 'FAST');

    heightLeft -= targetHeight;
    pageIndex++;
  }

  pdf.save(filename);
  return true;
}
