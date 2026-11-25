import React, { useState, useMemo, useRef } from 'react';
import {
  Database,
  Search,
  Filter,
  FilePlus2,
  Trash2,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  UserCheck,
  FileSpreadsheet,
  Download,
  FolderOpen,
  ArrowUpDown,
  FileText,
  Sparkles,
  ArrowLeft,
  Upload,
  HardDriveDownload,
  Save,
  Cloud,
  UploadCloud,
  Loader2,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { StoredManualRecord, ManualStatus } from '../types/processManual';
import { GoogleDriveSyncCard } from './GoogleDriveSyncCard';
import { SyncStatusType } from './RibbonToolbar';
import { getAccessToken, syncSingleManualToGoogleDrive, DRIVE_FOLDER_URL } from '../services/googleDriveService';
import { exportManualToPdfBlob } from '../utils/pdfExport';

interface ManualsDatabaseViewProps {
  manuals: StoredManualRecord[];
  activeManualId: string;
  activeManualName?: string;
  onReturnToEditor: () => void;
  onSelectManual: (manual: StoredManualRecord) => void;
  onNewBlankManual: () => void;
  onDeleteManual: (id: string, name: string) => void;
  onDuplicateManual: (manual: StoredManualRecord) => void;
  onUpdateStatus: (id: string, status: ManualStatus) => void;
  onExportWord: (manual: StoredManualRecord) => void;
  onExportPdf: (manual: StoredManualRecord) => void;
  onImportDatabase?: (imported: StoredManualRecord[]) => void;
  onSyncManual?: (
    manual: StoredManualRecord,
    onProgress?: (step: number, percent: number, stageMessage: string) => void
  ) => Promise<{ driveUrl?: string; uploadedAt?: string; fileId?: string }>;
  showToast: (message: string, type: 'success' | 'info' | 'error') => void;
  autoSaveDriveEnabled?: boolean;
  onToggleAutoSaveDrive?: (enabled: boolean) => void;
  syncStatus?: SyncStatusType;
  hasUnsavedChanges?: boolean;
}

export interface SyncModalState {
  isOpen: boolean;
  manual: StoredManualRecord | null;
  stage: 'idle' | 'running' | 'success' | 'error';
  stepNumber: number;
  totalSteps: number;
  percent: number;
  stageMessage: string;
  elapsedSeconds: number;
  uploadedAt?: string;
  driveUrl?: string;
  driveFileId?: string;
  error?: string;
}

export const ManualsDatabaseView: React.FC<ManualsDatabaseViewProps> = ({
  manuals,
  activeManualId,
  activeManualName,
  onReturnToEditor,
  onSelectManual,
  onNewBlankManual,
  onDeleteManual,
  onDuplicateManual,
  onUpdateStatus,
  onExportWord,
  onExportPdf,
  onImportDatabase,
  onSyncManual,
  showToast,
  autoSaveDriveEnabled,
  onToggleAutoSaveDrive,
  syncStatus,
  hasUnsavedChanges
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | ManualStatus>('todos');
  const [directionFilter, setDirectionFilter] = useState<string>('todas');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'codigo' | 'nombre'>('updatedAt');
  const [syncingRowId, setSyncingRowId] = useState<string | null>(null);
  const [syncModal, setSyncModal] = useState<SyncModalState>({
    isOpen: false,
    manual: null,
    stage: 'idle',
    stepNumber: 1,
    totalSteps: 4,
    percent: 0,
    stageMessage: '',
    elapsedSeconds: 0
  });
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const handleSyncSingleManual = async (m: StoredManualRecord) => {
    // Limpiar temporizador previo si existiera
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setSyncingRowId(m.id);
    setSyncModal({
      isOpen: true,
      manual: m,
      stage: 'running',
      stepNumber: 1,
      totalSteps: 4,
      percent: 15,
      stageMessage: 'Iniciando conexión segura con Google Drive...',
      elapsedSeconds: 0,
      uploadedAt: undefined,
      driveUrl: undefined,
      driveFileId: undefined,
      error: undefined
    });

    const startTime = Date.now();
    timerIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setSyncModal((prev) => ({
        ...prev,
        elapsedSeconds: +elapsed.toFixed(1)
      }));
    }, 100);

    try {
      if (onSyncManual) {
        const result = await onSyncManual(m, (step, percent, stageMessage) => {
          setSyncModal((prev) => ({
            ...prev,
            stepNumber: step,
            percent,
            stageMessage
          }));
        });

        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }

        const totalElapsed = (Date.now() - startTime) / 1000;
        setSyncModal((prev) => ({
          ...prev,
          stage: 'success',
          stepNumber: 4,
          percent: 100,
          stageMessage: '¡Archivo PDF verificado y adjunto en Google Drive!',
          elapsedSeconds: +totalElapsed.toFixed(1),
          uploadedAt: result?.uploadedAt || new Date().toISOString(),
          driveUrl: result?.driveUrl || m.sincronizadoDriveUrl,
          driveFileId: result?.fileId || m.sincronizadoDriveFileId
        }));
        return;
      }

      // Fallback si no está onSyncManual provisto
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Inicia sesión en Google Drive en el panel superior para guardar este manual.');
      }

      const cleanName = (m.nombre || 'MANUAL').replace(/[^a-zA-Z0-9_-]/g, '_');
      const pdfFilename = `${m.codigo || 'DTH-GFD-MP'}_${cleanName}_v${m.version || '01'}.pdf`;

      setSyncModal((prev) => ({
        ...prev,
        stepNumber: 2,
        percent: 45,
        stageMessage: 'Generando archivo PDF oficial...'
      }));

      const { blob } = await exportManualToPdfBlob(pdfFilename);

      setSyncModal((prev) => ({
        ...prev,
        stepNumber: 3,
        percent: 75,
        stageMessage: 'Subiendo archivo binario a Google Drive...'
      }));

      const fileInfo = await syncSingleManualToGoogleDrive(m, token, undefined, blob);

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      const totalElapsed = (Date.now() - startTime) / 1000;
      setSyncModal((prev) => ({
        ...prev,
        stage: 'success',
        stepNumber: 4,
        percent: 100,
        stageMessage: '¡Archivo guardado con éxito en Google Drive!',
        elapsedSeconds: +totalElapsed.toFixed(1),
        uploadedAt: new Date().toISOString(),
        driveUrl: fileInfo.webViewLink || `https://drive.google.com/file/d/${fileInfo.id}/view`,
        driveFileId: fileInfo.id
      }));

      showToast(`Archivo PDF oficial de "${m.nombre}" guardado con éxito en Google Drive.`, 'success');
    } catch (err: any) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      console.error(err);
      setSyncModal((prev) => ({
        ...prev,
        stage: 'error',
        stageMessage: 'Error en la sincronización con Google Drive',
        error: err?.message || 'Error de conexión o permisos en Google Drive'
      }));
    } finally {
      setSyncingRowId(null);
    }
  };

  // Direcciones únicas presentes en los manuales
  const uniqueDirections = useMemo(() => {
    const set = new Set<string>();
    manuals.forEach((m) => {
      if (m.direccion) set.add(m.direccion);
    });
    return Array.from(set).sort();
  }, [manuals]);

  // Contadores para métricas
  const stats = useMemo(() => {
    return {
      total: manuals.length,
      aprobados: manuals.filter((m) => m.status === 'aprobado').length,
      borradores: manuals.filter((m) => m.status === 'borrador').length
    };
  }, [manuals]);

  // Filtrado y orden
  const filteredManuals = useMemo(() => {
    return manuals
      .filter((m) => {
        const matchesStatus = statusFilter === 'todos' || m.status === statusFilter;
        const matchesDirection = directionFilter === 'todas' || m.direccion === directionFilter;
        const term = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !term ||
          m.codigo.toLowerCase().includes(term) ||
          m.nombre.toLowerCase().includes(term) ||
          m.direccion.toLowerCase().includes(term) ||
          m.directorApprover.toLowerCase().includes(term) ||
          m.owner.toLowerCase().includes(term) ||
          (m.narrative && m.narrative.toLowerCase().includes(term));

        return matchesStatus && matchesDirection && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'updatedAt') {
          return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
        }
        if (sortBy === 'codigo') {
          return a.codigo.localeCompare(b.codigo);
        }
        return a.nombre.localeCompare(b.nombre);
      });
  }, [manuals, statusFilter, directionFilter, searchTerm, sortBy]);

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Sin fecha';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const getStatusBadge = (status: ManualStatus, manualId: string) => {
    const config = {
      aprobado: {
        label: 'Aprobado',
        bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        dot: 'bg-emerald-600'
      },
      borrador: {
        label: 'Borrador',
        bg: 'bg-amber-100 text-amber-900 border-amber-300',
        dot: 'bg-amber-600'
      }
    }[status] || {
      label: status,
      bg: 'bg-zinc-100 text-zinc-800 border-zinc-300',
      dot: 'bg-zinc-600'
    };

    return (
      <div className="relative inline-flex items-center">
        <select
          value={status === 'aprobado' ? 'aprobado' : 'borrador'}
          onChange={(e) => onUpdateStatus(manualId, e.target.value as ManualStatus)}
          className={`appearance-none text-[11px] font-bold px-2.5 py-1 pr-6 rounded-full border ${config.bg} cursor-pointer outline-none transition focus:ring-2 focus:ring-amber-500`}
          title="Cambiar estado del manual"
          aria-label="Cambiar estado del manual"
        >
          <option value="borrador">Borrador</option>
          <option value="aprobado">Aprobado</option>
        </select>
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot} absolute right-2.5 pointer-events-none`} />
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1550px] mx-auto w-full">
      {/* Encabezado y Métricas */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#fed700] text-zinc-950 flex items-center justify-center shadow-xs">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-zinc-950 tracking-tight">
                Base de Datos de Manuales de Procedimientos
              </h1>
              <p className="text-xs text-zinc-500">
                Visualiza, retoma la edición y administra estados (Borradores y Aprobados).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Volver al Editor */}
            <button
              onClick={onReturnToEditor}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95"
              title="Volver al editor para continuar trabajando en el manual activo"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>Volver al Editor</span>
            </button>

            {/* Añadir Manual en Blanco */}
            <button
              onClick={onNewBlankManual}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#fed700] hover:bg-yellow-400 text-zinc-950 font-black text-xs rounded-xl shadow-xs transition active:scale-95"
              title="Iniciar un nuevo manual de procedimientos completamente en blanco en el editor"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>+ Nuevo Manual</span>
            </button>
          </div>
        </div>

        {/* Tarjetas Métricas Resumen (2 Tarjetas: Total y Aprobados) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200">
            <div className="flex items-center justify-between text-zinc-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Manuales</span>
              <FolderOpen className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-xl font-black text-zinc-900">{stats.total}</div>
          </div>

          <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200">
            <div className="flex items-center justify-between text-emerald-800 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Aprobados</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-950">{stats.aprobados}</div>
          </div>
        </div>
      </div>

      {/* Sincronización Oficial en Google Drive */}
      <GoogleDriveSyncCard
        manuals={manuals}
        showToast={showToast}
        onManualsUpdated={(updated) => onImportDatabase?.(updated)}
        autoSaveDriveEnabled={autoSaveDriveEnabled}
        onToggleAutoSaveDrive={onToggleAutoSaveDrive}
        syncStatus={syncStatus}
        hasUnsavedChanges={hasUnsavedChanges}
      />

      {/* Barra de Filtros y Buscador */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Buscador */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código, proceso, gerencia, dirección, director o contenido..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 outline-none focus:border-amber-400 focus:bg-white transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-zinc-400 hover:text-zinc-600 absolute right-3 top-2.5"
            >
              ×
            </button>
          )}
        </div>

        {/* Filtros de Estado: Todos, Aprobados, Borradores */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(['todos', 'aprobado', 'borrador'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap capitalize ${
                statusFilter === st
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
              }`}
            >
              {st === 'todos' ? 'Todos' : st === 'aprobado' ? 'Aprobados' : 'Borradores'}
              <span className="ml-1.5 opacity-70 font-mono text-[10px]">
                (
                {st === 'todos'
                  ? stats.total
                  : st === 'aprobado'
                  ? stats.aprobados
                  : stats.borradores}
                )
              </span>
            </button>
          ))}
        </div>

        {/* Filtro por Dirección */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
            className="text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="todas">Todas las Direcciones</option>
            {uniqueDirections.map((dir) => (
              <option key={dir} value={dir}>
                {dir}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="updatedAt">Más recientes</option>
            <option value="codigo">Por Código</option>
            <option value="nombre">Por Nombre</option>
          </select>
        </div>
      </div>

      {/* Tabla Ejecutiva de Manuales */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {filteredManuals.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Database className="w-10 h-10 mx-auto text-zinc-300 mb-3" />
            <h3 className="text-sm font-bold text-zinc-800 mb-1">No se encontraron manuales</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
              {searchTerm || statusFilter !== 'todos' || directionFilter !== 'todas'
                ? 'Prueba restableciendo los filtros de búsqueda para ver todos los manuales registrados.'
                : 'Añade tu primer manual en blanco o carga un caso de ejemplo para comenzar a poblar la base de datos.'}
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('todos');
                setDirectionFilter('todas');
              }}
              className="text-xs font-bold px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl transition"
            >
              Restablecer Filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Código & Versión</th>
                  <th className="py-3 px-4">Proceso / Gerencia</th>
                  <th className="py-3 px-4">Dirección Adscrita</th>
                  <th className="py-3 px-4">Director Aprobador</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Subido</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredManuals.map((m, mIdx) => {
                  const isActive = m.id === activeManualId;

                  return (
                    <tr
                      key={`${m.id || 'manual'}-${m.codigo || ''}-${mIdx}`}
                      className={`hover:bg-amber-50/40 transition group ${
                        isActive ? 'bg-amber-50/60 font-semibold' : ''
                      }`}
                    >
                      {/* Código & Versión */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-zinc-900 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md">
                            {m.codigo}
                          </span>
                          <span className="font-mono text-[11px] font-bold text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                            v{m.version}
                          </span>
                          {isActive && (
                            <span className="text-[10px] font-bold uppercase tracking-wide bg-[#fed700] text-zinc-950 px-2 py-0.5 rounded-full shadow-2xs">
                              En Edición
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Nombre del Proceso (Hacer clic abre el manual) */}
                      <td className="py-3.5 px-4 cursor-pointer" onClick={() => onSelectManual(m)}>
                        <div className="font-black text-zinc-900 text-xs uppercase line-clamp-1 hover:text-amber-600 transition" title="Hacer clic para abrir este manual en el editor">
                          {m.nombre || 'SIN NOMBRE ASIGNADO'}
                        </div>
                        <div className="text-[11px] text-zinc-500 line-clamp-1">{m.owner}</div>
                      </td>

                      {/* Dirección Adscrita */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-zinc-800 font-bold uppercase text-[11px]">
                          {m.direccion}
                        </span>
                      </td>

                      {/* Director Aprobador */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-zinc-700 font-semibold text-xs">
                          {m.directorApprover || 'No asignado'}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(m.status, m.id)}
                      </td>

                      {/* Fecha de Subida a Drive */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-zinc-700 text-[11px] font-medium">
                        {m.sincronizadoDriveEn ? (
                          formatDate(m.sincronizadoDriveEn)
                        ) : (
                          <span className="text-zinc-400 italic">No subido</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectManual(m)}
                            className="px-3.5 py-1.5 bg-[#fed700] hover:bg-yellow-400 text-zinc-950 font-black rounded-xl text-xs transition shadow-2xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
                            title="Abrir este manual en el editor para trabajar en él"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Abrir</span>
                          </button>

                          <button
                            onClick={() => onDuplicateManual(m)}
                            className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg transition"
                            title="Duplicar este manual para crear una copia o nueva revisión"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleSyncSingleManual(m)}
                            disabled={syncingRowId === m.id}
                            className={`p-1.5 rounded-lg transition disabled:opacity-50 cursor-pointer ${
                              m.sincronizadoDriveEn
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300'
                                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-400'
                            }`}
                            title={
                              m.sincronizadoDriveEn
                                ? `PDF oficial verificado en Google Drive (${formatDate(m.sincronizadoDriveEn)}). Haz clic para regenerar y resincronizar.`
                                : 'Generar PDF optimizado y subir a Google Drive con temporizador de carga'
                            }
                          >
                            {syncingRowId === m.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                            ) : (
                              <Cloud className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            onClick={() => onExportWord(m)}
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition"
                            title="Descargar en formato Microsoft Word (.docx)"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onExportPdf(m)}
                            className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg transition"
                            title="Descargar en formato PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onDeleteManual(m.id, m.nombre)}
                            className="p-1.5 bg-zinc-100 hover:bg-red-50 text-zinc-500 hover:text-red-600 rounded-lg transition"
                            title="Eliminar este manual permanentemente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE PROGRESO Y CONFIRMACIÓN DE SINCRONIZACIÓN EN GOOGLE DRIVE */}
      {syncModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera del Modal */}
            <div className="flex items-start justify-between gap-3 border-b border-zinc-200 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                    syncModal.stage === 'success'
                      ? 'bg-emerald-500 text-white'
                      : syncModal.stage === 'error'
                      ? 'bg-red-500 text-white'
                      : 'bg-[#fed700] text-zinc-950'
                  }`}
                >
                  {syncModal.stage === 'success' ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : syncModal.stage === 'error' ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : (
                    <Cloud className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-950 tracking-tight">
                    {syncModal.stage === 'success'
                      ? '¡Sincronizado con Éxito en Google Drive!'
                      : syncModal.stage === 'error'
                      ? 'Error al Sincronizar en Google Drive'
                      : 'Sincronizando Manual en Google Drive'}
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono">
                    {syncModal.manual?.codigo} • {syncModal.manual?.nombre}
                  </p>
                </div>
              </div>

              {syncModal.stage !== 'running' && (
                <button
                  onClick={() => setSyncModal((prev) => ({ ...prev, isOpen: false }))}
                  className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition"
                  title="Cerrar ventana"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Temporizador de Carga y Etapas en Vivo */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Tiempo transcurrido:</span>
                  <span className="font-mono font-black text-zinc-900 bg-white px-2 py-0.5 rounded border border-zinc-200 shadow-2xs">
                    {syncModal.elapsedSeconds.toFixed(1)} s
                  </span>
                </span>
                <span className="font-mono font-bold text-xs text-zinc-600">
                  {syncModal.percent}%
                </span>
              </div>

              {/* Barra de Progreso */}
              <div className="w-full h-2.5 bg-zinc-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    syncModal.stage === 'success'
                      ? 'bg-emerald-500'
                      : syncModal.stage === 'error'
                      ? 'bg-red-500'
                      : 'bg-[#fed700]'
                  }`}
                  style={{ width: `${Math.max(5, syncModal.percent)}%` }}
                />
              </div>

              {/* Indicador de 4 Pasos */}
              <div className="grid grid-cols-4 gap-1 text-[10px] font-bold text-center pt-1">
                <div className={`p-1 rounded ${syncModal.stepNumber >= 1 ? 'bg-amber-100 text-amber-900 font-black' : 'text-zinc-400'}`}>
                  1. Conexión
                </div>
                <div className={`p-1 rounded ${syncModal.stepNumber >= 2 ? 'bg-amber-100 text-amber-900 font-black' : 'text-zinc-400'}`}>
                  2. PDF
                </div>
                <div className={`p-1 rounded ${syncModal.stepNumber >= 3 ? 'bg-amber-100 text-amber-900 font-black' : 'text-zinc-400'}`}>
                  3. Subida
                </div>
                <div className={`p-1 rounded ${syncModal.stepNumber >= 4 ? 'bg-emerald-100 text-emerald-900 font-black' : 'text-zinc-400'}`}>
                  4. Verificación
                </div>
              </div>

              {/* Mensaje de Estado en Vivo */}
              <div className="text-xs text-zinc-600 font-medium flex items-center gap-2 pt-1 border-t border-zinc-200/80">
                {syncModal.stage === 'running' && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
                )}
                <span>{syncModal.stageMessage}</span>
              </div>
            </div>

            {/* Resultado: ÉXITO */}
            {syncModal.stage === 'success' && (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-tight">
                      Archivo PDF Adjunto y Verificado en Drive
                    </h4>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      El documento fue verificado en tu carpeta oficial de Google Drive y el registro ahora aparece marcado como <strong>Sincronizado</strong>.
                    </p>
                  </div>
                </div>

                <div className="bg-white/80 rounded-lg p-2.5 border border-emerald-200/60 text-[11px] text-zinc-700 space-y-1 font-medium">
                  <div>
                    <strong className="text-zinc-900">Fecha y hora de subida:</strong> {formatDate(syncModal.uploadedAt)}
                  </div>
                  <div>
                    <strong className="text-zinc-900">Tiempo total de carga:</strong> {syncModal.elapsedSeconds.toFixed(1)} segundos
                  </div>
                  {syncModal.driveFileId && (
                    <div className="text-[10px] text-zinc-500 font-mono">
                      <strong>ID de Drive:</strong> {syncModal.driveFileId}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  {syncModal.driveUrl && (
                    <a
                      href={syncModal.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Ver en Google Drive</span>
                    </a>
                  )}

                  <button
                    onClick={() => setSyncModal((prev) => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold text-xs transition active:scale-95"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}

            {/* Resultado: ERROR */}
            {syncModal.stage === 'error' && (
              <div className="bg-red-50/80 border border-red-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-red-950 uppercase tracking-tight">
                      No se pudo sincronizar el archivo
                    </h4>
                    <p className="text-xs text-red-800 mt-1">
                      {syncModal.error}
                    </p>
                    <p className="text-[11px] text-zinc-600 mt-1.5 bg-white/70 p-2 rounded border border-red-200">
                      <strong>Protección activa:</strong> El manual NO fue marcado como sincronizado para mantener la exactitud de tus registros en este equipo.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  {syncModal.manual && (
                    <button
                      onClick={() => handleSyncSingleManual(syncModal.manual!)}
                      className="px-4 py-2 bg-[#fed700] hover:bg-yellow-400 text-zinc-950 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reintentar Sincronización</span>
                    </button>
                  )}

                  <button
                    onClick={() => setSyncModal((prev) => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl font-bold text-xs transition"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
