import React, { useState, useEffect, useRef } from 'react';
import {
  Loader2,
  LogOut,
  AlertCircle,
  FileJson,
  UploadCloud,
  ShieldCheck,
  DownloadCloud,
  ArrowUpDown,
  ExternalLink,
  FolderSync,
  Settings2,
  Users2,
  Check,
  X,
  Database
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  googleSignIn,
  googleSignOut,
  initDriveAuth,
  listFolderFiles,
  syncDatabaseToGoogleDrive,
  downloadDatabaseFromDrive,
  bidirectionalSyncWithGoogleDrive,
  mergeManualsDatabases,
  getDriveFolderId,
  setDriveFolderId,
  getDriveFolderUrl,
  ensureAccessibleDriveFolder,
  getValidCachedTokenSync,
  getDeletedManualTombstones,
  saveDeletedManualTombstones,
  mergeDeletedTombstones,
  isDriveAuthError,
  setManualAccessToken,
  DEFAULT_DRIVE_FOLDER_ID,
  DriveFileInfo,
  exportDatabaseToJsonFile,
  importDatabaseFromJsonFile,
  type DriveUserProfile
} from '../services/googleDriveService';
import { StoredManualRecord } from '../types/processManual';
import { SyncStatusType } from './RibbonToolbar';

interface GoogleDriveSyncCardProps {
  manuals: StoredManualRecord[];
  showToast: (message: string, type: 'success' | 'info' | 'error') => void;
  onManualsUpdated?: (updated: StoredManualRecord[]) => void;
  autoSaveDriveEnabled?: boolean;
  onToggleAutoSaveDrive?: (enabled: boolean) => void;
  syncStatus?: SyncStatusType;
  hasUnsavedChanges?: boolean;
}

export const GoogleDriveSyncCard: React.FC<GoogleDriveSyncCardProps> = ({
  manuals,
  showToast,
  onManualsUpdated
}) => {
  const [currentUser, setCurrentUser] = useState<User | DriveUserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isPopupBlocked, setIsPopupBlocked] = useState<boolean>(false);
  const [folderWarning, setFolderWarning] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgressMsg, setSyncProgressMsg] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return localStorage.getItem('canguro_drive_last_sync') || '';
  });
  const [lastSyncUser, setLastSyncUser] = useState<string>(() => {
    return localStorage.getItem('canguro_drive_last_user') || '';
  });
  const [driveFiles, setDriveFiles] = useState<DriveFileInfo[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [showFolderModal, setShowFolderModal] = useState<boolean>(false);
  const [folderInput, setFolderInput] = useState<string>(getDriveFolderId());
  const [folderUrl, setFolderUrl] = useState<string>(getDriveFolderUrl());
  const [manualTokenInput, setManualTokenInput] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExportLocalBackup = () => {
    if (manuals.length === 0) {
      showToast('No hay manuales registrados para respaldar.', 'info');
      return;
    }
    try {
      exportDatabaseToJsonFile(manuals);
      showToast(`Copia de seguridad JSON descargada (${manuals.length} manuales).`, 'success');
    } catch (err: any) {
      showToast(`Error al exportar respaldo: ${err?.message || 'Error'}`, 'error');
    }
  };

  const handleImportLocalBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await importDatabaseFromJsonFile(file, manuals);
      if (onManualsUpdated) {
        onManualsUpdated(result.mergedList);
      }
      showToast(
        `¡Restauración exitosa! ${result.stats.totalMerged} manuales consolidados (${result.stats.addedFromRemote} nuevos, ${result.stats.updatedFromRemote} actualizados).`,
        'success'
      );
    } catch (err: any) {
      showToast(`Error al restaurar respaldo: ${err?.message || 'Archivo inválido'}`, 'error');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Inicializar observador de autenticación una sola vez al montar
  useEffect(() => {
    const unsubscribe = initDriveAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
        fetchFiles(token);
      },
      () => {
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const fetchFiles = async (token: string) => {
    setIsLoadingFiles(true);
    setFolderWarning(null);
    try {
      const files = await listFolderFiles(token);
      setDriveFiles(files);
      setFolderUrl(getDriveFolderUrl());
      setFolderInput(getDriveFolderId());
    } catch (err: any) {
      console.warn('Aviso al consultar archivos de Drive:', err?.message || err);
      if (isDriveAuthError(err)) {
        setAccessToken(null);
        setManualAccessToken(null);
        setFolderWarning('Tu sesión con Google Drive ha expirado. Haz clic en "Reactivar Conexión Google Drive" para continuar.');
      } else {
        setFolderWarning(err?.message || 'No se pudo leer la carpeta de Drive configurada.');
      }
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    setIsPopupBlocked(false);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setAccessToken(res.accessToken);
        setIsPopupBlocked(false);
        showToast(`Conectado a Google como ${res.user.displayName || res.user.email}`, 'success');
        await fetchFiles(res.accessToken);
      }
    } catch (err: any) {
      const isBlocked =
        err?.isPopupBlocked ||
        err?.code === 'auth/popup-blocked' ||
        err?.message?.includes('popup') ||
        err?.message?.includes('bloqueó');
      if (isBlocked) {
        setIsPopupBlocked(true);
        console.warn('Aviso: Ventana emergente de Google bloqueada por el navegador.');
        showToast('Ventana emergente bloqueada. Revisa la barra de direcciones de tu navegador o ingresa el token manual.', 'info');
      } else {
        console.warn('Aviso al iniciar sesión con Google:', err?.message || err);
        const msg = err?.message || 'No se pudo autenticar con Google.';
        setAuthError(msg);
        showToast(msg, 'error');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleApplyManualToken = () => {
    if (!manualTokenInput.trim()) {
      showToast('Ingresa un token de acceso válido de Google.', 'info');
      return;
    }
    const cleanToken = manualTokenInput.trim();
    setManualAccessToken(cleanToken, 3500);
    setAccessToken(cleanToken);
    setShowFolderModal(false);
    showToast('Token de acceso vinculado exitosamente.', 'success');
    fetchFiles(cleanToken);
  };

  const handleRepairFolder = async () => {
    const token = getValidCachedTokenSync() || accessToken;
    if (!token) {
      setAccessToken(null);
      showToast('Inicia sesión con Google Drive para verificar tu carpeta.', 'info');
      return;
    }
    try {
      const resolved = await ensureAccessibleDriveFolder(token);
      setFolderInput(resolved.folderId);
      setFolderUrl(getDriveFolderUrl(resolved.folderId));
      setFolderWarning(null);
      showToast(`Carpeta verificada: ${resolved.folderName}`, 'success');
      await fetchFiles(token);
    } catch (e: any) {
      if (isDriveAuthError(e)) {
        setAccessToken(null);
        setManualAccessToken(null);
        setFolderWarning('Tu sesión con Google Drive ha expirado. Reactiva la conexión para verificar la carpeta.');
      }
      showToast(`Error al verificar carpeta: ${e?.message || 'Error'}`, 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      await googleSignOut();
      setCurrentUser(null);
      setAccessToken(null);
      setDriveFiles([]);
      setFolderWarning(null);
      setAuthError(null);
      showToast('Sesión de Google Drive cerrada.', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  // Helper para ejecutar y reportar resultado de sincronización bidireccional
  const runBidirectionalSyncWithToken = async (activeUser: User | DriveUserProfile, activeToken: string) => {
    const result = await bidirectionalSyncWithGoogleDrive(
      manuals,
      activeUser,
      activeToken,
      (msg) => setSyncProgressMsg(msg)
    );

    if (onManualsUpdated) {
      onManualsUpdated(result.mergedList);
    }

    const now = new Date().toLocaleString('es-VE', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
    const userIdent = activeUser.displayName || activeUser.email || 'Usuario';
    setLastSyncTime(now);
    setLastSyncUser(userIdent);
    localStorage.setItem('canguro_drive_last_sync', now);
    localStorage.setItem('canguro_drive_last_user', userIdent);

    const { stats } = result;
    const details = [];
    if (stats.addedFromRemote > 0) details.push(`${stats.addedFromRemote} nuevos descargados`);
    if (stats.updatedFromRemote > 0) details.push(`${stats.updatedFromRemote} actualizados`);
    if (stats.newLocalUploaded > 0) details.push(`${stats.newLocalUploaded} locales subidos`);
    if (stats.removedByDeletion && stats.removedByDeletion > 0) {
      details.push(`${stats.removedByDeletion} eliminados sincronizados`);
    }

    const summaryText = details.length > 0 ? ` (${details.join(', ')})` : '';
    showToast(
      `¡Sincronización bidireccional exitosa! ${stats.totalMerged} manuales consolidados al día${summaryText}.`,
      'success'
    );

    await fetchFiles(activeToken);
  };

  // 1. Sincronización Bidireccional Completa (Recomendada: Subir y Descargar con Smart Merge)
  const handleBidirectionalSync = async () => {
    // Comprobación síncrona antes de cualquier await para preservar userActivation si se requiere popup
    let activeToken = getValidCachedTokenSync();
    let activeUser = currentUser;

    if (!activeToken) {
      setIsAuthenticating(true);
      setAuthError(null);
      setIsPopupBlocked(false);
      setFolderWarning(null);
      try {
        showToast('Renovando sesión de Google Drive...', 'info');
        const res = await googleSignIn();
        if (!res?.accessToken) {
          showToast('No se pudo conectar con Google Drive.', 'error');
          return;
        }
        activeToken = res.accessToken;
        activeUser = res.user;
        setCurrentUser(res.user);
        setAccessToken(res.accessToken);
      } catch (authErr: any) {
        setAccessToken(null);
        const isBlocked =
          authErr?.isPopupBlocked ||
          authErr?.code === 'auth/popup-blocked' ||
          authErr?.message?.includes('bloqueó');
        if (isBlocked) {
          setIsPopupBlocked(true);
          showToast('Ventana emergente bloqueada. Permite las ventanas emergentes o ingresa un token manual.', 'info');
        } else {
          showToast(authErr?.message || 'No se pudo autenticar con Google Drive.', 'error');
        }
        return;
      } finally {
        setIsAuthenticating(false);
      }
    }

    if (!activeUser) {
      activeUser = { displayName: 'Usuario Google', email: '' };
    }

    setIsSyncing(true);
    setFolderWarning(null);
    setAuthError(null);
    try {
      await runBidirectionalSyncWithToken(activeUser, activeToken);
    } catch (err: any) {
      if (isDriveAuthError(err)) {
        // Token revocado o expirado antes del límite estimado: limpiar estado e intentar reconexión
        setManualAccessToken(null);
        setAccessToken(null);
        setSyncProgressMsg('Sesión expirada. Reconectando con Google...');
        try {
          const refreshed = await googleSignIn();
          if (refreshed?.accessToken) {
            setCurrentUser(refreshed.user);
            setAccessToken(refreshed.accessToken);
            await runBidirectionalSyncWithToken(refreshed.user || activeUser, refreshed.accessToken);
            return;
          }
        } catch (reauthErr: any) {
          const isBlocked =
            reauthErr?.isPopupBlocked ||
            reauthErr?.code === 'auth/popup-blocked' ||
            reauthErr?.message?.includes('bloqueó');
          if (isBlocked) {
            setIsPopupBlocked(true);
            setFolderWarning('Tu sesión de Google Drive expiró. Permite las ventanas emergentes o haz clic en "Reactivar Conexión Google Drive".');
            showToast('Tu sesión de Google Drive expiró. Haz clic en "Reintentar Abrir Ventana de Google" para continuar.', 'info');
            return;
          }
          setFolderWarning('Tu sesión de Google Drive ha expirado. Haz clic en "Reactivar Conexión Google Drive" para reconectar.');
          showToast(reauthErr?.message || 'Tu sesión de Google Drive expiró. Haz clic en Reactivar Conexión.', 'info');
          return;
        }
      }

      console.error('Error in bidirectional sync:', err);
      const isPermErr = err?.message?.includes('compartida') || err?.message?.includes('403') || err?.message?.includes('404');
      if (isPermErr) {
        showToast(err.message, 'error');
      } else {
        showToast(`Error de sincronización con Google Drive: ${err.message || 'Error de red'}`, 'error');
      }
    } finally {
      setIsSyncing(false);
      setSyncProgressMsg('');
    }
  };

  // 2. Solo Descargar y Fusionar desde Drive
  const handleDownloadOnly = async () => {
    const token = getValidCachedTokenSync();
    if (!token) {
      setAccessToken(null);
      showToast('Tu sesión ha expirado. Reactiva la conexión con Google primero.', 'info');
      return;
    }

    setIsSyncing(true);
    setSyncProgressMsg('Descargando base de datos desde la nube...');
    try {
      const remoteData = await downloadDatabaseFromDrive(token);
      if (remoteData.manuales.length === 0) {
        showToast('No se encontraron manuales remotos en la carpeta de Drive.', 'info');
        return;
      }

      const mergedTombstones = mergeDeletedTombstones(
        getDeletedManualTombstones(),
        remoteData.eliminados || []
      );
      const { mergedList, stats, activeTombstones } = mergeManualsDatabases(
        manuals,
        remoteData.manuales,
        mergedTombstones
      );
      saveDeletedManualTombstones(activeTombstones);
      if (onManualsUpdated) {
        onManualsUpdated(mergedList);
      }

      const now = new Date().toLocaleString('es-VE', {
        dateStyle: 'short',
        timeStyle: 'short'
      });
      setLastSyncTime(now);
      localStorage.setItem('canguro_drive_last_sync', now);

      showToast(
        `Descarga completada: ${remoteData.manuales.length} manuales remotos procesados (${stats.addedFromRemote} nuevos incorporados).`,
        'success'
      );
      await fetchFiles(token);
    } catch (err: any) {
      if (isDriveAuthError(err)) {
        setManualAccessToken(null);
        setAccessToken(null);
        setFolderWarning('Tu sesión con Google Drive ha expirado. Reactiva la conexión para descargar.');
      }
      console.error(err);
      showToast(`Error al descargar de Drive: ${err.message || 'Error de conexión'}`, 'error');
    } finally {
      setIsSyncing(false);
      setSyncProgressMsg('');
    }
  };

  // 3. Solo Subir a Drive
  const handleUploadOnly = async () => {
    const token = getValidCachedTokenSync();
    if (!token) {
      setAccessToken(null);
      showToast('Tu sesión ha expirado. Reactiva la conexión con Google primero.', 'info');
      return;
    }

    if (manuals.length === 0) {
      showToast('No hay manuales registrados para subir a Drive.', 'info');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncDatabaseToGoogleDrive(manuals, token, currentUser, (msg) => {
        setSyncProgressMsg(msg);
      });

      const now = new Date().toLocaleString('es-VE', {
        dateStyle: 'short',
        timeStyle: 'short'
      });
      const userIdent = currentUser?.displayName || currentUser?.email || 'Usuario';
      setLastSyncTime(now);
      setLastSyncUser(userIdent);
      localStorage.setItem('canguro_drive_last_sync', now);
      localStorage.setItem('canguro_drive_last_user', userIdent);

      showToast(`¡Subida completada! ${result.totalManualsSynced} manuales guardados en la nube.`, 'success');
      await fetchFiles(token);
    } catch (err: any) {
      if (isDriveAuthError(err)) {
        setManualAccessToken(null);
        setAccessToken(null);
        setFolderWarning('Tu sesión con Google Drive ha expirado. Reactiva la conexión para subir.');
      }
      console.error(err);
      showToast(`Error al subir a Drive: ${err.message || 'Error de conexión'}`, 'error');
    } finally {
      setIsSyncing(false);
      setSyncProgressMsg('');
    }
  };

  const handleSaveFolderConfig = () => {
    const savedId = setDriveFolderId(folderInput);
    setFolderInput(savedId);
    setFolderUrl(getDriveFolderUrl(savedId));
    setShowFolderModal(false);
    showToast('Configuración de carpeta de Google Drive guardada.', 'success');
    if (accessToken) {
      fetchFiles(accessToken);
    }
  };

  const handleResetDefaultFolder = () => {
    const defId = setDriveFolderId(DEFAULT_DRIVE_FOLDER_ID);
    setFolderInput(defId);
    setFolderUrl(getDriveFolderUrl(defId));
    showToast('Carpeta restablecida a la oficial corporativa.', 'info');
    if (accessToken) {
      fetchFiles(accessToken);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-4">
      {/* Encabezado y Estado de Cuenta */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Identidad de Sincronización */}
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#fed700] text-zinc-950 flex items-center justify-center shadow-xs shrink-0">
            <FolderSync className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">
                SINCRONIZACIÓN EN GOOGLE DRIVE
              </h3>
            </div>

            <p className="text-xs text-zinc-600 mt-1 flex items-center gap-1.5 flex-wrap">
              {lastSyncTime ? (
                <span>
                  Última sincronización: <span className="font-semibold text-zinc-800">{lastSyncTime}</span>
                  {lastSyncUser && <span className="text-zinc-600"> por {lastSyncUser}</span>}
                </span>
              ) : (
                <span className="text-zinc-500">Base de datos corporativa en la nube</span>
              )}
            </p>
          </div>
        </div>

        {/* Estado de Cuenta de Google y Acciones */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {!accessToken ? (
            <div className="flex items-center gap-2 flex-wrap">
              {currentUser && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-100 border border-zinc-200 text-[11px] text-zinc-700">
                  <span className="truncate max-w-[120px] font-medium">{currentUser.email}</span>
                </div>
              )}
              <button
                onClick={handleSignIn}
                disabled={isAuthenticating}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-50 text-zinc-900 font-bold text-xs rounded-xl border border-zinc-300 shadow-2xs transition active:scale-95 disabled:opacity-60 cursor-pointer"
                title="Iniciar sesión con tu cuenta de Google para sincronizar"
              >
                {isAuthenticating ? (
                  <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                )}
                <span>{currentUser ? 'Reactivar Conexión Google Drive' : 'Conectar Cuenta de Google'}</span>
              </button>

              <button
                onClick={() => setShowFolderModal(true)}
                className="p-2 text-zinc-500 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-xl border border-zinc-200 transition cursor-pointer"
                title="Configuración de carpeta y opciones de conexión"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Badge Usuario Activo */}
              <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-200 text-xs">
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Google'}
                    className="w-5 h-5 rounded-full"
                  />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                )}
                <div className="flex flex-col text-left">
                  <span className="font-bold text-zinc-900 truncate max-w-[140px] leading-tight">
                    {currentUser?.displayName || 'Usuario Google'}
                  </span>
                  <span className="text-[10px] text-zinc-500 truncate max-w-[140px] leading-tight">
                    {currentUser?.email || 'Google Drive Conectado'}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-zinc-400 hover:text-red-600 p-1 rounded-md hover:bg-zinc-200 transition ml-1 cursor-pointer"
                  title="Cerrar sesión de Google"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Botón Principal: Sincronización Bidireccional (Smart Merge) */}
              <button
                onClick={handleBidirectionalSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#fed700] hover:bg-yellow-400 text-zinc-950 font-black text-xs rounded-xl shadow-xs transition active:scale-95 disabled:opacity-60 cursor-pointer"
                title="Sincronización completa: descarga manuales de otros usuarios y sube los tuyos conservando la versión más reciente"
              >
                {isSyncing ? (
                  <Loader2 className="w-4 h-4 text-zinc-950 animate-spin" />
                ) : (
                  <ArrowUpDown className="w-4 h-4 text-zinc-950" />
                )}
                <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar (Subir y Descargar)'}</span>
              </button>

              {/* Configurar Carpeta */}
              <button
                onClick={() => setShowFolderModal(true)}
                className="p-2 text-zinc-500 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-xl border border-zinc-200 transition cursor-pointer"
                title="Configuración de la Carpeta de Google Drive"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Alerta Asistida si el Navegador Bloqueó la Ventana Emergente */}
      {isPopupBlocked && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs space-y-2 text-amber-950 animate-in fade-in duration-200">
          <div className="flex items-start gap-2 font-bold text-amber-900 text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <span>Ventana emergente de Google bloqueada por el navegador</span>
          </div>
          <p className="text-xs text-zinc-700 leading-relaxed">
            Tu navegador impidió abrir automáticamente la ventana de inicio de sesión de Google. Para habilitarla:
            <br />
            <strong>1.</strong> Busca el ícono de <strong>ventana emergente bloqueada</strong> (🚫 o 🗔) en la barra de direcciones de tu navegador (junto al candado o estrella).
            <br />
            <strong>2.</strong> Selecciona <strong>"Permitir siempre ventanas emergentes de este sitio"</strong> y haz clic en Hecho.
            <br />
            <strong>3.</strong> Haz clic en el botón amarillo a continuación para reintentar la conexión directamente.
          </p>
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <button
              type="button"
              onClick={handleSignIn}
              className="px-4 py-2 bg-[#fed700] hover:bg-yellow-400 text-zinc-950 font-black rounded-xl text-xs transition shadow-2xs cursor-pointer active:scale-95"
            >
              Reintentar Abrir Ventana de Google
            </button>
            <button
              type="button"
              onClick={() => setShowFolderModal(true)}
              className="px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-800 font-bold rounded-xl text-xs border border-zinc-200 transition cursor-pointer"
            >
              Ingresar Token Manual
            </button>
            <button
              type="button"
              onClick={() => setIsPopupBlocked(false)}
              className="text-xs text-zinc-500 hover:text-zinc-700 ml-auto cursor-pointer underline"
            >
              Ocultar aviso
            </button>
          </div>
        </div>
      )}

      {/* Barra de Respaldo Local Directo e Importación */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 text-xs">
        <div className="flex items-center gap-1.5 text-zinc-600 text-[11px]">
          <Database className="w-3.5 h-3.5 text-zinc-500" />
          <span>Respaldo fuera de línea (sin depender de Google Drive):</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportLocalBackup}
            accept=".json,application/json"
            className="hidden"
          />
          <button
            type="button"
            onClick={handleExportLocalBackup}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold rounded-lg border border-zinc-200 transition active:scale-95 text-[11px] cursor-pointer"
            title="Descarga una copia completa de todos los manuales a tu computadora en formato JSON"
          >
            <DownloadCloud className="w-3.5 h-3.5 text-zinc-600" />
            <span>Descargar Copia JSON</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold rounded-lg border border-zinc-200 transition active:scale-95 text-[11px] cursor-pointer"
            title="Carga y fusiona una copia de seguridad JSON guardada previamente"
          >
            <UploadCloud className="w-3.5 h-3.5 text-zinc-600" />
            <span>Restaurar / Fusionar Copia JSON</span>
          </button>
        </div>
      </div>

      {/* Alerta de Error de Autenticación con Guía Resolutiva */}
      {authError && (
        <div className="bg-red-50 p-3.5 rounded-xl border border-red-200 flex items-start justify-between gap-3 text-xs text-red-950">
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-red-900">Estado de conexión con Google:</span>
              <p className="text-red-800 leading-relaxed">{authError}</p>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  onClick={handleSignIn}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[11px] transition shadow-2xs cursor-pointer"
                >
                  Reintentar Conexión
                </button>
                <button
                  onClick={() => setShowFolderModal(true)}
                  className="px-3 py-1 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 rounded-lg font-semibold text-[11px] transition cursor-pointer"
                >
                  Ingresar Token Directo
                </button>
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 rounded-lg font-semibold text-[11px] transition inline-flex items-center gap-1"
                >
                  <span>Abrir en Pestaña Directa</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
          <button
            onClick={() => setAuthError(null)}
            className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Alerta de Carpeta No Accesible */}
      {folderWarning && (
        <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium truncate">{folderWarning}</span>
          </div>
          <button
            onClick={handleRepairFolder}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-[11px] shrink-0 transition cursor-pointer"
          >
            Crear / Usar Mi Carpeta en Drive
          </button>
        </div>
      )}

      {/* Barra de Progreso en Vivo */}
      {isSyncing && (
        <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-center gap-2 min-w-0">
            <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
            <span className="font-medium truncate">{syncProgressMsg || 'Procesando sincronización en Google Drive...'}</span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-amber-200/80 px-2 py-0.5 rounded text-amber-900 shrink-0">
            Smart Merge Activo
          </span>
        </div>
      )}

      {/* MODAL CONFIGURACIÓN DE CARPETA DE GOOGLE DRIVE */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Settings2 className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-950 uppercase tracking-tight">
                    Carpeta de Google Drive Compartida
                  </h3>
                  <p className="text-xs text-zinc-500">
                    ID o Enlace de la carpeta compartida donde colaboran los usuarios
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowFolderModal(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-700 mb-1">
                  ID o Enlace de la Carpeta de Drive
                </label>
                <input
                  type="text"
                  value={folderInput}
                  onChange={(e) => setFolderInput(e.target.value)}
                  placeholder="Ej: 1Xzy-NetG8AZLTNGyYJSnrmD_M5Lv5ta- o pega el enlace completo"
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 font-mono text-xs outline-none focus:border-amber-400 focus:bg-white"
                />
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-zinc-600 space-y-1">
                <p className="font-semibold text-zinc-800">
                  ¿Cómo permitir que otros usuarios sincronicen aquí?
                </p>
                <p>
                  1. Abre la carpeta en Google Drive haciendo clic en el enlace inferior.
                </p>
                <p>
                  2. Haz clic en <strong>Compartir</strong> en Google Drive y añade los correos de los miembros del equipo con rol de <strong>Editor</strong> (o comparte con la organización).
                </p>
                <p>
                  3. Cuando ellos inicien sesión en esta aplicación con su cuenta de Google, se sincronizarán directamente con la misma base de datos.
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleResetDefaultFolder}
                  className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 underline cursor-pointer"
                >
                  Restablecer carpeta corporativa por defecto
                </button>

                <a
                  href={folderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800"
                >
                  <span>Abrir en Drive</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Acceso Alternativo con Token Directo */}
              <div className="pt-2 border-t border-zinc-200/80 space-y-2">
                <label className="block text-[11px] font-bold uppercase text-zinc-700">
                  Acceso Alternativo: Token OAuth Directo (Opcional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={manualTokenInput}
                    onChange={(e) => setManualTokenInput(e.target.value)}
                    placeholder="Pega tu token Bearer si las ventanas emergentes están bloqueadas"
                    className="flex-1 p-2 bg-zinc-50 border border-zinc-300 rounded-xl text-zinc-900 font-mono text-xs outline-none focus:border-amber-400 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleApplyManualToken}
                    className="px-3 py-2 bg-zinc-800 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Vincular
                  </button>
                </div>
                <p className="text-[10px] text-zinc-400">
                  Útil en entornos con políticas estrictas de seguridad o navegadores que bloquean pop-ups de Google.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={handleRepairFolder}
                className="px-3 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition cursor-pointer"
                title="Comprueba si tienes acceso y si no, crea tu carpeta en tu Drive"
              >
                Verificar / Crear Mi Carpeta
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveFolderConfig}
                  className="px-4 py-2 text-xs font-black text-zinc-950 bg-[#fed700] hover:bg-yellow-400 rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Carpeta</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
