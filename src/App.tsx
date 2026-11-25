import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Copy,
  Mic,
  MicOff,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Edit3,
  Zap,
  Sparkles,
  ChevronDown,
  Plus,
  Trash2,
  X,
  Upload,
  Maximize2,
  Minimize2,
  Check,
  Download,
  Loader2,
  Database,
  FilePlus2,
  FolderOpen,
  Save,
  Clock,
  Paperclip,
  FileCode,
  File,
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
  Presentation,
  Settings,
  UserCheck
} from 'lucide-react';
import {
  DIRECCIONES_CANGURO,
  DIRECTORES_POR_DIRECCION,
  CODIGOS_NUMERICOS,
  VERSIONES_NUMERICAS,
  CLASIFICACIONES_PROCESO,
  EJEMPLO_REAL_LOGISTICA
} from './data/canguroStructure';
import { generateManualPdfBlob } from './services/manualExportService';
import { useManualExport, useManualDriveSync, useManualGeneration } from './hooks';
import {
  domToMarkdown,
  domToMarkdownLine,
  formatInline,
  stripMarkdown,
  toTitleCase,
  cleanSpuriousSignaturesAndFooters,
  isBlankOrHeaderOnlyPage
} from './utils/markdownUtils';
import { getTodayFormatted, formatDateToSlash, formatSlashToIso } from './utils/dateUtils';
import {
  AddDirectionModal,
  DeleteManualConfirmModal,
  DeleteDirectionConfirmModal,
  ConfirmNewManualModal,
  PresentationModeViewer
} from './components/modals';
import {
  HeaderTable,
  Page1EditableLayout,
  Page2EditableBlock,
  SubsequentGenericPage,
  SubsequentPageEditable,
  OfficialSignaturesFooter,
  cleanResponsibilityBolds,
  renderFormattedIntermediateContent,
  RenderPageMarkdown
} from './components/views/ManualDocumentPages';
import { StoredManualRecord, ManualStatus, ManualData, CargoData, CriterioData, GlosarioItem, ProcessMetadata, IntermediatePage, sanitizeCargoTitle } from './types/processManual';
import { ManualsDatabaseView } from './components/ManualsDatabaseView';
import { RibbonToolbar, type SyncStatusType } from './components/RibbonToolbar';
import { DiagnosticView } from './components/DiagnosticView';
import { DynamicSelect } from './components/DynamicSelect';
import { SettingsModal, type DirectorConfigItem } from './components/SettingsModal';
import {
  getAccessToken,
  syncSingleManualToGoogleDrive,
  recordDeletedManualTombstone,
  clearDeletedTombstoneForManuals,
  auth
} from './services/googleDriveService';
import {
  usePaginatedManual,
  parseLegacyMarkdownToManualData,
  manualDataToMarkdown,
  buildDefaultManualData,
  type PaginatedPage,
  type ContentBlock
} from './utils/paginate';
import {
  FIRMA_FREDDY_MOLINA,
  FIRMA_NATALIA_RODRIGUEZ,
  FIRMA_ALEJANDRA_AREVALO,
  FIRMA_JEANETTE_ARVELO,
  getOfficialSignatureFallback,
  subscribeToOfficialSignatures,
  fetchOfficialSignatures
} from './utils/officialSignatures';
import {
  SectionPillBanner,
  CargoBlockView,
  RenderBlockView,
  PaginatedContentSections,
  parseEmbeddedVinetas
} from './components/ManualPageRenderer';
import { ErrorBoundary } from './components/ErrorBoundary';

export interface SignerSlot {
  id: string;
  roleLabel: string;
  name: string;
  position: string;
  signatureUrl: string;
  defaultSignatureUrl: string;
  defaultName: string;
  defaultPosition: string;
}

export interface AttachedDoc {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  textContent?: string;
  base64Data?: string;
}

interface HistorySnapshot {
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
  };
  manualMarkdown: string;
  leanMarkdown: string;
}

function getDefaultSigners(currentDirection: string, currentDirector: string): SignerSlot[] {
  const dirName = toTitleCase(currentDirection || 'Transporte y Logística');
  let director = currentDirector || DIRECTORES_POR_DIRECCION[currentDirection] || 'Gabriel Saavedra';
  let directorSignature = '';

  try {
    const dirDirSaved = localStorage.getItem('canguro_directors_directory');
    if (dirDirSaved) {
      const parsedDir = JSON.parse(dirDirSaved);
      if (parsedDir && parsedDir[currentDirection]) {
        if (parsedDir[currentDirection].directorName) {
          director = parsedDir[currentDirection].directorName;
        }
        if (parsedDir[currentDirection].signatureUrl) {
          directorSignature = parsedDir[currentDirection].signatureUrl;
        }
      }
    }
  } catch (e) {
    console.error(e);
  }

  const isTalentoHumano = currentDirection && currentDirection.toUpperCase() === 'TALENTO HUMANO';

  try {
    const custom = localStorage.getItem('canguro_default_signers');
    if (custom) {
      const parsed = JSON.parse(custom);
      // Validar que la lista personalizada contenga a Natalia Rodriguez
      if (Array.isArray(parsed) && parsed.length >= 4 && parsed.some((s: SignerSlot) => /natalia/i.test(s.name))) {
        const sanitized = parsed.map((s: SignerSlot, idx: number) => {
          const fallbackSig = getOfficialSignatureFallback(s.name, s.id);
          const sig = s.signatureUrl || fallbackSig;
          if (idx === 3 || s.id === 'aprobado1') {
            return {
              ...s,
              name: director,
              position: `Director de ${dirName}`,
              signatureUrl: directorSignature || sig || '',
              defaultSignatureUrl: fallbackSig
            };
          }
          return {
            ...s,
            signatureUrl: sig,
            defaultSignatureUrl: s.defaultSignatureUrl || fallbackSig
          };
        });
        if (isTalentoHumano) {
          return sanitized.slice(0, 4);
        }
        return sanitized;
      }
    }
  } catch (e) {
    console.error(e);
  }

  // Si la dirección es TALENTO HUMANO: exactamente 4 firmantes ya que Jeanette Arvelo es la Directora del área
  if (isTalentoHumano) {
    return [
      {
        id: 'realizado',
        roleLabel: 'Realizado por',
        name: 'Freddy Molina',
        position: 'Analista de Procesos',
        signatureUrl: getOfficialSignatureFallback('Freddy Molina', 'realizado'),
        defaultSignatureUrl: getOfficialSignatureFallback('Freddy Molina', 'realizado'),
        defaultName: 'Freddy Molina',
        defaultPosition: 'Analista de Procesos'
      },
      {
        id: 'revisado1',
        roleLabel: 'Revisado por',
        name: 'Natalia Rodriguez',
        position: 'Coordinadora de Formación y Desarrollo',
        signatureUrl: getOfficialSignatureFallback('Natalia Rodriguez', 'revisado1'),
        defaultSignatureUrl: getOfficialSignatureFallback('Natalia Rodriguez', 'revisado1'),
        defaultName: 'Natalia Rodriguez',
        defaultPosition: 'Coordinadora de Formación y Desarrollo'
      },
      {
        id: 'revisado2',
        roleLabel: 'Revisado por',
        name: 'Alejandra Arévalo',
        position: 'Gerente de Formación y Desarrollo',
        signatureUrl: getOfficialSignatureFallback('Alejandra Arévalo', 'revisado2'),
        defaultSignatureUrl: getOfficialSignatureFallback('Alejandra Arévalo', 'revisado2'),
        defaultName: 'Alejandra Arévalo',
        defaultPosition: 'Gerente de Formación y Desarrollo'
      },
      {
        id: 'aprobado1',
        roleLabel: 'Aprobado por',
        name: 'Jeanette Arvelo',
        position: 'Director de Talento Humano',
        signatureUrl: getOfficialSignatureFallback('Jeanette Arvelo', 'aprobado1'),
        defaultSignatureUrl: getOfficialSignatureFallback('Jeanette Arvelo', 'aprobado1'),
        defaultName: 'Jeanette Arvelo',
        defaultPosition: 'Director de Talento Humano'
      }
    ];
  }

  // Para TODAS las demás direcciones: exactamente 5 firmantes oficiales
  // 1: Freddy Molina (Realizado por)
  // 2: Natalia Rodriguez (Revisado por - Coordinadora de Formación y Desarrollo)
  // 3: Alejandra Arévalo (Revisado por - Gerente de Formación y Desarrollo)
  // 4: Director de la Dirección correspondiente (Aprobado por - LA ÚNICA VARIABLE)
  // 5: Jeanette Arvelo (Aprobado por - Director de Talento Humano)
  return [
    {
      id: 'realizado',
      roleLabel: 'Realizado por',
      name: 'Freddy Molina',
      position: 'Analista de Procesos',
      signatureUrl: getOfficialSignatureFallback('Freddy Molina', 'realizado'),
      defaultSignatureUrl: getOfficialSignatureFallback('Freddy Molina', 'realizado'),
      defaultName: 'Freddy Molina',
      defaultPosition: 'Analista de Procesos'
    },
    {
      id: 'revisado1',
      roleLabel: 'Revisado por',
      name: 'Natalia Rodriguez',
      position: 'Coordinadora de Formación y Desarrollo',
      signatureUrl: getOfficialSignatureFallback('Natalia Rodriguez', 'revisado1'),
      defaultSignatureUrl: getOfficialSignatureFallback('Natalia Rodriguez', 'revisado1'),
      defaultName: 'Natalia Rodriguez',
      defaultPosition: 'Coordinadora de Formación y Desarrollo'
    },
    {
      id: 'revisado2',
      roleLabel: 'Revisado por',
      name: 'Alejandra Arévalo',
      position: 'Gerente de Formación y Desarrollo',
      signatureUrl: getOfficialSignatureFallback('Alejandra Arévalo', 'revisado2'),
      defaultSignatureUrl: getOfficialSignatureFallback('Alejandra Arévalo', 'revisado2'),
      defaultName: 'Alejandra Arévalo',
      defaultPosition: 'Gerente de Formación y Desarrollo'
    },
    {
      id: 'aprobado1',
      roleLabel: 'Aprobado por',
      name: director,
      position: `Director de ${dirName}`,
      signatureUrl: directorSignature || '',
      defaultSignatureUrl: '',
      defaultName: director,
      defaultPosition: `Director de ${dirName}`
    },
    {
      id: 'aprobado2',
      roleLabel: 'Aprobado por',
      name: 'Jeanette Arvelo',
      position: 'Director de Talento Humano',
      signatureUrl: getOfficialSignatureFallback('Jeanette Arvelo', 'aprobado2'),
      defaultSignatureUrl: getOfficialSignatureFallback('Jeanette Arvelo', 'aprobado2'),
      defaultName: 'Jeanette Arvelo',
      defaultPosition: 'Director de Talento Humano'
    }
  ];
}

export interface ApprovalArea {
  id: string;
  name: string;
  role: string;
  isOwner?: boolean;
}

export { getTodayFormatted, formatDateToSlash, formatSlashToIso } from './utils/dateUtils';

export { renderFormattedIntermediateContent } from './components/views/ManualDocumentPages';

export default function App() {
  // Form State - INICIALMENTE TOTALMENTE EN BLANCO
  const [codeNumber, setCodeNumber] = useState<string>('');
  const [version, setVersion] = useState<string>('01');
  const [classification, setClassification] = useState<string>('Crítico.');
  const [processName, setProcessName] = useState<string>('');
  const [direction, setDirection] = useState<string>('');
  const [owner, setOwner] = useState<string>('');
  const [directorApprover, setDirectorApprover] = useState<string>('');
  const [emisionDate, setEmisionDate] = useState<string>(() => getTodayFormatted());
  const [actualizacionDate, setActualizacionDate] = useState<string>(() => getTodayFormatted());
  const [narrative, setNarrative] = useState<string>('');
  const [attachedDocs, setAttachedDocs] = useState<AttachedDoc[]>([]);

  // Result & Tab State - LIENZO LIMPIO AL INICIAR
  const [activeTab, setActiveTab] = useState<'manual' | 'lean' | 'database'>('manual');
  const [manualMarkdown, setManualMarkdown] = useState<string>('');
  const [leanMarkdown, setLeanMarkdown] = useState<string>('');
  
  // In-Place Document Editing & View State - CARGA CON EDICIÓN DESACTIVADA POR DEFECTO
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isWideView, setIsWideView] = useState<boolean>(false);
  const [signers, setSigners] = useState<SignerSlot[]>(() =>
    getDefaultSigners('', '')
  );
  const [docZoom, setDocZoom] = useState<number>(100);

  // Typography & Ribbon Formatting State
  const [selectedFont, setSelectedFont] = useState<string>('Arial, Helvetica, sans-serif');
  const [selectedFontSize, setSelectedFontSize] = useState<string>('9.5pt');
  const [selectedLineHeight, setSelectedLineHeight] = useState<string>('1.35');

  // Datos estructurados oficiales del manual (Única fuente de verdad de paginación)
  const [manualData, setManualData] = useState<ManualData>(() =>
    buildDefaultManualData({
      code: 'DTH-GFD-MP-01',
      version: '01',
      classification: 'Crítico.',
      processName: '',
      direction: '',
      owner: '',
      directorApprover: '',
      roles: '',
      tools: '',
      emisionDate: getTodayFormatted(),
      actualizacionDate: getTodayFormatted(),
      today: getTodayFormatted()
    })
  );

  // Undo / Redo History Stack
  const [historyStack, setHistoryStack] = useState<HistorySnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Manuals Database & Status State
  const [activeManualId, setActiveManualId] = useState<string>('');
function sanitizeAndDeduplicateManuals(list: StoredManualRecord[]): StoredManualRecord[] {
  const seenIds = new Set<string>();
  return list.map((m, idx) => {
    let cleanId = m.id;
    if (!cleanId || seenIds.has(cleanId)) {
      cleanId = `${cleanId || 'manual'}-${(m.codigo || '').replace(/[^a-zA-Z0-9]/g, '') || idx}`;
    }
    seenIds.add(cleanId);
    const cleanManual = { ...m, id: cleanId };
    if (cleanManual.manualData && Array.isArray(cleanManual.manualData.criterios)) {
      cleanManual.manualData.criterios = cleanManual.manualData.criterios.map((cr: any) => {
        const hasV = Array.isArray(cr.vinetas) && cr.vinetas.length > 0;
        if (hasV && cr.texto) {
          const isDup = cr.vinetas.some(
            (v: any) =>
              (v.detalle && cr.texto.includes(v.detalle.slice(0, 30))) ||
              (v.etiqueta && cr.texto.includes(v.etiqueta))
          );
          if (isDup) return { ...cr, texto: undefined };
        }
        return cr;
      });
    }
    return cleanManual;
  });
}

  const [manualStatus, setManualStatus] = useState<ManualStatus>('borrador');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [manualsDatabase, setManualsDatabase] = useState<StoredManualRecord[]>(() => {
    try {
      const saved = localStorage.getItem('canguro_manuals_database_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(
            (m: StoredManualRecord) =>
              (m.nombre && m.nombre.trim().length > 0) ||
              (m.narrative && m.narrative.trim().length > 0) ||
              (m.manualMarkdown && m.manualMarkdown.trim().length > 0)
          );
          if (valid.length > 0) return sanitizeAndDeduplicateManuals(valid);
        }
      }
    } catch (e) {
      console.error('Error loading manuals database:', e);
    }
    return [];
  });

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  const handleLoadManualFromDbRef = useRef<(manual: StoredManualRecord) => void>(() => {});

  // Hooks especializados de exportación, sincronización Drive y generación asistida
  const {
    isExportingPdf,
    pdfProgress,
    handleDownloadDiagnosticPdf: exportDiagnosticPdf,
    handleDownloadPdf: exportManualPdf,
    handleExportWord: exportWord,
    handleExportWordForManual,
    handleExportPdfForManual: exportPdfForManual,
    handleCopyText: copyText
  } = useManualExport({ showToast });

  const {
    syncStatus,
    setSyncStatus,
    lastSyncTimeString,
    setLastSyncTimeString,
    autoSaveDriveEnabled,
    handleToggleAutoSaveDrive,
    handleSyncManualToDrive
  } = useManualDriveSync({
    activeManualId,
    manualsDatabase,
    setManualsDatabase,
    onLoadManualFromDb: (m) => handleLoadManualFromDbRef.current(m),
    showToast
  });

  const {
    isGenerating,
    setIsGenerating,
    generationProgress,
    generationElapsedSec,
    generationStage,
    handleGenerateManual
  } = useManualGeneration({ showToast });

  // Modal States
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    manualId: string;
    manualName: string;
  }>({ isOpen: false, manualId: '', manualName: '' });

  const [deleteDirectionModal, setDeleteDirectionModal] = useState<{
    isOpen: boolean;
    directionName: string;
  }>({ isOpen: false, directionName: '' });

  const [confirmNewManualModal, setConfirmNewManualModal] = useState<boolean>(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState<boolean>(false);
  const [presentationSlideIndex, setPresentationSlideIndex] = useState<number>(0);

  // Estados de Configuración y Listas Dinámicas
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [codePrefix, setCodePrefix] = useState<string>(() => {
    return localStorage.getItem('canguro_code_prefix') || 'DTH-GFD-MP-';
  });
  const [codesList, setCodesList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('canguro_codes_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return CODIGOS_NUMERICOS;
  });
  const [versionsList, setVersionsList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('canguro_versions_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return VERSIONES_NUMERICAS;
  });
  const [classificationsList, setClassificationsList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('canguro_classifications_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return CLASIFICACIONES_PROCESO;
  });
  const [signersConfig, setSignersConfig] = useState<SignerSlot[]>(() => getDefaultSigners('', ''));

  const DEFAULT_DIRECTORS_DIRECTORY: Record<string, DirectorConfigItem> = {
    'OPERACIONES': { directionName: 'OPERACIONES', directorName: 'Luis González', signatureUrl: '' },
    'COMPRAS': { directionName: 'COMPRAS', directorName: 'Juan Diego Ayala', signatureUrl: '' },
    'COMERCIAL': { directionName: 'COMERCIAL', directorName: 'Juan Pablo Layrise', signatureUrl: '' },
    'TRANSPORTE Y LOGÍSTICA': { directionName: 'TRANSPORTE Y LOGÍSTICA', directorName: 'Gabriel Saavedra', signatureUrl: '' },
    'TALENTO HUMANO': { directionName: 'TALENTO HUMANO', directorName: 'Jeanette Arvelo', signatureUrl: getOfficialSignatureFallback('Jeanette Arvelo', 'aprobado1') },
    'TECNOLOGÍA': { directionName: 'TECNOLOGÍA', directorName: 'Harold Veracierta', signatureUrl: '' },
    'ADMINISTRACIÓN Y FINANZAS': { directionName: 'ADMINISTRACIÓN Y FINANZAS', directorName: 'Gustavo Arria', signatureUrl: '' },
    'CONTROL INTERNO': { directionName: 'CONTROL INTERNO', directorName: 'Jacobo Caicedo', signatureUrl: '' }
  };

  const [directorsDirectory, setDirectorsDirectory] = useState<Record<string, DirectorConfigItem>>(() => {
    try {
      const saved = localStorage.getItem('canguro_directors_directory');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) {
          return {
            'OPERACIONES': { directionName: 'OPERACIONES', directorName: 'Luis González', signatureUrl: '' },
            'COMPRAS': { directionName: 'COMPRAS', directorName: 'Juan Diego Ayala', signatureUrl: '' },
            'COMERCIAL': { directionName: 'COMERCIAL', directorName: 'Juan Pablo Layrise', signatureUrl: '' },
            'TRANSPORTE Y LOGÍSTICA': { directionName: 'TRANSPORTE Y LOGÍSTICA', directorName: 'Gabriel Saavedra', signatureUrl: '' },
            'TALENTO HUMANO': { directionName: 'TALENTO HUMANO', directorName: 'Jeanette Arvelo', signatureUrl: getOfficialSignatureFallback('Jeanette Arvelo', 'aprobado1') },
            'TECNOLOGÍA': { directionName: 'TECNOLOGÍA', directorName: 'Harold Veracierta', signatureUrl: '' },
            'ADMINISTRACIÓN Y FINANZAS': { directionName: 'ADMINISTRACIÓN Y FINANZAS', directorName: 'Gustavo Arria', signatureUrl: '' },
            'CONTROL INTERNO': { directionName: 'CONTROL INTERNO', directorName: 'Jacobo Caicedo', signatureUrl: '' },
            ...parsed
          };
        }
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_DIRECTORS_DIRECTORY;
  });

  const [defaultTrainingArea, setDefaultTrainingArea] = useState<string>(() => {
    return localStorage.getItem('canguro_training_area') || 'Gerencia de Formación y Desarrollo';
  });

  // Direcciones List State (Restauradas y protegidas con las 8 direcciones oficiales de Districueros El Canguro C.A.)
  const [directionsList, setDirectionsList] = useState<string[]>(() => {
    const officialNames = DIRECCIONES_CANGURO.map((d) => d.nombre);
    try {
      const saved = localStorage.getItem('canguro_custom_directions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Fusionar siempre las 8 oficiales con las personalizadas para que nunca falten
          const merged = Array.from(new Set([...officialNames, ...parsed]));
          return merged;
        }
      }
    } catch (e) {
      console.error('Error loading directions:', e);
    }
    return officialNames;
  });

  // Asegurar que las 8 direcciones oficiales se restablezcan de inmediato en el navegador del usuario
  useEffect(() => {
    const officialNames = DIRECCIONES_CANGURO.map((d) => d.nombre);
    setDirectionsList((prev) => {
      const hasAll = officialNames.every((name) => prev.includes(name));
      if (!hasAll) {
        const restored = Array.from(new Set([...officialNames, ...prev]));
        try {
          localStorage.setItem('canguro_custom_directions', JSON.stringify(restored));
        } catch (e) {
          console.error(e);
        }
        return restored;
      }
      return prev;
    });
  }, []);

  // Suscripción reactiva a firmas oficiales protegidas del servidor
  useEffect(() => {
    return subscribeToOfficialSignatures(() => {
      setSigners((prev) =>
        prev.map((s) => {
          const fallback = getOfficialSignatureFallback(s.name, s.id);
          if (!s.signatureUrl || s.signatureUrl === s.defaultSignatureUrl) {
            return {
              ...s,
              signatureUrl: fallback || s.signatureUrl,
              defaultSignatureUrl: fallback || s.defaultSignatureUrl
            };
          }
          return s;
        })
      );
    });
  }, []);

  const [isEditingDirectionName, setIsEditingDirectionName] = useState<boolean>(false);
  const [isAddDirectionModalOpen, setIsAddDirectionModalOpen] = useState<boolean>(false);
  const [newDirectionName, setNewDirectionName] = useState<string>('');
  const [newDirectionDirector, setNewDirectionDirector] = useState<string>('');

  // Áreas Participantes como texto separado por comas (para edición compacta sin ocupar espacio)
  const [participantAreasText, setParticipantAreasText] = useState<string>('');

  // Dynamic Approval Areas State (Section 6)
  const [approvalAreas, setApprovalAreas] = useState<ApprovalArea[]>([]);

  // Sincronizar automáticamente la lista de Áreas Aprobadoras (Sección 6)
  // El Área 1 siempre es el Dueño del Proceso (del campo owner o Gerencia), y las demás son Participantes separadas por comas.
  useEffect(() => {
    if (!owner && !direction && !participantAreasText) {
      setApprovalAreas([]);
      return;
    }
    const ownerName = (owner || (direction ? `Gerencia de ${direction}` : '')).trim().toUpperCase();
    const parts = participantAreasText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.toUpperCase() !== ownerName);

    const built: ApprovalArea[] = [];
    if (ownerName) {
      built.push({
        id: 'area-owner',
        name: ownerName,
        role: 'Dueño del proceso',
        isOwner: true
      });
    }
    parts.forEach((pName, idx) => {
      built.push({
        id: `area-part-${idx + 1}`,
        name: pName,
        role: 'Participante',
        isOwner: false
      });
    });
    setApprovalAreas(built);
  }, [owner, direction, participantAreasText]);

  // Editable Document Structure (Page 1 + Subsequent Pages) - INICIALMENTE VACÍO
  const [editableDoc, setEditableDoc] = useState<{
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
  }>({
    objetivo: '',
    alcance: '',
    versionDesc: 'Nuevo',
    clasificacion: 'Crítico.',
    flowSteps: ['Inicio', 'Fin'],
    ownerArea: '',
    directionArea: '',
    trainingArea: 'Gerencia de Formación y Desarrollo',
    pages: [],
    intermediatePages: []
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Speech Recognition State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fullCode = codeNumber.trim() ? `${codePrefix}${codeNumber.trim()}` : codePrefix;

  // Metadatos y Paginación Determinista Única
  const currentMeta: ProcessMetadata = useMemo(() => ({
    code: fullCode || 'DTH-GFD-MP-01',
    version: version || '01',
    classification: classification || 'Crítico.',
    processName: processName || 'PROCESO OPERATIVO',
    direction: direction || 'OPERACIONES',
    owner: owner || `Gerencia de ${direction || 'Operaciones'}`,
    directorApprover: directorApprover || 'Director del Área',
    roles: '',
    tools: manualData.herramientas?.join(', ') || '',
    emisionDate: emisionDate || getTodayFormatted(),
    actualizacionDate: actualizacionDate || getTodayFormatted(),
    today: getTodayFormatted(),
    approvalAreas
  }), [fullCode, version, classification, processName, direction, owner, directorApprover, manualData.herramientas, emisionDate, actualizacionDate, approvalAreas]);

  const { pages, totalPages, rawBlocks } = usePaginatedManual(manualData, currentMeta, {
    lineHeight: parseFloat(selectedLineHeight) || 1.35,
    fontSize: selectedFontSize,
    font: selectedFont
  });

  const handleAddCodeNumber = (newVal: string) => {
    const formatted = newVal.trim();
    if (formatted && !codesList.includes(formatted)) {
      const updated = [...codesList, formatted];
      setCodesList(updated);
      try {
        localStorage.setItem('canguro_codes_list', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
    setCodeNumber(formatted);
    setHasUnsavedChanges(true);
  };

  const handleAddVersion = (newVal: string) => {
    const formatted = newVal.trim();
    if (formatted && !versionsList.includes(formatted)) {
      const updated = [...versionsList, formatted];
      setVersionsList(updated);
      try {
        localStorage.setItem('canguro_versions_list', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
    setVersion(formatted);
    setHasUnsavedChanges(true);
  };

  const handleAddClassification = (newVal: string) => {
    const formatted = newVal.trim();
    if (formatted && !classificationsList.includes(formatted)) {
      const updated = [...classificationsList, formatted];
      setClassificationsList(updated);
      try {
        localStorage.setItem('canguro_classifications_list', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
    setClassification(formatted);
    setHasUnsavedChanges(true);
  };

  const handleSaveCodePrefix = (newPrefix: string) => {
    setCodePrefix(newPrefix);
    try {
      localStorage.setItem('canguro_code_prefix', newPrefix);
    } catch (e) {
      console.error(e);
    }
    setHasUnsavedChanges(true);
  };

  const handleSaveSignersConfig = (newSigners: SignerSlot[]) => {
    setSignersConfig(newSigners);
    try {
      localStorage.setItem('canguro_default_signers', JSON.stringify(newSigners));
    } catch (e) {
      console.error(e);
    }
    setSigners(newSigners);
    setHasUnsavedChanges(true);
  };

  const handleSaveDirectorsDirectory = (newDir: Record<string, DirectorConfigItem>) => {
    setDirectorsDirectory(newDir);
    try {
      localStorage.setItem('canguro_directors_directory', JSON.stringify(newDir));
    } catch (e) {
      console.error(e);
    }
    // Si hay una dirección seleccionada actualmente, actualizar el puesto 4 de inmediato
    if (direction && newDir[direction]) {
      const dirInfo = newDir[direction];
      const titleDir = toTitleCase(direction);
      setDirectorApprover(dirInfo.directorName);
      setSigners((prev) =>
        prev.map((s, idx) => {
          if (idx === 3) {
            return {
              ...s,
              name: dirInfo.directorName,
              position: `Director de ${titleDir}`,
              defaultName: dirInfo.directorName,
              defaultPosition: `Director de ${titleDir}`,
              signatureUrl: dirInfo.signatureUrl || ''
            };
          }
          return s;
        })
      );
    }
    setHasUnsavedChanges(true);
  };

  const handleSaveTrainingArea = (val: string) => {
    setDefaultTrainingArea(val);
    try {
      localStorage.setItem('canguro_training_area', val);
    } catch (e) {
      console.error(e);
    }
    setEditableDoc((prev) => ({ ...prev, trainingArea: val }));
    setHasUnsavedChanges(true);
  };

  const handleApplyToCurrentManual = (
    updatedSigners: SignerSlot[],
    updatedPrefix: string,
    updatedTrainingArea: string,
    updatedDirectors: Record<string, DirectorConfigItem>
  ) => {
    setCodePrefix(updatedPrefix);
    setDefaultTrainingArea(updatedTrainingArea);
    setEditableDoc((prev) => ({ ...prev, trainingArea: updatedTrainingArea }));

    // Si hay dirección actual, obtener la firma de ese director
    const currentDirInfo = direction ? updatedDirectors[direction] : null;

    setSigners(
      updatedSigners.map((s) => {
        if (s.id === 'aprobado1' && currentDirInfo) {
          const titleDir = toTitleCase(direction);
          return {
            ...s,
            name: currentDirInfo.directorName || s.name,
            position: `Director de ${titleDir}`,
            signatureUrl: currentDirInfo.signatureUrl || s.signatureUrl || ''
          };
        }
        return s;
      })
    );
    setHasUnsavedChanges(true);
  };

  // Manejo de eliminación y restauración de cuadro de firmas (modo 4 o 5 firmantes)
  const handleRemoveSigner = (idx: number) => {
    if (signers.length <= 4) {
      showToast('El manual debe contar con al menos 4 firmantes.', 'info');
      return;
    }
    const updated = signers.filter((_, i) => i !== idx);
    setSigners(updated);
    setHasUnsavedChanges(true);
    showToast('Cuadro de firma eliminado (Modo 4 Firmantes activo).', 'info');
  };

  const handleAddFifthSigner = () => {
    if (signers.length >= 5) return;
    const fifth: SignerSlot = {
      id: 'aprobado2',
      roleLabel: 'Aprobado por',
      name: 'Jeanette Arvelo',
      position: 'Director de Talento Humano',
      signatureUrl: getOfficialSignatureFallback('Jeanette Arvelo', 'aprobado2'),
      defaultSignatureUrl: getOfficialSignatureFallback('Jeanette Arvelo', 'aprobado2'),
      defaultName: 'Jeanette Arvelo',
      defaultPosition: 'Director de Talento Humano'
    };
    const updated = [...signers, fifth];
    setSigners(updated);
    setHasUnsavedChanges(true);
    showToast('5º Firmante restaurado (Jeanette Arvelo - Talento Humano).', 'success');
  };

  const handleToggleSignerCount = () => {
    if (signers.length === 4) {
      handleAddFifthSigner();
    } else {
      handleRemoveSigner(signers.length - 1);
    }
  };

  const handleResetFactoryDefaults = () => {
    try {
      localStorage.removeItem('canguro_code_prefix');
      localStorage.removeItem('canguro_default_signers');
      localStorage.removeItem('canguro_directors_directory');
      localStorage.removeItem('canguro_training_area');
    } catch (e) {
      console.error(e);
    }
    setCodePrefix('DTH-GFD-MP-');
    setDefaultTrainingArea('Gerencia de Formación y Desarrollo');
    setDirectorsDirectory(DEFAULT_DIRECTORS_DIRECTORY);
    setEditableDoc((prev) => ({ ...prev, trainingArea: 'Gerencia de Formación y Desarrollo' }));

    const defaults = [
      {
        id: 'realizado',
        roleLabel: 'Realizado por',
        name: 'Freddy Molina',
        position: 'Analista de Procesos',
        signatureUrl: getOfficialSignatureFallback('Freddy Molina', 'realizado'),
        defaultSignatureUrl: getOfficialSignatureFallback('Freddy Molina', 'realizado'),
        defaultName: 'Freddy Molina',
        defaultPosition: 'Analista de Procesos'
      },
      {
        id: 'revisado1',
        roleLabel: 'Revisado por',
        name: 'Natalia Rodriguez',
        position: 'Coordinadora de Formación y Desarrollo',
        signatureUrl: getOfficialSignatureFallback('Natalia Rodriguez', 'revisado1'),
        defaultSignatureUrl: getOfficialSignatureFallback('Natalia Rodriguez', 'revisado1'),
        defaultName: 'Natalia Rodriguez',
        defaultPosition: 'Coordinadora de Formación y Desarrollo'
      },
      {
        id: 'revisado2',
        roleLabel: 'Revisado por',
        name: 'Alejandra Arévalo',
        position: 'Gerente de Formación y Desarrollo',
        signatureUrl: getOfficialSignatureFallback('Alejandra Arévalo', 'revisado2'),
        defaultSignatureUrl: getOfficialSignatureFallback('Alejandra Arévalo', 'revisado2'),
        defaultName: 'Alejandra Arévalo',
        defaultPosition: 'Gerente de Formación y Desarrollo'
      },
      {
        id: 'aprobado1',
        roleLabel: 'Aprobado por',
        name: 'Gabriel Saavedra',
        position: 'Director de Transporte y Logística',
        signatureUrl: '',
        defaultSignatureUrl: '',
        defaultName: 'Gabriel Saavedra',
        defaultPosition: 'Director de Transporte y Logística'
      },
      {
        id: 'aprobado2',
        roleLabel: 'Aprobado por',
        name: 'Jeanette Arvelo',
        position: 'Director de Talento Humano',
        signatureUrl: getOfficialSignatureFallback('Jeanette Arvelo', 'aprobado2'),
        defaultSignatureUrl: getOfficialSignatureFallback('Jeanette Arvelo', 'aprobado2'),
        defaultName: 'Jeanette Arvelo',
        defaultPosition: 'Director de Talento Humano'
      }
    ];
    setSignersConfig(defaults);
    setSigners(defaults);
    setHasUnsavedChanges(true);
  };

  // Formatear tamaño de archivo en bytes a KB o MB
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Inicialización de Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
    }
  }, []);

  // Keyboard Shortcuts para Undo (Ctrl+Z) y Redo (Ctrl+Y / Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, historyStack]);

  // Monitoreo del elemento o selección activa para herramientas de formato (ej. Interlineado/Espaciado)
  useEffect(() => {
    const handleActiveSelection = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        let node: Node | null = sel.anchorNode;
        if (node && node.nodeType === Node.TEXT_NODE) {
          node = node.parentElement;
        }
        if (node && node instanceof HTMLElement) {
          const editable = node.closest(
            '[contenteditable="true"], .editable-block, .cargo-block, .glosario-unified-box, p, li'
          ) as HTMLElement;
          if (editable) {
            (window as any).__lastActiveEditableElement = editable;
          }
        }
      }
    };
    document.addEventListener('selectionchange', handleActiveSelection);
    document.addEventListener('focusin', handleActiveSelection);
    return () => {
      document.removeEventListener('selectionchange', handleActiveSelection);
      document.removeEventListener('focusin', handleActiveSelection);
    };
  }, []);

  // Registrar snapshot en historial de Deshacer/Rehacer
  const pushHistorySnapshot = (
    newDoc: typeof editableDoc,
    newManualMd: string = manualMarkdown,
    newLeanMd: string = leanMarkdown
  ) => {
    setHistoryStack((prev) => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      const snapshot: HistorySnapshot = {
        editableDoc: JSON.parse(JSON.stringify(newDoc)),
        manualMarkdown: newManualMd,
        leanMarkdown: newLeanMd
      };
      const updated = [...upToCurrent, snapshot].slice(-40);
      return updated;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 39));
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevSnapshot = historyStack[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setEditableDoc(JSON.parse(JSON.stringify(prevSnapshot.editableDoc)));
      setManualMarkdown(prevSnapshot.manualMarkdown);
      setLeanMarkdown(prevSnapshot.leanMarkdown);
      setHasUnsavedChanges(true);
      showToast('Deshecho', 'info');
    } else {
      try {
        document.execCommand('undo');
      } catch {}
    }
  };

  const handleRedo = () => {
    if (historyIndex < historyStack.length - 1) {
      const nextSnapshot = historyStack[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setEditableDoc(JSON.parse(JSON.stringify(nextSnapshot.editableDoc)));
      setManualMarkdown(nextSnapshot.manualMarkdown);
      setLeanMarkdown(nextSnapshot.leanMarkdown);
      setHasUnsavedChanges(true);
      showToast('Rehecho', 'info');
    } else {
      try {
        document.execCommand('redo');
      } catch {}
    }
  };

  // Carga de Archivos de Soporte (.pdf, .json, .txt, .csv, .md, .docx)
  const handleFilesUpload = (files: FileList | File[]) => {
    const fileList = Array.from(files);
    fileList.forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const id = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      if (['json', 'txt', 'csv', 'md'].includes(ext) || file.type.startsWith('text/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          setAttachedDocs((prev) => [
            ...prev,
            {
              id,
              name: file.name,
              size: file.size,
              mimeType: file.type || 'text/plain',
              textContent: text
            }
          ]);
          setHasUnsavedChanges(true);
          showToast(`Archivo "${file.name}" leído e incorporado.`, 'success');
        };
        reader.readAsText(file);
      } else {
        // PDF, imágenes u otros binarios compatibles para visión multimodal
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          const base64Data = dataUrl.split(',')[1] || '';
          const resolvedMime =
            file.type ||
            (ext === 'pdf'
              ? 'application/pdf'
              : ext === 'png'
              ? 'image/png'
              : ext === 'jpg' || ext === 'jpeg'
              ? 'image/jpeg'
              : ext === 'webp'
              ? 'image/webp'
              : 'application/octet-stream');

          setAttachedDocs((prev) => [
            ...prev,
            {
              id,
              name: file.name,
              size: file.size,
              mimeType: resolvedMime,
              base64Data
            }
          ]);
          setHasUnsavedChanges(true);
          showToast(`Documento "${file.name}" adjuntado para análisis multimodal nativo.`, 'success');
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleRemoveAttachedDoc = (id: string) => {
    setAttachedDocs((prev) => prev.filter((d) => d.id !== id));
    setHasUnsavedChanges(true);
    showToast('Archivo adjunto retirado.', 'info');
  };

  // Dictado por voz
  const toggleRecording = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Tu navegador no soporta dictado por voz.', 'error');
      return;
    }

    if (isRecording) {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      } catch (err) {
        console.warn('Error al detener dictado:', err);
      }
      setIsRecording(false);
      showToast('Dictado por voz finalizado.', 'info');
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (permErr: any) {
      console.warn('Microphone permission check:', permErr);
      if (permErr?.name === 'NotAllowedError' || permErr?.name === 'PermissionDeniedError') {
        showToast('Permiso de micrófono no otorgado. Habilita el micrófono en el navegador.', 'error');
        return;
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-VE';

      let interimBuffer = '';

      recognition.onstart = () => {
        setIsRecording(true);
        showToast('Micrófono activado. Habla con claridad...', 'info');
      };

      recognition.onresult = (event: any) => {
        let finalChunk = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalChunk += item[0].transcript + ' ';
          } else {
            interimBuffer = item[0].transcript;
          }
        }
        if (finalChunk.trim()) {
          setNarrative((prev) => (prev && prev.trim() ? `${prev.trim()} ${finalChunk.trim()}` : finalChunk.trim()));
          interimBuffer = '';
          setHasUnsavedChanges(true);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        if (interimBuffer.trim()) {
          setNarrative((prev) => (prev && prev.trim() ? `${prev.trim()} ${interimBuffer.trim()}` : interimBuffer.trim()));
          interimBuffer = '';
        }
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (startErr: any) {
      console.error('Failed to start speech recognition:', startErr);
      showToast('No se pudo iniciar el dictado por voz.', 'error');
      setIsRecording(false);
    }
  };

  // Edición directa del nombre de la Dirección Adscrita
  const handleDirectionNameEdit = (newName: string) => {
    const oldName = direction;
    setDirection(newName);
    const titleDir = toTitleCase(newName);
    setSigners((prev) =>
      prev.map((s, idx) => {
        if (idx === 3) {
          return {
            ...s,
            position: `Director de ${titleDir}`,
            defaultPosition: `Director de ${titleDir}`
          };
        }
        return s;
      })
    );
    setEditableDoc((prev) => ({
      ...prev,
      directionArea: `Dirección de ${titleDir}`
    }));
    setDirectionsList((prev) =>
      prev.map((item) => (item.trim().toUpperCase() === oldName.trim().toUpperCase() ? newName.toUpperCase() : item))
    );
    setHasUnsavedChanges(true);
  };

  // Cambio de dirección y asignación automática del director oficial y su firma gráfica
  const handleDirectionChange = (selectedDir: string) => {
    setDirection(selectedDir);
    const dirInfo = directorsDirectory[selectedDir] || {
      directionName: selectedDir,
      directorName: DIRECTORES_POR_DIRECCION[selectedDir] || directorApprover,
      signatureUrl: ''
    };
    const officialDirector = dirInfo.directorName || DIRECTORES_POR_DIRECCION[selectedDir] || directorApprover;
    const officialSignature = dirInfo.signatureUrl || '';

    if (officialDirector) {
      setDirectorApprover(officialDirector);
    }

    const found = DIRECCIONES_CANGURO.find((d) => d.nombre === selectedDir);
    if (found && found.dueñosHabituales.length > 0 && (!owner || owner.includes('Gerencia de'))) {
      setOwner(found.dueñosHabituales[0]);
    }

    const titleDir = toTitleCase(selectedDir);
    // Aplicar la regla oficial de firmantes:
    // En Talento Humano: 4 firmantes (Freddy, Natalia, Alejandra, Jeanette)
    // En las demás direcciones: 5 firmantes (Freddy, Natalia, Alejandra, Director de la Dirección, Jeanette)
    setSigners(getDefaultSigners(selectedDir, officialDirector));
    setEditableDoc((prev) => ({
      ...prev,
      directionArea: `Dirección de ${titleDir}`
    }));
    setHasUnsavedChanges(true);
  };

  // Persistir direcciones en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('canguro_custom_directions', JSON.stringify(directionsList));
    } catch (e) {
      console.error('Error saving directions:', e);
    }
  }, [directionsList]);

  // Persistir base de datos en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('canguro_manuals_database_v2', JSON.stringify(manualsDatabase));
    } catch (e) {
      console.error('Error saving manuals database:', e);
    }
  }, [manualsDatabase]);

  // Guardar Manual Explícito y Sincronizar automáticamente en Google Drive si está conectado
  const handleSaveActiveManual = async () => {
    const hasMeaningfulContent =
      (processName && processName.trim().length > 0) ||
      (narrative && narrative.trim().length > 0) ||
      (manualMarkdown && manualMarkdown.trim().length > 0) ||
      (editableDoc.pages && editableDoc.pages.length > 0);

    if (!hasMeaningfulContent) {
      showToast('No hay contenido suficiente para guardar en la base de datos.', 'info');
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    setSyncStatus('saving_local');

    const currentId = activeManualId || `manual-${Date.now()}`;
    if (!activeManualId) {
      setActiveManualId(currentId);
    }

    const syncMd = buildSynchronizedMarkdown();
    if (syncMd) {
      setManualMarkdown(syncMd);
    }

    const token = await getAccessToken();
    const nowIso = new Date().toISOString();
    const nowTime = new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });

    const record: StoredManualRecord = {
      id: currentId,
      codigo: fullCode,
      version,
      clasificacion: classification,
      nombre: processName.trim() ? processName.trim().toUpperCase() : 'BORRADOR EN PROCESO',
      direccion: direction,
      directorApprover,
      owner: owner || `Gerencia de ${direction}`,
      narrative,
      emisionDate,
      actualizacionDate,
      status: manualStatus,
      manualMarkdown: syncMd || manualMarkdown,
      manualData,
      leanMarkdown,
      editableDoc,
      signers,
      approvalAreas,
      createdAt: nowIso,
      updatedAt: nowIso,
      sincronizadoDriveEn: undefined,
      sincronizadoPor: undefined
    };

    clearDeletedTombstoneForManuals([record]);
    setManualsDatabase((prev) => {
      const existingIndex = prev.findIndex((m) => m.id === currentId);
      if (existingIndex >= 0) {
        record.createdAt = prev[existingIndex].createdAt;
        // Si ya estaba sincronizado previamente en Drive, preservar la marca temporal a menos que se re-sincronice
        record.sincronizadoDriveEn = prev[existingIndex].sincronizadoDriveEn;
        record.sincronizadoPor = prev[existingIndex].sincronizadoPor;
        const updated = [...prev];
        updated[existingIndex] = record;
        return updated;
      } else {
        return [record, ...prev];
      }
    });

    setHasUnsavedChanges(false);
    setLastSavedTime(`Guardado a las ${nowTime}`);
    setLastSyncTimeString(nowTime);

    if (token) {
      setSyncStatus('syncing_drive');
      showToast(`Manual guardado. Generando y sincronizando PDF oficial en Google Drive...`, 'info');
      try {
        let pdfBlob: Blob | undefined;
        try {
          const cleanName = (record.nombre || 'MANUAL').replace(/[^a-zA-Z0-9_-]/g, '_');
          const pdfRes = await generateManualPdfBlob(`${record.codigo || 'DTH-GFD-MP'}_${cleanName}_v${record.version || '01'}.pdf`);
          pdfBlob = pdfRes.blob;
        } catch (pdfErr) {
          console.warn('Aviso: No se pudo capturar el Blob del PDF directamente del DOM:', pdfErr);
        }

        if (pdfBlob) {
          await syncSingleManualToGoogleDrive(record, token, auth.currentUser?.email || undefined, pdfBlob);
          const syncTimeIso = new Date().toISOString();
          const userEmail = auth.currentUser?.email || 'Usuario Google';
          setManualsDatabase((prev) =>
            prev.map((m) =>
              m.id === record.id
                ? { ...m, sincronizadoDriveEn: syncTimeIso, sincronizadoPor: userEmail }
                : m
            )
          );
          setSyncStatus('synced_drive');
          localStorage.setItem('canguro_drive_last_sync', nowTime);
          showToast(`¡Archivo PDF oficial de "${record.nombre}" guardado con éxito en Google Drive!`, 'success');
        } else {
          setSyncStatus('saved_local');
          showToast(`Manual guardado en la base de datos corporativa.`, 'success');
        }
      } catch (err: any) {
        console.warn('Error sincronizando manual en Drive al guardar:', err);
        setSyncStatus('saved_local');
        showToast(`Manual guardado en base de datos local (aviso Drive: ${err?.message || 'Error'}).`, 'info');
      }
    } else {
      setSyncStatus('saved_local');
      showToast(`Manual "${processName || fullCode}" guardado en la base de datos.`, 'success');
    }
  };

  // Auto-guardado reactivo silencioso tras pausa de 5 segundos
  const executeSilentAutoSave = async () => {
    const hasMeaningfulContent =
      (processName && processName.trim().length > 0) ||
      (narrative && narrative.trim().length > 0) ||
      (manualMarkdown && manualMarkdown.trim().length > 0) ||
      (editableDoc.pages && editableDoc.pages.length > 0);

    if (!hasMeaningfulContent) return;

    setSyncStatus('saving_local');

    const currentId = activeManualId || `manual-${Date.now()}`;
    if (!activeManualId) {
      setActiveManualId(currentId);
    }

    const syncMd = buildSynchronizedMarkdown();
    if (syncMd) {
      setManualMarkdown(syncMd);
    }

    const nowIso = new Date().toISOString();
    const nowTime = new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });

    const record: StoredManualRecord = {
      id: currentId,
      codigo: fullCode,
      version,
      clasificacion: classification,
      nombre: processName.trim() ? processName.trim().toUpperCase() : 'BORRADOR EN PROCESO',
      direccion: direction,
      directorApprover,
      owner: owner || `Gerencia de ${direction}`,
      narrative,
      emisionDate,
      actualizacionDate,
      status: manualStatus,
      manualMarkdown: syncMd || manualMarkdown,
      manualData,
      leanMarkdown,
      editableDoc,
      signers,
      approvalAreas,
      createdAt: nowIso,
      updatedAt: nowIso,
      sincronizadoDriveEn: undefined,
      sincronizadoPor: undefined
    };

    clearDeletedTombstoneForManuals([record]);
    setManualsDatabase((prev) => {
      const existingIndex = prev.findIndex((m) => m.id === currentId);
      if (existingIndex >= 0) {
        record.createdAt = prev[existingIndex].createdAt;
        record.sincronizadoDriveEn = prev[existingIndex].sincronizadoDriveEn;
        record.sincronizadoPor = prev[existingIndex].sincronizadoPor;
        const updated = [...prev];
        updated[existingIndex] = record;
        return updated;
      } else {
        return [record, ...prev];
      }
    });

    setHasUnsavedChanges(false);
    setLastSavedTime(`Guardado a las ${nowTime}`);
    setLastSyncTimeString(nowTime);
    setSyncStatus('saved_local');
  };

  // Debounce de 5 segundos de pausa al escribir para auto-guardar
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    setSyncStatus('pending');

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      executeSilentAutoSave();
    }, 5000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    hasUnsavedChanges,
    manualData,
    processName,
    codeNumber,
    version,
    direction,
    classification,
    owner,
    directorApprover,
    narrative,
    emisionDate,
    actualizacionDate,
    editableDoc,
    signers,
    approvalAreas,
    autoSaveDriveEnabled
  ]);

  // Añadir un nuevo manual en blanco
  const handleNewBlankManual = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    const newId = `manual-${Date.now()}`;
    setActiveManualId(newId);
    setCodeNumber('');
    setVersion('01');
    setClassification('Crítico.');
    setProcessName('');
    setDirection('');
    setOwner('');
    setDirectorApprover('');
    setEmisionDate(getTodayFormatted());
    setActualizacionDate(getTodayFormatted());
    setNarrative('');
    setAttachedDocs([]);
    setManualMarkdown('');
    setLeanMarkdown('');
    setManualStatus('borrador');
    setEditableDoc({
      objetivo: '',
      alcance: '',
      versionDesc: 'Nuevo',
      clasificacion: 'Crítico.',
      flowSteps: ['Inicio', 'Fin'],
      ownerArea: '',
      directionArea: '',
      trainingArea: 'Gerencia de Formación y Desarrollo',
      pages: [],
      intermediatePages: []
    });
    setManualData(
      buildDefaultManualData({
        code: 'DTH-GFD-MP-01',
        version: '01',
        classification: 'Crítico.',
        processName: '',
        direction: '',
        owner: '',
        directorApprover: '',
        roles: '',
        tools: '',
        today: getTodayFormatted()
      })
    );
    setSigners(getDefaultSigners('', ''));
    setParticipantAreasText('');
    setApprovalAreas([]);
    setActiveTab('manual');
    setLastSavedTime('Borrador sin guardar');
    setHasUnsavedChanges(false);
    setSyncStatus('saved_local');
    showToast('Nuevo manual en blanco iniciado en el editor.', 'info');
  };

  // Cargar Preset de Ejemplo Oficial (Sin sobreescribir ni forzar renderizado previo)
  const handleLoadPreset = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    setActiveManualId('manual-logistica-inversa-ejemplo');
    setCodeNumber('05');
    setVersion('01');
    setClassification('Crítico.');
    setProcessName('LOGÍSTICA INVERSA');
    setDirection('TRANSPORTE Y LOGÍSTICA');
    setDirectorApprover('Gabriel Saavedra');
    setOwner('Gerencia de Transporte y Logística / Supervisión de Logística Inversa');
    setEmisionDate(getTodayFormatted());
    setActualizacionDate(getTodayFormatted());
    setParticipantAreasText('Dirección de Transporte y Logística, Gerencia de Formación y Desarrollo');
    setNarrative(EJEMPLO_REAL_LOGISTICA.narrative);
    setManualMarkdown('');
    setLeanMarkdown('');
    setManualStatus('borrador');
    setEditableDoc({
      objetivo: '',
      alcance: '',
      versionDesc: 'Nuevo',
      clasificacion: 'Crítico.',
      flowSteps: ['Inicio', 'Fin'],
      ownerArea: 'Gerencia de Transporte y Logística / Supervisión de Logística Inversa',
      directionArea: 'Dirección de Transporte y Logística',
      trainingArea: 'Gerencia de Formación y Desarrollo',
      pages: [],
      intermediatePages: []
    });
    setManualData(
      buildDefaultManualData({
        code: 'DTH-GFD-MP-05',
        version: '01',
        classification: 'Crítico.',
        processName: 'LOGÍSTICA INVERSA',
        direction: 'TRANSPORTE Y LOGÍSTICA',
        owner: 'Gerencia de Transporte y Logística / Supervisión de Logística Inversa',
        directorApprover: 'Gabriel Saavedra',
        roles: '',
        tools: '',
        today: getTodayFormatted()
      })
    );
    setSigners(getDefaultSigners('TRANSPORTE Y LOGÍSTICA', 'Gabriel Saavedra'));
    setHasUnsavedChanges(false);
    showToast('Parámetros y entrevista de ejemplo cargados. Haz clic en "Generar Manual de Procedimientos" para redactarlo.', 'info');
  };

  // Cargar manual existente desde la base de datos
  const handleLoadManualFromDb = (manual: StoredManualRecord) => {
    // 1. Cancelar cualquier temporizador de auto-guardado en cola del manual previo
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    // 2. Si el manual previo tenía cambios sin guardar, auto-guardarlo atómicamente antes de cambiar
    if (hasUnsavedChanges && activeManualId && activeManualId !== manual.id) {
      const nowIso = new Date().toISOString();
      const outgoingSyncMd = buildSynchronizedMarkdown();
      const outgoingRecord: StoredManualRecord = {
        id: activeManualId,
        codigo: fullCode,
        version,
        clasificacion: classification,
        nombre: processName.trim() ? processName.trim().toUpperCase() : 'BORRADOR EN PROCESO',
        direccion: direction,
        directorApprover,
        owner: owner || `Gerencia de ${direction}`,
        narrative,
        emisionDate,
        actualizacionDate,
        status: manualStatus,
        manualMarkdown: outgoingSyncMd || manualMarkdown,
        manualData,
        leanMarkdown,
        editableDoc,
        signers,
        approvalAreas,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      setManualsDatabase((prev) => {
        const exIdx = prev.findIndex((m) => m.id === activeManualId);
        if (exIdx >= 0) {
          outgoingRecord.createdAt = prev[exIdx].createdAt;
          outgoingRecord.sincronizadoDriveEn = prev[exIdx].sincronizadoDriveEn;
          outgoingRecord.sincronizadoPor = prev[exIdx].sincronizadoPor;
          const up = [...prev];
          up[exIdx] = outgoingRecord;
          return up;
        }
        return [outgoingRecord, ...prev];
      });
    }

    // 3. Establecer identificador activo y parámetros formales del nuevo manual
    setActiveManualId(manual.id);
    const codeMatch = manual.codigo.match(/DTH-GFD-MP-(\d+)/);
    if (codeMatch) {
      setCodeNumber(codeMatch[1]);
    }
    setVersion(manual.version || '01');
    setClassification(manual.clasificacion || 'Crítico.');
    setProcessName(manual.nombre || '');
    setDirection(manual.direccion || 'OPERACIONES');
    setDirectorApprover(manual.directorApprover || '');
    setOwner(manual.owner || '');
    setEmisionDate(manual.emisionDate || '');
    setActualizacionDate(manual.actualizacionDate || '');
    setNarrative(manual.narrative || '');
    setManualStatus(manual.status || 'borrador');
    setManualMarkdown(manual.manualMarkdown || '');
    setLeanMarkdown(manual.leanMarkdown || '');
    setAttachedDocs([]);
    setHistoryStack([]);
    setHistoryIndex(-1);

    if (manual.editableDoc) {
      // Sanitizar flowSteps por si contenía texto contaminado de criterios o párrafos largos
      const rawSteps = manual.editableDoc.flowSteps || [];
      let cleanSteps = rawSteps
        .map((s) => s.replace(/\*\*/g, '').replace(/\[|\]/g, '').trim())
        .filter((s) => s && !/^4\.\d+/i.test(s) && !/criterio/i.test(s) && s.length <= 65 && s.toLowerCase() !== 'inicio' && s.toLowerCase() !== 'fin');
      if (cleanSteps.length < 3) {
        cleanSteps = [
          'Recepción de solicitud',
          'Validación en ERP Odoo',
          'Procesamiento operativo',
          'Inspección y control técnico',
          'Entrega conforme y cierre'
        ];
      }

      setEditableDoc({
        ...manual.editableDoc,
        flowSteps: ['Inicio', ...cleanSteps, 'Fin'],
        pages: (manual.editableDoc.pages || []).map((p) => cleanSpuriousSignaturesAndFooters(p)),
        intermediatePages: manual.editableDoc.intermediatePages || manual.manualData?.intermediatePages || []
      });
    } else if (manual.manualMarkdown) {
      syncEditableDocFromMarkdown(manual.manualMarkdown, manual);
    } else {
      setEditableDoc({
        objetivo: '',
        alcance: '',
        versionDesc: 'Nuevo',
        clasificacion: manual.clasificacion || 'Crítico.',
        flowSteps: [
          'Inicio',
          'Recepción de requerimiento',
          'Validación en ERP Odoo',
          'Procesamiento operativo',
          'Inspección de calidad',
          'Entrega y cierre',
          'Fin'
        ],
        ownerArea: manual.owner || '',
        directionArea: `Dirección de ${toTitleCase(manual.direccion || 'Operaciones')}`,
        trainingArea: 'Gerencia de Formación y Desarrollo',
        pages: [],
        intermediatePages: []
      });
    }

    if (manual.signers && manual.signers.length >= 4 && manual.signers.some((s: SignerSlot) => /natalia/i.test(s.name))) {
      const hydrated = manual.signers.map((s: SignerSlot) => ({
        ...s,
        signatureUrl: s.signatureUrl || getOfficialSignatureFallback(s.name, s.id),
        defaultSignatureUrl: s.defaultSignatureUrl || getOfficialSignatureFallback(s.name, s.id)
      }));
      setSigners(hydrated);
    } else {
      setSigners(getDefaultSigners(manual.direccion, manual.directorApprover));
    }

    if (manual.approvalAreas && manual.approvalAreas.length > 0) {
      setApprovalAreas(manual.approvalAreas);
      const participantText = manual.approvalAreas
        .filter((a) => !a.isOwner && a.role !== 'Dueño del proceso')
        .map((a) => a.name)
        .join(', ');
      setParticipantAreasText(participantText || '');
    } else {
      setApprovalAreas([]);
      setParticipantAreasText('');
    }

    if (manual.manualData) {
      const sanitized = { ...manual.manualData };
      if (Array.isArray(sanitized.cargos)) {
        sanitized.cargos = sanitized.cargos.map((c: any, idx: number) => ({
          ...c,
          nivel: `3.${idx + 1}`,
          titulo: sanitizeCargoTitle(c.titulo || '')
        }));
      }
      if (Array.isArray(sanitized.criterios)) {
        const safeStr = (s: any): string => (typeof s === 'string' ? s.trim() : '');
        sanitized.criterios = sanitized.criterios.map((cr: any) => {
          if (!cr) return cr;
          const rawT = safeStr(cr.texto);
          let hasVinetas = Array.isArray(cr.vinetas) && cr.vinetas.length > 0;
          if (!hasVinetas && rawT) {
            const embedded = parseEmbeddedVinetas(rawT);
            if (embedded && embedded.length > 0) {
              return { ...cr, vinetas: embedded, texto: undefined };
            }
          }
          if (hasVinetas && rawT) {
            const tNorm = rawT.toLowerCase();
            const isDuplicate = cr.vinetas.some((v: any) => {
              if (!v) return false;
              const vDet = safeStr(v.detalle || v.text || '').toLowerCase();
              const vEt = safeStr(v.etiqueta || '').toLowerCase();
              return (
                (vDet && tNorm.includes(vDet.slice(0, 20))) ||
                (vEt && tNorm.includes(vEt)) ||
                (vDet && vDet.includes(tNorm.slice(0, 20)))
              );
            });
            if (isDuplicate) {
              return { ...cr, texto: undefined };
            }
          }
          return cr;
        });
      }
      setManualData(sanitized);
    } else if (manual.manualMarkdown) {
      const parsed = parseLegacyMarkdownToManualData(manual.manualMarkdown, {
        code: manual.codigo,
        version: manual.version,
        classification: manual.clasificacion,
        processName: manual.nombre,
        direction: manual.direccion,
        owner: manual.owner,
        directorApprover: manual.directorApprover,
        roles: '',
        tools: '',
        today: getTodayFormatted()
      });
      setManualData(parsed);
    } else {
      setManualData(buildDefaultManualData({
        code: manual.codigo || 'DTH-GFD-MP-01',
        version: manual.version || '01',
        classification: manual.clasificacion || 'Crítico.',
        processName: manual.nombre || '',
        direction: manual.direccion || '',
        owner: manual.owner || '',
        directorApprover: manual.directorApprover || '',
        roles: '',
        tools: '',
        today: getTodayFormatted()
      }));
    }

    setIsEditing(false);
    setActiveTab('manual');
    setHasUnsavedChanges(false);

    if (manual.sincronizadoDriveEn) {
      setSyncStatus('synced_drive');
      try {
        const d = new Date(manual.sincronizadoDriveEn);
        const timeStr = !isNaN(d.getTime())
          ? d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
          : '';
        if (timeStr) setLastSyncTimeString(timeStr);
      } catch {
        // fallback
      }
    } else {
      setSyncStatus('saved_local');
    }

    showToast(`Manual "${manual.nombre}" cargado en el editor.`, 'success');
  };
  handleLoadManualFromDbRef.current = handleLoadManualFromDb;

  // Confirmar eliminación del manual
  const confirmDeleteManual = () => {
    const idToDelete = deleteConfirmModal.manualId;
    const manualToDelete = manualsDatabase.find((m) => m.id === idToDelete);
    recordDeletedManualTombstone(
      manualToDelete || {
        id: idToDelete,
        codigo: '',
        nombre: deleteConfirmModal.manualName
      }
    );
    const remaining = manualsDatabase.filter((m) => m.id !== idToDelete);
    setManualsDatabase(remaining);
    setDeleteConfirmModal({ isOpen: false, manualId: '', manualName: '' });

    if (activeManualId === idToDelete) {
      handleNewBlankManual();
    }
    showToast('Manual eliminado de la base de datos.', 'info');
  };

  // Duplicar manual en la base de datos
  const handleDuplicateManual = (manual: StoredManualRecord) => {
    const newId = `manual-${Date.now()}`;
    const duplicated: StoredManualRecord = {
      ...manual,
      id: newId,
      nombre: `${manual.nombre} (Copia)`,
      status: 'borrador',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    clearDeletedTombstoneForManuals([duplicated]);
    setManualsDatabase((prev) => [duplicated, ...prev]);
    showToast(`Copia creada en borradores: "${duplicated.nombre}".`, 'success');
  };

  // Cambiar estado del manual
  const handleUpdateManualStatus = (id: string, newStatus: ManualStatus) => {
    setManualsDatabase((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: newStatus, updatedAt: new Date().toISOString() } : m))
    );
    if (activeManualId === id) {
      setManualStatus(newStatus);
    }
    showToast(`Estado actualizado a ${newStatus.toUpperCase()}.`, 'info');
  };

  // Exportar PDF para un manual de la base de datos
  const handleExportPdfForManual = (manual: StoredManualRecord) => {
    exportPdfForManual(manual, activeManualId, handleLoadManualFromDb, handleDownloadPdf);
  };

  // Handle Save New Direction
  const handleSaveNewDirection = () => {
    const cleanName = newDirectionName.trim().toUpperCase();
    if (!cleanName) {
      showToast('Ingresa el nombre de la nueva dirección.', 'error');
      return;
    }
    if (!directionsList.includes(cleanName)) {
      setDirectionsList((prev) => [...prev, cleanName]);
    }
    handleDirectionChange(cleanName);
    if (newDirectionDirector.trim()) {
      handleDirectorApproverChange(newDirectionDirector.trim());
    }
    setIsAddDirectionModalOpen(false);
    setNewDirectionName('');
    setNewDirectionDirector('');
    showToast(`Dirección "${cleanName}" agregada y seleccionada.`, 'success');
  };

  // Solicitar eliminación de dirección (abre modal de confirmación con opciones Sí y No)
  const handleRequestDeleteDirection = () => {
    if (directionsList.length <= 1) {
      showToast('Debe existir al menos una dirección registrada.', 'error');
      return;
    }
    setDeleteDirectionModal({
      isOpen: true,
      directionName: direction
    });
  };

  // Confirmar eliminación de la dirección
  const handleConfirmDeleteDirection = () => {
    const toDelete = deleteDirectionModal.directionName;
    const filtered = directionsList.filter((d) => d !== toDelete);
    setDirectionsList(filtered);
    try {
      localStorage.setItem('canguro_custom_directions', JSON.stringify(filtered));
    } catch (e) {
      console.error(e);
    }
    const nextDir = filtered[0] || 'OPERACIONES';
    handleDirectionChange(nextDir);
    setDeleteDirectionModal({ isOpen: false, directionName: '' });
    showToast(`Dirección "${toDelete}" eliminada de la lista.`, 'info');
  };

  // Solicitar creación de nuevo manual (verifica si hay cambios sin guardar antes de limpiar)
  const handleRequestNewManual = () => {
    const hasMeaningfulContent =
      (processName && processName.trim().length > 0) ||
      (narrative && narrative.trim().length > 0) ||
      (manualMarkdown && manualMarkdown.trim().length > 0) ||
      (editableDoc.pages && editableDoc.pages.length > 0);

    if (hasUnsavedChanges && hasMeaningfulContent) {
      setConfirmNewManualModal(true);
    } else {
      handleNewBlankManual();
    }
  };

  // Handle Director Approver change
  const handleDirectorApproverChange = (newDirector: string) => {
    setDirectorApprover(newDirector);
    setSigners((prev) =>
      prev.map((s, idx) => {
        if (idx === 3) {
          return {
            ...s,
            name: newDirector,
            defaultName: newDirector
          };
        }
        return s;
      })
    );
  };

  // Sincronizar estado estructurado desde el texto Markdown con soporte para serverData y regex ultra flexible
  const syncEditableDocFromMarkdown = (rawMarkdown: string, serverData?: any) => {
    const p1Match = rawMarkdown ? rawMarkdown.search(/##\s*\[?7\]/i) : -1;
    const p1 = p1Match !== -1 ? rawMarkdown.substring(0, p1Match) : (rawMarkdown || '');
    const fullText = rawMarkdown || '';

    // Sincronizar fechas si vienen del servidor
    if (serverData?.emisionDate) {
      setEmisionDate(formatDateToSlash(serverData.emisionDate));
    }
    if (serverData?.actualizacionDate) {
      setActualizacionDate(formatDateToSlash(serverData.actualizacionDate));
    }

    // 1. Extraer [1] OBJETIVO (soporta ## [1] OBJETIVO, - ## [1] OBJETIVO:, ## 1. OBJETIVO, etc.)
    let extractedObjetivo = serverData?.objetivo || '';
    if (!extractedObjetivo) {
      const objMatch =
        p1.match(/(?:^|\n)\s*(?:[-*]\s*)?#{1,4}\s*(?:\[?(?:1|I)\]?[\.\:\-\s]*)?OBJETIVO[\:\.\-]?\s*\n*([^\n#=]+(?:\n+(?!\s*(?:[-*]\s*)?#{1,4}\s*(?:\[?(?:2|II)\]?[\.\:\-\s]*)?ALCANCE|\n*===)[^\n#=]+)*)/i) ||
        fullText.match(/(?:^|\n)\s*(?:[-*]\s*)?#{1,4}\s*(?:\[?(?:1|I)\]?[\.\:\-\s]*)?OBJETIVO[\:\.\-]?\s*\n*([^\n#=]+(?:\n+(?!\s*(?:[-*]\s*)?#{1,4}\s*(?:\[?(?:2|II)\]?[\.\:\-\s]*)?ALCANCE|\n*===)[^\n#=]+)*)/i);
      if (objMatch && objMatch[1] && objMatch[1].trim()) {
        extractedObjetivo = objMatch[1].replace(/^\s*[:\-]\s*/, '').trim();
      }
    }

    // 2. Extraer [2] ALCANCE (soporta ## [2] ALCANCE, - ## [2] ALCANCE:, ## 2. ALCANCE, etc.)
    let extractedAlcance = serverData?.alcance || '';
    if (!extractedAlcance) {
      const alcMatch =
        p1.match(/(?:^|\n)\s*(?:[-*]\s*)?#{1,4}\s*(?:\[?(?:2|II)\]?[\.\:\-\s]*)?ALCANCE[\:\.\-]?\s*\n*([^\n#=]+(?:\n+(?!\s*(?:[-*]\s*)?#{1,4}\s*(?:\[?(?:3|III)\]?[\.\:\-\s]*)?CONTROL|\n*===)[^\n#=]+)*)/i) ||
        fullText.match(/(?:^|\n)\s*(?:[-*]\s*)?#{1,4}\s*(?:\[?(?:2|II)\]?[\.\:\-\s]*)?ALCANCE[\:\.\-]?\s*\n*([^\n#=]+(?:\n+(?!\s*(?:[-*]\s*)?#{1,4}\s*(?:\[?(?:3|III)\]?[\.\:\-\s]*)?CONTROL|\n*===)[^\n#=]+)*)/i);
      if (alcMatch && alcMatch[1] && alcMatch[1].trim()) {
        extractedAlcance = alcMatch[1].replace(/^\s*[:\-]\s*/, '').trim();
      }
    }

    // Fallbacks si vienen vacíos
    if (!extractedObjetivo || extractedObjetivo.length < 25) {
      extractedObjetivo = editableDoc.objetivo || `Establecer de forma estandarizada los criterios de actuación, metodologías de trabajo, controles normativos y gobernanza operativa que rigen el proceso de ${processName || 'este proceso'} en Districueros El Canguro C.A., garantizando la trazabilidad integral de los registros, la confiabilidad de las operaciones físicas versus ERP Odoo y el estricto cumplimiento de las políticas institucionales.`;
    }

    if (!extractedAlcance || extractedAlcance.length < 25) {
      extractedAlcance = editableDoc.alcance || `El alcance abarca la totalidad del ciclo operativo y administrativo del proceso de ${processName || 'este proceso'}, desde la recepción o requerimiento inicial de la operación, pasando por la validación técnica, el cotejo físico, el registro en los módulos autorizados del ERP Odoo, hasta la entrega formal conforme y el archivo auditable de los soportes, aplicable a todas las sedes, dependencias y centros de distribución (CENDIS) de Districueros El Canguro C.A.`;
    }

    // Extraer [3] CONTROL DE VERSIONES
    let extractedVersionDesc = serverData?.versionDesc || 'Nuevo';
    if (!serverData?.versionDesc) {
      const verMatch = p1.match(/##\s*\[?3\]?.*?(?:Descripción:\s*)([^\n]+)/i);
      if (verMatch) {
        extractedVersionDesc = verMatch[1].replace(/\*\*/g, '').trim();
      }
    }

    // Extraer [4] CLASIFICACIÓN
    let extractedClasificacion = serverData?.clasificacion || classification;
    if (!serverData?.clasificacion) {
      const clasMatch = p1.match(/##\s*\[?4\]?.*?(?:Clasificación del Proceso:\s*)([^\n]+)/i);
      if (clasMatch) {
        extractedClasificacion = clasMatch[1].replace(/\*\*/g, '').trim();
      }
    }

    // Extraer [5] VISIÓN EXTENDIDA DEL PROCESO con sanitización estricta de 6 a 8 cajas
    let rawFlowCandidate: string[] = [];
    if (Array.isArray(serverData?.flowSteps) && serverData.flowSteps.length > 0) {
      rawFlowCandidate = serverData.flowSteps;
    } else if (Array.isArray(serverData?.manualData?.flujo) && serverData.manualData.flujo.length > 0) {
      rawFlowCandidate = serverData.manualData.flujo;
    } else {
      const flowMatch = p1.match(/(?:##\s*\[?5\]?.*?\n+)([^\n]+)/i);
      if (flowMatch) {
        const line = flowMatch[1].trim();
        rawFlowCandidate = line
          .split(/\s*(?:→|-->|->|➔)\s*/)
          .map((s) => s.replace(/\*\*/g, '').replace(/\[|\]/g, '').trim())
          .filter(Boolean);
      }
    }

    // Filtrar cualquier criterio residual o texto excesivamente largo (>65 chars)
    let sanitizedSteps = rawFlowCandidate
      .map((s) => s.replace(/\*\*/g, '').replace(/\[|\]/g, '').trim())
      .filter((s) => {
        if (!s) return false;
        if (/^4\.\d+/i.test(s) || /criterio/i.test(s) || s.length > 65) return false;
        return true;
      });

    // Descartar "Inicio" y "Fin" redundantes para reinsertarlos limpios
    sanitizedSteps = sanitizedSteps.filter((s) => s.toLowerCase() !== 'inicio' && s.toLowerCase() !== 'fin');

    // Máximo 8 actividades para la Visión Extendida del Proceso
    if (sanitizedSteps.length > 8) {
      sanitizedSteps = sanitizedSteps.slice(0, 8);
    }

    if (sanitizedSteps.length < 3) {
      sanitizedSteps = [
        'Recepción de solicitud',
        'Validación en ERP Odoo',
        'Procesamiento operativo',
        'Inspección y control técnico',
        'Entrega conforme y cierre'
      ];
    }

    const extractedFlowSteps = ['Inicio', ...sanitizedSteps, 'Fin'];

    const subsequentPages: string[] = [];

    const newDoc = {
      objetivo: extractedObjetivo,
      alcance: extractedAlcance,
      versionDesc: extractedVersionDesc,
      clasificacion: extractedClasificacion,
      flowSteps: extractedFlowSteps,
      ownerArea: owner || `Gerencia de ${direction}`,
      directionArea: `Dirección de ${toTitleCase(direction)}`,
      trainingArea: 'Gerencia de Formación y Desarrollo',
      pages: subsequentPages
    };

    setEditableDoc(newDoc);
    pushHistorySnapshot(newDoc, rawMarkdown, leanMarkdown);
  };

  // Construir Markdown sincronizado a partir de las modificaciones
  const buildSynchronizedMarkdown = (): string => {
    if (manualData && (manualData.cargos?.length || manualData.criterios?.length || manualData.glosario?.length)) {
      return manualDataToMarkdown(manualData, currentMeta);
    }
    const validPages = editableDoc.pages
      .map((p) => cleanSpuriousSignaturesAndFooters(p.trim()))
      .filter((p) => !isBlankOrHeaderOnlyPage(p));

    if (validPages.length === 0) return manualMarkdown;

    const todayDate = formatDateToSlash(emisionDate) || getTodayFormatted();
    const actualizacion = formatDateToSlash(actualizacionDate) || todayDate;
    const pName = (processName || 'PROCESO').toUpperCase();
    const ownerUpper = (owner || 'GERENCIA RESPONSABLE').toUpperCase();

    const p1 = `# MANUAL DE PROCEDIMIENTOS - ${pName}

| Fecha de Emisión | Fecha de Actualización | Versión | Código | Clasificación del Proceso |
| :--- | :--- | :--- | :--- | :--- |
| ${todayDate} | ${actualizacion} | ${version} | ${fullCode} | ${editableDoc.clasificacion || classification} |

## [1] OBJETIVO
${editableDoc.objetivo}

## [2] ALCANCE
${editableDoc.alcance}

## [3] CONTROL DE VERSIONES
- **Descripción:** ${editableDoc.versionDesc}

## [4] CLASIFICACIÓN
- **Clasificación del Proceso:** ${editableDoc.clasificacion}

## [5] VISIÓN EXTENDIDA DEL PROCESO
${editableDoc.flowSteps.map((st, i) => `**${st}**`).join(' ➔ ')}

## [6] ÁREAS APROBADORAS
| Área / Dirección / Gerencia | Rol en el Proceso |
| :--- | :--- |
${approvalAreas.map((a) => `| ${a.name} | ${a.role} |`).join('\n')}`;

    const pagesWithSeparators = validPages
      .map((pageContent, idx) => `\n\n===PAGINA_${idx + 2}===\n\n${pageContent}`)
      .join('');

    let intermediatePagesMd = '';
    if (Array.isArray(manualData.intermediatePages) && manualData.intermediatePages.length > 0) {
      intermediatePagesMd = manualData.intermediatePages
        .map(
          (ip, idx) =>
            `\n\n===PAGINA_INTERMEDIA_${idx + 1}===\n\n## [${ip.sectionNumber}] ${ip.sectionTitle}\n### ${ip.subtitle || 'DISPOSICIONES COMPLEMENTARIAS'}\n\n${ip.content}`
        )
        .join('');
    }

    return `${p1}${pagesWithSeparators}${intermediatePagesMd}`;
  };

  // Flujograma Step Management
  const handleAddFlowStep = () => {
    const intermediate = editableDoc.flowSteps.filter(
      (s) => s.toLowerCase() !== 'inicio' && s.toLowerCase() !== 'fin'
    );
    if (intermediate.length >= 8) {
      showToast('La Visión Extendida del Proceso permite un máximo de 8 actividades.', 'info');
      return;
    }
    const steps = [...editableDoc.flowSteps];
    const lastIndex = steps.length - 1;
    steps.splice(lastIndex, 0, 'Nueva Actividad');
    const newDoc = { ...editableDoc, flowSteps: steps };
    setEditableDoc(newDoc);
    pushHistorySnapshot(newDoc);
    setHasUnsavedChanges(true);
  };

  const handleRemoveFlowStep = (idx: number) => {
    if (editableDoc.flowSteps.length <= 3) {
      showToast('El flujograma debe contener al menos 3 pasos.', 'error');
      return;
    }
    const steps = editableDoc.flowSteps.filter((_, i) => i !== idx);
    const newDoc = { ...editableDoc, flowSteps: steps };
    setEditableDoc(newDoc);
    pushHistorySnapshot(newDoc);
    setHasUnsavedChanges(true);
  };

  const handleUpdateFlowStep = (idx: number, newText: string) => {
    const steps = [...editableDoc.flowSteps];
    steps[idx] = newText.trim() || 'Paso';
    const newDoc = { ...editableDoc, flowSteps: steps };
    setEditableDoc(newDoc);
    setHasUnsavedChanges(true);
  };

  // Firmantes Management
  const handleUpdateSigner = (index: number, field: 'name' | 'position', value: string) => {
    setSigners((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setHasUnsavedChanges(true);
  };

  const handleUploadSignerSignature = (index: number, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      showToast('La imagen de firma no debe exceder 5MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSigners((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], signatureUrl: dataUrl };
        return updated;
      });
      setHasUnsavedChanges(true);
      showToast(`Firma actualizada para ${signers[index]?.name || 'el firmante'}.`, 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleResetSigner = (index: number) => {
    setSigners((prev) => {
      const updated = [...prev];
      const s = updated[index];
      updated[index] = {
        ...s,
        name: s.defaultName,
        position: s.defaultPosition,
        signatureUrl: s.defaultSignatureUrl
      };
      return updated;
    });
    setHasUnsavedChanges(true);
    showToast('Firmante restaurado a los valores oficiales predeterminados.', 'info');
  };

  const handleResetAllSigners = () => {
    setSigners(getDefaultSigners(direction, directorApprover));
    setHasUnsavedChanges(true);
    showToast('Todos los firmantes y firmas oficiales han sido restaurados.', 'info');
  };

  // Gestión de Áreas Aprobadoras (Sección 6)
  const handleAddApprovalArea = () => {
    const newId = `area-${Date.now()}`;
    setApprovalAreas((prev) => [
      ...prev,
      {
        id: newId,
        name: 'Nueva Dirección o Gerencia Participante',
        role: 'Participante',
        isOwner: false
      }
    ]);
    setHasUnsavedChanges(true);
    showToast('Nueva área aprobadora agregada a la Sección 6.', 'info');
  };

  const handleRemoveApprovalArea = (id: string) => {
    if (approvalAreas.length <= 1) {
      showToast('Debe permanecer al menos un área aprobadora.', 'error');
      return;
    }
    setApprovalAreas((prev) => prev.filter((a) => a.id !== id));
    setHasUnsavedChanges(true);
    showToast('Área eliminada.', 'info');
  };

  const handleUpdateApprovalArea = (id: string, field: 'name' | 'role', value: string) => {
    setApprovalAreas((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
    setHasUnsavedChanges(true);
  };

  // Clear Form
  const handleClear = () => {
    setCodeNumber('');
    setProcessName('');
    setDirection('');
    setDirectorApprover('');
    setOwner('');
    setNarrative('');
    setAttachedDocs([]);
    setParticipantAreasText('');
    setApprovalAreas([]);
    setManualMarkdown('');
    setLeanMarkdown('');
    setEditableDoc({
      objetivo: '',
      alcance: '',
      versionDesc: 'Nuevo',
      clasificacion: 'Crítico.',
      flowSteps: ['Inicio', 'Fin'],
      ownerArea: '',
      directionArea: '',
      trainingArea: 'Gerencia de Formación y Desarrollo',
      pages: []
    });
    setSigners(getDefaultSigners('', ''));
    showToast('Campos de texto y parámetros limpios.', 'info');
  };

  // GENERAR MANUAL: LLAMADA MAESTRA MULTIMODAL UNIFICADA
  const handleGenerate = async () => {
    const textFiles = attachedDocs
      .filter((d) => d.textContent && d.textContent.trim().length > 0)
      .map((d) => ({ name: d.name, content: d.textContent! }));

    const mediaFiles = attachedDocs
      .filter((d) => d.base64Data && d.base64Data.trim().length > 0)
      .map((d) => ({ name: d.name, mimeType: d.mimeType, data: d.base64Data! }));

    await handleGenerateManual({
      payload: {
        code: fullCode,
        version,
        classification,
        processName: processName || 'PROCESO OPERATIVO',
        direction,
        owner: owner || `Gerencia de ${direction}`,
        directorApprover: directorApprover || 'Director del Área',
        emisionDate: emisionDate || getTodayFormatted(),
        actualizacionDate: actualizacionDate || getTodayFormatted(),
        narrative: narrative.trim() || 'Proceso documentado mediante archivos adjuntos.',
        textFiles,
        mediaFiles,
        approvalAreas
      },
      currentMeta,
      onSuccess: ({ generatedManual, leanMarkdown: newLean, sanitizedManualData, fullResData }) => {
        setManualMarkdown(generatedManual);
        setLeanMarkdown(newLean);
        if (sanitizedManualData) {
          setManualData(sanitizedManualData);
        }
        syncEditableDocFromMarkdown(generatedManual, fullResData);
        setIsEditing(false);
        setActiveTab('manual');
        setHasUnsavedChanges(true);
        setLastSavedTime('Cambios sin guardar');
      }
    });
  };

  // Descarga del Informe Ejecutivo de Auditoría y Diagnóstico Operativo en PDF
  const handleDownloadDiagnosticPdf = () =>
    exportDiagnosticPdf({
      leanMarkdown,
      processName,
      fullCode,
      version
    });

  // Descarga Directa de Archivo PDF (.pdf) - Manual o Diagnóstico según pestaña activa
  const handleDownloadPdf = () =>
    exportManualPdf({
      activeTab,
      setActiveTab,
      docZoom,
      setDocZoom,
      manualMarkdown,
      editableDocPagesCount: editableDoc.pages.length,
      processName,
      fullCode,
      version,
      leanMarkdown
    });

  // Exportar a Word
  const handleExportWord = () =>
    exportWord({
      manualMarkdown,
      editableDocPagesCount: editableDoc.pages.length,
      fullCode,
      version,
      processName,
      direction,
      directorApprover,
      leanMarkdown,
      buildSynchronizedMarkdown
    });

  // Copiar al portapapeles
  const handleCopyText = () =>
    copyText({
      activeTab,
      manualMarkdown,
      leanMarkdown,
      buildSynchronizedMarkdown
    });

  // Actualizar contenido de página subsiguiente
  const handleUpdatePageText = (pageIdx: number, newPageContent: string) => {
    const updatedPages = [...editableDoc.pages];
    updatedPages[pageIdx] = newPageContent;
    const newDoc = { ...editableDoc, pages: updatedPages };
    setEditableDoc(newDoc);
    pushHistorySnapshot(newDoc);
    setHasUnsavedChanges(true);
  };

  // Añadir una nueva página intermedia al manual (entre dos páginas o al final)
  const handleInsertIntermediatePage = (afterPageKey?: string, afterPageNumber?: number) => {
    const newIntPage: IntermediatePage = {
      id: `int-${Date.now()}`,
      afterPageKey: afterPageKey || '',
      afterPageNumber: typeof afterPageNumber === 'number' ? afterPageNumber : undefined,
      sectionNumber: '10',
      sectionTitle: 'NORMAS DEL PROCESO - DISPOSICIONES COMPLEMENTARIAS',
      subtitle: 'DISPOSICIONES Y LINEAMIENTOS OPERATIVOS COMPLEMENTARIOS',
      content: '• **Nuevo Lineamiento Operativo:** Especificar los controles, políticas y especificaciones técnicas correspondientes a esta fase del proceso.\n• **Controles y Registros en Odoo:** Indicar las validaciones transaccionales y soportes documentales correspondientes.'
    };

    setManualData((prev) => {
      const existing = prev.intermediatePages || [];
      const updated = [...existing, newIntPage];
      return { ...prev, intermediatePages: updated };
    });

    setEditableDoc((prev) => {
      const existing = prev.intermediatePages || [];
      const updated = [...existing, newIntPage];
      return { ...prev, intermediatePages: updated };
    });

    setHasUnsavedChanges(true);
    showToast('Página intermedia agregada con éxito.', 'success');
  };

  // Eliminar una página intermedia específica
  const handleRemoveIntermediatePage = (id: string) => {
    setManualData((prev) => ({
      ...prev,
      intermediatePages: (prev.intermediatePages || []).filter((p) => p.id !== id)
    }));
    setEditableDoc((prev) => ({
      ...prev,
      intermediatePages: (prev.intermediatePages || []).filter((p) => p.id !== id)
    }));
    setHasUnsavedChanges(true);
    showToast('Página intermedia eliminada. Páginas recalculadas.', 'info');
  };

  // Actualizar contenido o títulos de una página intermedia
  const handleUpdateIntermediatePage = (id: string, updates: Partial<IntermediatePage>) => {
    setManualData((prev) => ({
      ...prev,
      intermediatePages: (prev.intermediatePages || []).map((p) => (p.id === id ? { ...p, ...updates } : p))
    }));
    setEditableDoc((prev) => ({
      ...prev,
      intermediatePages: (prev.intermediatePages || []).map((p) => (p.id === id ? { ...p, ...updates } : p))
    }));
    setHasUnsavedChanges(true);
  };

  // Añadir una nueva página subsiguiente al manual
  const handleAddNewPage = (afterIdx?: number) => {
    if (pages.length > 0) {
      const targetPage = typeof afterIdx === 'number' && pages[afterIdx] ? pages[afterIdx] : pages[pages.length - 1];
      handleInsertIntermediatePage(targetPage?.pageKey, targetPage?.pageNumber);
      return;
    }
    const updatedPages = [...editableDoc.pages];
    const newPageTemplate = `## [10] NORMAS DEL PROCESO\n\n• **Nuevo Criterio Operativo:** Especificar los controles y lineamientos normativos correspondientes a esta fase.`;
    if (typeof afterIdx === 'number' && afterIdx >= 0) {
      updatedPages.splice(afterIdx + 1, 0, newPageTemplate);
    } else {
      updatedPages.push(newPageTemplate);
    }
    const newDoc = { ...editableDoc, pages: updatedPages };
    setEditableDoc(newDoc);
    pushHistorySnapshot(newDoc);
    setHasUnsavedChanges(true);
    showToast(`Página agregada. Total: ${1 + updatedPages.length} páginas.`, 'success');
  };

  // Eliminar una página subsiguiente del manual
  const handleDeletePage = (pageIdx: number) => {
    if (editableDoc.pages.length <= 1) {
      showToast('El manual debe conservar al menos una página de contenido operativo.', 'error');
      return;
    }
    const updatedPages = editableDoc.pages.filter((_, i) => i !== pageIdx);
    const newDoc = { ...editableDoc, pages: updatedPages };
    setEditableDoc(newDoc);
    pushHistorySnapshot(newDoc);
    setHasUnsavedChanges(true);
    showToast(`Página eliminada. Total: ${1 + updatedPages.length} páginas.`, 'info');
  };

  // Eliminar una página del manual según su tipo o número y recalcular automáticamente
  const handleRemovePage = (pageNumber: number, page?: PaginatedPage) => {
    if (pageNumber === 1) {
      showToast('La carátula (Pág. 1) es obligatoria en la estructura institucional y no puede eliminarse.', 'error');
      return;
    }

    if (page?.type === 'intermediate') {
      if (page.intermediateData?.id) {
        handleRemoveIntermediatePage(page.intermediateData.id);
      }
      return;
    }

    if (page?.type === 'herramientas_derogados' || pageNumber === 2) {
      setManualData((prev) => ({
        ...prev,
        herramientas: [],
        documentosDerogados: ['N/A']
      }));
      if (editableDoc.pages.length > 0) {
        setEditableDoc((prev) => ({
          ...prev,
          pages: prev.pages.filter((_, idx) => idx !== 0)
        }));
      }
      showToast('Contenido de Página 2 reiniciado.', 'info');
      setHasUnsavedChanges(true);
      return;
    }

    if (page?.type === 'content') {
      const hasGlosario = page.sections?.some(
        (s) => s.sectionNumber === '9' || /glosario/i.test(s.sectionTitle)
      );
      if (hasGlosario) {
        setManualData((prev) => ({
          ...prev,
          glosario: []
        }));
        showToast('Sección 9 (Glosario de Términos) eliminada. Páginas recalculadas.', 'info');
        setHasUnsavedChanges(true);
        return;
      }

      const hasOnlyCargos = page.sections && page.sections.length > 0 && page.sections.every((s) =>
        s.blocks.every((b) => b.type === 'cargo' || b.type === 'normas_estructura_intro')
      );
      if (hasOnlyCargos) {
        const cargoTitles = (page.sections || [])
          .flatMap((s) => s.blocks)
          .filter((b) => b.type === 'cargo')
          .map((b) => b.cargo?.titulo)
          .filter(Boolean);

        setManualData((prev) => ({
          ...prev,
          cargos: prev.cargos.filter((c) => !cargoTitles.includes(c.titulo))
        }));
        showToast(`Página ${pageNumber} de cargos eliminada. Páginas recalculadas.`, 'info');
        setHasUnsavedChanges(true);
        return;
      }

      const hasCriterios = page.sections?.some((s) => s.blocks.some((b) => b.type === 'criterio'));
      if (hasCriterios) {
        const critNumbers = (page.sections || [])
          .flatMap((s) => s.blocks)
          .filter((b) => b.type === 'criterio')
          .map((b) => b.criterio?.numero)
          .filter(Boolean);

        setManualData((prev) => ({
          ...prev,
          criterios: prev.criterios.filter((c) => !critNumbers.includes(c.numero))
        }));
        showToast(`Página ${pageNumber} de criterios eliminada. Páginas recalculadas.`, 'info');
        setHasUnsavedChanges(true);
        return;
      }
    }

    // Fallback: eliminar de editableDoc.pages si aplica
    const pageIndexInDoc = pageNumber - 2;
    if (pageIndexInDoc >= 0 && pageIndexInDoc < editableDoc.pages.length) {
      handleDeletePage(pageIndexInDoc);
    } else {
      showToast(`Página ${pageNumber} eliminada.`, 'info');
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-100/90 text-zinc-900 flex flex-col font-sans selection:bg-[#fed700] selection:text-black"
      style={{ fontFamily: selectedFont }}
    >
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-bold border transition-all animate-bounce ${
            toast.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-300'
              : toast.type === 'info'
              ? 'bg-zinc-900 text-amber-300 border-zinc-800'
              : 'bg-zinc-900 text-white border-zinc-800'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#fed700] shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* NAVBAR EJECUTIVO MODERNO Y SOBRIO */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200/90 shadow-2xs px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 overflow-x-auto min-w-0 flex-nowrap no-print">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3 shrink-0">
          <img
            src="/assets/aistudio/images_5a52e549.png"
            alt="Logo Corporativo Canguro"
            className="h-8 w-auto object-contain mix-blend-multiply shrink-0"
          />

          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-sm sm:text-base font-black tracking-tight text-zinc-950 uppercase whitespace-nowrap">
                MANUALES DE PROCEDIMIENTOS
              </span>
            </div>
            <span className="text-[11px] text-zinc-500 font-semibold mt-0.5 whitespace-nowrap">
              Districueros El Canguro C.A.
            </span>
          </div>
        </div>

        {/* Selector Principal de Vistas: Segmentado moderno con badge activo y relieve sobrio */}
        <div
          role="tablist"
          aria-label="Selector de Vista Principal"
          className="flex items-center bg-zinc-200/70 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-300/80 dark:border-zinc-700/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] shrink-0 gap-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab !== 'database'}
            onClick={() => setActiveTab('manual')}
            className={`group relative flex items-center space-x-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ease-out whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              activeTab !== 'database'
                ? 'bg-white text-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
            }`}
            title="Ir al Editor de Parámetros y Redacción del Manual"
          >
            <FileText className={`w-3.5 h-3.5 transition-colors ${activeTab !== 'database' ? 'text-amber-500' : 'text-zinc-400 group-hover:text-zinc-600'}`} />
            <span>Editor de Manual</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'database'}
            onClick={() => setActiveTab('database')}
            className={`group relative flex items-center space-x-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ease-out whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              activeTab === 'database'
                ? 'bg-white text-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
            }`}
            title="Ir a la Base de Datos de Manuales Registrados"
          >
            <Database className={`w-3.5 h-3.5 transition-colors ${activeTab === 'database' ? 'text-amber-500' : 'text-zinc-400 group-hover:text-zinc-600'}`} />
            <span>Base de Datos</span>
            <span
              className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-md transition-all duration-200 ${
                activeTab === 'database'
                  ? 'bg-amber-400/25 text-amber-950 border border-amber-400/40 shadow-2xs'
                  : 'bg-zinc-300/80 text-zinc-700'
              }`}
            >
              {manualsDatabase.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="group relative flex items-center space-x-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ease-out whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-amber-500 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60"
            title="Configuración de Parámetros Predeterminados (Codificación y Firmantes)"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600" />
            <span>Configuración</span>
          </button>
        </div>

        {/* Acciones de Navegación Ejecutivas */}
        <div className="flex items-center space-x-2 shrink-0 flex-nowrap">
          {activeTab !== 'database' && (
            <button
              onClick={() => setIsWideView(!isWideView)}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-zinc-800 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 rounded-xl border border-zinc-200 transition shadow-2xs whitespace-nowrap"
              title={isWideView ? 'Restaurar panel lateral de parámetros' : 'Ocultar panel lateral y ver la hoja en ancho completo'}
            >
              {isWideView ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>Dividida</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Hoja Completa</span>
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col lg:flex-row gap-5 p-3 sm:p-5 max-w-[1900px] w-full mx-auto">
        {activeTab === 'database' && (
          <div className="w-full">
            <ManualsDatabaseView
              manuals={manualsDatabase}
              activeManualId={activeManualId}
              activeManualName={processName || fullCode}
              onReturnToEditor={() => setActiveTab('manual')}
              onSelectManual={handleLoadManualFromDb}
              onNewBlankManual={handleNewBlankManual}
              onDeleteManual={(id, name) => {
                setDeleteConfirmModal({
                  isOpen: true,
                  manualId: id,
                  manualName: name
                });
              }}
              onDuplicateManual={handleDuplicateManual}
              onUpdateStatus={handleUpdateManualStatus}
              onExportWord={handleExportWordForManual}
              onExportPdf={handleExportPdfForManual}
              onSyncManual={handleSyncManualToDrive}
              onImportDatabase={(imported) => {
                const sanitized = sanitizeAndDeduplicateManuals(imported);
                setManualsDatabase(sanitized);
                showToast(`¡Se importaron ${sanitized.length} manuales con éxito!`, 'success');
              }}
              showToast={showToast}
              autoSaveDriveEnabled={autoSaveDriveEnabled}
              onToggleAutoSaveDrive={handleToggleAutoSaveDrive}
              syncStatus={syncStatus}
              hasUnsavedChanges={hasUnsavedChanges}
            />
          </div>
        )}

        {/* CONTENEDOR DE EDICIÓN Y PREVISUALIZACIÓN (Mantenido vivo offscreen cuando se visualiza la base de datos) */}
        <div
          className={
            activeTab === 'database'
              ? 'fixed -top-[30000px] left-0 pointer-events-none opacity-0 w-[1122px] overflow-hidden'
              : 'flex-1 flex flex-col lg:flex-row gap-5 w-full'
          }
          aria-hidden={activeTab === 'database'}
        >
          {/* PANEL IZQUIERDO: FORMULARIO Y DOCUMENTOS (Colapsable con isWideView) */}
          {!isWideView && activeTab !== 'database' && (
              <section className="w-full lg:w-4/12 bg-white rounded-2xl shadow-sm border border-zinc-200/90 flex flex-col h-full overflow-hidden no-print">
                <div className="p-4 sm:p-5 border-b border-zinc-200/80 bg-zinc-50/50 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-extrabold text-zinc-900 uppercase tracking-tight flex items-center gap-2">
                    <span>Parámetros del Proceso</span>
                  </h2>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleRequestNewManual}
                      className="text-[11px] text-amber-900 hover:text-amber-950 flex items-center gap-1 font-bold px-2.5 py-1 bg-[#fed700]/70 hover:bg-[#fed700] border border-amber-300 rounded-lg transition shadow-2xs"
                      title="Crear un manual nuevo en blanco"
                    >
                      <FilePlus2 className="w-3.5 h-3.5 text-zinc-900" />
                      <span>Nuevo Manual</span>
                    </button>

                    <button
                      onClick={handleClear}
                      className="text-[11px] text-zinc-500 hover:text-zinc-800 flex items-center gap-1 font-semibold px-2 py-1 hover:bg-zinc-200/60 rounded-lg transition"
                      title="Limpiar campos de texto y adjuntos"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Limpiar</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto max-h-[calc(100vh-210px)] text-xs">
                  {/* Tarjeta de Parámetros Oficiales */}
                  <div className="bg-zinc-50/80 p-3 rounded-xl border border-zinc-200 space-y-3">
                    {/* Código, Versión y Clasificación Dinámicos */}
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-4">
                        <DynamicSelect
                          label="Código (Nº)"
                          value={codeNumber}
                          options={codesList}
                          onChange={(val) => {
                            setCodeNumber(val);
                            setHasUnsavedChanges(true);
                          }}
                          onAddNew={handleAddCodeNumber}
                          placeholder="05"
                          addLabel="+ Incluir número"
                          inputClassName="font-mono"
                          helperText={fullCode}
                        />
                      </div>

                      <div className="col-span-3">
                        <DynamicSelect
                          label="Versión"
                          value={version}
                          options={versionsList}
                          onChange={(val) => {
                            setVersion(val);
                            setHasUnsavedChanges(true);
                          }}
                          onAddNew={handleAddVersion}
                          placeholder="01"
                          addLabel="+ Incluir versión"
                          inputClassName="font-mono"
                        />
                      </div>

                      <div className="col-span-5">
                        <DynamicSelect
                          label="Clasificación"
                          value={classification}
                          options={classificationsList}
                          onChange={(val) => {
                            setClassification(val);
                            setHasUnsavedChanges(true);
                          }}
                          onAddNew={handleAddClassification}
                          placeholder="Crítico."
                          addLabel="+ Incluir clasificación"
                        />
                      </div>
                    </div>

                    {/* Dirección Adscrita */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-zinc-800 mb-1">
                        Dirección Adscrita
                      </label>
                      <div className="flex items-center gap-1.5">
                        {!isEditingDirectionName ? (
                          <>
                            <div className="relative flex-1 min-w-0">
                              <select
                                value={direction}
                                onChange={(e) => handleDirectionChange(e.target.value)}
                                className="w-full p-2.5 pr-8 bg-white border border-zinc-300 rounded-xl text-zinc-900 font-bold text-xs appearance-none outline-none focus:border-amber-400 cursor-pointer uppercase truncate"
                              >
                                <option value="" disabled>Selecciona una dirección...</option>
                                {directionsList.map((dirName) => (
                                  <option key={dirName} value={dirName}>
                                    {dirName}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-3 pointer-events-none" />
                            </div>

                            <button
                              type="button"
                              onClick={() => setIsEditingDirectionName(true)}
                              className="p-2.5 bg-zinc-100 hover:bg-amber-100 text-zinc-700 hover:text-amber-900 border border-zinc-300 rounded-xl transition flex items-center justify-center shrink-0"
                              title="Editar nombre de la dirección"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setNewDirectionName('');
                                setNewDirectionDirector('');
                                setIsAddDirectionModalOpen(true);
                              }}
                              className="p-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl transition flex items-center justify-center shrink-0"
                              title="Incluir nueva dirección"
                            >
                              <Plus className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={handleRequestDeleteDirection}
                              disabled={directionsList.length <= 1}
                              className="p-2.5 bg-zinc-100 hover:bg-red-50 text-zinc-600 hover:text-red-600 border border-zinc-300 rounded-xl transition flex items-center justify-center shrink-0 disabled:opacity-40"
                              title="Eliminar dirección actual"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <input
                              type="text"
                              autoFocus
                              value={direction}
                              onChange={(e) => handleDirectionNameEdit(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') setIsEditingDirectionName(false);
                                if (e.key === 'Escape') setIsEditingDirectionName(false);
                              }}
                              className="w-full p-2.5 bg-white border-2 border-amber-400 rounded-xl text-zinc-900 font-bold text-xs outline-none uppercase"
                            />
                            <button
                              type="button"
                              onClick={() => setIsEditingDirectionName(false)}
                              className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition flex items-center justify-center shrink-0"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEditingDirectionName(false)}
                              className="p-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl transition flex items-center justify-center shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Nombre de la Gerencia / Proceso */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-zinc-800 mb-1">
                        Nombre de la Gerencia / Proceso
                      </label>
                      <input
                        type="text"
                        value={processName}
                        onChange={(e) => {
                          setProcessName(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="Ej: LOGÍSTICA INVERSA / GESTIÓN DE COMPRAS"
                        className="w-full p-2.5 bg-white border border-zinc-300 rounded-xl text-zinc-900 font-bold text-xs outline-none focus:border-amber-400 uppercase"
                      />
                    </div>

                    {/* Dueño del Proceso */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-zinc-800 mb-1">
                        Dueño del Proceso
                      </label>
                      <input
                        type="text"
                        value={owner}
                        onChange={(e) => {
                          setOwner(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="Ej: Gerencia de Transporte y Logística / Supervisión de Logística Inversa"
                        className="w-full p-2.5 bg-white border border-zinc-300 rounded-xl text-zinc-900 text-xs font-semibold outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* Director Aprobador */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-zinc-800 mb-1">
                        Director Aprobador
                      </label>
                      <input
                        type="text"
                        value={directorApprover}
                        onChange={(e) => {
                          handleDirectorApproverChange(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="Nombre del Director Aprobador"
                        className="w-full p-2.5 bg-white border border-zinc-300 rounded-xl text-zinc-900 font-bold text-xs outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* Fechas de Emisión y Actualización con Calendario Desplegable */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-200">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-zinc-600 mb-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-500" />
                          <span>Emisión</span>
                        </label>
                        <input
                          type="date"
                          value={formatSlashToIso(emisionDate) || formatSlashToIso(getTodayFormatted())}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEmisionDate(val ? formatDateToSlash(val) : '');
                            setHasUnsavedChanges(true);
                          }}
                          className="w-full py-1.5 px-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 font-semibold text-xs outline-none focus:border-amber-400 font-mono cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-zinc-600 mb-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-500" />
                          <span>Actualización</span>
                        </label>
                        <input
                          type="date"
                          value={formatSlashToIso(actualizacionDate) || formatSlashToIso(getTodayFormatted())}
                          onChange={(e) => {
                            const val = e.target.value;
                            setActualizacionDate(val ? formatDateToSlash(val) : '');
                            setHasUnsavedChanges(true);
                          }}
                          className="w-full py-1.5 px-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 font-semibold text-xs outline-none focus:border-amber-400 font-mono cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ÁREAS INVOLUCRADAS (SECCIÓN 6) */}
                  <div className="bg-zinc-50/80 p-2.5 rounded-xl border border-zinc-200 space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-zinc-700 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-600" />
                      <span>Áreas Involucradas</span>
                    </label>

                    <input
                      type="text"
                      value={participantAreasText}
                      onChange={(e) => {
                        setParticipantAreasText(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Separadas por comas (Ej: Dirección de Transporte y Logística, Gerencia de Formación y Desarrollo)"
                      className="w-full p-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 font-medium text-xs outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* NUEVO MÓDULO: ADJUNTAR DOCUMENTOS DE SOPORTE (.PDF, .JSON, .TXT, .CSV, .MD) */}
                  <div className="bg-zinc-50/80 p-3 rounded-xl border border-zinc-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase text-zinc-800 flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-amber-600" />
                        <span>Documentos de Soporte (.PDF, .JSON, .TXT)</span>
                      </label>
                      <span className="text-[10px] font-bold text-zinc-500">
                        {attachedDocs.length} adjuntos
                      </span>
                    </div>

                    {/* Zona interactiva Drag & Drop / Clic */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          handleFilesUpload(e.dataTransfer.files);
                        }
                      }}
                      className="border-2 border-dashed border-zinc-300 hover:border-amber-400 bg-white hover:bg-amber-50/30 p-3 rounded-xl cursor-pointer text-center transition group shadow-2xs"
                    >
                      <Upload className="w-5 h-5 mx-auto text-zinc-400 group-hover:text-amber-600 mb-1 transition" />
                      <p className="text-[11px] font-bold text-zinc-700 group-hover:text-zinc-950">
                        Arrastra o haz clic para adjuntar archivos
                      </p>
                      <p className="text-[9.5px] text-zinc-400">
                        Formatos soportados: PDF, PNG, JPG, JSON, TXT, CSV, MD
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.json,.txt,.csv,.md,.docx,application/pdf,application/json,image/*,text/*"
                      onChange={(e) => {
                        if (e.target.files) handleFilesUpload(e.target.files);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />

                    {/* Lista de Chips de Archivos Adjuntos */}
                    {attachedDocs.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {attachedDocs.map((doc) => {
                          const isPdf = doc.mimeType.includes('pdf') || doc.name.endsWith('.pdf');
                          const isJson = doc.mimeType.includes('json') || doc.name.endsWith('.json');
                          const isImg = doc.mimeType.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(doc.name);

                          return (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between p-2 bg-white rounded-lg border border-zinc-200 text-xs shadow-2xs"
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${
                                    isPdf
                                      ? 'bg-red-100 text-red-700'
                                      : isImg
                                      ? 'bg-amber-100 text-amber-700'
                                      : isJson
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-zinc-100 text-zinc-700'
                                  }`}
                                >
                                  {isPdf ? 'PDF' : isImg ? 'IMG' : isJson ? 'JSON' : 'DOC'}
                                </span>
                                <span className="font-semibold text-zinc-900 truncate text-[11px]" title={doc.name}>
                                  {doc.name}
                                </span>
                                <span className="text-[10px] text-zinc-400 shrink-0 font-mono">
                                  ({formatFileSize(doc.size)})
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveAttachedDoc(doc.id)}
                                className="text-zinc-400 hover:text-red-600 p-1 hover:bg-zinc-100 rounded transition shrink-0"
                                title="Quitar archivo"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Apuntes de la Entrevista */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold uppercase text-zinc-800 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-500" />
                        <span>Apuntes de la Entrevista y Observaciones</span>
                      </label>
                      <button
                        type="button"
                        onClick={toggleRecording}
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 transition ${
                          isRecording
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200'
                        }`}
                        title="Dictado por voz"
                      >
                        {isRecording ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3 text-amber-600" />}
                        <span>{isRecording ? 'Detener voz' : 'Dictar por voz'}</span>
                      </button>
                    </div>

                    <textarea
                      rows={8}
                      value={narrative}
                      onChange={(e) => {
                        setNarrative(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Pega aquí la entrevista, conversación, notas de relevamiento de campo, pasos operativos observados..."
                      className="w-full p-3 bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 text-xs leading-relaxed outline-none focus:border-amber-400 font-sans resize-y"
                    />
                  </div>
                </div>

                {/* Botón Generador Principal */}
                <div className="p-3 bg-zinc-50 border-t border-zinc-200 shrink-0">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full bg-[#fed700] hover:bg-yellow-400 text-zinc-950 font-black py-3 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-95 disabled:opacity-50 uppercase tracking-wide cursor-pointer"
                  >
                    {isGenerating && (
                      <Loader2 className="w-4 h-4 text-zinc-950 animate-spin shrink-0" />
                    )}
                    <span>
                      {isGenerating
                        ? `Generando... ${Math.round(generationProgress)}%`
                        : 'Generar Manual de Procedimientos'}
                    </span>
                  </button>
                </div>
              </section>
            )}

            {/* PANEL DERECHO: VISOR DEL MANUAL EN FORMATO OFICIAL */}
            <section
              className={`bg-white rounded-2xl shadow-sm border border-zinc-200/90 flex flex-col transition-all relative ${
                isWideView ? 'w-full' : 'w-full lg:w-8/12'
              }`}
            >
              {/* Barra de Pestañas y Herramientas Sticky (Acompaña al usuario en todo el recorrido de la página) */}
              <div className="sticky top-[52px] z-30 bg-white/95 backdrop-blur-md border-b border-zinc-200/90 shadow-2xs rounded-t-2xl no-print">
                <div className="flex items-center justify-between bg-zinc-50/70 border-b border-zinc-200/80 p-2 gap-2 shrink-0">
                  <div className="flex gap-2 flex-1 overflow-x-auto">
                    <button
                      onClick={() => setActiveTab('manual')}
                      className={`py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
                        activeTab === 'manual'
                          ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200 font-black'
                          : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-500" />
                      <span>1. Manual de Procedimientos</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('lean')}
                      className={`py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
                        activeTab === 'lean'
                          ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200 font-black'
                          : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>2. Diagnóstico</span>
                    </button>
                  </div>
                </div>

                {/* BARRA DE HERRAMIENTAS WORD COMPACTA Y MINIMALISTA - ACOMPAÑA AL USUARIO AL BAJAR */}
                {!isGenerating && activeTab === 'manual' && (manualMarkdown || editableDoc.pages.length > 0) && (
                  <div className="bg-white px-3 py-1">
                    <RibbonToolbar
                      onUndo={handleUndo}
                      onRedo={handleRedo}
                      canUndo={historyIndex > 0}
                      canRedo={historyIndex < historyStack.length - 1}
                      docZoom={docZoom}
                      onZoomChange={setDocZoom}
                      onResetSigners={handleResetAllSigners}
                      onSaveManual={handleSaveActiveManual}
                      hasUnsavedChanges={hasUnsavedChanges}
                      syncStatus={syncStatus}
                      lastSyncTime={lastSyncTimeString}
                      onExportWord={handleExportWord}
                      onExportPdf={handleDownloadPdf}
                      isExportingPdf={isExportingPdf}
                      pdfProgress={pdfProgress}
                      selectedFont={selectedFont}
                      onFontChange={setSelectedFont}
                      selectedFontSize={selectedFontSize}
                      onFontSizeChange={setSelectedFontSize}
                      selectedLineHeight={selectedLineHeight}
                      onLineHeightChange={setSelectedLineHeight}
                      isEditing={isEditing}
                      onToggleEditing={() => setIsEditing(!isEditing)}
                      signerCount={signers.length}
                      onToggleSignerCount={handleToggleSignerCount}
                      onOpenPresentation={() => {
                        setPresentationSlideIndex(0);
                        setIsPresentationOpen(true);
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Área de Visualización y Edición In-Situ */}
              <div className="flex-1 overflow-y-auto overflow-x-auto p-3 sm:p-6 bg-slate-100 text-black">
                {/* Loading Overlay: Barra de Progreso y Etapas con % */}
                {isGenerating && (
                  <div className="h-full flex flex-col items-center justify-center py-16 px-4 text-center max-w-lg mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-5 shadow-xs relative">
                      <Loader2 className="w-7 h-7 text-amber-600 animate-spin" />
                      <span className="absolute -top-2 -right-2 text-[10px] font-black bg-zinc-900 text-[#fed700] px-2 py-0.5 rounded-full border border-amber-500/40">
                        {Math.round(generationProgress)}%
                      </span>
                    </div>

                    <h3 className="text-lg font-extrabold text-zinc-900 mb-1.5 tracking-tight">
                      Generando Manual de Procedimientos
                    </h3>
                    <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200/80 px-3 py-1 rounded-full mb-5">
                      {generationStage || 'Generando contenido oficial...'}
                    </p>

                    {/* Barra de Progreso Principal */}
                    <div className="w-full bg-zinc-200 rounded-full h-3 overflow-hidden p-0.5 border border-zinc-300/80 mb-5 shadow-inner">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-300 ease-out shadow-xs"
                        style={{ width: `${Math.min(100, Math.max(5, Math.round(generationProgress)))}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* LIENZO LIMPIO AL INICIAR: Pantalla de Bienvenida y Espera */}
                {!isGenerating && !manualMarkdown && editableDoc.pages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center py-24 text-zinc-400">
                    <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-3 border border-zinc-200 shadow-xs">
                      <img
                        src="/assets/aistudio/images_5a52e549.png"
                        alt="Logo Canguro"
                        className="h-10 w-auto mix-blend-multiply opacity-80"
                      />
                    </div>
                    <h4 className="font-black text-zinc-900 text-xs sm:text-sm uppercase tracking-widest mb-4">
                      EN ESPERA DE GENERACIÓN
                    </h4>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={handleLoadPreset}
                        className="px-3.5 py-2 text-xs font-bold text-zinc-800 bg-white hover:bg-zinc-50 rounded-xl border border-zinc-300 shadow-2xs transition active:scale-95 flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Cargar Caso de Ejemplo</span>
                      </button>
                      <button
                        onClick={handleNewBlankManual}
                        className="px-3.5 py-2 text-xs font-bold text-zinc-800 bg-white hover:bg-zinc-50 rounded-xl border border-zinc-300 shadow-2xs transition active:scale-95 flex items-center gap-1.5"
                      >
                        <FilePlus2 className="w-3.5 h-3.5 text-zinc-700" />
                        <span>Crear Manual en Blanco</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* DOCUMENTO RENDERIZADO: Visible solo tras generar o abrir desde BD */}
                {!isGenerating && (manualMarkdown || editableDoc.pages.length > 0) && (
                  <div className={`mx-auto ${isEditing ? 'editing-active' : ''} max-w-[1300px]`}>

                    {/* Contenedor de Medición DOM Oculto para alturas reales de bloques */}
                    <div
                      id="manual-measurement-container"
                      className="invisible fixed -top-[10000px] left-0 pointer-events-none"
                      style={{
                        width: '1072px',
                        fontFamily: selectedFont,
                        fontSize: selectedFontSize,
                        lineHeight: selectedLineHeight
                      }}
                    >
                      {rawBlocks.map((b) => (
                        <div key={b.id} id={`measure-block-${b.id}`} className="py-1">
                          <RenderBlockView
                            block={b}
                            selectedLineHeight={selectedLineHeight}
                          />
                        </div>
                      ))}
                    </div>

                    {(activeTab === 'manual' || activeTab === 'database') ? (
                      <div className="space-y-8" style={{ zoom: `${docZoom}%`, lineHeight: selectedLineHeight }}>
                        {pages.map((page, pIdx) => {
                          if (page.type === 'portada') {
                            return (
                              <React.Fragment key={page.pageKey || 'manual-page-1'}>
                                <div
                                  className="page-sheet bg-white text-black relative"
                                  style={{
                                    fontFamily: selectedFont,
                                    fontSize: selectedFontSize,
                                    color: '#000000',
                                    lineHeight: selectedLineHeight
                                  }}
                                >
                                  {isEditing && (
                                    <div className="no-print absolute top-3 right-3 z-30">
                                      <button
                                        type="button"
                                        onClick={() => handleRemovePage(1, page)}
                                        className="w-6 h-6 rounded-full bg-zinc-100 hover:bg-red-500 text-zinc-400 hover:text-white border border-zinc-200 transition-all flex items-center justify-center cursor-pointer shadow-xs"
                                        title="La carátula es obligatoria y no puede eliminarse"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                  <HeaderTable
                                    pageNumber={1}
                                    totalPages={totalPages}
                                    code={fullCode}
                                    version={version}
                                    classification={classification}
                                    processName={processName}
                                    direction={direction}
                                    emisionDate={emisionDate}
                                    actualizacionDate={actualizacionDate}
                                  />
                                  <div className="page-body">
                                    <Page1EditableLayout
                                      doc={editableDoc}
                                      approvalAreas={approvalAreas}
                                      isEditing={isEditing}
                                      onUpdateField={(field, value) => {
                                        const newDoc = { ...editableDoc, [field]: value };
                                        setEditableDoc(newDoc);
                                        if (field === 'objetivo' || field === 'alcance' || field === 'clasificacion' || field === 'versionDesc') {
                                          setManualData((prev) => ({ ...prev, [field]: value }));
                                        }
                                        pushHistorySnapshot(newDoc);
                                        setHasUnsavedChanges(true);
                                      }}
                                      onAddStep={handleAddFlowStep}
                                      onRemoveStep={handleRemoveFlowStep}
                                      onUpdateStep={handleUpdateFlowStep}
                                      onAddApprovalArea={handleAddApprovalArea}
                                      onRemoveApprovalArea={handleRemoveApprovalArea}
                                      onUpdateApprovalArea={handleUpdateApprovalArea}
                                    />
                                  </div>
                                  <OfficialSignaturesFooter
                                    signers={signers}
                                    isEditing={isEditing}
                                    onUpdateSigner={handleUpdateSigner}
                                    onUploadSignature={handleUploadSignerSignature}
                                    onResetSigner={handleResetSigner}
                                    onRemoveSigner={handleRemoveSigner}
                                    onAddFifthSigner={handleAddFifthSigner}
                                  />
                                </div>

                                {/* Divisor '+' para incluir página intermedia entre páginas */}
                                {pIdx < pages.length - 1 && (
                                  <div className="no-print my-6 flex items-center justify-center group relative py-1">
                                    <div className="absolute inset-0 flex items-center">
                                      <div className="w-full border-t-2 border-dashed border-zinc-300 group-hover:border-[#fed700] transition-colors" />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleInsertIntermediatePage(page.pageKey, page.pageNumber)}
                                      className="relative z-10 px-4 py-1.5 rounded-full bg-white hover:bg-[#fed700] text-zinc-700 hover:text-black font-bold text-xs border border-zinc-300 hover:border-black/50 shadow-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 group-hover:shadow-md group-hover:scale-105"
                                      title={`Incluir página intermedia entre la Página ${page.pageNumber} y la Página ${page.pageNumber + 1}`}
                                    >
                                      <div className="w-4 h-4 rounded-full bg-[#fed700] group-hover:bg-black text-black group-hover:text-white flex items-center justify-center transition-colors">
                                        <Plus className="w-3 h-3 stroke-[3]" />
                                      </div>
                                      <span className="text-[11px] font-bold">Incluir Página Intermedia</span>
                                    </button>
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          }

                          if (page.type === 'herramientas_derogados') {
                            const page2Md = `## [7] HERRAMIENTAS TECNOLÓGICAS\n${(manualData.herramientas || []).map((h) => `• ${h}`).join('\n')}\n\n## [8] DOCUMENTOS DEROGADOS\n${(manualData.documentosDerogados || ['N/A']).map((d) => (d === 'N/A' ? 'N/A' : `• ${d}`)).join('\n')}`;
                            return (
                              <React.Fragment key={page.pageKey || 'manual-page-2'}>
                                <div
                                  className="page-sheet bg-white text-black relative"
                                  style={{
                                    fontFamily: selectedFont,
                                    fontSize: selectedFontSize,
                                    color: '#000000',
                                    lineHeight: selectedLineHeight
                                  }}
                                >
                                  {isEditing && (
                                    <div className="no-print absolute top-3 right-3 z-30">
                                      <button
                                        type="button"
                                        onClick={() => handleRemovePage(2, page)}
                                        className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border border-red-200 transition-all flex items-center justify-center cursor-pointer shadow-xs"
                                        title="Eliminar o reiniciar página 2"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                  <HeaderTable
                                    pageNumber={2}
                                    totalPages={totalPages}
                                    code={fullCode}
                                    version={version}
                                    classification={classification}
                                    processName={processName}
                                    direction={direction}
                                    emisionDate={emisionDate}
                                    actualizacionDate={actualizacionDate}
                                  />
                                  <div className="page-body">
                                    <Page2EditableBlock
                                      content={page2Md}
                                      herramientas={manualData.herramientas || []}
                                      documentosDerogados={manualData.documentosDerogados || ['N/A']}
                                      isEditing={isEditing}
                                      onUpdateHerramientas={(tools) => {
                                        setManualData((prev) => ({
                                          ...prev,
                                          herramientas: tools
                                        }));
                                        setHasUnsavedChanges(true);
                                      }}
                                      onUpdateDerogados={(derogados) => {
                                        setManualData((prev) => ({
                                          ...prev,
                                          documentosDerogados: derogados
                                        }));
                                        setHasUnsavedChanges(true);
                                      }}
                                      onUpdateContent={(val) => {
                                        const toolsMatch = val.match(/##\s*\[?7\]?\s*HERRAMIENTAS[\s\S]*?\n([^\n#=][\s\S]*?)(?=\n##|\n===|$)/i);
                                        let tools: string[] = [];
                                        if (toolsMatch && toolsMatch[1]) {
                                          tools = toolsMatch[1].split('\n').map((l) => l.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean);
                                        }
                                        const derMatch = val.match(/##\s*(?:\[?8\]?\s*)?DOCUMENTOS DEROGADOS[\s\S]*?\n([^\n#=][\s\S]*?)(?=\n##|\n===|$)/i);
                                        let derogados: string[] = ['N/A'];
                                        if (derMatch && derMatch[1]) {
                                          const lines = derMatch[1].split('\n').map((l) => l.trim()).filter(Boolean);
                                          if (lines.length > 0 && lines[0] !== 'N/A') {
                                            derogados = lines.map((l) => l.replace(/^[•\-\*]\s*/, ''));
                                          }
                                        }
                                        setManualData((prev) => ({
                                          ...prev,
                                          herramientas: tools.length > 0 ? tools : prev.herramientas,
                                          documentosDerogados: derogados
                                        }));
                                        setHasUnsavedChanges(true);
                                      }}
                                    />
                                  </div>
                                  <OfficialSignaturesFooter
                                    signers={signers}
                                    isEditing={isEditing}
                                    onUpdateSigner={handleUpdateSigner}
                                    onUploadSignature={handleUploadSignerSignature}
                                    onResetSigner={handleResetSigner}
                                    onRemoveSigner={handleRemoveSigner}
                                    onAddFifthSigner={handleAddFifthSigner}
                                  />
                                </div>

                                {/* Divisor '+' para incluir página intermedia entre páginas */}
                                {pIdx < pages.length - 1 && (
                                  <div className="no-print my-6 flex items-center justify-center group relative py-1">
                                    <div className="absolute inset-0 flex items-center">
                                      <div className="w-full border-t-2 border-dashed border-zinc-300 group-hover:border-[#fed700] transition-colors" />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleInsertIntermediatePage(page.pageKey, page.pageNumber)}
                                      className="relative z-10 px-4 py-1.5 rounded-full bg-white hover:bg-[#fed700] text-zinc-700 hover:text-black font-bold text-xs border border-zinc-300 hover:border-black/50 shadow-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 group-hover:shadow-md group-hover:scale-105"
                                      title={`Incluir página intermedia entre la Página ${page.pageNumber} y la Página ${page.pageNumber + 1}`}
                                    >
                                      <div className="w-4 h-4 rounded-full bg-[#fed700] group-hover:bg-black text-black group-hover:text-white flex items-center justify-center transition-colors">
                                        <Plus className="w-3 h-3 stroke-[3]" />
                                      </div>
                                      <span className="text-[11px] font-bold">Incluir Página Intermedia</span>
                                    </button>
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          }

                          if (page.type === 'intermediate') {
                            const intData = page.intermediateData;
                            return (
                              <React.Fragment key={page.pageKey || `intermediate-${page.pageNumber}`}>
                                <div
                                  className="page-sheet bg-white text-black relative"
                                  style={{
                                    fontFamily: selectedFont,
                                    fontSize: selectedFontSize,
                                    color: '#000000',
                                    lineHeight: selectedLineHeight
                                  }}
                                >
                                  {isEditing && (
                                    <div className="no-print absolute top-3 right-3 z-30">
                                      <button
                                        type="button"
                                        onClick={() => handleRemovePage(page.pageNumber, page)}
                                        className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border border-red-200 transition-all flex items-center justify-center cursor-pointer shadow-xs"
                                        title={`Eliminar página intermedia ${page.pageNumber}`}
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                  <HeaderTable
                                    pageNumber={page.pageNumber}
                                    totalPages={totalPages}
                                    code={fullCode}
                                    version={version}
                                    classification={classification}
                                    processName={processName}
                                    direction={direction}
                                    emisionDate={emisionDate}
                                    actualizacionDate={actualizacionDate}
                                  />
                                  <div className="page-body">
                                    <div className="flex-1 flex flex-col justify-start h-full overflow-hidden">
                                      {/* Encabezado Oficial Visio de Sección */}
                                      <SectionPillBanner
                                        number={intData?.sectionNumber || '10'}
                                        title={intData?.sectionTitle || 'NORMAS DEL PROCESO'}
                                      />

                                      {/* Caja Blanca Redondeada Oficial Visio */}
                                      <div className="border border-black rounded-[14px] bg-white p-3.5 my-0.5 flex-1 flex flex-col justify-start shadow-2xs overflow-hidden">
                                        <h3 className="font-black text-black border-b border-black/30 pb-0.5 mb-1.5 uppercase text-[11.5px]">
                                          {intData?.subtitle || 'DISPOSICIONES Y LINEAMIENTOS OPERATIVOS COMPLEMENTARIOS'}
                                        </h3>

                                        {isEditing ? (
                                          <textarea
                                            value={intData?.content || ''}
                                            onChange={(e) => {
                                              if (intData?.id) {
                                                handleUpdateIntermediatePage(intData.id, { content: e.target.value });
                                              }
                                            }}
                                            placeholder="Escriba aquí los lineamientos, normas o notas complementarias de esta página..."
                                            className="w-full flex-1 p-2 outline-none border border-amber-300/80 bg-amber-50/20 hover:bg-amber-50/40 rounded text-black text-[11px] font-sans resize-none leading-relaxed transition"
                                            style={{ lineHeight: selectedLineHeight, fontFamily: selectedFont, fontSize: selectedFontSize }}
                                          />
                                        ) : (
                                          <div
                                            className="text-black text-[11px] whitespace-pre-wrap leading-relaxed overflow-y-auto"
                                            style={{ lineHeight: selectedLineHeight, fontFamily: selectedFont, fontSize: selectedFontSize }}
                                          >
                                            {renderFormattedIntermediateContent(intData?.content || '')}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <OfficialSignaturesFooter
                                    signers={signers}
                                    isEditing={isEditing}
                                    onUpdateSigner={handleUpdateSigner}
                                    onUploadSignature={handleUploadSignerSignature}
                                    onResetSigner={handleResetSigner}
                                    onRemoveSigner={handleRemoveSigner}
                                    onAddFifthSigner={handleAddFifthSigner}
                                  />
                                </div>

                                {/* Divisor '+' para incluir página intermedia entre páginas */}
                                {pIdx < pages.length - 1 && (
                                  <div className="no-print my-6 flex items-center justify-center group relative py-1">
                                    <div className="absolute inset-0 flex items-center">
                                      <div className="w-full border-t-2 border-dashed border-zinc-300 group-hover:border-[#fed700] transition-colors" />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleInsertIntermediatePage(page.pageKey, page.pageNumber)}
                                      className="relative z-10 px-4 py-1.5 rounded-full bg-white hover:bg-[#fed700] text-zinc-700 hover:text-black font-bold text-xs border border-zinc-300 hover:border-black/50 shadow-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 group-hover:shadow-md group-hover:scale-105"
                                      title={`Incluir página intermedia entre la Página ${page.pageNumber} y la Página ${page.pageNumber + 1}`}
                                    >
                                      <div className="w-4 h-4 rounded-full bg-[#fed700] group-hover:bg-black text-black group-hover:text-white flex items-center justify-center transition-colors">
                                        <Plus className="w-3 h-3 stroke-[3]" />
                                      </div>
                                      <span className="text-[11px] font-bold">Incluir Página Intermedia</span>
                                    </button>
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          }

                          // Páginas 3 a N de Contenido Determinista
                          return (
                            <React.Fragment key={page.pageKey || `manual-page-${page.pageNumber}`}>
                              <div
                                className="page-sheet bg-white text-black relative"
                                style={{
                                  fontFamily: selectedFont,
                                  fontSize: selectedFontSize,
                                  color: '#000000',
                                  lineHeight: selectedLineHeight
                                }}
                              >
                                {isEditing && (
                                  <div className="no-print absolute top-3 right-3 z-30">
                                    <button
                                      type="button"
                                      onClick={() => handleRemovePage(page.pageNumber, page)}
                                      className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border border-red-200 transition-all flex items-center justify-center cursor-pointer shadow-xs"
                                      title={`Eliminar página ${page.pageNumber}`}
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                                <HeaderTable
                                  pageNumber={page.pageNumber}
                                  totalPages={totalPages}
                                  code={fullCode}
                                  version={version}
                                  classification={classification}
                                  processName={processName}
                                  direction={direction}
                                  emisionDate={emisionDate}
                                  actualizacionDate={actualizacionDate}
                                />
                                <div className="page-body">
                                  <ErrorBoundary fallbackMessage="Se detectó una inconsistencia de formato en esta página del manual. El resto del documento sigue accesible.">
                                    <PaginatedContentSections
                                      sections={page.sections || []}
                                      isEditing={isEditing}
                                      selectedLineHeight={selectedLineHeight}
                                      processName={processName}
                                      continuationLabel={manualData?.continuationLabel}
                                      onUpdateContinuationLabel={(newLabel) => {
                                        setManualData((prev) => (prev ? { ...prev, continuationLabel: newLabel } : prev));
                                        setHasUnsavedChanges(true);
                                      }}
                                      onUpdateCargo={(cargoIdx, updatedCargo) => {
                                        setManualData((prev) => {
                                          const newCargos = [...(prev.cargos || [])];
                                          newCargos[cargoIdx] = updatedCargo;
                                          return { ...prev, cargos: newCargos };
                                        });
                                        setHasUnsavedChanges(true);
                                      }}
                                      onUpdateCriterio={(critIdx, updatedCrit) => {
                                        setManualData((prev) => {
                                          if (!prev) return prev;
                                          const currentCrits = Array.isArray(prev.criterios) ? [...prev.criterios] : [];
                                          const hasV = Array.isArray(updatedCrit.vinetas) && updatedCrit.vinetas.length > 0;
                                          const safeStr = (s: any): string => (typeof s === 'string' ? s.trim() : '');
                                          const rawT = safeStr(updatedCrit?.texto);
                                          let isDup = false;
                                          if (hasV && rawT) {
                                            const tNorm = rawT.toLowerCase();
                                            isDup = (updatedCrit.vinetas || []).some((v: any) => {
                                              if (!v) return false;
                                              const vDet = safeStr(v.detalle || v.text || '').toLowerCase();
                                              const vEt = safeStr(v.etiqueta || '').toLowerCase();
                                              return (
                                                (vDet && tNorm.includes(vDet.slice(0, 20))) ||
                                                (vEt && tNorm.includes(vEt)) ||
                                                (vDet && vDet.includes(tNorm.slice(0, 20)))
                                              );
                                            });
                                          }
                                          const cleanUpdated = isDup ? { ...updatedCrit, texto: undefined } : updatedCrit;
                                          let targetIdx = critIdx;
                                          if (cleanUpdated.numero) {
                                            const matchIdx = currentCrits.findIndex((c) => c && c.numero === cleanUpdated.numero);
                                            if (matchIdx !== -1) targetIdx = matchIdx;
                                          }
                                          if (targetIdx >= 0 && targetIdx < currentCrits.length) {
                                            currentCrits[targetIdx] = cleanUpdated;
                                          } else {
                                            currentCrits.push(cleanUpdated);
                                          }
                                          return { ...prev, criterios: currentCrits.filter(Boolean) };
                                        });
                                        setHasUnsavedChanges(true);
                                      }}
                                      onUpdateGlosario={(gloIdx, updatedGlo) => {
                                        setManualData((prev) => {
                                          const newGlo = [...(prev.glosario || [])];
                                          newGlo[gloIdx] = updatedGlo;
                                          return { ...prev, glosario: newGlo };
                                        });
                                        setHasUnsavedChanges(true);
                                      }}
                                      onUpdateAllGlosario={(updatedGlosario) => {
                                        setManualData((prev) => ({
                                          ...prev,
                                          glosario: updatedGlosario
                                        }));
                                        setHasUnsavedChanges(true);
                                      }}
                                    />
                                  </ErrorBoundary>
                                </div>
                                <OfficialSignaturesFooter
                                  signers={signers}
                                  isEditing={isEditing}
                                  onUpdateSigner={handleUpdateSigner}
                                  onUploadSignature={handleUploadSignerSignature}
                                  onResetSigner={handleResetSigner}
                                  onRemoveSigner={handleRemoveSigner}
                                  onAddFifthSigner={handleAddFifthSigner}
                                />
                              </div>

                              {/* Divisor '+' para incluir página intermedia entre páginas */}
                              {pIdx < pages.length - 1 && (
                                <div className="no-print my-6 flex items-center justify-center group relative py-1">
                                  <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t-2 border-dashed border-zinc-300 group-hover:border-[#fed700] transition-colors" />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleInsertIntermediatePage(page.pageKey, page.pageNumber)}
                                    className="relative z-10 px-4 py-1.5 rounded-full bg-white hover:bg-[#fed700] text-zinc-700 hover:text-black font-bold text-xs border border-zinc-300 hover:border-black/50 shadow-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 group-hover:shadow-md group-hover:scale-105"
                                    title={`Incluir página intermedia entre la Página ${page.pageNumber} y la Página ${page.pageNumber + 1}`}
                                  >
                                    <div className="w-4 h-4 rounded-full bg-[#fed700] group-hover:bg-black text-black group-hover:text-white flex items-center justify-center transition-colors">
                                      <Plus className="w-3 h-3 stroke-[3]" />
                                    </div>
                                    <span className="text-[11px] font-bold">Incluir Página Intermedia</span>
                                  </button>
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}

                        {/* Botón para añadir nueva página al final del documento en modo edición */}
                        {isEditing && (
                          <div className="no-print max-w-[1120px] mx-auto text-center py-2">
                            <button
                              type="button"
                              onClick={() => handleAddNewPage()}
                              className="px-5 py-2.5 rounded-xl border-2 border-dashed border-zinc-400 hover:border-black bg-white hover:bg-yellow-50 text-zinc-800 hover:text-black font-bold text-xs flex items-center gap-2 mx-auto transition cursor-pointer shadow-xs active:scale-95"
                            >
                              <Plus className="w-4 h-4 text-black" />
                              <span>Añadir Nueva Página al Manual</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-6" style={{ zoom: `${docZoom}%` }}>
                        <DiagnosticView
                          markdown={leanMarkdown}
                          onUpdateMarkdown={(newLean) => {
                            setLeanMarkdown(newLean);
                            setHasUnsavedChanges(true);
                          }}
                          processName={processName}
                          direction={direction}
                          code={fullCode}
                          owner={owner}
                          showToast={showToast}
                          onExportWord={handleExportWord}
                          onExportPdf={handleDownloadDiagnosticPdf}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
        </div>
      </main>

      {/* MODAL: AÑADIR NUEVA DIRECCIÓN */}
      <AddDirectionModal
        isOpen={isAddDirectionModalOpen}
        directionName={newDirectionName}
        directorName={newDirectionDirector}
        onDirectionNameChange={setNewDirectionName}
        onDirectorNameChange={setNewDirectionDirector}
        onSave={handleSaveNewDirection}
        onClose={() => setIsAddDirectionModalOpen(false)}
      />

      {/* MODAL DE CONFIRMACIÓN: ELIMINAR MANUAL */}
      <DeleteManualConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        manualName={deleteConfirmModal.manualName}
        onConfirm={confirmDeleteManual}
        onClose={() => setDeleteConfirmModal({ isOpen: false, manualId: '', manualName: '' })}
      />

      {/* MODAL DE CONFIRMACIÓN: ELIMINAR DIRECCIÓN */}
      <DeleteDirectionConfirmModal
        isOpen={deleteDirectionModal.isOpen}
        directionName={deleteDirectionModal.directionName}
        onConfirm={handleConfirmDeleteDirection}
        onClose={() => setDeleteDirectionModal({ isOpen: false, directionName: '' })}
      />

      {/* MODAL DE CONFIRMACIÓN: NUEVO MANUAL CON CAMBIOS SIN GUARDAR */}
      <ConfirmNewManualModal
        isOpen={confirmNewManualModal}
        onConfirm={() => {
          setConfirmNewManualModal(false);
          handleNewBlankManual();
        }}
        onClose={() => setConfirmNewManualModal(false)}
      />

      {/* MODAL / VISOR DE MODO PRESENTACIÓN PÁGINA POR PÁGINA */}
      {isPresentationOpen && (
        <PresentationModeViewer
          fullCode={fullCode}
          version={version}
          classification={classification}
          processName={processName}
          direction={direction}
          emisionDate={emisionDate}
          actualizacionDate={actualizacionDate}
          editableDoc={editableDoc}
          approvalAreas={approvalAreas}
          signers={signers}
          selectedFont={selectedFont}
          selectedFontSize={selectedFontSize}
          selectedLineHeight={selectedLineHeight}
          slideIndex={presentationSlideIndex}
          onSlideChange={setPresentationSlideIndex}
          onClose={() => setIsPresentationOpen(false)}
          pages={pages}
          manualData={manualData}
        />
      )}

      {/* MODAL DE CONFIGURACIÓN PREDETERMINADA */}
      {isSettingsModalOpen && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          codePrefix={codePrefix}
          onSavePrefix={handleSaveCodePrefix}
          signersConfig={signersConfig}
          onSaveSigners={handleSaveSignersConfig}
          directorsDirectory={directorsDirectory}
          onSaveDirectorsDirectory={handleSaveDirectorsDirectory}
          availableDirections={directionsList}
          defaultTrainingArea={defaultTrainingArea}
          onSaveTrainingArea={handleSaveTrainingArea}
          onResetDefaults={handleResetFactoryDefaults}
          onShowToast={showToast}
          onApplyToCurrentManual={handleApplyToCurrentManual}
        />
      )}
    </div>
  );
}
