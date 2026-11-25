/**
 * Utilidades para manejo y formateo de fechas oficiales de manuales
 */

// Helper de fecha formateada DD/MM/AAAA
export const getTodayFormatted = (): string => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Convertir fecha de YYYY-MM-DD a DD/MM/AAAA (o normalizar formato existente)
export const formatDateToSlash = (dateStr: string): string => {
  if (!dateStr || !dateStr.trim()) return '';
  const trimmed = dateStr.trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('/');
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  const parts = trimmed.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  return trimmed;
};

// Convertir fecha de DD/MM/AAAA a YYYY-MM-DD para <input type="date">
export const formatSlashToIso = (slashDate: string): string => {
  if (!slashDate || !slashDate.trim()) return '';
  const trimmed = slashDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parts = trimmed.split(/[\/\-]/);
  if (parts.length === 3) {
    if (parts[0].length <= 2 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return '';
};
