import { exportManualToWordDoc } from '../utils/docxExport';
import { exportManualToPdf, exportDiagnosticToPdf, exportManualToPdfBlob } from '../utils/pdfExport';
import type { StoredManualRecord } from '../types/processManual';

export interface ExportWordOptions {
  code: string;
  version: string;
  processName: string;
  direction: string;
  directorApprover: string;
  manualMarkdown: string;
  leanMarkdown: string;
}

/**
 * Exporta el manual en formato Microsoft Word (.docx).
 */
export function exportWordDocument(options: ExportWordOptions): void {
  exportManualToWordDoc({
    code: options.code,
    version: options.version,
    processName: options.processName || 'Proceso',
    direction: options.direction,
    directorApprover: options.directorApprover,
    manualMarkdown: options.manualMarkdown,
    leanMarkdown: options.leanMarkdown
  });
}

/**
 * Exporta el manual de procedimientos en formato PDF utilizando el renderizador en canvas.
 */
export async function exportManualPdfDocument(
  filename: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  await exportManualToPdf(filename, onProgress);
}

/**
 * Exporta el informe diagnóstico de auditoría Lean en formato PDF.
 */
export async function exportDiagnosticPdfDocument(
  filename: string,
  onProgress?: () => void
): Promise<void> {
  await exportDiagnosticToPdf('diagnostic-report-content', filename, onProgress);
}

/**
 * Genera el Blob binario del PDF del manual para adjuntarlo o subirlo a Google Drive.
 */
export async function generateManualPdfBlob(
  filename: string,
  onProgress?: (current: number, total: number) => void
): Promise<{ blob: Blob; filename: string }> {
  return await exportManualToPdfBlob(filename, onProgress);
}

/**
 * Copia texto o markdown al portapapeles del navegador de forma segura.
 */
export async function copyContentToClipboard(content: string): Promise<boolean> {
  try {
    if (!content) return false;
    await navigator.clipboard.writeText(content);
    return true;
  } catch (err) {
    console.error('Error copiando contenido al portapapeles:', err);
    return false;
  }
}

/**
 * Descarga un manual o lista de manuales en formato JSON estructurado.
 */
export function downloadJsonFile(filename: string, data: unknown): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
