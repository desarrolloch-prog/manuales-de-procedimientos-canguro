/**
 * Convierte cualquier cadena a formato Tipo Título en español respetando conectores gramaticales.
 */
export function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => {
      if (['de', 'y', 'la', 'del', 'el', 'en', 'al'].includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    .replace(/^(.)/, (c) => c.toUpperCase());
}
