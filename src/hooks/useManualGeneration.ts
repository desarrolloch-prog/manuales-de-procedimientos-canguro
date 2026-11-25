import { useState, useRef, useEffect, useCallback } from 'react';
import {
  generateManualApi,
  type GenerateManualPayload,
  type GenerateManualResponse,
  type GenerateManualApiResult
} from '../services/manualApiService';
import { sanitizeCargoTitle, type ManualData } from '../types/processManual';
import { parseLegacyMarkdownToManualData } from '../utils/paginate';
import type { ProcessMetadata } from '../shared';

export interface UseManualGenerationOptions {
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function useManualGeneration({ showToast }: UseManualGenerationOptions) {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [generationElapsedSec, setGenerationElapsedSec] = useState<number>(0);
  const [generationStage, setGenerationStage] = useState<string>('');

  // Refs para estado mutable accesible desde el setInterval sin stale closure
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isApiDoneRef = useRef<boolean>(false);
  const apiResultRef = useRef<GenerateManualApiResult | null>(null);
  const apiErrorRef = useRef<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const clientTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      if (clientTimeoutRef.current) clearTimeout(clientTimeoutRef.current);
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleGenerateManual = useCallback(async (params: {
    payload: GenerateManualPayload;
    currentMeta: ProcessMetadata;
    onSuccess: (data: {
      generatedManual: string;
      leanMarkdown: string;
      sanitizedManualData: ManualData | null;
      fullResData: unknown;
    }) => void;
  }) => {
    const { payload, currentMeta, onSuccess } = params;

    if (!payload.narrative.trim() && (!payload.textFiles || payload.textFiles.length === 0) && (!payload.mediaFiles || payload.mediaFiles.length === 0)) {
      showToast('Ingresa los apuntes de la entrevista o adjunta un documento de soporte (.pdf, .json, .txt).', 'error');
      return;
    }

    // Cancelar cualquier solicitud previa
    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (clientTimeoutRef.current) clearTimeout(clientTimeoutRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);

    // Reiniciar refs de estado mutable
    isApiDoneRef.current = false;
    apiResultRef.current = null;
    apiErrorRef.current = null;

    setIsGenerating(true);
    setGenerationProgress(5);
    setGenerationElapsedSec(0);
    setGenerationStage('Inspeccionando y decodificando documentos adjuntos y transcripción...');

    const TARGET_DURATION_MS = 70000;
    // Timeout de cliente: 220s — debe ser menor que el guard de 240s del backend
    const CLIENT_TIMEOUT_MS = 220_000;
    const startTime = Date.now();

    // Crear AbortController para poder cancelar el fetch
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Timer de cliente: cancela el fetch si el backend no responde en CLIENT_TIMEOUT_MS
    clientTimeoutRef.current = setTimeout(() => {
      console.warn('[useManualGeneration] Timeout de cliente (220s) alcanzado. Cancelando solicitud...');
      controller.abort();
    }, CLIENT_TIMEOUT_MS);

    // Ejecución asíncrona de la llamada al backend a través de manualApiService
    const fetchManual = async () => {
      try {
        apiResultRef.current = await generateManualApi(payload, controller.signal);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          apiErrorRef.current = new Error('La solicitud superó el tiempo máximo de espera (220s). Por favor, reintenta.');
        } else {
          const normalizedErr = err instanceof Error ? err : new Error(String(err));
          console.error('[useManualGeneration] Error durante generate-manual:', normalizedErr);
          apiErrorRef.current = normalizedErr;
        }
      } finally {
        // Limpiar timer de cliente y marcar como completada
        if (clientTimeoutRef.current) clearTimeout(clientTimeoutRef.current);
        isApiDoneRef.current = true;
      }
    };

    fetchManual();

    // Cronómetro de progreso ágil y continuo — lee desde refs para evitar stale closure
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const elapsedSec = Math.floor(elapsed / 1000);
      setGenerationElapsedSec(elapsedSec);

      const isDone = isApiDoneRef.current;
      const result = apiResultRef.current;
      const error = apiErrorRef.current;

      // Si la API falló con error, reportar de inmediato
      if (isDone && (error || !result?.ok || !result?.resData?.success)) {
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);
        setIsGenerating(false);
        let errorMsg = error?.message || result?.resData?.error || `Error del servidor (${result?.status || '500'})`;
        if (errorMsg.includes('503') || errorMsg.includes('UNAVAILABLE') || errorMsg.includes('high demand')) {
          errorMsg = 'Los servidores de IA experimentan alta demanda momentánea. Por favor, reintenta en unos instantes.';
        } else if (errorMsg.includes('220s') || errorMsg.includes('AbortError') || errorMsg.includes('tiempo máximo')) {
          errorMsg = 'La solicitud superó el tiempo máximo de espera (220s). Por favor, reintenta.';
        }
        showToast(`Aviso al generar manual: ${errorMsg}`, 'error');
        return;
      }

      // Si la API ya terminó con éxito:
      if (isDone && result?.ok && result?.resData?.success) {
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);

        let currentVal = Math.max(92, 92);
        setGenerationStage('¡Manual canónico e informe completados con éxito!');
        const finishInterval = setInterval(() => {
          currentVal += 4;
          if (currentVal >= 100) {
            clearInterval(finishInterval);
            setGenerationProgress(100);

            setTimeout(() => {
              setIsGenerating(false);
              const resData: GenerateManualResponse = apiResultRef.current!.resData;
              if (resData?.data?.manual || resData?.data?.manualData) {
                const generatedManual = resData.data.manual || '';
                const leanMarkdown = resData.data.lean || '';
                let sanitizedData: ManualData | null = null;

                if (resData.data.manualData) {
                  sanitizedData = { ...(resData.data.manualData as ManualData) };
                  if (Array.isArray(sanitizedData.herramientas)) {
                    sanitizedData.herramientas = sanitizedData.herramientas
                      .map((h: string) => (typeof h === 'string' ? h.replace(/\s*\([^)]*\)/g, '').trim() : h))
                      .filter(Boolean);
                  }
                  if (Array.isArray(sanitizedData.cargos)) {
                    sanitizedData.cargos = sanitizedData.cargos.map((c, idx: number) => ({
                      ...c,
                      nivel: `3.${idx + 1}`,
                      titulo: sanitizeCargoTitle(c.titulo || '')
                    }));
                  }
                } else if (generatedManual) {
                  sanitizedData = parseLegacyMarkdownToManualData(generatedManual, currentMeta);
                }

                onSuccess({
                  generatedManual,
                  leanMarkdown,
                  sanitizedManualData: sanitizedData,
                  fullResData: resData.data
                });

                if (resData.source === 'fallback') {
                  let toastWarn = resData.warning || 'Aviso: Se empleó la plantilla formal certificada.';
                  if (toastWarn.includes('{"error"') || toastWarn.includes('"code":503')) {
                    toastWarn = 'Aviso: Servidores de IA con alta demanda temporal. Se aplicó la plantilla formal certificada DTH-GFD-MP.';
                  }
                  showToast(toastWarn, 'info');
                } else {
                  showToast('¡Manual de Procedimientos e Informe generados con éxito!', 'success');
                }
              }
            }, 150);
          } else {
            setGenerationProgress(Math.min(99, Math.round(currentVal)));
          }
        }, 25);
        return;
      }

      // Progresión continua ágil
      const targetPct = isDone
        ? 95
        : Math.min(92, Math.round(5 + 87 * (elapsed / TARGET_DURATION_MS)));

      setGenerationProgress((prev) => Math.max(prev, targetPct));

      if (elapsed < 12000) {
        setGenerationStage('Inspeccionando y decodificando descriptores de cargo y documentos adjuntos...');
      } else if (elapsed < 28000) {
        setGenerationStage('Extrayendo el 100% de los roles para la Estructura Organizacional...');
      } else if (elapsed < 45000) {
        setGenerationStage('Analizando glosario específico y criterios técnicos de negocio...');
      } else if (elapsed < 62000) {
        setGenerationStage('Paginando manual en estándar Visio con distribución de 3 cargos por hoja...');
      } else {
        setGenerationStage('Consolidando auditoría Lean Six Sigma, verificación de candados y firmas...');
      }
    }, 100);
  }, [showToast]);

  return {
    isGenerating,
    setIsGenerating,
    generationProgress,
    generationElapsedSec,
    generationStage,
    handleGenerateManual
  };
}
