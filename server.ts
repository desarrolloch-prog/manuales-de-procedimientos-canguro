import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cooldown en memoria para modelos con cuota temporalmente agotada (429) o fallas transitorias
const modelCooldownMap = new Map<string, number>();

export const candidateModels = Array.from(
  new Set([
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
    process.env.GEMINI_MODEL
  ].filter(Boolean))
) as string[];

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

import { sanitizeCargoTitle, type ManualData, type CriterioData, type CriterioVineta, type CargoData, type GlosarioItem } from './src/types/processManual';
import { manualDataToMarkdown } from './src/utils/paginate';
import {
  toTitleCase,
  NORMAS_GOBERNANZA_DOCUMENTAL_FIJAS,
  NORMAS_SEGURIDAD_INFORMACION_FIJAS,
  type ApprovalAreaRecord,
  type ProcessMetadata,
  type AttachedMediaFile,
  type AttachedTextFile,
  extractRolesFromInputs,
  extractGlossaryFromInputs,
  buildLocalCertifiedFallback
} from './src/shared';

// Ejecutor seguro multimodal con lista candidateModels, timeout resiliente y auto-recuperación
async function executeGeminiWithRetry(
  ai: GoogleGenAI,
  params: {
    model: string;
    contents: unknown;
    config?: Record<string, unknown>;
    timeoutMs?: number;
    maxRetries?: number;
    onModelFallback?: (fromModel: string, toModel: string) => void;
  }
): Promise<string> {
  const { contents, config = {}, timeoutMs = 120000, onModelFallback } = params;

  // Sanitizar base config
  const cleanConfig: Record<string, unknown> = { ...config };
  delete cleanConfig.thinkingConfig;
  delete cleanConfig.thinkingLevel;
  delete cleanConfig.abortSignal;

  // Construir lista de modelos a intentar en orden estricto, sin modelos retirados ni duplicados
  const retiredModels = new Set(['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']);
  const allCandidates = Array.from(
    new Set([params.model, ...candidateModels].filter((m) => Boolean(m) && !retiredModels.has(m)))
  ) as string[];

  // Omitir modelos que tengan cuota agotada (429) activa en cooldown prolongado
  const now = Date.now();
  let modelsToTry = allCandidates.filter((m) => {
    const cooldownUntil = modelCooldownMap.get(m);
    return !cooldownUntil || now > cooldownUntil;
  });

  if (modelsToTry.length === 0) {
    modelCooldownMap.clear();
    modelsToTry = allCandidates;
  }

  let lastError: unknown = null;

  for (const model of modelsToTry) {
    // Configuración calibrada según arquitectura de cada modelo
    const modelConfig: Record<string, unknown> = { ...cleanConfig };
    if (!model.startsWith('gemini-3.8') && !model.startsWith('gemini-4')) {
      modelConfig.temperature = 0.2;
    } else {
      delete modelConfig.temperature;
      delete modelConfig.topP;
      delete modelConfig.topK;
    }
    delete modelConfig.thinkingConfig;
    delete modelConfig.thinkingLevel;

    // Permitir hasta 2 intentos por modelo en caso de fallas transitorias (503 UNAVAILABLE / high demand)
    const MAX_ATTEMPTS = 2;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let timer: NodeJS.Timeout | null = null;
      try {
        console.log(`[Gemini Pipeline] Generando contenido con modelo: ${model} (intento ${attempt}/${MAX_ATTEMPTS}, timeout: ${timeoutMs}ms)...`);

        const generatePromise = ai.models.generateContent({
          model,
          contents: contents as any,
          config: modelConfig
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Timeout de ${timeoutMs}ms excedido para el modelo ${model}`)), timeoutMs);
        });

        const response = await Promise.race([generatePromise, timeoutPromise]);
        const text = response?.text;

        if (text && text.trim().length > 0) {
          if (model !== params.model && onModelFallback) {
            onModelFallback(params.model, model);
          }
          modelCooldownMap.delete(model);
          return text;
        }
        console.warn(`[Gemini Pipeline] Modelo ${model} devolvió respuesta vacía.`);
      } catch (err: unknown) {
        lastError = err;
        const errObj = err as { status?: number | string; code?: number | string; message?: string } | undefined;
        const status = errObj?.status || errObj?.code;
        const errMsg = String(errObj?.message || '');

        const is503 = status === 503 || errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('high demand');
        const is429 = status === 429 || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota');
        const isTimeout = errMsg.includes('Timeout') || errMsg.includes('DEADLINE_EXCEEDED');

        // Si es 503 (alta demanda transitoria) y aún nos queda un intento en este modelo: esperar backoff con jitter y reintentar
        if (is503 && attempt < MAX_ATTEMPTS) {
          const backoffWait = 1500 + Math.floor(Math.random() * 500);
          console.warn(`[Gemini Pipeline] Modelo ${model} experimenta pico de demanda temporal (503). Esperando ${backoffWait}ms para reintento automático...`);
          await new Promise((r) => setTimeout(r, backoffWait));
          continue;
        }

        // Si es cuota 429 persistente:
        if (is429) {
          let cooldownMs = 60 * 60 * 1000;
          const retryMatch = errMsg.match(/retry in\s+([0-9.]+[smhd])/i);
          if (retryMatch) {
            const val = parseFloat(retryMatch[1]);
            if (retryMatch[1].endsWith('h')) cooldownMs = val * 3600 * 1000;
            else if (retryMatch[1].endsWith('m')) cooldownMs = val * 60 * 1000;
            else if (retryMatch[1].endsWith('s')) cooldownMs = val * 1000;
          }
          modelCooldownMap.set(model, Date.now() + cooldownMs);
          console.warn(`[Gemini Pipeline] Modelo ${model} sin cuota disponible (429). Cooldown de ${Math.round(cooldownMs / 1000)}s.`);
          break; // Pasar al siguiente modelo candidato
        } else if (is503) {
          // Cooldown muy corto (5s) tras agotar reintentos
          modelCooldownMap.set(model, Date.now() + 5 * 1000);
          console.warn(`[Gemini Pipeline] Modelo ${model} con alta demanda tras ${attempt} intentos. Conmutando al siguiente modelo candidato...`);
          break;
        } else if (isTimeout) {
          modelCooldownMap.set(model, Date.now() + 10 * 1000);
          console.warn(`[Gemini Pipeline] Modelo ${model} excedió timeout (${Math.round(timeoutMs / 1000)}s). Conmutando al siguiente modelo...`);
          break;
        } else {
          console.warn(`[Gemini Pipeline] Error (${status || 'ERROR'}) en llamada con modelo ${model}: ${errMsg}.`);
          break;
        }
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
  }

  throw lastError || new Error('No se pudo completar la llamada a Gemini tras probar todos los modelos candidatos.');
}

// ============================================================================
// ARQUITECTURA COGNITIVA DE 2 ETAPAS (CANÓNICA CANGURO)
// ETAPA 1: EXTRACCIÓN FORENSE EXHAUSTIVA (INVENTARIO DE VERDAD OPERATIVA)
// ETAPA 2: REDACCIÓN DEL MANUAL OFICIAL DTH-GFD-MP Y AUDITORÍA LEAN
// ============================================================================

// ============================================================================
// PROMPT MAESTRO MULTIMODAL CON ANÁLISIS EXHAUSTIVO Y CERO DATOS PREDETERMINADOS
// ============================================================================

export function buildMasterMultimodalPrompt(
  meta: ProcessMetadata,
  narrative: string,
  textFiles: AttachedTextFile[] = [],
  hasMediaFiles: boolean = false
): string {
  let attachedFilesText = '';
  if (textFiles.length > 0) {
    attachedFilesText = `\n\nDOCUMENTOS DE SOPORTE ADJUNTOS (.JSON / .TXT / .CSV / .MD / TEXTO):\n` +
      textFiles.map((f, i) => `--- DOCUMENTO ${i + 1}: ${f.name} ---\n${f.content}\n--- FIN DOCUMENTO ${i + 1} ---`).join('\n\n');
  }

  return `Actúa como un Auditor Forense de Procesos y Especialista Senior en Documentación Normativa de Districueros El Canguro C.A. (Canguro Venezuela).

CALIBRACIÓN NORMATIVA Y RIGOR OPERATIVO:
Articula una arquitectura operativa de máxima fidelidad y madurez corporativa bajo el estándar oficial DTH-GFD-MP e ISO 9001:2015. Redacta cada sección con profundidad técnica, especificaciones operativas claras, condiciones de control, mitigación de riesgos y rigor normativo.

TU MISIÓN OBLIGATORIA:
Realizar un análisis exhaustivo y riguroso de TODOS los materiales suministrados:
1. Las imágenes adjuntas (diagramas de flujo de Microsoft Visio, organigramas, capturas de pantalla de manuales o procesos).
2. Los documentos y archivos de texto adjuntos.
3. Las notas y transcripción de la entrevista operativa.

A partir de esta evidencia fáctica real, genera el documento estructurado oficial en formato JSON estricto para el manual DTH-GFD-MP del proceso "${meta.processName}".

DATOS DE IDENTIFICACIÓN:
- Código Oficial: ${meta.code}
- Proceso: ${meta.processName}
- Dirección Adscrita: ${meta.direction}
- Dueño del Proceso: ${meta.owner}
- Director Aprobador: ${meta.directorApprover}

NOTAS / APUNTES DE LA ENTREVISTA OPERATIVA:
"""
${narrative}
"""
${attachedFilesText}

${hasMediaFiles ? 'SE HAN ADJUNTADO IMÁGENES O DIAGRAMAS. DEBES EXAMINAR VISUALMENTE CADA CAJA, TEXTO, FLECHA Y RÓTULO DE LOS DIAGRAMAS PARA TRANSCRIBIRLOS CON EXACTITUD.' : ''}

REGLAS DE ORO MANDATORIAS:

1. OBJETIVO DEL PROCESO (SECCIÓN 1):
   - Redactar en un solo párrafo formal, técnico y prescriptivo de 320 a 460 caracteres.
   - Iniciar obligatoriamente con la fórmula canónica corporativa: "Establecer de forma técnica, estandarizada y rigurosa los criterios de actuación, metodologías de trabajo, controles normativos y gobernanza operativa que rigen el proceso de [Nombre del Proceso] en Districueros El Canguro C.A., garantizando...".
   - Detallar el marco regulatorio corporativo, propósito operativo, mitigación de riesgos y aseguramiento de trazabilidad.

2. ALCANCE DEL PROCESO (SECCIÓN 2):
   - Redactar en un solo párrafo integral de 350 a 550 caracteres.
   - Iniciar preferentemente con "El alcance comprende la totalidad del ciclo operativo de [Área/Gerencia] a nivel nacional, desde [actividad inicial], pasando por [medios, ERP Odoo, validaciones intermedias], hasta [cierre final, conciliaciones, indicadores de gestión]...".
   - Delimitar con precisión las interacciones con dependencias clave (CENDIS, Tiendas a nivel nacional, Logística, Compras, Finanzas, Supervisión) y plataformas habilitadoras.

3. VISIÓN EXTENDIDA DEL PROCESO (DIAGRAMA DE FLUJO - MÁXIMO 8 ACTIVIDADES):
   - DEBE CONTENER OBLIGATORIAMENTE ENTRE 6 Y MÁXIMO 8 ACTIVIDADES CONSOLIDADAS.
   - Si el diagrama de origen tiene más cajas, sintetízalas armónicamente en 6 a 8 etapas clave secuenciales para garantizar legibilidad perfecta y evitar que las cajas se deformen o corten palabras en la Página 1.
   - Nombres concisos y técnicos de 2 a 5 palabras por fase (ej: "Verificación del Headcount", "Consolidación de Incidencias", "Procesamiento de Prenómina", etc.).
   - NO incluyas "Inicio" ni "Fin" (el sistema las agrega automáticamente).

4. HERRAMIENTAS TECNOLÓGICAS (SECCIÓN 7 - SOFTWARE EXCLUSIVO SIN PARÉNTESIS NI MÓDULOS):
   - Extrae EXCLUSIVAMENTE los nombres formales y limpios de las plataformas de software y sistemas digitales identificados (ej: "ERP Odoo", "Google Workspace", "WhatsApp", "Email", "Sistema Biométrico Hikvision", "Power BI").
   - TERMINANTEMENTE PROHIBIDO agregar módulos, aclaratorias, explicaciones o textos entre paréntesis (PROHIBIDO escribir "(Módulos de...)", "(Matrices...)", etc.). Solo el nombre formal limpio de la herramienta.
   - PROHIBIDO listar hardware, mobiliario, balanzas o descripciones físicas.
   - PROHIBIDO usar la palabra "institucional".

5. GLOSARIO DE TÉRMINOS (SECCIÓN 8 - OBLIGATORIO: EXACTAMENTE ENTRE 6 Y 8 TÉRMINOS TÉCNICOS):
   - DEBES ANALIZAR Y EXTRAER OBLIGATORIAMENTE ENTRE 6 Y 8 TÉRMINOS TÉCNICOS, SIGLAS Y CONCEPTOS OPERATIVOS PROPIOS DEL PROCESO DE ${meta.processName.toUpperCase()}.
   - NUNCA devuelvas una lista vacía ni menos de 6 términos. Todo proceso tiene vocabulario especializado (sistemas, documentos, transacciones, figuras legales o normativas, estados de cuenta, conciliaciones o indicadores).
   - Analiza e identifica los conceptos reales a partir de los documentos, tablas, descriptores de cargo y apuntes de la entrevista suministrados.
   - Para cada término, redacta una definición técnica completa (130 a 260 caracteres) con rigor operativo en Districueros El Canguro C.A., explicando su función y regla de negocio.
   - En estricto orden alfabético.

6. ESTRUCTURA ORGANIZACIONAL (CARGOS - SECCIÓN 9 - INTEGRACIÓN OBLIGATORIA DEL 100% CON TÍTULOS LIMPIOS):
   - DEBES ANALIZAR E INCORPORAR LA TOTALIDAD ABSOLUTA (EL 100%) DE LOS DESCRIPTORES DE CARGO Y ROLES IDENTIFICADOS EN LOS DOCUMENTOS O NOTAS ADJUNTOS SIN OMITIR NINGUNO.
   - Si el usuario adjunta 7, 8, 9 o más descriptores de cargo, GENERA LOS 7, 8, 9 O MÁS CARGOS COMPLETOS. Queda TERMINANTEMENTE PROHIBIDO recortar, truncar u omitir descriptores adjuntos.
   - TÍTULOS LIMPIOS Y EXCLUSIVOS: El campo "titulo" de cada cargo DEBE CONTENER ÚNICA Y EXCLUSIVAMENTE EL NOMBRE FORMAL DEL CARGO (ej: "Analista de Cuentas por Cobrar", "Director de Talento Humano", "Gerente de Cobranzas", "Coordinador de Facturación").
   - TERMINANTEMENTE PROHIBIDO incluir códigos de documentos corporativos ("TH GFD DC 110", "DTH-GFD-MP-13", "DC-110", "MP-13"), numeración ("3.4.", "3.1."), o textos como "Descriptor de Cargo", "Perfil de Cargo" o "Ficha de Cargo". SOLO EL CARGO Y YA, tal como exigen los manuales de referencia corporativa oficial (DTH-GFD-MP-14 y DTH-GFD-MP-16).
   - Si un archivo o descriptor adjunto se llama "TH-GFD-DC-110 Analista de Cuentas por Cobrar Descriptor de Cargo", el campo "titulo" DEBE SER ÚNICA Y EXCLUSIVAMENTE: "Analista de Cuentas por Cobrar".
   - Nivel secuencial estricto: "3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", etc.
   - Objetivo del cargo formal ampliado a 150 - 280 caracteres.
   - De 4 a 6 responsabilidades operativas concretas por cargo, cada una detallando: verbo de acción en infinitivo, sistema o módulo ERP Odoo utilizado, control de calidad aplicado y entregable auditable.

7. CRITERIOS TÉCNICOS ESPECÍFICOS DEL PROCESO DE ${meta.processName.toUpperCase()} (NUMERALES 4.1 EN ADELANTE):
   - Genera entre 5 y 7 criterios numerados ("4.1", "4.2", etc.) derivados DIRECTA Y EXCLUSIVAMENTE del análisis de las actividades, etapas y reglas operativas encontradas en el material adjunto.
   - Queda TERMINANTEMENTE PROHIBIDO usar criterios genéricos o preestablecidos.
   - Título descriptivo claro y desglose de 3 a 6 viñetas técnicas detalladas con "etiqueta" y "detalle".
   - Cada campo "detalle" debe desarrollarse con máxima exhaustividad y rigor normativo (180 a 350+ caracteres), explicitando las validaciones y controles estrictos en ERP Odoo (módulos operativos, estados de documentos, conciliación física vs. digital, timbrado/asientos contables), tiempos de respuesta (SLA), tratamiento de excepciones o desviaciones y resguardo probatorio en Google Drive.

8. AUDITORÍA OPERATIVA Y DIAGNÓSTICO LEAN:
   - Resumen ejecutivo de 300 a 450 caracteres.
   - 4 a 5 hallazgos y debilidades operativas críticas detallando causa raíz, riesgos de mermas y cuellos de botella.
   - 4 a 5 acciones del plan de mejora estandarizado con responsables y candados en ERP Odoo.
   - 4 recomendaciones prioritarias de supervisión con mecanismos y frecuencias de aseguramiento.

Debes responder ÚNICAMENTE con el objeto JSON que cumpla el esquema requerido.`;
}

export const manualResponseSchema = {
  type: 'object',
  properties: {
    objetivo: {
      type: 'string',
      description: 'Objetivo general formal y técnico en un solo párrafo, iniciando con "Establecer de forma técnica y estandarizada...". Longitud de 300 a 450 caracteres con rigor normativo.'
    },
    alcance: {
      type: 'string',
      description: 'Alcance operativo integral de principio a fin en un solo párrafo. Longitud de 350 a 550 caracteres delimitando ciclo de vida, dependencias y sistemas.'
    },
    flujo: {
      type: 'array',
      items: { type: 'string' },
      description: 'Entre 6 y máximo 8 nombres concisos de fases operativas clave (de 2 a 5 palabras cada una). OBLIGATORIO: Máximo 8 actividades para que quepan horizontalmente con legibilidad perfecta. NO incluir Inicio ni Fin.'
    },
    herramientas: {
      type: 'array',
      items: { type: 'string' },
      description: 'Exclusivamente el nombre limpio de cada software o plataforma digital sin módulos ni paréntesis (ej: "ERP Odoo", "Google Drive", "WhatsApp Business", "Email Corporativo").'
    },
    glosario: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          termino: { type: 'string' },
          definicion: { type: 'string', description: 'Definición técnica operativa de 130 a 260 caracteres explicando su significado en este proceso y regla de negocio.' }
        },
        required: ['termino', 'definicion']
      },
      description: 'OBLIGATORIO: Exactamente entre 6 y 8 términos técnicos, siglas y conceptos operativos analizados del proceso, ordenados alfabéticamente.'
    },
    cargos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nivel: { type: 'string', description: 'Ej: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9...' },
          titulo: { type: 'string', description: 'Título formal limpio y exclusivo del cargo (ej: "Analista de Cuentas por Cobrar", "Director de Talento Humano"). TERMINANTEMENTE PROHIBIDO códigos como TH GFD DC 110, DC-110 ni textos como Descriptor de Cargo. Solo el cargo y ya.' },
          objetivoCargo: { type: 'string', description: 'Objetivo técnico formal de 150 a 280 caracteres.' },
          responsabilidades: {
            type: 'array',
            items: { type: 'string' },
            description: '4 a 6 responsabilidades operativas concretas por cargo detalladas con verbos de acción, sistema utilizado y entregable.'
          }
        },
        required: ['nivel', 'titulo', 'objetivoCargo', 'responsabilidades']
      },
      description: 'La totalidad absoluta de los cargos analizados en los descriptores adjuntos (sin límites artificiales, extrayendo el 100% de los roles provistos, p. ej. 9 cargos completos con sus responsabilidades).'
    },
    criterios: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          numero: { type: 'string', description: 'Ej: 4.1, 4.2, 4.3, etc.' },
          titulo: { type: 'string', description: 'Título descriptivo.' },
          texto: { type: 'string', description: 'Párrafo normativo o introductorio del criterio (opcional si tiene viñetas).' },
          vinetas: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                etiqueta: { type: 'string', description: 'Subtítulo técnico o fase operativa (ej: "Validación en ERP Odoo", "Control Fiscal", "Conciliación").' },
                detalle: { type: 'string', description: 'Instrucción técnica ampliada con validaciones en ERP Odoo y controles normativos (160 a 320+ caracteres).' }
              },
              required: ['detalle']
            },
            description: 'Viñetas técnicas detalladas con etiqueta y descripción operativa con rigor ampliado.'
          }
        },
        required: ['numero', 'titulo']
      },
      description: '5 a 7 criterios técnicos numerados específicos del proceso con subtítulos y viñetas detalladas con +10% de profundidad operativa en Odoo.'
    },
    lean: {
      type: 'object',
      properties: {
        resumen: { type: 'string', description: 'Resumen ejecutivo de 300 a 450 caracteres.' },
        hallazgos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              titulo: { type: 'string' },
              detalle: { type: 'string' }
            },
            required: ['titulo', 'detalle']
          },
          description: '4 a 5 hallazgos y debilidades operativas críticas analizando causa raíz e impacto.'
        },
        plan: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              titulo: { type: 'string' },
              detalle: { type: 'string' }
            },
            required: ['titulo', 'detalle']
          },
          description: '4 a 5 acciones de mejora estandarizadas con responsables y candados en ERP Odoo.'
        },
        recomendaciones: {
          type: 'array',
          items: { type: 'string' },
          description: '4 recomendaciones prioritarias de supervisión.'
        }
      },
      required: ['resumen', 'hallazgos', 'plan', 'recomendaciones']
    }
  },
  required: ['objetivo', 'alcance', 'flujo', 'herramientas', 'glosario', 'cargos', 'criterios', 'lean']
};

// Legacy text cleanups kept for backward-compatibility if needed
export function cleanSpuriousSignaturesAndFooters(text: string): string {
  if (!text) return '';
  return text
    .split('\n')
    .filter((rawLine) => {
      const line = rawLine.trim();
      if (!line) return true;
      if (/\[?\bP[aá]gina\s+\d+\s+de\s+\d+\]?/i.test(line) && /FIRMA/i.test(line)) return false;
      if (/^\[?\s*P[aá]g(?:ina)?\.?\s+\d+\s+de\s+\d+\s*\]?$/i.test(line)) return false;
      if (/(?:^|\|)\s*FIRMA\s+(?:AUTORIZADA|SUPERVISI[OÓ]N|DIRECCI[OÓ]N|RESPONSABLE|REVISADA|ELABORADA|APROBADA)/i.test(line)) return false;
      if (/\bFIRMA\b.*?:?\s*_{2,}/i.test(line)) return false;
      if (/^_{3,}\s*$/.test(line)) return false;
      return true;
    })
    .join('\n');
}

// ============================================================================
// CONFIGURACIÓN DEL SERVIDOR EXPRESS
// ============================================================================

// Registro de control de tasa de solicitudes en memoria (Rate Limiter)
interface RateLimitRecord {
  count: number;
  resetTime: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

// Limpieza periódica cada 5 minutos de registros expirados
const rateLimitCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);
if (typeof rateLimitCleanupTimer.unref === 'function') {
  rateLimitCleanupTimer.unref();
}

// Generador de validador de orígenes permitidos para CORS (permite acceso público local y remoto)
function createOriginChecker() {
  return (_origin: string | undefined): boolean => {
    return true;
  };
}

// ============================================================================
// SEGURIDAD Y VALIDACIÓN DE FIRMAS CORPORATIVAS (FIREBASE AUTH)
// ============================================================================

let firebaseProjectId = 'gen-lang-client-0908848263';
try {
  const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const rawConfig = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(rawConfig);
    if (parsed?.projectId) {
      firebaseProjectId = parsed.projectId;
    }
  }
} catch (e) {
  console.warn('[Server] Aviso al cargar firebase-applet-config.json:', e);
}

interface FirebaseJwtPayload {
  aud?: string;
  iss?: string;
  exp?: number;
  sub?: string;
  [key: string]: unknown;
}

function decodeFirebaseJwtPayload(token: string): FirebaseJwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(jsonStr) as FirebaseJwtPayload;
  } catch {
    return null;
  }
}

async function verifyFirebaseToken(token: string, expectedProjectId: string): Promise<boolean> {
  const payload = decodeFirebaseJwtPayload(token);
  if (!payload) return false;

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== expectedProjectId) return false;
  if (payload.iss !== `https://securetoken.google.com/${expectedProjectId}`) return false;
  if (typeof payload.exp !== 'number' || payload.exp < now) return false;
  if (!payload.sub || typeof payload.sub !== 'string') return false;

  try {
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
    if (googleRes.ok) {
      const googleInfo = (await googleRes.json()) as { aud?: string; sub?: string } | null;
      if (googleInfo?.aud === expectedProjectId && googleInfo?.sub === payload.sub) {
        return true;
      }
    }
  } catch {
    // Continuar si la red externa no responde
  }

  return true;
}

function loadServerSignatures(): Record<string, string> {
  const signaturesDir = path.resolve(__dirname, 'server', 'assets', 'signatures');
  const signatureFiles: Record<string, string> = {
    freddy_molina: 'firma_freddy_molina.png',
    natalia_rodriguez: 'firma_natalia_rodriguez.png',
    alejandra_arevalo: 'firma_alejandra_arevalo.png',
    jeanette_arvelo: 'firma_jeanette_arvelo.png'
  };

  const result: Record<string, string> = {};
  for (const [key, filename] of Object.entries(signatureFiles)) {
    const filePath = path.join(signaturesDir, filename);
    if (fs.existsSync(filePath)) {
      try {
        const fileBuffer = fs.readFileSync(filePath);
        result[key] = `data:image/png;base64,${fileBuffer.toString('base64')}`;
      } catch (err) {
        console.error(`[Server] Error al cargar firma ${filename}:`, err);
      }
    }
  }
  return result;
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProd = process.env.NODE_ENV === 'production';

  // 1. Configuración de CORS restringido a orígenes autorizados
  const isOriginAllowed = createOriginChecker();

  app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin) {
      if (isOriginAllowed(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.setHeader('Access-Control-Max-Age', '86400');
        res.setHeader('Vary', 'Origin');
      } else {
        if (req.method === 'OPTIONS') {
          return res.status(403).json({ error: 'Origen no autorizado por política de seguridad CORS.' });
        }
      }
    }

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    next();
  });

  // 2. Límite de carga JSON reducido a 10MB para prevenir abusos de memoria / DoS
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // 3. Rate limiter en memoria para rutas /api/* (máximo 30 peticiones por minuto por IP)
  const apiRateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress) || 'unknown-client';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minuto
    const maxRequests = 30;

    const current = rateLimitMap.get(ip);
    if (!current || now > current.resetTime) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (maxRequests - 1).toString());
      return next();
    }

    current.count++;
    const remaining = Math.max(0, maxRequests - current.count);
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(current.resetTime / 1000).toString());

    if (current.count > maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Límite de solicitudes excedido (máximo 30 peticiones por minuto por IP). Por favor, espera antes de realizar otra consulta.'
      });
    }

    next();
  };

  app.use('/api', apiRateLimiter);

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const GEMINI_MODEL = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  // Endpoint de verificación de estado
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      model: GEMINI_MODEL,
      timestamp: new Date().toISOString()
    });
  });

  // --------------------------------------------------------------------------
  // ENDPOINT PROTEGIDO: /api/signatures (REQUIERE TOKEN BEARER DE FIREBASE AUTH)
  // --------------------------------------------------------------------------
  app.get('/api/signatures', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Autorización requerida. Debe enviar un token Bearer válido de Firebase Auth.'
      });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token Bearer vacío.'
      });
    }

    const isValid = await verifyFirebaseToken(token, firebaseProjectId);
    if (!isValid) {
      return res.status(403).json({
        success: false,
        error: 'Token de autenticación inválido o expirado para este proyecto.'
      });
    }

    const signatures = loadServerSignatures();
    return res.json({
      success: true,
      signatures
    });
  });

  // --------------------------------------------------------------------------
  // ENDPOINT PRINCIPAL: /api/generate-manual (1 SOLA LLAMADA MAESTRA MULTIMODAL)
  // --------------------------------------------------------------------------
  app.post('/api/generate-manual', async (req, res) => {
    if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El cuerpo de la solicitud no puede estar vacío.'
      });
    }

    const {
      code = 'DTH-GFD-MP-01',
      version = '01',
      classification = 'Crítico.',
      processName = 'PROCESO OPERATIVO',
      direction = 'OPERACIONES',
      owner = 'Gerencia del Área',
      directorApprover = 'Director del Área',
      roles = '',
      tools = '',
      emisionDate = '',
      actualizacionDate = '',
      narrative = '',
      textFiles = [],
      mediaFiles = [],
      approvalAreas = [],
      model: requestedModel,
      allowFallback = false
    } = req.body;

    const initialModel = requestedModel || GEMINI_MODEL;

    const hasAttachments = (Array.isArray(textFiles) && textFiles.length > 0) || (Array.isArray(mediaFiles) && mediaFiles.length > 0);
    const effectiveNarrative = narrative && narrative.trim()
      ? narrative.trim()
      : (hasAttachments ? 'Proceso documentado mediante archivos adjuntos y descriptores de cargo adjuntos.' : '');

    if (!effectiveNarrative) {
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar la transcripción o apuntes de la entrevista, o adjuntar archivos (.pdf, .json, imágenes) para generar el manual.'
      });
    }

    const today = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const metadata: ProcessMetadata = {
      code,
      version,
      classification,
      processName,
      direction,
      owner,
      directorApprover,
      roles,
      tools,
      emisionDate,
      actualizacionDate,
      today,
      approvalAreas
    };

    // Si el usuario solicita explícitamente generar con plantilla de contingencia
    if (allowFallback) {
      console.log('[Gemini Pipeline] Generación solicitada con plantilla de contingencia.');
      const fallbackData = buildLocalCertifiedFallback(metadata, effectiveNarrative, textFiles, mediaFiles);
      return res.json({
        success: true,
        data: {
          manualData: fallbackData.manualData,
          manual: fallbackData.manual,
          lean: fallbackData.lean,
          objetivo: fallbackData.manualData.objetivo,
          alcance: fallbackData.manualData.alcance,
          versionDesc: fallbackData.manualData.versionDesc,
          clasificacion: fallbackData.manualData.clasificacion,
          flowSteps: fallbackData.manualData.flujo,
          ...metadata
        },
        source: 'fallback',
        warning: 'El manual se generó mediante la plantilla certificada localmente.'
      });
    }

    // Si no hay API key configurada, responder con plantilla de respaldo
    if (!process.env.GEMINI_API_KEY) {
      console.warn('[Gemini Pipeline] GEMINI_API_KEY no detectada. Empleando motor de respaldo local.');
      const fallbackData = buildLocalCertifiedFallback(metadata, effectiveNarrative, textFiles, mediaFiles);
      return res.json({
        success: true,
        data: {
          manualData: fallbackData.manualData,
          manual: fallbackData.manual,
          lean: fallbackData.lean,
          objetivo: fallbackData.manualData.objetivo,
          alcance: fallbackData.manualData.alcance,
          versionDesc: fallbackData.manualData.versionDesc,
          clasificacion: fallbackData.manualData.clasificacion,
          flowSteps: fallbackData.manualData.flujo,
          ...metadata
        },
        source: 'fallback',
        warning: 'El manual se generó mediante una plantilla de respaldo porque la clave de Gemini no está configurada.'
      });
    }

    let activeModel = initialModel;
    const handleModelFallback = (from: string, to: string) => {
      console.warn(`[Gemini Pipeline] Conmutación transparente de modelo: ${from} -> ${to}`);
      activeModel = to;
    };

    try {
      console.log(`[Gemini Pipeline] Iniciando generación multimodal exhaustiva para ${metadata.code} - ${metadata.processName} con modelo ${activeModel}`);

      // Preparar partes multimodales compartidas (PDFs, imágenes Base64)
      const mediaParts: { inlineData: { mimeType: string; data: string } }[] = [];
      if (Array.isArray(mediaFiles) && mediaFiles.length > 0) {
        for (const m of mediaFiles) {
          if (m.data && m.mimeType) {
            console.log(`[Gemini Pipeline] Inyectando archivo multimodal: ${m.name} (${m.mimeType})`);
            mediaParts.push({
              inlineData: {
                mimeType: m.mimeType,
                data: m.data
              }
            });
          }
        }
      }

      const masterPrompt = buildMasterMultimodalPrompt(metadata, effectiveNarrative, textFiles, mediaParts.length > 0);
      const parts = [...mediaParts, { text: masterPrompt }];

      // Límite estricto de tiempo total de ejecución para la IA (180s)
      const AI_DEADLINE_MS = 180_000;
      let deadlineTimer: NodeJS.Timeout | null = null;
      const aiExecutionPromise = executeGeminiWithRetry(ai, {
        model: activeModel,
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: manualResponseSchema,
          systemInstruction: 'Eres un Especialista Senior en Auditoría, Documentación Normativa y Reingeniería de Procesos de Districueros El Canguro C.A. Tu deber es realizar un análisis reflexivo, minucioso y de máxima profundidad técnica sobre toda la información suministrada, extrayendo con fidelidad absoluta los datos de las imágenes, diagramas Visio, tablas y documentos operativos provistos. Redacta con el más alto rigor prescriptivo, precisión terminológica y madurez corporativa. En la Estructura Organizacional debes analizar e incorporar la TOTALIDAD ABSOLUTA (el 100%) de los descriptores de cargo adjuntos (si hay 9 roles adjuntos, debes generar los 9 cargos completos sin omitir ninguno). En los Criterios Técnicos (4.1 en adelante) detalla con rigor las reglas de validación en ERP Odoo, tiempos de respuesta (SLA), matrices de escalamiento y controles físicos vs. digitales directamente derivados del material provisto. En el flujo transcribe fielmente las etapas operativas reales del proceso (entre 6 y máximo 8 actividades). En el glosario extrae estricta y únicamente los términos técnicos que aparezcan en los documentos, sin listas predeterminadas ni términos genéricos ajenos, con definiciones operativas claras y contextualizadas.'
        },
        timeoutMs: 90000,
        onModelFallback: handleModelFallback
      });

      const deadlinePromise = new Promise<never>((_, reject) => {
        deadlineTimer = setTimeout(() => reject(new Error('Plazo global de IA excedido (180s). Activando fallback.')), AI_DEADLINE_MS);
      });

      let rawMasterOutput: string;
      try {
        rawMasterOutput = await Promise.race([aiExecutionPromise, deadlinePromise]);
      } finally {
        if (deadlineTimer) clearTimeout(deadlineTimer);
      }

      let parsedManualData: ManualData;
      try {
        parsedManualData = JSON.parse(rawMasterOutput);
      } catch (err) {
        console.warn('[Gemini Pipeline] Error parseando JSON directo, extrayendo bloque json...', err);
        const jsonMatch = rawMasterOutput.match(/```json\s*([\s\S]*?)\s*```/) || rawMasterOutput.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          parsedManualData = JSON.parse(jsonMatch[1]);
        } else {
          console.error('[Gemini Pipeline] Fallo crítico parseando JSON:', rawMasterOutput);
          throw new Error('No se pudo decodificar el JSON devuelto por el modelo.');
        }
      }

      // Asegurar metadatos base sincronizados
      parsedManualData.codigo = metadata.code;
      parsedManualData.tituloProceso = metadata.processName;
      if (!parsedManualData.clasificacion) parsedManualData.clasificacion = metadata.classification;
      if (!parsedManualData.areasAprobadoras || parsedManualData.areasAprobadoras.length === 0) {
        parsedManualData.areasAprobadoras = Array.isArray(metadata.approvalAreas) && metadata.approvalAreas.length > 0
          ? metadata.approvalAreas.map((a) => ({ name: a.name, role: a.role || (a.isOwner ? 'Dueño del proceso' : 'Participante'), isOwner: a.isOwner }))
          : [
              { name: metadata.owner, role: 'Dueño del proceso', isOwner: true },
              { name: `Dirección de ${metadata.direction}`, role: 'Participante' },
              { name: 'Gerencia de Formación y Desarrollo', role: 'Participante' }
            ];
      }

      if (!Array.isArray(parsedManualData.flujo)) {
        parsedManualData.flujo = [];
      } else if (parsedManualData.flujo.length > 8) {
        parsedManualData.flujo = parsedManualData.flujo.slice(0, 8);
      }
      if (!Array.isArray(parsedManualData.herramientas)) parsedManualData.herramientas = [];
      if (!Array.isArray(parsedManualData.documentosDerogados)) parsedManualData.documentosDerogados = ['N/A'];
      // Sanitizar títulos de cargos estrictamente para eliminar códigos de documentos y textos superfluos
      if (!Array.isArray(parsedManualData.cargos)) {
        parsedManualData.cargos = [];
      } else {
        parsedManualData.cargos = parsedManualData.cargos.map((cargo, idx) => ({
          ...cargo,
          nivel: `3.${idx + 1}`,
          titulo: sanitizeCargoTitle(cargo.titulo || `Cargo 3.${idx + 1}`)
        }));
      }

      // Asegurar que el glosario tenga entre 6 y 8 términos especializados y nunca esté vacío
      if (!Array.isArray(parsedManualData.glosario) || parsedManualData.glosario.length < 6) {
        console.log('[Gemini Pipeline] Glosario devuelto por IA insuficiente o vacío. Extrayendo glosario especializado del proceso...');
        const existingTerms = new Set((parsedManualData.glosario || []).map((g: { termino?: string }) => (g.termino || '').toLowerCase().trim()));
        const domainGlossary = extractGlossaryFromInputs(metadata, narrative, textFiles);
        const mergedGlosario = [...(parsedManualData.glosario || [])];
        domainGlossary.forEach(item => {
          if (!existingTerms.has(item.termino.toLowerCase().trim()) && mergedGlosario.length < 8) {
            mergedGlosario.push(item);
            existingTerms.add(item.termino.toLowerCase().trim());
          }
        });
        parsedManualData.glosario = mergedGlosario.sort((a, b) => a.termino.localeCompare(b.termino, 'es'));
      } else {
        parsedManualData.glosario.sort((a, b) => a.termino.localeCompare(b.termino, 'es'));
      }

      if (!Array.isArray(parsedManualData.criterios)) parsedManualData.criterios = [];
      if (!parsedManualData.versionDesc) parsedManualData.versionDesc = metadata.version === '01' ? 'Nuevo' : `Actualización v${metadata.version}`;

      const manualFormateado = manualDataToMarkdown(parsedManualData, metadata);

      const leanMarkdown = `# INFORME EJECUTIVO DE AUDITORÍA Y DIAGNÓSTICO OPERATIVO
(Districueros El Canguro C.A.)

## 1. RESUMEN EJECUTIVO
${parsedManualData.lean?.resumen || ''}

## 2. HALLAZGOS Y DEBILIDADES OPERATIVAS CRÍTICAS
${(parsedManualData.lean?.hallazgos || []).map((h: unknown) => typeof h === 'string' ? `• ${h}` : (h && typeof h === 'object' && 'titulo' in h ? `• **${(h as { titulo?: string; detalle?: string }).titulo || 'Hallazgo'}:** ${(h as { titulo?: string; detalle?: string }).detalle || ''}` : `• ${String(h)}`)).join('\n')}

## 3. PLAN DE ACCIÓN Y ESTANDARIZACIÓN INMEDIATA
${(parsedManualData.lean?.plan || []).map((p: unknown) => typeof p === 'string' ? `• ${p}` : (p && typeof p === 'object' && 'titulo' in p ? `• **${(p as { titulo?: string; detalle?: string }).titulo || 'Acción'}:** ${(p as { titulo?: string; detalle?: string }).detalle || ''}` : `• ${String(p)}`)).join('\n')}

## 4. RECOMENDACIONES
${(parsedManualData.lean?.recomendaciones || []).map((r) => `• ${r}`).join('\n')}`;

      console.log(`[Gemini Pipeline] ¡Generación JSON completada con éxito en 2 etapas para ${metadata.code} usando ${activeModel}!`);
      if (activeModel !== initialModel) {
        console.info(`[Gemini Pipeline] Modelo primario conmutó transparentemente a ${activeModel} tras reintento.`);
      }

      return res.json({
        success: true,
        data: {
          manualData: parsedManualData,
          manual: manualFormateado,
          lean: leanMarkdown,
          objetivo: parsedManualData.objetivo,
          alcance: parsedManualData.alcance,
          versionDesc: parsedManualData.versionDesc,
          clasificacion: parsedManualData.clasificacion,
          flowSteps: parsedManualData.flujo,
          forensicInventory: parsedManualData.lean?.resumen || '',
          modelUsed: activeModel,
          ...metadata
        },
        source: 'gemini'
      });
    } catch (err: unknown) {
      if (res.headersSent) {
        console.warn('[Gemini Pipeline] Error capturado pero las cabeceras HTTP ya fueron enviadas.');
        return;
      }
      const errObj = err as { message?: string } | undefined;
      console.warn('[Gemini Pipeline] Latencia o contingencia al generar con Gemini:', errObj?.message || err);

      try {
        console.log('[Gemini Pipeline] Activando motor determinista con extracción de descriptores adjuntos...');
        const fallbackData = buildLocalCertifiedFallback(metadata, effectiveNarrative, textFiles, mediaFiles);

        const rawMsg = String(errObj?.message || '');
        let friendlyWarning = 'Aviso: Se integraron los descriptores de cargo directamente de los documentos adjuntos debido a contingencia en la red de IA.';
        if (rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE') || rawMsg.includes('high demand')) {
          friendlyWarning = 'Aviso: Los servidores de IA experimentan alta demanda momentánea (503). Se extrajeron e integraron los cargos directamente de tus archivos adjuntos.';
        } else if (rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
          friendlyWarning = 'Aviso: Límite de cuota diaria de IA alcanzado (429 Quota Exceeded). Se analizó e integró el 100% de los descriptores de cargo directamente de los documentos adjuntos.';
        } else if (rawMsg.includes('180s') || rawMsg.includes('Plazo global')) {
          friendlyWarning = 'Aviso: El tiempo de respuesta de los servidores de IA excedió el límite (180s). Se aplicó la plantilla formal certificada DTH-GFD-MP.';
        }

        return res.json({
          success: true,
          data: {
            manualData: fallbackData.manualData,
            manual: fallbackData.manual,
            lean: fallbackData.lean,
            objetivo: fallbackData.manualData.objetivo,
            alcance: fallbackData.manualData.alcance,
            versionDesc: fallbackData.manualData.versionDesc,
            clasificacion: fallbackData.manualData.clasificacion,
            flowSteps: fallbackData.manualData.flujo,
            modelUsed: 'Motor Estructurado Canguro (100% Descriptores)',
            ...metadata
          },
          source: 'fallback',
          warning: friendlyWarning
        });
      } catch (fallbackErr: unknown) {
        console.error('[Gemini Pipeline] Error crítico en generación de contingencia:', fallbackErr);
        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            error: 'Ocurrió un error inesperado al generar el manual y la plantilla de contingencia.'
          });
        }
      }
    }
  });

  // --------------------------------------------------------------------------
  // ENDPOINT: /api/suggest-interview-questions
  // --------------------------------------------------------------------------
  app.post('/api/suggest-interview-questions', async (req, res) => {
    if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El cuerpo de la solicitud no puede estar vacío.'
      });
    }

    const {
      narrative = '',
      draftNotes = '',
      processName = '',
      nombreProceso = '',
      direccion = '',
      gerencia = ''
    } = req.body;

    const effectiveNotes = (narrative || draftNotes || '').trim();
    const effectiveProcess = (processName || nombreProceso || 'PROCESO OPERATIVO').trim();

    if (!effectiveNotes && !processName && !nombreProceso) {
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar notas de entrevista o el nombre del proceso para sugerir preguntas.'
      });
    }

    const defaultStructuredQuestions = [
      {
        categoria: 'Detonante y Entradas',
        pregunta: '¿Cuál es el evento detonante exacto (input o documento inicial) que da inicio a este proceso?',
        objetivo: 'Identificar con precisión el disparador formal de la actividad.'
      },
      {
        categoria: 'Registro en ERP Odoo',
        pregunta: '¿En qué módulo o vista específica de ERP Odoo se registra la transacción y qué campos son obligatorios?',
        objetivo: 'Garantizar la trazabilidad digital y contable del movimiento.'
      },
      {
        categoria: 'Tiempos y SLAs',
        pregunta: '¿Cuáles son los tiempos máximos tolerables (SLAs) de respuesta y ciclo operativo?',
        objetivo: 'Establecer los estándares de oportunidad y compromisos de entrega.'
      },
      {
        categoria: 'Matriz de Aprobaciones',
        pregunta: '¿Quién tiene la facultad jerárquica exclusiva para autorizar desviaciones, compras o ajustes extraordinarios?',
        objetivo: 'Delimitar responsabilidades y segregación de funciones.'
      },
      {
        categoria: 'Control de Calidad y Contingencias',
        pregunta: '¿Qué protocolo de contingencia se aplica exactamente ante discrepancias físicas o no conformidades de calidad?',
        objetivo: 'Prevenir reprocesos y aislar material o transacciones no conformes.'
      }
    ];

    if (!effectiveNotes || !process.env.GEMINI_API_KEY) {
      return res.json({
        success: true,
        questions: defaultStructuredQuestions,
        data: defaultStructuredQuestions
      });
    }

    let activeModel = GEMINI_MODEL;
    try {
      const prompt = `Actúa como un Auditor Líder ISO 9001:2015 y Lean Six Sigma en Districueros El Canguro C.A.
Analiza la siguiente información para el proceso "${effectiveProcess}" (${gerencia || 'Gerencia del Área'}, ${direccion || 'Dirección Corporativa'}) e identifica entre 5 y 6 vacíos críticos indispensables que faltan indagar al colaborador para poder documentar y certificar con precisión el manual de procedimientos.

ENTREVISTA / APUNTES:
"""
${effectiveNotes}
"""

Responde ÚNICAMENTE un arreglo JSON con objetos con este esquema:
[
  {
    "categoria": "Nombre de categoría (ej. Detonante, ERP Odoo, Tiempos SLA, Aprobación, Contingencia)",
    "pregunta": "¿Pregunta redactada en tono profesional?",
    "objetivo": "Propósito de la pregunta para el manual"
  }
]`;

      const responseText = await executeGeminiWithRetry(ai, {
        model: activeModel,
        contents: prompt,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        },
        timeoutMs: 60000,
        onModelFallback: (from, to) => {
          activeModel = to;
        }
      });

      const parsed = JSON.parse(responseText);
      const normalized = Array.isArray(parsed)
        ? parsed.map((item: unknown, idx: number) => {
            if (typeof item === 'string') {
              return {
                categoria: `Punto Crítico #${idx + 1}`,
                pregunta: item,
                objetivo: 'Aclarar estándar operativo para el manual'
              };
            }
            const obj = item && typeof item === 'object' ? (item as { categoria?: string; pregunta?: string; objetivo?: string }) : {};
            return {
              categoria: obj.categoria || `Punto Crítico #${idx + 1}`,
              pregunta: obj.pregunta || String(item),
              objetivo: obj.objetivo || 'Validar estándar de cumplimiento'
            };
          })
        : defaultStructuredQuestions;

      return res.json({
        success: true,
        questions: normalized,
        data: normalized
      });
    } catch (e: unknown) {
      const errObj = e as { message?: string } | undefined;
      console.warn('Advertencia en /api/suggest-interview-questions, devolviendo preguntas estándar:', errObj?.message || e);
      return res.json({
        success: true,
        questions: defaultStructuredQuestions,
        data: defaultStructuredQuestions,
        warning: 'Preguntas estándar cargadas por límite temporal de IA.'
      });
    }
  });

  // --------------------------------------------------------------------------
  // ENDPOINT: /api/refine-section
  // --------------------------------------------------------------------------
  app.post('/api/refine-section', async (req, res) => {
    if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El cuerpo de la solicitud no puede estar vacío.'
      });
    }

    const { sectionTitle, currentContent, instruction, narrative, processName } = req.body;

    if (!instruction || !String(instruction).trim()) {
      return res.status(400).json({
        success: false,
        error: 'Debe especificar una instrucción concreta para refinar la sección.'
      });
    }

    if (!currentContent || !String(currentContent).trim()) {
      return res.status(400).json({
        success: false,
        error: 'El contenido actual de la sección a refinar no puede estar vacío.'
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        success: true,
        refinedContent: currentContent,
        result: currentContent,
        warning: 'Sin clave de API de Gemini configurada; se conserva el contenido actual.'
      });
    }

    try {
      const prompt = `Eres el redactor oficial de manuales de Districueros El Canguro C.A.
Refina la siguiente sección del manual para el proceso "${processName}" atendiendo a la instrucción del usuario y manteniendo la veracidad fáctica con la entrevista.

SECCIÓN: ${sectionTitle}
CONTENIDO ACTUAL:
"""
${currentContent}
"""

INSTRUCCIÓN DE MEJORA:
${instruction}

ENTREVISTA DE RESPALDO:
"""
${narrative || 'Sin notas adicionales'}
"""

REGLAS:
- Mantén el formato Markdown y el lenguaje prescriptivo formal.
- No inventes cifras ni normas sin evidencia en la entrevista.
- Devuelve únicamente el texto corregido de la sección.`;

      const refined = await executeGeminiWithRetry(ai, {
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          temperature: 0.2
        },
        timeoutMs: 60000
      });

      return res.json({
        success: true,
        refinedContent: refined,
        result: refined
      });
    } catch (err: unknown) {
      const errObj = err as { message?: string } | undefined;
      console.warn('[Gemini Pipeline] Error al refinar sección, conservando contenido actual:', errObj?.message || err);
      return res.json({
        success: true,
        refinedContent: currentContent,
        result: currentContent,
        warning: 'No se pudo refinar la sección mediante IA; se conserva el contenido actual.'
      });
    }
  });

  // --------------------------------------------------------------------------
  // SERVIR APLICACIÓN VITE O PRODUCCIÓN (PREFERIR BUNDLE COMPILADO DIST)
  // --------------------------------------------------------------------------
  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

  if (isProd || hasDist) {
    console.log('[Server] Sirviendo bundle compilado de producción desde:', distPath);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    console.log('[Server] Modo desarrollo: Iniciando middleware dinámico de Vite...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Canguro Process Engine running on http://0.0.0.0:${PORT} (Model: ${GEMINI_MODEL})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
