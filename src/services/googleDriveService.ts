import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { StoredManualRecord } from '../types/processManual';
import { fetchOfficialSignatures } from '../utils/officialSignatures';

export const DEFAULT_DRIVE_FOLDER_ID = '1Xzy-NetG8AZLTNGyYJSnrmD_M5Lv5ta-';

/**
 * Obtiene el ID de la carpeta de Google Drive configurada (con fallback al ID oficial corporativo)
 */
export const getDriveFolderId = (): string => {
  try {
    const custom = localStorage.getItem('canguro_drive_folder_id');
    if (custom && custom.trim()) {
      return custom.trim();
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_DRIVE_FOLDER_ID;
};

/**
 * Guarda un ID o URL personalizada de la carpeta de Google Drive
 */
export const setDriveFolderId = (folderInput: string): string => {
  let cleanId = folderInput.trim();
  // Si pegan una URL completa de Drive, extraer el ID
  const urlMatch = cleanId.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (urlMatch && urlMatch[1]) {
    cleanId = urlMatch[1];
  }
  if (!cleanId) {
    cleanId = DEFAULT_DRIVE_FOLDER_ID;
  }
  try {
    localStorage.setItem('canguro_drive_folder_id', cleanId);
  } catch (e) {
    console.error(e);
  }

  // Actualizar valores reactivos en memoria para reflejar el cambio de inmediato
  DRIVE_FOLDER_ID = cleanId;
  DRIVE_FOLDER_URL = getDriveFolderUrl(cleanId);
  return cleanId;
};

/**
 * Retorna el enlace directo web a la carpeta de Google Drive configurada
 */
export const getDriveFolderUrl = (folderId?: string): string => {
  const id = folderId || getDriveFolderId();
  return `https://drive.google.com/drive/folders/${id}`;
};

/**
 * Retorna dinámicamente el ID activo de la carpeta de Drive en cada invocación
 */
export const getActiveDriveFolderId = (): string => getDriveFolderId();

// Variables de acceso que se mantienen sincronizadas dinámicamente con getDriveFolderId()
export let DRIVE_FOLDER_ID = getDriveFolderId();
export let DRIVE_FOLDER_URL = getDriveFolderUrl();

// 1. Inicializar Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// 2. Configurar Google Provider con scope completo de Google Drive para la carpeta enlazada
export const createGoogleDriveProvider = (): GoogleAuthProvider => {
  const p = new GoogleAuthProvider();
  p.addScope('https://www.googleapis.com/auth/drive');
  p.addScope('https://www.googleapis.com/auth/drive.file');
  p.setCustomParameters({ prompt: 'select_account' });
  return p;
};

// Clave para preservar el token en la sesión de la pestaña actual sin fugas permanentes
const SESSION_TOKEN_KEY = 'canguro_drive_access_token';
const SESSION_TOKEN_EXPIRY_KEY = 'canguro_drive_token_expires_at';
const SESSION_USER_PROFILE_KEY = 'canguro_drive_user_profile';

export interface DriveCustomError extends Error {
  code?: string;
  status?: number;
  isPopupBlocked?: boolean;
  isUserCancelled?: boolean;
  isAuthExpired?: boolean;
}

export interface DriveUserProfile {
  displayName?: string;
  email?: string;
  photoURL?: string;
}

export class DriveAuthExpiredError extends Error implements DriveCustomError {
  isAuthExpired = true;
  status = 401;
  constructor(
    message = 'Tu sesión de Google Drive ha expirado. Haz clic en Sincronizar para reconectar tu cuenta de forma segura.'
  ) {
    super(message);
    this.name = 'DriveAuthExpiredError';
  }
}

export function isDriveAuthError(err: unknown): boolean {
  if (!err) return false;
  if (typeof err === 'object' && err !== null) {
    const errorObj = err as DriveCustomError;
    if (errorObj.isAuthExpired || errorObj.status === 401) return true;
    const msg = String(errorObj.message || err).toLowerCase();
    return (
      msg.includes('401') ||
      msg.includes('expirado') ||
      msg.includes('invalid credentials') ||
      msg.includes('unauthenticated') ||
      msg.includes('invalid_grant') ||
      msg.includes('sesión con google drive')
    );
  }
  const msg = String(err).toLowerCase();
  return (
    msg.includes('401') ||
    msg.includes('expirado') ||
    msg.includes('invalid credentials') ||
    msg.includes('unauthenticated') ||
    msg.includes('invalid_grant') ||
    msg.includes('sesión con google drive')
  );
}

// Inicializar token de sesión si ya existe en la pestaña activa
let cachedAccessToken: string | null = (() => {
  try {
    return sessionStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
})();

let cachedTokenExpiresAt: number | null = (() => {
  try {
    const raw = sessionStorage.getItem(SESSION_TOKEN_EXPIRY_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
})();

let isSigningIn = false;

export const setCachedDriveUserProfile = (profile: { displayName?: string; email?: string; photoURL?: string } | null) => {
  try {
    if (profile) {
      sessionStorage.setItem(SESSION_USER_PROFILE_KEY, JSON.stringify(profile));
    } else {
      sessionStorage.removeItem(SESSION_USER_PROFILE_KEY);
    }
  } catch (e) {
    console.error(e);
  }
};

export const getCachedDriveUserProfile = (): { displayName?: string; email?: string; photoURL?: string } | null => {
  try {
    const raw = sessionStorage.getItem(SESSION_USER_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const isCachedTokenExpired = (): boolean => {
  if (!cachedAccessToken) return true;
  if (cachedTokenExpiresAt !== null && Date.now() >= cachedTokenExpiresAt) {
    return true;
  }
  return false;
};

export const setManualAccessToken = (token: string | null, expiresInSeconds?: number) => {
  cachedAccessToken = token ? token.trim() : null;
  try {
    if (cachedAccessToken) {
      // Reservar 60s de margen antes de la expiración real (3600s por defecto en Google OAuth)
      const ttlSeconds = expiresInSeconds && expiresInSeconds > 120 ? expiresInSeconds : 3500;
      const expiresAt = Date.now() + (ttlSeconds - 60) * 1000;
      cachedTokenExpiresAt = expiresAt;
      sessionStorage.setItem(SESSION_TOKEN_KEY, cachedAccessToken);
      sessionStorage.setItem(SESSION_TOKEN_EXPIRY_KEY, String(expiresAt));
    } else {
      cachedTokenExpiresAt = null;
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      sessionStorage.removeItem(SESSION_TOKEN_EXPIRY_KEY);
    }
  } catch (e) {
    console.error(e);
  }
};

/**
 * Comprueba sincrónicamente si existe un token en caché vigente (no expirado).
 * Útil dentro de manejadores de click para decidir si invocar popup antes de hacer await.
 */
export const getValidCachedTokenSync = (): string | null => {
  let token = cachedAccessToken;
  if (!token) {
    try {
      token = sessionStorage.getItem(SESSION_TOKEN_KEY);
      if (token) cachedAccessToken = token;
    } catch {
      token = null;
    }
  }
  if (!token) return null;

  if (cachedTokenExpiresAt === null) {
    try {
      const raw = sessionStorage.getItem(SESSION_TOKEN_EXPIRY_KEY);
      const parsed = raw ? Number(raw) : NaN;
      if (Number.isFinite(parsed)) cachedTokenExpiresAt = parsed;
    } catch {
      // ignore
    }
  }

  if (cachedTokenExpiresAt !== null && Date.now() >= cachedTokenExpiresAt) {
    setManualAccessToken(null);
    return null;
  }
  return token;
};

interface GisTokenResponse {
  error?: string;
  error_description?: string;
  access_token?: string;
  expires_in?: string | number;
}

interface GisErrorResponse {
  type?: string;
  message?: string;
}

interface GisTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

interface GisWindow extends Window {
  google?: {
    accounts?: {
      oauth2?: {
        initTokenClient: (config: {
          client_id: string;
          scope: string;
          callback: (response: GisTokenResponse) => void;
          error_callback?: (err: GisErrorResponse) => void;
        }) => GisTokenClient;
      };
    };
  };
}

const getGisWindow = (): GisWindow | null => (typeof window !== 'undefined' ? (window as unknown as GisWindow) : null);

/**
 * Carga dinámica del SDK de Google Identity Services (GIS) para autorización OAuth2 directa
 */
function loadGoogleIdentityServices(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (getGisWindow()?.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existingScript = document.getElementById('google-gis-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('No se pudo cargar Google Identity Services')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'));
    document.head.appendChild(script);
  });
}

let gisTokenClient: GisTokenClient | null = null;
let pendingGisPromise: {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
} | null = null;

export function initGisTokenClient(): GisTokenClient | null {
  const win = getGisWindow();
  if (!win) return null;
  if (gisTokenClient) return gisTokenClient;
  if (!win.google?.accounts?.oauth2) return null;

  const clientId = firebaseConfig.oAuthClientId;
  if (!clientId) return null;

  try {
    gisTokenClient = win.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file',
      callback: (response: GisTokenResponse) => {
        if (response.error) {
          const isAccessDenied = response.error === 'access_denied';
          const err: DriveCustomError = new Error(
            isAccessDenied
              ? 'No se otorgaron los permisos de Google Drive necesarios para sincronizar.'
              : `Error de autorización Google: ${response.error_description || response.error}`
          );
          if (isAccessDenied) err.isUserCancelled = true;
          pendingGisPromise?.reject(err);
          pendingGisPromise = null;
          return;
        }
        if (response.access_token) {
          const expiresIn = response.expires_in ? Number(response.expires_in) : 3500;
          setManualAccessToken(response.access_token, expiresIn);
          pendingGisPromise?.resolve(response.access_token);
          pendingGisPromise = null;
        } else {
          pendingGisPromise?.reject(new Error('No se recibió token de acceso de Google.'));
          pendingGisPromise = null;
        }
      },
      error_callback: (err: GisErrorResponse) => {
        const isClosed = err?.type === 'popup_closed';
        const isBlocked =
          err?.type === 'popup_failed_to_open' ||
          err?.message?.includes('Failed to open popup window') ||
          (!isClosed && Boolean(err?.message?.includes('popup')));
        const customErr: DriveCustomError = new Error(
          isClosed
            ? 'Se cerró la ventana de autenticación de Google antes de finalizar el proceso.'
            : isBlocked
            ? 'Tu navegador bloqueó la ventana emergente de Google. Haz clic en el ícono de ventana bloqueada en la barra de direcciones para permitir ventanas emergentes, o usa un token manual.'
            : (err?.message || 'Error en cliente de autorización Google')
        );
        if (isBlocked) {
          customErr.code = 'auth/popup-blocked';
          customErr.isPopupBlocked = true;
        }
        if (isClosed) {
          customErr.code = 'auth/popup-closed-by-user';
          customErr.isUserCancelled = true;
        }
        pendingGisPromise?.reject(customErr);
        pendingGisPromise = null;
      }
    });
    return gisTokenClient;
  } catch (e) {
    console.warn('No se pudo inicializar GIS Token Client:', e);
    return null;
  }
}

// Cargar e inicializar GIS preventivamente al cargar el módulo
if (typeof window !== 'undefined') {
  if (getGisWindow()?.google?.accounts?.oauth2) {
    initGisTokenClient();
  } else {
    loadGoogleIdentityServices().then(() => initGisTokenClient()).catch(() => {});
  }
}

/**
 * Solicita token de Google Drive mediante Google Identity Services (GIS) Token Client.
 * Ejecuta requestAccessToken sincrónicamente en el click del usuario para evitar bloqueos por expiración de userActivation.
 */
export function requestTokenViaGIS(): Promise<string> {
  const clientId = firebaseConfig.oAuthClientId;
  if (!clientId) {
    throw new Error('No se encontró oAuthClientId en la configuración de la aplicación.');
  }

  if (pendingGisPromise) {
    pendingGisPromise.reject(new Error('La solicitud anterior fue reemplazada por una nueva.'));
    pendingGisPromise = null;
  }

  const client = initGisTokenClient();
  if (client) {
    return new Promise<string>((resolve, reject) => {
      pendingGisPromise = { resolve, reject };
      // LLAMADA SÍNCRONA DIRECTA DENTRO DEL EVENTO DEL USUARIO
      client.requestAccessToken({ prompt: 'select_account' });
    });
  }

  // Fallback si el script aún está completando carga
  return loadGoogleIdentityServices().then(() => {
    const c = initGisTokenClient();
    if (!c) throw new Error('No se pudo inicializar el servicio de autenticación de Google.');
    return new Promise<string>((resolve, reject) => {
      pendingGisPromise = { resolve, reject };
      c.requestAccessToken({ prompt: 'select_account' });
    });
  });
}

export const initDriveAuth = (
  onAuthSuccess?: (user: User | DriveUserProfile, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    // Si el usuario está autenticado en Firebase, cargar firmas oficiales protegidas
    if (user) {
      try {
        const idToken = await user.getIdToken();
        if (idToken) {
          fetchOfficialSignatures(idToken).catch(() => {});
        }
      } catch (tokenErr) {
        console.warn('Aviso al obtener idToken para firmas oficiales:', tokenErr);
      }
    }

    let activeToken = getValidCachedTokenSync();
    let driveAboutUser: DriveUserProfile | null = null;

    if (activeToken) {
      // Validar previamente si el token de Google sigue vigente o expiró (3600s de vida útil)
      try {
        const testRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress,photoLink)', {
          headers: { Authorization: `Bearer ${activeToken}` }
        });
        if (!testRes.ok && testRes.status === 401) {
          console.warn('El token en sesión de Google Drive ha expirado (401). Limpiando credenciales caducadas.');
          setManualAccessToken(null);
          activeToken = null;
        } else if (testRes.ok) {
          const aboutData = await testRes.json();
          if (aboutData?.user) {
            driveAboutUser = {
              displayName: aboutData.user.displayName,
              email: aboutData.user.emailAddress,
              photoURL: aboutData.user.photoLink
            };
            setCachedDriveUserProfile(driveAboutUser);
          }
        }
      } catch {
        // En caso de corte momentáneo de red, continuar
      }
    }

    if (activeToken) {
      cachedAccessToken = activeToken;
      const cachedProfile = getCachedDriveUserProfile();
      const targetUser = user || driveAboutUser || cachedProfile || {
        displayName: 'Usuario Google',
        email: '',
        photoURL: ''
      };
      if (onAuthSuccess) onAuthSuccess(targetUser, activeToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User | DriveUserProfile; accessToken: string } | null> => {
  try {
    isSigningIn = true;

    // 1. Intentar primero con Google Identity Services (GIS) directo
    // Se ejecuta de inmediato dentro del gesto de usuario (click), garantizando que el navegador no bloquee el pop-up
    try {
      const gisToken = await requestTokenViaGIS();
      if (gisToken) {
        let profileUser: DriveUserProfile = (auth.currentUser ? {
          displayName: auth.currentUser.displayName || undefined,
          email: auth.currentUser.email || undefined,
          photoURL: auth.currentUser.photoURL || undefined
        } : null) || getCachedDriveUserProfile() || { displayName: 'Usuario Google', email: '' };
        try {
          const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${gisToken}` }
          });
          if (userRes.ok) {
            const profile = await userRes.json();
            profileUser = {
              displayName: profile.name || profile.given_name || 'Usuario Google',
              email: profile.email,
              photoURL: profile.picture
            };
            setCachedDriveUserProfile(profileUser);
          }
        } catch (pe) {
          console.warn('No se pudo obtener información del perfil:', pe);
        }

        return {
          user: profileUser || { displayName: 'Usuario Google', email: '' },
          accessToken: gisToken
        };
      }
    } catch (gisErr: unknown) {
      const gisErrObj = gisErr as DriveCustomError | undefined;
      // Si el popup fue bloqueado o el usuario canceló/cerró el popup, no abrir un segundo popup de Firebase
      if (
        gisErrObj?.isPopupBlocked ||
        gisErrObj?.code === 'auth/popup-blocked' ||
        gisErrObj?.isUserCancelled ||
        gisErrObj?.code === 'auth/popup-closed-by-user' ||
        gisErrObj?.message?.includes('bloqueó la ventana')
      ) {
        throw gisErr;
      }
      console.warn('GIS encontró error, intentando alternativa con Firebase Popup:', gisErr);
    }

    // 2. Fallback secundario: Firebase signInWithPopup
    const provider = createGoogleDriveProvider();
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      setManualAccessToken(credential.accessToken, 3500);
      setCachedDriveUserProfile({
        displayName: result.user.displayName || undefined,
        email: result.user.email || undefined,
        photoURL: result.user.photoURL || undefined
      });
      try {
        const idToken = await result.user.getIdToken();
        if (idToken) {
          fetchOfficialSignatures(idToken).catch(() => {});
        }
      } catch (tokenErr) {
        console.warn('Aviso al solicitar firmas oficiales tras login:', tokenErr);
      }
      return { user: result.user, accessToken: credential.accessToken };
    }

    throw new Error('No se pudo obtener el token de acceso de Google. Vuelve a intentarlo.');
  } catch (error: unknown) {
    const errorObj = error as DriveCustomError | undefined;
    const isClosed =
      Boolean(errorObj?.isUserCancelled) ||
      errorObj?.code === 'auth/popup-closed-by-user';
    const isBlocked =
      !isClosed &&
      (errorObj?.code === 'auth/popup-blocked' ||
        Boolean(errorObj?.isPopupBlocked) ||
        Boolean(errorObj?.message?.includes('Failed to open popup window')) ||
        Boolean(errorObj?.message?.includes('bloqueó')));

    if (isBlocked) {
      console.warn('Aviso: Ventana emergente bloqueada por el navegador.');
      const blockedErr: DriveCustomError = new Error(
        'Tu navegador bloqueó la ventana emergente de Google. Haz clic en el ícono de ventana bloqueada en la barra de direcciones para permitir ventanas emergentes, o usa un token manual.'
      );
      blockedErr.code = 'auth/popup-blocked';
      blockedErr.isPopupBlocked = true;
      throw blockedErr;
    }

    console.warn('Aviso al autenticar con Google:', errorObj?.message || error);

    if (isClosed) {
      const closedErr: DriveCustomError = new Error('Se cerró la ventana de autenticación de Google antes de finalizar el proceso.');
      closedErr.code = 'auth/popup-closed-by-user';
      closedErr.isUserCancelled = true;
      throw closedErr;
    }
    if (errorObj?.code === 'auth/unauthorized-domain') {
      throw new Error('El dominio actual requiere autorización directa. Haz clic en Reintentar Conexión para abrir la autorización de Google.');
    }
    if (errorObj?.code === 'auth/cancelled-popup-request') {
      throw new Error('La solicitud anterior fue cancelada. Vuelve a intentarlo.');
    }
    if (errorObj?.code === 'auth/network-request-failed') {
      throw new Error('Error de conexión con Google. Verifica tu conexión a internet.');
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return getValidCachedTokenSync();
};

/**
 * Obtiene el token de acceso activo y valida que no haya expirado; si ha expirado (401),
 * renueva automáticamente el acceso con Google para evitar fallas silenciosas de sincronización.
 */
export async function getValidAccessToken(forceInteractive = false): Promise<string> {
  let token = getValidCachedTokenSync();

  if (token && !forceInteractive) {
    // Probar token rápidamente con una llamada ligera a Google Drive
    try {
      const testRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (testRes.ok) {
        return token;
      }
      if (testRes.status === 401) {
        console.warn('El token de Google Drive ha expirado. Renovando token...');
        setManualAccessToken(null);
        token = null;
      }
    } catch {
      // Continuar a renovación si falla la conexión
    }
  }

  // Si no hay token o expiró, solicitar renovación interactiva
  const loginResult = await googleSignIn();
  if (loginResult?.accessToken) {
    return loginResult.accessToken;
  }
  throw new Error('No se pudo autenticar con Google Drive. Inicia sesión en el panel de sincronización.');
}

export const googleSignOut = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn(e);
  }
  setManualAccessToken(null);
  setCachedDriveUserProfile(null);
};

export interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  size?: string;
  modifiedTime?: string;
}

export interface DeletedManualTombstone {
  id: string;
  key: string;
  codigo?: string;
  deletedAt: string;
}

const DELETED_MANUALS_STORAGE_KEY = 'canguro_deleted_manuals_tombstones';
const TOMBSTONE_RETENTION_MS = 90 * 24 * 60 * 60 * 1000; // 90 días

export function getManualRecordKey(m: Pick<StoredManualRecord, 'id' | 'codigo' | 'nombre'>): string {
  const cleanCode = (m.codigo || '').trim().toUpperCase();
  if (cleanCode && cleanCode !== 'DTH-GFD-MP-' && cleanCode.includes('MP-')) {
    return cleanCode;
  }
  return m.id || `${cleanCode}_${(m.nombre || '').trim().toUpperCase()}`;
}

export function getDeletedManualTombstones(): DeletedManualTombstone[] {
  try {
    const raw = localStorage.getItem(DELETED_MANUALS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - TOMBSTONE_RETENTION_MS;
    return (parsed as unknown[]).filter(
      (t): t is DeletedManualTombstone =>
        Boolean(
          t &&
          typeof t === 'object' &&
          'key' in t &&
          'deletedAt' in t &&
          typeof (t as DeletedManualTombstone).key === 'string' &&
          typeof (t as DeletedManualTombstone).deletedAt === 'string' &&
          new Date((t as DeletedManualTombstone).deletedAt).getTime() >= cutoff
        )
    );
  } catch {
    return [];
  }
}

export function saveDeletedManualTombstones(tombstones: DeletedManualTombstone[]): void {
  try {
    const cutoff = Date.now() - TOMBSTONE_RETENTION_MS;
    const pruned = tombstones.filter((t) => new Date(t.deletedAt).getTime() >= cutoff);
    localStorage.setItem(DELETED_MANUALS_STORAGE_KEY, JSON.stringify(pruned));
  } catch (e) {
    console.error('Error guardando registro de manuales eliminados:', e);
  }
}

export function recordDeletedManualTombstone(manual: Pick<StoredManualRecord, 'id' | 'codigo' | 'nombre'> & { updatedAt?: string; createdAt?: string }): void {
  const key = getManualRecordKey(manual);
  const lastModMs = Math.max(
    manual.updatedAt ? new Date(manual.updatedAt).getTime() || 0 : 0,
    manual.createdAt ? new Date(manual.createdAt).getTime() || 0 : 0
  );
  // Garantizar que deletedAt sea estrictamente posterior a la última modificación del registro
  const deletedAt = new Date(Math.max(Date.now(), lastModMs + 1000)).toISOString();

  const existing = getDeletedManualTombstones();
  const filtered = existing.filter(
    (t) => t.key !== key && (!manual.id || t.id !== manual.id)
  );
  filtered.push({
    id: manual.id,
    key,
    codigo: manual.codigo,
    deletedAt
  });
  saveDeletedManualTombstones(filtered);
}

export function clearDeletedTombstoneForManuals(manuals: Array<Pick<StoredManualRecord, 'id' | 'codigo' | 'nombre'>>): void {
  if (!manuals || manuals.length === 0) return;
  const existing = getDeletedManualTombstones();
  if (existing.length === 0) return;

  const keysToClear = new Set(manuals.map((m) => getManualRecordKey(m)));
  const idsToClear = new Set(manuals.map((m) => m.id).filter(Boolean));
  const remaining = existing.filter((t) => !keysToClear.has(t.key) && (!t.id || !idsToClear.has(t.id)));
  if (remaining.length !== existing.length) {
    saveDeletedManualTombstones(remaining);
  }
}

export function mergeDeletedTombstones(
  localList: DeletedManualTombstone[],
  remoteList: DeletedManualTombstone[] = []
): DeletedManualTombstone[] {
  const byKey = new Map<string, DeletedManualTombstone>();
  const cutoff = Date.now() - TOMBSTONE_RETENTION_MS;

  for (const item of [...localList, ...remoteList]) {
    if (!item || !item.key || !item.deletedAt) continue;
    const itemTime = new Date(item.deletedAt).getTime();
    if (!Number.isFinite(itemTime) || itemTime < cutoff) continue;

    const prev = byKey.get(item.key);
    if (!prev || itemTime > new Date(prev.deletedAt).getTime()) {
      byKey.set(item.key, item);
    }
  }

  return Array.from(byKey.values());
}

export interface RemoteDatabasePayload {
  empresa: string;
  sistema: string;
  fechaSincronizacion: string;
  totalRegistros: number;
  carpetaDriveId: string;
  carpetaDriveUrl: string;
  ultimoSincronizador?: {
    displayName?: string;
    email?: string;
    photoURL?: string;
  };
  manuales: StoredManualRecord[];
  eliminados?: DeletedManualTombstone[];
}

export interface MergeStats {
  totalMerged: number;
  addedFromRemote: number;
  updatedFromRemote: number;
  keptFromLocal: number;
  newLocalUploaded: number;
  removedByDeletion?: number;
}

/**
 * Comprueba si la carpeta configurada existe y es accesible; si la corporativa no está compartida
 * con el usuario actual (404/403), busca o crea automáticamente una carpeta 'Manuales Canguro - DTH-GFD-MP'
 * en el Google Drive personal o corporativo del usuario para que nunca se interrumpa el flujo de trabajo.
 */
export async function ensureAccessibleDriveFolder(token: string): Promise<{
  folderId: string;
  folderName: string;
  isFallback: boolean;
}> {
  const currentId = getDriveFolderId();

  // 1. Intentar validar la carpeta configurada
  try {
    const checkRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${currentId}?fields=id,name,trashed,capabilities`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    if (checkRes.status === 401) {
      setManualAccessToken(null);
      throw new DriveAuthExpiredError();
    }
    if (checkRes.ok) {
      const data = await checkRes.json();
      // Si la carpeta existe y el usuario tiene permisos de escritura (canAddChildren)
      const canWrite = data.capabilities?.canAddChildren !== false;
      if (!data.trashed && canWrite) {
        return {
          folderId: currentId,
          folderName: data.name || 'Carpeta Compartida',
          isFallback: currentId !== DEFAULT_DRIVE_FOLDER_ID
        };
      } else {
        console.warn(`Carpeta actual ${currentId} no tiene permisos de escritura para este usuario.`);
      }
    } else {
      console.warn(`Verificación de carpeta actual retornó status ${checkRes.status}.`);
    }
  } catch (e) {
    if (isDriveAuthError(e)) throw e;
    console.warn('Error comprobando accesibilidad de la carpeta actual en Drive:', e);
  }

  // 2. Si la carpeta predeterminada no es accesible, buscar carpeta propia 'Manuales Canguro - DTH-GFD-MP'
  try {
    const q = encodeURIComponent(
      "name = 'Manuales Canguro - DTH-GFD-MP' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    );
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,capabilities)`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    if (searchRes.status === 401) {
      setManualAccessToken(null);
      throw new DriveAuthExpiredError();
    }
    if (searchRes.ok) {
      const sData = await searchRes.json();
      if (sData.files && sData.files.length > 0) {
        const found = sData.files[0];
        setDriveFolderId(found.id);
        return {
          folderId: found.id,
          folderName: found.name,
          isFallback: true
        };
      }
    }
  } catch (e) {
    if (isDriveAuthError(e)) throw e;
    console.warn('Error buscando carpeta alternativa:', e);
  }

  // 3. Crear automáticamente la carpeta en el Google Drive del usuario
  try {
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Manuales Canguro - DTH-GFD-MP',
        mimeType: 'application/vnd.google-apps.folder'
      })
    });
    if (createRes.status === 401) {
      setManualAccessToken(null);
      throw new DriveAuthExpiredError();
    }
    if (createRes.ok) {
      const created = await createRes.json();
      setDriveFolderId(created.id);
      return {
        folderId: created.id,
        folderName: 'Manuales Canguro - DTH-GFD-MP',
        isFallback: true
      };
    }
  } catch (e) {
    if (isDriveAuthError(e)) throw e;
    console.warn('Error creando carpeta en Google Drive:', e);
  }

  return {
    folderId: currentId,
    folderName: 'Carpeta por Defecto',
    isFallback: false
  };
}

/**
 * Formatea errores comunes de la API de Google Drive de manera amigable
 */
export function parseDriveApiError(errText: string, status: number): string {
  if (status === 401 || errText.includes('invalid_grant') || errText.includes('UNAUTHENTICATED') || errText.includes('Invalid Credentials')) {
    setManualAccessToken(null);
    return 'Tu sesión de Google Drive ha expirado. Haz clic en Sincronizar para reconectar tu cuenta de forma segura.';
  }
  if (errText.includes('accessNotConfigured') || errText.includes('has not been used in project') || errText.includes('it is disabled')) {
    return 'Google Drive API se acaba de habilitar en el proyecto de Google Cloud. Por favor espera 1 o 2 minutos mientras Google propaga la activación a nivel global y vuelve a pulsar Sincronizar.';
  }
  if (status === 404 || status === 403) {
    return `La carpeta compartida no tiene permisos de edición para tu cuenta (Error ${status}). Usa la opción 'Crear / Usar Mi Carpeta en Drive' o descarga un respaldo local en JSON.`;
  }
  return `Error de Google Drive (${status}): ${errText.substring(0, 160)}`;
}

/**
 * Verifica si un archivo específico existe y está activo en Google Drive (no eliminado en papelera)
 */
export async function verifyDriveFileExists(fileId: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,trashed`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      return !data.trashed;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Lista los archivos almacenados en la carpeta designada de Google Drive.
 */
export async function listFolderFiles(token: string): Promise<DriveFileInfo[]> {
  const folderInfo = await ensureAccessibleDriveFolder(token);
  const folderId = folderInfo.folderId;
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const fields = encodeURIComponent('files(id, name, mimeType, webViewLink, size, modifiedTime)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=modifiedTime desc`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 401) {
      setManualAccessToken(null);
      console.warn('Sesión de Google Drive expirada (401) al listar archivos.');
      throw new DriveAuthExpiredError();
    }
    console.error('Error listing files in Drive folder:', errText);
    throw new Error(parseDriveApiError(errText, res.status));
  }

  const data = await res.json();
  return (data.files || []) as DriveFileInfo[];
}

/**
 * Busca si un archivo con el mismo nombre ya existe en la carpeta designada.
 */
async function findExistingFile(filename: string, token: string): Promise<DriveFileInfo | null> {
  const folderInfo = await ensureAccessibleDriveFolder(token);
  const folderId = folderInfo.folderId;
  const safeName = filename.replace(/'/g, "\\'");
  const query = encodeURIComponent(`name = '${safeName}' and '${folderId}' in parents and trashed = false`);
  const fields = encodeURIComponent('files(id, name, mimeType, webViewLink)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (res.status === 401) {
    setManualAccessToken(null);
    throw new DriveAuthExpiredError();
  }
  if (!res.ok) return null;
  const data = await res.json();
  return data.files && data.files.length > 0 ? (data.files[0] as DriveFileInfo) : null;
}

/**
 * Sube o actualiza un archivo binario PDF en la carpeta designada de Google Drive.
 */
export async function uploadPdfFileToDrive(
  filename: string,
  pdfBlob: Blob,
  token: string
): Promise<DriveFileInfo> {
  const folderInfo = await ensureAccessibleDriveFolder(token);
  const folderId = folderInfo.folderId;
  const existing = await findExistingFile(filename, token);

  if (existing) {
    // Actualizar contenido del PDF existente vía PATCH
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`;
    const updateRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/pdf'
      },
      body: pdfBlob
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      if (updateRes.status === 401) {
        setManualAccessToken(null);
        throw new DriveAuthExpiredError();
      }
      throw new Error(`Error al actualizar PDF en Google Drive: ${parseDriveApiError(errText, updateRes.status)}`);
    }

    const updatedData = await updateRes.json();
    const finalId = updatedData.id || existing.id;
    return {
      id: finalId,
      name: filename,
      mimeType: 'application/pdf',
      webViewLink: existing.webViewLink || `https://drive.google.com/file/d/${finalId}/view`
    };
  }

  // Crear archivo PDF nuevo mediante multipart/related binario
  const metadata = {
    name: filename,
    mimeType: 'application/pdf',
    parents: [folderId]
  };

  const boundary = '-------canguroDrivePdfMultipartBoundary123456789';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const metaPart = new Blob([
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/pdf\r\n\r\n'
  ], { type: 'text/plain' });

  const closePart = new Blob([closeDelim], { type: 'text/plain' });
  const multipartBody = new Blob([metaPart, pdfBlob, closePart]);

  const createRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    }
  );

  if (!createRes.ok) {
    const errText = await createRes.text();
    if (createRes.status === 401) {
      setManualAccessToken(null);
      throw new DriveAuthExpiredError();
    }
    throw new Error(`Error al subir PDF a Google Drive: ${parseDriveApiError(errText, createRes.status)}`);
  }

  const createdData = await createRes.json();
  if (!createdData.id) {
    throw new Error('Google Drive no retornó el identificador del archivo PDF subido.');
  }

  return {
    id: createdData.id,
    name: createdData.name || filename,
    mimeType: 'application/pdf',
    webViewLink: createdData.webViewLink || `https://drive.google.com/file/d/${createdData.id}/view`
  };
}

/**
 * Sube o actualiza un archivo de texto/JSON en la carpeta designada de Google Drive.
 */
export async function uploadTextFileToDrive(
  filename: string,
  content: string,
  mimeType: string = 'application/json',
  token: string
): Promise<DriveFileInfo> {
  const folderInfo = await ensureAccessibleDriveFolder(token);
  const folderId = folderInfo.folderId;
  const existing = await findExistingFile(filename, token);

  if (existing) {
    // Actualizar contenido existente vía PATCH
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`;
    const updateRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `${mimeType}; charset=UTF-8`
      },
      body: content
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      if (updateRes.status === 401) {
        setManualAccessToken(null);
        throw new DriveAuthExpiredError();
      }
      throw new Error(`Error al actualizar archivo en Drive: ${parseDriveApiError(errText, updateRes.status)}`);
    }

    const updatedData = await updateRes.json();
    return {
      id: updatedData.id,
      name: filename,
      mimeType,
      webViewLink: existing.webViewLink
    };
  }

  // Crear archivo nuevo mediante multipart/related
  const metadata = {
    name: filename,
    mimeType,
    parents: [folderId]
  };

  const boundary = '-------canguroDriveMultipartBoundary987654321';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
    content +
    closeDelim;

  const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    if (createRes.status === 401) {
      setManualAccessToken(null);
      throw new DriveAuthExpiredError();
    }
    throw new Error(`Error al crear archivo en Google Drive: ${parseDriveApiError(errText, createRes.status)}`);
  }

  const createdData = await createRes.json();
  return createdData as DriveFileInfo;
}

/**
 * Descarga la base de datos de manuales desde la carpeta compartida de Google Drive.
 */
export async function downloadDatabaseFromDrive(token: string): Promise<{
  manuales: StoredManualRecord[];
  eliminados?: DeletedManualTombstone[];
  ultimoSincronizador?: { displayName?: string; email?: string; photoURL?: string };
  fechaSincronizacion?: string;
  sourceFileName?: string;
}> {
  const folderInfo = await ensureAccessibleDriveFolder(token);
  const folderId = folderInfo.folderId;
  const mainDbFilename = 'Base_de_Datos_Manuales_Canguro_CA.json';

  // 1. Buscar archivo consolidado maestro
  const existingMaster = await findExistingFile(mainDbFilename, token);

  if (existingMaster) {
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${existingMaster.id}?alt=media`;
    const res = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      setManualAccessToken(null);
      throw new DriveAuthExpiredError();
    }

    if (res.ok) {
      try {
        const raw = await res.json();
        const manuales: StoredManualRecord[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.manuales)
          ? raw.manuales
          : [];
        const eliminados: DeletedManualTombstone[] = Array.isArray(raw?.eliminados)
          ? raw.eliminados
          : [];

        return {
          manuales,
          eliminados,
          ultimoSincronizador: raw?.ultimoSincronizador,
          fechaSincronizacion: raw?.fechaSincronizacion || existingMaster.modifiedTime,
          sourceFileName: mainDbFilename
        };
      } catch (err) {
        console.warn('Error al parsear archivo maestro JSON:', err);
      }
    }
  }

  // 2. Si no existe el maestro consolidado, buscar manuales individuales (*.json) en la carpeta
  const query = encodeURIComponent(`'${folderId}' in parents and mimeType = 'application/json' and trashed = false`);
  const fields = encodeURIComponent('files(id, name, modifiedTime)');
  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=100`;

  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (listRes.status === 401) {
    setManualAccessToken(null);
    throw new DriveAuthExpiredError();
  }

  if (listRes.ok) {
    const data = await listRes.json();
    const files = (data.files || []) as DriveFileInfo[];
    const recoveredManuals: StoredManualRecord[] = [];

    for (const f of files) {
      if (f.name === mainDbFilename) continue;
      try {
        const singleRes = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (singleRes.status === 401) {
          setManualAccessToken(null);
          throw new DriveAuthExpiredError();
        }
        if (singleRes.ok) {
          const singleData = await singleRes.json();
          if (singleData && (singleData.codigo || singleData.nombre || singleData.id)) {
            recoveredManuals.push(singleData as StoredManualRecord);
          }
        }
      } catch (e) {
        if (isDriveAuthError(e)) throw e;
        console.warn(`Error al descargar manual individual ${f.name}:`, e);
      }
    }

    if (recoveredManuals.length > 0) {
      return {
        manuales: recoveredManuals,
        sourceFileName: 'Archivos individuales de Google Drive'
      };
    }
  }

  return {
    manuales: [],
    sourceFileName: 'Ninguno'
  };
}

/**
 * Algoritmo de Fusión Inteligente (Smart Merge):
 * Compara manuales locales y remotos por ID o Código.
 * Si existe en ambos lados, conserva la versión más recientemente modificada (updatedAt).
 * Si solo existe en un lado, lo preserva para evitar pérdida de registros creados por otros usuarios.
 */
export function mergeManualsDatabases(
  localManuals: StoredManualRecord[],
  remoteManuals: StoredManualRecord[],
  deletedTombstones: DeletedManualTombstone[] = []
): { mergedList: StoredManualRecord[]; stats: MergeStats; activeTombstones: DeletedManualTombstone[] } {
  const mergedMap = new Map<string, StoredManualRecord>();
  let addedFromRemote = 0;
  let updatedFromRemote = 0;
  let keptFromLocal = 0;
  let newLocalUploaded = 0;
  let removedByDeletion = 0;

  const tombByKey = new Map<string, DeletedManualTombstone>();
  const tombById = new Map<string, DeletedManualTombstone>();
  for (const t of deletedTombstones) {
    if (!t || !t.deletedAt) continue;
    if (t.key) {
      const prev = tombByKey.get(t.key);
      if (!prev || new Date(t.deletedAt).getTime() > new Date(prev.deletedAt).getTime()) {
        tombByKey.set(t.key, t);
      }
    }
    if (t.id) {
      const prev = tombById.get(t.id);
      if (!prev || new Date(t.deletedAt).getTime() > new Date(prev.deletedAt).getTime()) {
        tombById.set(t.id, t);
      }
    }
  }

  const supersededTombstoneKeys = new Set<string>();

  const isDeletedByTombstone = (m: StoredManualRecord): boolean => {
    const key = getManualRecordKey(m);
    const tomb = tombByKey.get(key) || (m.id ? tombById.get(m.id) : undefined);
    if (!tomb) return false;
    const deletedMs = new Date(tomb.deletedAt).getTime();
    const recordMs = Math.max(
      m.updatedAt ? new Date(m.updatedAt).getTime() || 0 : 0,
      m.createdAt ? new Date(m.createdAt).getTime() || 0 : 0
    );
    if (deletedMs >= recordMs) {
      return true;
    }
    // El manual fue creado o editado después de la eliminación
    supersededTombstoneKeys.add(tomb.key);
    return false;
  };

  // Mapear manuales locales existentes
  const localMap = new Map<string, StoredManualRecord>();
  for (const loc of localManuals) {
    if (isDeletedByTombstone(loc)) {
      removedByDeletion++;
      continue;
    }
    localMap.set(getManualRecordKey(loc), loc);
  }

  const remoteKeysProcessed = new Set<string>();

  // 1. Evaluar registros remotos
  for (const rem of remoteManuals) {
    if (isDeletedByTombstone(rem)) {
      removedByDeletion++;
      continue;
    }
    const key = getManualRecordKey(rem);
    remoteKeysProcessed.add(key);
    const loc = localMap.get(key);

    if (!loc) {
      // Registro nuevo en la nube proveniente de otro usuario
      mergedMap.set(key, rem);
      addedFromRemote++;
    } else {
      // Existe en ambos: comparar marcas de tiempo ISO
      const remTime = rem.updatedAt ? new Date(rem.updatedAt).getTime() : 0;
      const locTime = loc.updatedAt ? new Date(loc.updatedAt).getTime() : 0;

      if (remTime > locTime) {
        // Remoto es más nuevo
        mergedMap.set(key, rem);
        updatedFromRemote++;
      } else {
        // Local es más reciente o idéntico
        mergedMap.set(key, loc);
        keptFromLocal++;
      }
    }
  }

  // 2. Incorporar registros locales que no estaban aún en la nube
  for (const loc of localMap.values()) {
    const key = getManualRecordKey(loc);
    if (!remoteKeysProcessed.has(key)) {
      mergedMap.set(key, loc);
      newLocalUploaded++;
    }
  }

  // Ordenar lista consolidada por fecha de actualización descendente y garantizar IDs únicos
  const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
    return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
  });

  const seenIds = new Set<string>();
  const sanitizedList = mergedList.map((m, idx) => {
    let cleanId = m.id;
    if (!cleanId || seenIds.has(cleanId)) {
      cleanId = `${cleanId || 'manual'}-${(m.codigo || '').replace(/[^a-zA-Z0-9]/g, '') || idx}`;
    }
    seenIds.add(cleanId);
    return { ...m, id: cleanId };
  });

  const activeTombstones = deletedTombstones.filter((t) => !supersededTombstoneKeys.has(t.key));

  return {
    mergedList: sanitizedList,
    stats: {
      totalMerged: sanitizedList.length,
      addedFromRemote,
      updatedFromRemote,
      keptFromLocal,
      newLocalUploaded,
      removedByDeletion
    },
    activeTombstones
  };
}

/**
 * Sincronización Bidireccional Completa con Google Drive:
 * 1. Descarga la base de datos remota de Google Drive.
 * 2. Aplica fusión inteligente por versión más reciente (Smart Merge) respetando eliminaciones.
 * 3. Sube el consolidado resultante a Google Drive para que todos los usuarios tengan la misma versión.
 */
export async function bidirectionalSyncWithGoogleDrive(
  localManuals: StoredManualRecord[],
  currentUser: User | DriveUserProfile,
  token: string,
  onProgress?: (msg: string) => void
): Promise<{
  mergedList: StoredManualRecord[];
  stats: MergeStats;
  databaseFile: DriveFileInfo;
  remoteInfo?: { displayName?: string; email?: string; photoURL?: string };
}> {
  if (onProgress) onProgress('1/4: Conectando con Google Drive y buscando base de datos remota...');

  // 1. Descargar remoto
  const remoteResult = await downloadDatabaseFromDrive(token);

  if (onProgress) {
    onProgress(`2/4: Descargados ${remoteResult.manuales.length} manuales de la nube. Fusionando versiones...`);
  }

  // 2. Fusionar registros y eliminaciones (tombstones)
  const localTombstones = getDeletedManualTombstones();
  const mergedTombstones = mergeDeletedTombstones(localTombstones, remoteResult.eliminados || []);
  const { mergedList, stats, activeTombstones } = mergeManualsDatabases(
    localManuals,
    remoteResult.manuales,
    mergedTombstones
  );

  saveDeletedManualTombstones(activeTombstones);

  const syncTimeIso = new Date().toISOString();
  const finalMergedList = mergedList.map((m) => ({
    ...m,
    sincronizadoDriveEn: m.sincronizadoDriveEn || undefined,
    sincronizadoPor: m.sincronizadoPor || currentUser.email || 'Google User'
  }));

  if (onProgress) {
    onProgress(`3/4: Fusión exitosa (${finalMergedList.length} manuales totales). Preparando archivo consolidado...`);
  }

  // 3. Subir consolidado a Drive con los metadatos del usuario actual
  const folderId = getDriveFolderId();
  const folderUrl = getDriveFolderUrl(folderId);

  const dbPayload: RemoteDatabasePayload = {
    empresa: 'Districueros El Canguro C.A.',
    sistema: 'Sistema de Gestión y Estandarización de Manuales de Procedimientos DTH-GFD-MP',
    fechaSincronizacion: syncTimeIso,
    totalRegistros: finalMergedList.length,
    carpetaDriveId: folderId,
    carpetaDriveUrl: folderUrl,
    ultimoSincronizador: {
      displayName: currentUser.displayName || currentUser.email || 'Usuario de Google',
      email: currentUser.email || '',
      photoURL: currentUser.photoURL || ''
    },
    manuales: finalMergedList,
    eliminados: activeTombstones
  };

  const mainDbFilename = 'Base_de_Datos_Manuales_Canguro_CA.json';
  const dbFile = await uploadTextFileToDrive(
    mainDbFilename,
    JSON.stringify(dbPayload, null, 2),
    'application/json',
    token
  );

  if (onProgress) onProgress('4/4: Sincronización corporativa completada.');

  return {
    mergedList: finalMergedList,
    stats,
    databaseFile: dbFile,
    remoteInfo: remoteResult.ultimoSincronizador
  };
}

/**
 * Sincroniza la base de datos completa de manuales en Google Drive sin generar archivos .json individuales sueltos.
 */
export async function syncDatabaseToGoogleDrive(
  manuals: StoredManualRecord[],
  token: string,
  currentUser?: User | DriveUserProfile | null,
  onProgress?: (msg: string) => void
): Promise<{ databaseFile: DriveFileInfo; totalManualsSynced: number }> {
  if (onProgress) onProgress('Preparando archivo general de la base de datos...');

  const folderId = getDriveFolderId();
  const folderUrl = getDriveFolderUrl(folderId);
  const eliminados = getDeletedManualTombstones();

  // Archivo maestro consolidado con todos los manuales y metadatos
  const dbPayload: RemoteDatabasePayload = {
    empresa: 'Districueros El Canguro C.A.',
    sistema: 'Sistema de Gestión y Estandarización de Manuales de Procedimientos DTH-GFD-MP',
    fechaSincronizacion: new Date().toISOString(),
    totalRegistros: manuals.length,
    carpetaDriveId: folderId,
    carpetaDriveUrl: folderUrl,
    ultimoSincronizador: currentUser
      ? {
          displayName: currentUser.displayName || currentUser.email || 'Usuario',
          email: currentUser.email || '',
          photoURL: currentUser.photoURL || ''
        }
      : undefined,
    manuales: manuals,
    eliminados
  };

  const mainDbFilename = 'Base_de_Datos_Manuales_Canguro_CA.json';
  const dbFile = await uploadTextFileToDrive(
    mainDbFilename,
    JSON.stringify(dbPayload, null, 2),
    'application/json',
    token
  );

  return {
    databaseFile: dbFile,
    totalManualsSynced: manuals.length
  };
}

/**
 * Sincroniza un manual oficial en Google Drive guardando su archivo PDF oficial (.pdf).
 */
export async function syncSingleManualToGoogleDrive(
  m: StoredManualRecord,
  token: string,
  userEmail?: string,
  pdfBlob?: Blob
): Promise<DriveFileInfo> {
  const cleanName = (m.nombre || 'PROCESO').replace(/[^a-zA-Z0-9_-]/g, '_');
  const pdfFilename = `${m.codigo || 'DTH-GFD-MP'}_${cleanName}_v${m.version || '01'}.pdf`;

  if (pdfBlob) {
    return uploadPdfFileToDrive(pdfFilename, pdfBlob, token);
  }

  // Si no se proveyó el Blob binario directamente, advertir o generar respaldo
  console.warn('syncSingleManualToGoogleDrive invocado sin pdfBlob. Requiere Blob binario para PDF oficial.');
  throw new Error('Se requiere el archivo PDF generado para sincronizar el documento oficial en Google Drive.');
}

/**
 * Exporta la base de datos completa de manuales a un archivo JSON descargable directamente en el navegador.
 * Garantiza respaldo offline inmediato sin depender de la red ni de Google Drive.
 */
export function exportDatabaseToJsonFile(manuals: StoredManualRecord[]): void {
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `Canguro_Manuales_Backup_${dateStr}.json`;

  const payload: RemoteDatabasePayload = {
    empresa: 'Districueros El Canguro C.A.',
    sistema: 'Sistema de Gestión y Estandarización de Manuales de Procedimientos DTH-GFD-MP',
    fechaSincronizacion: new Date().toISOString(),
    totalRegistros: manuals.length,
    carpetaDriveId: getDriveFolderId(),
    carpetaDriveUrl: getDriveFolderUrl(),
    manuales: manuals,
    eliminados: getDeletedManualTombstones()
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Importa y restaura una base de datos desde un archivo JSON local con fusión inteligente (Smart Merge).
 */
export async function importDatabaseFromJsonFile(
  file: File,
  currentManuals: StoredManualRecord[]
): Promise<{ mergedList: StoredManualRecord[]; stats: MergeStats }> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('El archivo seleccionado no tiene un formato JSON válido.');
  }

  let importedManuals: StoredManualRecord[] = [];
  if (Array.isArray(parsed)) {
    importedManuals = parsed as StoredManualRecord[];
  } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { manuales?: unknown }).manuales)) {
    importedManuals = (parsed as { manuales: StoredManualRecord[] }).manuales;
  } else {
    throw new Error('El archivo JSON no contiene una lista de manuales reconocible.');
  }

  if (importedManuals.length === 0) {
    throw new Error('El archivo no contiene manuales registrados.');
  }

  // Al restaurar manualmente desde un archivo JSON, limpiar tombstones de los manuales restaurados
  clearDeletedTombstoneForManuals(importedManuals);
  return mergeManualsDatabases(currentManuals, importedManuals);
}
