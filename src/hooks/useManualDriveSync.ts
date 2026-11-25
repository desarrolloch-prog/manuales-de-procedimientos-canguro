import React, { useState } from 'react';
import type { SyncStatusType } from '../components/RibbonToolbar';
import type { StoredManualRecord } from '../types/processManual';
import {
  getValidAccessToken,
  googleSignIn,
  verifyDriveFileExists,
  syncSingleManualToGoogleDrive,
  syncDatabaseToGoogleDrive,
  auth
} from '../services/googleDriveService';
import { generateManualPdfBlob } from '../services/manualExportService';

export interface UseManualDriveSyncOptions {
  activeManualId: string;
  manualsDatabase: StoredManualRecord[];
  setManualsDatabase: React.Dispatch<React.SetStateAction<StoredManualRecord[]>>;
  onLoadManualFromDb: (manual: StoredManualRecord) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function useManualDriveSync({
  activeManualId,
  manualsDatabase,
  setManualsDatabase,
  onLoadManualFromDb,
  showToast
}: UseManualDriveSyncOptions) {
  const [syncStatus, setSyncStatus] = useState<SyncStatusType>('saved_local');
  const [lastSyncTimeString, setLastSyncTimeString] = useState<string>(() => {
    return localStorage.getItem('canguro_drive_last_sync') || '';
  });
  const [autoSaveDriveEnabled, setAutoSaveDriveEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('canguro_drive_autosave_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const handleToggleAutoSaveDrive = (enabled: boolean) => {
    setAutoSaveDriveEnabled(enabled);
    try {
      localStorage.setItem('canguro_drive_autosave_enabled', String(enabled));
    } catch (e) {
      console.warn('Error guardando preferencia de auto-guardado:', e);
    }
  };

  /**
   * Sincroniza un manual oficial individual en Google Drive generando un PDF oficial
   * y subiéndolo con verificación de integridad y actualización de la base de datos maestra.
   */
  const handleSyncManualToDrive = async (
    manual: StoredManualRecord,
    onProgress?: (step: number, percent: number, stageMessage: string) => void
  ): Promise<{ driveUrl?: string; uploadedAt?: string; fileId?: string }> => {
    onProgress?.(1, 10, 'Verificando credenciales de Google Drive...');

    // 1. Obtener y validar token (renueva si ha expirado)
    let token: string;
    try {
      token = await getValidAccessToken();
    } catch {
      onProgress?.(1, 15, 'Requiere autorización con cuenta Google...');
      const authRes = await googleSignIn();
      if (!authRes?.accessToken) {
        throw new Error('No se pudo autenticar con Google. Inicia sesión en el panel de sincronización.');
      }
      token = authRes.accessToken;
    }

    onProgress?.(1, 20, 'Sesión validada. Preparando documento para exportación...');

    try {
      // 2. Si el manual seleccionado no es el que está en memoria activa, cargarlo
      if (manual.id !== activeManualId) {
        onLoadManualFromDb(manual);
        // Breve espera para que el DOM reactivo actualice las páginas offscreen
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Asegurar que las fuentes estén listas
      if (document.fonts) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 60));

      const cleanName = (manual.nombre || 'MANUAL').replace(/[^a-zA-Z0-9_-]/g, '_');
      const pdfFilename = `${manual.codigo || 'DTH-GFD-MP'}_${cleanName}_v${manual.version || '01'}.pdf`;

      onProgress?.(2, 30, 'Generando archivo PDF oficial optimizado...');

      const { blob } = await generateManualPdfBlob(pdfFilename, (cur, tot) => {
        const pct = 30 + Math.round((cur / tot) * 35);
        onProgress?.(2, pct, `Procesando hoja ${cur} de ${tot} del manual...`);
      });

      onProgress?.(3, 70, `Subiendo ${pdfFilename} (${(blob.size / (1024 * 1024)).toFixed(2)} MB) a Google Drive...`);

      const userEmail = auth.currentUser?.email || undefined;
      const fileInfo = await syncSingleManualToGoogleDrive(manual, token, userEmail, blob);

      onProgress?.(4, 90, 'Verificando archivo adjunto en Google Drive...');

      // Verificar que el archivo existe en Drive
      const isConfirmed = await verifyDriveFileExists(fileInfo.id, token);
      if (!isConfirmed && !fileInfo.id) {
        throw new Error('Google Drive no confirmó la recepción del archivo subido.');
      }

      const nowIso = new Date().toISOString();
      const userDisplay = userEmail || 'Usuario Google';
      const driveUrl = fileInfo.webViewLink || `https://drive.google.com/file/d/${fileInfo.id}/view`;

      // 4. Actualizar registro en base de datos local SOLO tras confirmación de Drive
      setManualsDatabase((prev) =>
        prev.map((item) =>
          item.id === manual.id
            ? {
                ...item,
                sincronizadoDriveEn: nowIso,
                sincronizadoPor: userDisplay,
                sincronizadoDriveUrl: driveUrl,
                sincronizadoDriveFileId: fileInfo.id
              }
            : item
        )
      );

      // 5. Sincronizar base de datos JSON maestra en Drive para reflejar el estado consolidado
      try {
        const updatedList = manualsDatabase.map((item) =>
          item.id === manual.id
            ? {
                ...item,
                sincronizadoDriveEn: nowIso,
                sincronizadoPor: userDisplay,
                sincronizadoDriveUrl: driveUrl,
                sincronizadoDriveFileId: fileInfo.id
              }
            : item
        );
        await syncDatabaseToGoogleDrive(updatedList, token, auth.currentUser);
      } catch (dbSyncErr) {
        console.warn('Aviso sincronizando JSON maestro:', dbSyncErr);
      }

      onProgress?.(4, 100, '¡Archivo verificado y adjunto con éxito en Google Drive!');
      showToast(`¡Archivo PDF "${pdfFilename}" verificado y guardado en Google Drive!`, 'success');

      return {
        driveUrl,
        fileId: fileInfo.id,
        uploadedAt: nowIso
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err || 'Error de conexión');
      console.warn('Aviso al sincronizar PDF en Google Drive:', errMsg);
      showToast(`Error al guardar en Drive: ${errMsg}`, 'error');
      throw err;
    }
  };

  return {
    syncStatus,
    setSyncStatus,
    lastSyncTimeString,
    setLastSyncTimeString,
    autoSaveDriveEnabled,
    handleToggleAutoSaveDrive,
    handleSyncManualToDrive
  };
}
