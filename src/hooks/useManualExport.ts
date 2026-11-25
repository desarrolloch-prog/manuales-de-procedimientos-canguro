import { useState } from 'react';
import {
  exportWordDocument,
  exportManualPdfDocument,
  exportDiagnosticPdfDocument,
  copyContentToClipboard
} from '../services/manualExportService';
import type { StoredManualRecord } from '../types/processManual';

export interface UseManualExportOptions {
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function useManualExport({ showToast }: UseManualExportOptions) {
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pdfProgress, setPdfProgress] = useState<string>('');

  /**
   * Descarga el Informe Ejecutivo de Diagnóstico Lean en PDF.
   */
  const handleDownloadDiagnosticPdf = async (params: {
    leanMarkdown: string;
    processName: string;
    fullCode: string;
    version: string;
  }) => {
    const { leanMarkdown, processName, fullCode, version } = params;
    if (!leanMarkdown) {
      showToast('Genera o carga primero un diagnóstico para descargarlo en PDF.', 'info');
      return;
    }

    setIsExportingPdf(true);
    setPdfProgress('Generando Informe de Diagnóstico en PDF...');
    showToast('Generando PDF del Informe Ejecutivo de Auditoría...', 'info');

    const cleanProcessName = (processName || 'Proceso').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${fullCode}_Informe_Diagnostico_${cleanProcessName}_v${version}.pdf`;

    try {
      await exportDiagnosticPdfDocument(filename, () => {
        setPdfProgress('Procesando reporte...');
      });
      showToast('¡Informe de Diagnóstico descargado con éxito en tu equipo!', 'success');
    } catch (err: unknown) {
      console.error('Error generando PDF del diagnóstico:', err);
      showToast('Hubo un inconveniente al generar el PDF del diagnóstico. Inténtalo nuevamente.', 'error');
    } finally {
      setIsExportingPdf(false);
      setPdfProgress('');
    }
  };

  /**
   * Descarga directa del archivo PDF del manual o diagnóstico según la pestaña activa.
   */
  const handleDownloadPdf = async (params: {
    activeTab: 'manual' | 'lean' | 'database';
    setActiveTab: (tab: 'manual' | 'lean' | 'database') => void;
    docZoom: number;
    setDocZoom: (zoom: number) => void;
    manualMarkdown: string;
    editableDocPagesCount: number;
    processName: string;
    fullCode: string;
    version: string;
    leanMarkdown: string;
  }) => {
    const {
      activeTab,
      setActiveTab,
      docZoom,
      setDocZoom,
      manualMarkdown,
      editableDocPagesCount,
      processName,
      fullCode,
      version,
      leanMarkdown
    } = params;

    if (activeTab === 'lean') {
      return handleDownloadDiagnosticPdf({ leanMarkdown, processName, fullCode, version });
    }

    if (!manualMarkdown && editableDocPagesCount === 0) {
      showToast('Genera o carga primero el manual para descargarlo en PDF.', 'info');
      return;
    }

    const previousZoom = docZoom;
    const previousTab = activeTab;

    if (activeTab !== 'manual') {
      setActiveTab('manual');
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    if (docZoom !== 100) {
      setDocZoom(100);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    setIsExportingPdf(true);
    setPdfProgress('Iniciando descarga de PDF...');
    showToast('Generando archivo PDF con membrete y firmas...', 'info');

    const cleanProcessName = (processName || 'Proceso').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${fullCode}_Manual_de_Procedimientos_${cleanProcessName}_v${version}.pdf`;

    try {
      await exportManualPdfDocument(filename, (current, total) => {
        setPdfProgress(`Página ${current}/${total}`);
      });
      showToast('¡Archivo PDF descargado con éxito en tu equipo!', 'success');
    } catch (err: unknown) {
      console.error('Error generando PDF vía canvas:', err);
      showToast('Hubo un inconveniente al generar el PDF. Verifica los datos e inténtalo nuevamente.', 'error');
    } finally {
      if (previousZoom !== 100) {
        setDocZoom(previousZoom);
      }
      if (previousTab !== 'manual') {
        setActiveTab(previousTab);
      }
      setIsExportingPdf(false);
      setPdfProgress('');
    }
  };

  /**
   * Exporta el manual a formato Word (.docx).
   */
  const handleExportWord = (params: {
    manualMarkdown: string;
    editableDocPagesCount: number;
    fullCode: string;
    version: string;
    processName: string;
    direction: string;
    directorApprover: string;
    leanMarkdown: string;
    buildSynchronizedMarkdown: () => string;
  }) => {
    const {
      manualMarkdown,
      editableDocPagesCount,
      fullCode,
      version,
      processName,
      direction,
      directorApprover,
      leanMarkdown,
      buildSynchronizedMarkdown
    } = params;

    if (!manualMarkdown && editableDocPagesCount === 0) {
      showToast('Genera primero el manual para descargarlo.', 'info');
      return;
    }

    exportWordDocument({
      code: fullCode,
      version,
      processName: processName || 'Proceso',
      direction,
      directorApprover,
      manualMarkdown: buildSynchronizedMarkdown() || manualMarkdown,
      leanMarkdown
    });

    showToast('Descargando documento Word (.docx)...', 'success');
  };

  /**
   * Exporta el archivo Word directamente desde un registro de la base de datos.
   */
  const handleExportWordForManual = (manual: StoredManualRecord) => {
    exportWordDocument({
      code: manual.codigo,
      version: manual.version,
      processName: manual.nombre || 'Proceso',
      direction: manual.direccion,
      directorApprover: manual.directorApprover,
      manualMarkdown: manual.manualMarkdown,
      leanMarkdown: manual.leanMarkdown
    });
    showToast(`Descargando Word para "${manual.nombre}"...`, 'success');
  };

  /**
   * Exporta el PDF directamente desde un registro de la base de datos.
   */
  const handleExportPdfForManual = (
    manual: StoredManualRecord,
    activeManualId: string,
    onLoadManual: (m: StoredManualRecord) => void,
    triggerDownloadPdf: () => void
  ) => {
    if (manual.id === activeManualId) {
      triggerDownloadPdf();
    } else {
      onLoadManual(manual);
      setTimeout(() => {
        triggerDownloadPdf();
      }, 400);
    }
  };

  /**
   * Copia el contenido Markdown al portapapeles del sistema.
   */
  const handleCopyText = async (params: {
    activeTab: 'manual' | 'lean' | 'database';
    manualMarkdown: string;
    leanMarkdown: string;
    buildSynchronizedMarkdown: () => string;
  }) => {
    const { activeTab, manualMarkdown, leanMarkdown, buildSynchronizedMarkdown } = params;
    const content = activeTab === 'manual' ? (buildSynchronizedMarkdown() || manualMarkdown) : leanMarkdown;
    if (!content) {
      showToast('No hay contenido para copiar.', 'info');
      return;
    }
    const ok = await copyContentToClipboard(content);
    if (ok) {
      showToast('¡Texto copiado al portapapeles con éxito!', 'success');
    } else {
      showToast('No se pudo copiar el texto al portapapeles.', 'error');
    }
  };

  return {
    isExportingPdf,
    pdfProgress,
    handleDownloadDiagnosticPdf,
    handleDownloadPdf,
    handleExportWord,
    handleExportWordForManual,
    handleExportPdfForManual,
    handleCopyText
  };
}
