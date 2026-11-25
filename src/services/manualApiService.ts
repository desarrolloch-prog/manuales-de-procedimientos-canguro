import type { ApprovalAreaRecord } from '../shared';
import type { ManualData } from '../types/processManual';

export interface GenerateManualPayload {
  code: string;
  version: string;
  classification: string;
  processName: string;
  direction: string;
  owner: string;
  directorApprover: string;
  emisionDate: string;
  actualizacionDate: string;
  narrative: string;
  textFiles: { name: string; content: string }[];
  mediaFiles: { name: string; mimeType: string; data: string }[];
  approvalAreas?: ApprovalAreaRecord[];
}

export interface GenerateManualResponse {
  success: boolean;
  data?: {
    manual?: string;
    lean?: string;
    manualData?: ManualData | Record<string, unknown>;
    rawResponse?: string;
  };
  source?: 'gemini' | 'fallback';
  modelUsed?: string;
  warning?: string;
  error?: string;
}

export interface GenerateManualApiResult {
  ok: boolean;
  status: number;
  statusText: string;
  resData: GenerateManualResponse;
}

/**
 * Invoca el endpoint maestro de generación de manuales (/api/generate-manual).
 * Provee mapeo de errores HTTP resiliente (504, 413, 502, 503) y manejo no-JSON.
 */
export async function generateManualApi(
  payload: GenerateManualPayload,
  signal?: AbortSignal
): Promise<GenerateManualApiResult> {
  const response = await fetch('/api/generate-manual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal
  });

  const contentType = response.headers.get('content-type') || '';
  let resData: GenerateManualResponse;

  if (contentType.includes('application/json')) {
    resData = (await response.json()) as GenerateManualResponse;
  } else {
    const rawText = await response.text();
    console.warn(`[Client] Respuesta no-JSON del servidor (HTTP ${response.status}):`, rawText.slice(0, 300));
    let friendlyMsg = `Error del servidor (HTTP ${response.status})`;
    if (response.status === 504 || response.status === 408) {
      friendlyMsg = 'Tiempo de espera agotado (504 Gateway Timeout). La solicitud tardó más del límite permitido por el servidor.';
    } else if (response.status === 413) {
      friendlyMsg = 'Los archivos adjuntos exceden el límite de tamaño permitido por la red (10 MB). Reduce el tamaño o la cantidad de archivos.';
    } else if (response.status === 502 || response.status === 503) {
      friendlyMsg = 'Los servidores de IA experimentan alta demanda momentánea (503). Por favor, reintenta en unos instantes.';
    }
    resData = { success: false, error: friendlyMsg };
  }

  return {
    ok: response.ok && Boolean(resData?.success),
    status: response.status,
    statusText: response.statusText,
    resData
  };
}

export interface SuggestInterviewQuestionsPayload {
  direccion?: string;
  gerencia?: string;
  nombreProceso?: string;
  processName?: string;
  narrative?: string;
  draftNotes?: string;
}

export interface SuggestInterviewQuestionsResponse {
  success: boolean;
  data?: unknown[];
  questions?: unknown[];
  error?: string;
}

/**
 * Invoca el endpoint de sugerencia de preguntas para la entrevista (/api/suggest-interview-questions).
 */
export async function suggestInterviewQuestionsApi(
  payload: SuggestInterviewQuestionsPayload
): Promise<SuggestInterviewQuestionsResponse> {
  const res = await fetch('/api/suggest-interview-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return (await res.json()) as SuggestInterviewQuestionsResponse;
}

export interface RefineSectionPayload {
  sectionName: string;
  currentContent: unknown;
  instruction: string;
  processContext: {
    codigo?: string;
    nombre?: string;
    direccion?: string;
    gerencia?: string;
    tipoProceso?: string;
  };
}

export interface RefineSectionResponse {
  success: boolean;
  result?: unknown;
  error?: string;
}

/**
 * Invoca el endpoint de refinamiento de secciones individuales con IA (/api/refine-section).
 */
export async function refineSectionApi(payload: RefineSectionPayload): Promise<RefineSectionResponse> {
  const res = await fetch('/api/refine-section', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return (await res.json()) as RefineSectionResponse;
}
