// Módulo de Firmas Oficiales Canguro
// Las firmas se obtienen bajo demanda desde el endpoint protegido /api/signatures
// requiriendo una sesión autenticada con token Bearer de Firebase Auth.

export type SignatureMap = Record<string, string>;

let memorySignatures: SignatureMap = {};

export type SignatureListener = (signatures: SignatureMap) => void;
const listeners = new Set<SignatureListener>();

/**
 * Suscribe un callback que se ejecuta cuando las firmas oficiales se cargan o actualizan.
 */
export function subscribeToOfficialSignatures(listener: SignatureListener): () => void {
  listeners.add(listener);
  if (Object.keys(memorySignatures).length > 0) {
    try {
      listener(memorySignatures);
    } catch (e) {
      console.error('[OfficialSignatures] Error en listener:', e);
    }
  }
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Actualiza el almacén de firmas en memoria y notifica a los suscriptores.
 */
export function setOfficialSignatures(signatures: Record<string, string>) {
  memorySignatures = { ...signatures };
  listeners.forEach((listener) => {
    try {
      listener(memorySignatures);
    } catch (e) {
      console.error('[OfficialSignatures] Error notificando listener:', e);
    }
  });
}

/**
 * Devuelve una copia de las firmas cargadas en memoria.
 */
export function getLoadedSignatures(): Record<string, string> {
  return { ...memorySignatures };
}

/**
 * Solicita las firmas al servidor seguro /api/signatures enviando el token de Firebase.
 * Si no hay token o la petición falla, mantiene un estado vacío {}.
 */
export async function fetchOfficialSignatures(token?: string | null): Promise<Record<string, string>> {
  if (!token) {
    return memorySignatures;
  }

  try {
    const res = await fetch('/api/signatures', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      console.warn(`[OfficialSignatures] Servidor respondió con estado ${res.status}`);
      return memorySignatures;
    }

    const data = await res.json();
    if (data?.success && data?.signatures) {
      setOfficialSignatures(data.signatures);
      return data.signatures;
    }
  } catch (err) {
    console.warn('[OfficialSignatures] Error de red al solicitar firmas:', err);
  }

  return memorySignatures;
}

/**
 * Obtiene la firma correspondiente al firmante según su nombre o rol.
 * Retorna cadena vacía si no hay firma cargada en memoria.
 */
export function getOfficialSignatureFallback(name: string, roleId?: string): string {
  const n = (name || '').toLowerCase();
  const id = (roleId || '').toLowerCase();

  if (n.includes('freddy') || id === 'realizado') {
    return memorySignatures['freddy_molina'] || '/assets/signatures/firma_freddy_molina.png';
  }
  if (n.includes('natalia') || id === 'revisado1') {
    return memorySignatures['natalia_rodriguez'] || '/assets/signatures/firma_natalia_rodriguez.png';
  }
  if (n.includes('alejandra') || id === 'revisado2') {
    return memorySignatures['alejandra_arevalo'] || '/assets/signatures/firma_alejandra_arevalo.png';
  }
  if (n.includes('jeanette') || id === 'aprobado1' || id === 'aprobado2') {
    return memorySignatures['jeanette_arvelo'] || '/assets/signatures/firma_jeanette_arvelo.png';
  }

  return '';
}

// Constantes vacías exportadas para retrocompatibilidad
export const FIRMA_FREDDY_MOLINA = '';
export const FIRMA_NATALIA_RODRIGUEZ = '';
export const FIRMA_ALEJANDRA_AREVALO = '';
export const FIRMA_JEANETTE_ARVELO = '';
