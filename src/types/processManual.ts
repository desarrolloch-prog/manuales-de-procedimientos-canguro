export interface RolClave {
  cargo: string;
  rolEnProceso: string;
  responsabilidadPrincipal: string;
}

export interface ItemRaci {
  faseActividad: string;
  r: string; // Responsable
  a: string; // Aprobador / Accountable
  c: string; // Consultado
  i: string; // Informado
}

export interface DesperdicioMuda {
  tipoMuda: string; // e.g., Sobreproducción, Esperas, Transporte, Sobreprocesamiento, Inventario, Movimiento, Defectos
  descripcion: string;
  impacto: string;
  accionKaizen: string;
}

export interface PasoProcedimiento {
  numero: number;
  actividad: string;
  responsable: string;
  descripcion: string;
  sistemaOherramienta: string;
  documentoSoporte: string;
  tiempoEstimado: string;
  controlCalidad: string;
}

export interface IndicadorKpi {
  nombre: string;
  formula: string;
  meta: string;
  frecuencia: string;
  responsableMedicion: string;
}

export interface ItemGlosario {
  termino: string;
  definicion: string;
}

export interface FirmaAprobacion {
  nombre: string;
  cargo: string;
  fecha: string;
}

export interface SignerSlot {
  id: string;
  roleLabel: string;
  name: string;
  position: string;
  signatureUrl: string;
  defaultSignatureUrl: string;
  defaultName?: string;
  defaultPosition?: string;
}

export interface ProcessManual {
  id: string;
  codigo: string;
  nombre: string;
  version: string;
  fechaEmision: string;
  macroproceso: string;
  tipoProceso: string;
  propietario: string;
  direccion: string;
  gerencia: string;
  objetivoGeneral: string;
  objetivosEspecificos: string[];
  alcance: {
    iniciaEn: string;
    incluye: string;
    terminaEn: string;
    areasAplicables: string[];
  };
  gobernanza: {
    descripcionJerarquica: string;
    rolesClave: RolClave[];
    matrizRaci: ItemRaci[];
  };
  sipoc: {
    proveedores: string[];
    entradas: string[];
    macroPasos: string[];
    salidas: string[];
    clientes: string[];
  };
  analisisLean: {
    desperdiciosMudaIdentificados: DesperdicioMuda[];
    puntosCriticosCalidad: string[];
  };
  politicasYReglas: string[];
  pasosProcedimiento: PasoProcedimiento[];
  indicadoresKpi: IndicadorKpi[];
  glosario: ItemGlosario[];
  controlAprobaciones: {
    elaboradoPor: FirmaAprobacion;
    revisadoPor: FirmaAprobacion;
    aprobadoPor: FirmaAprobacion;
  };
  updatedAt?: string;
}

export interface InterviewData {
  direccion: string;
  gerencia: string;
  nombreProceso: string;
  codigoSugerido: string;
  propietario: string;
  version: string;
  tipoProceso: string;
  entrevistado: string;
  cargoEntrevistado: string;
  notasEntrevista: string;
  preguntasRespuestas: Record<string, string>;
  objetivoPreliminar: string;
  alcancePreliminar: string;
}

export type ManualStatus = 'borrador' | 'aprobado';

export interface CargoData {
  nivel?: string;
  titulo: string;
  objetivoCargo: string;
  responsabilidades: string[];
}

export interface CriterioVineta {
  etiqueta?: string;
  detalle: string;
}

export interface CriterioData {
  numero: string;
  titulo: string;
  texto?: string;
  vinetas?: CriterioVineta[];
}

export interface GlosarioItem {
  termino: string;
  definicion: string;
}

export interface LeanData {
  resumen: string;
  hallazgos: string[];
  plan: string[];
  recomendaciones: string[];
}

export type { ProcessMetadata, ApprovalAreaRecord } from '../shared';

export interface IntermediatePage {
  id: string;
  afterPageKey?: string;
  afterPageNumber?: number;
  sectionNumber: string;
  sectionTitle: string;
  subtitle?: string;
  content: string;
}

export interface ManualData {
  codigo?: string;
  tituloProceso?: string;
  objetivo: string;
  alcance: string;
  versionDesc: string;
  clasificacion: string;
  flujo: string[];
  areasAprobadoras: { name: string; role: string; isOwner?: boolean }[];
  herramientas: string[];
  documentosDerogados: string[];
  glosario: GlosarioItem[];
  cargos: CargoData[];
  criterios: CriterioData[];
  normasFijas?: any;
  lean?: LeanData;
  intermediatePages?: IntermediatePage[];
  continuationLabel?: string;
}

export interface StoredManualRecord {
  id: string;
  codigo: string;
  version: string;
  clasificacion: string;
  nombre: string;
  direccion: string;
  directorApprover: string;
  owner: string;
  narrative: string;
  status: ManualStatus;
  manualMarkdown: string;
  manualData?: ManualData;
  leanMarkdown: string;
  editableDoc: {
    objetivo: string;
    alcance: string;
    versionDesc: string;
    clasificacion: string;
    flowSteps: string[];
    ownerArea: string;
    directionArea: string;
    trainingArea: string;
    pages: string[];
    intermediatePages?: IntermediatePage[];
  };
  signers: {
    id: string;
    roleLabel: string;
    name: string;
    position: string;
    signatureUrl: string;
    defaultSignatureUrl: string;
    defaultName: string;
    defaultPosition: string;
  }[];
  approvalAreas: {
    id: string;
    name: string;
    role: string;
    isOwner?: boolean;
  }[];
  roles?: string;
  tools?: string;
  emisionDate?: string;
  actualizacionDate?: string;
  createdAt: string;
  updatedAt: string;
  sincronizadoDriveEn?: string;
  sincronizadoPor?: string;
  sincronizadoDriveUrl?: string;
  sincronizadoDriveFileId?: string;
}

/**
 * Sanitiza los títulos de cargos según el estándar oficial DTH-GFD-MP de Districueros El Canguro C.A.
 * Elimina códigos de documentos (ej. "TH GFD DC 110", "DTH-GFD-MP-13", "DC-110"),
 * prefijos numéricos de sección ("3.4.", "3.1"), y sufijos como "Descriptor de Cargo" o "Perfil de Cargo",
 * dejando ÚNICA Y EXCLUSIVAMENTE el nombre formal y limpio del cargo (ej. "Analista de Cuentas por Cobrar").
 */
export function sanitizeCargoTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  let clean = String(rawTitle).trim();

  // 1. Quitar extensiones de archivo si vinieron de un nombre de archivo (.pdf, .docx, etc.)
  clean = clean.replace(/\.[a-zA-Z0-9]{2,5}$/i, '');

  // 2. Normalizar guiones y guiones bajos a espacios antes del análisis léxico
  clean = clean.replace(/[_\-]+/g, ' ');

  // 3. Quitar prefijos numéricos de sección como "3.4.", "3.4", "3.", etc. (con o sin negritas/viñetas)
  clean = clean.replace(/^(?:\*{0,2})3\.\d+\.?\s*(?:\*{0,2})/i, '');
  clean = clean.replace(/^[•\-\*]\s*/, '');

  // 4. Quitar códigos y nomenclaturas de documentos corporativos:
  // e.g. "TH GFD DC 110", "TH GFD DC", "DC 110", "DTH GFD MP 13", "DTH GFD DC 110"
  clean = clean.replace(/\b(?:DTH|TH)\s+GFD\s+(?:DC|MP)\s*\d+\s*/gi, '');
  clean = clean.replace(/\b(?:DTH|TH|GFD|DC|MP|DP|PR|IT|RG|FO)(?:\s+(?:DTH|TH|GFD|DC|MP|DP|PR|IT|RG|FO))*\s*\d+\s*/gi, '');
  clean = clean.replace(/\b(?:DTH|TH)\s+GFD(?:\s+DC)?\s*/gi, '');
  clean = clean.replace(/\bDC\s*\d+\s*/gi, '');
  clean = clean.replace(/^[A-Z]{2,4}\s+[A-Z]{2,4}\s+\d+\s*/i, '');

  // 5. Quitar etiquetas y sufijos de tipo de documento:
  // e.g. "Descriptor de Cargo", "Perfil de Cargo", "Descripción de Cargo", "Ficha de Cargo", "Descriptor", "Perfil"
  clean = clean.replace(/\b(?:descriptor(?:es)?|perfil(?:es)?|descripci[oó]n|ficha)\s+(?:de\s+)?(?:cargo|puesto|rol)\b/gi, '');
  clean = clean.replace(/\b(?:descriptor(?:es)?|perfil(?:es)?)\b/gi, '');

  // 6. Quitar identificadores hash (ej. 892b0732, 6d277a74)
  clean = clean.replace(/\b[0-9a-fA-F]{8,}\b/g, '');

  // 7. Quitar palabras de secciones subsiguientes o encabezados que puedan haberse capturado
  clean = clean.replace(/\.?\s*(?:responsabilidades|objetivo(?:s)?|funciones|perfil|requisitos)\b.*$/i, '');

  // 8. Limpiar signos de puntuación sobrantes en los extremos y espacios múltiples
  clean = clean.replace(/^[:\s\-*•.,()]+|[:\s\-*•.,()]+$/g, '');
  clean = clean.replace(/\s{2,}/g, ' ').trim();

  // 9. Capitalización inicial adecuada
  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  return clean;
}
