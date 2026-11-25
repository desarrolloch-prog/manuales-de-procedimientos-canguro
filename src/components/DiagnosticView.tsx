import React, { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  Edit3,
  Save,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  ClipboardList
} from 'lucide-react';

interface DiagnosticViewProps {
  markdown: string;
  onUpdateMarkdown?: (newMarkdown: string) => void;
  processName: string;
  direction: string;
  code: string;
  owner: string;
  showToast?: (message: string, type: 'info' | 'success' | 'error') => void;
  onExportWord?: () => void;
  onExportPdf?: () => void;
}

interface ParsedItem {
  id: string;
  title: string;
  body: string;
}

export const DiagnosticView: React.FC<DiagnosticViewProps> = ({
  markdown,
  onUpdateMarkdown,
  processName,
  direction,
  code,
  owner,
  showToast,
  onExportWord,
  onExportPdf
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedText, setEditedText] = useState<string>(markdown || '');
  const [copied, setCopied] = useState<boolean>(false);

  // Sincronizar texto editable cuando cambie el prop
  React.useEffect(() => {
    setEditedText(markdown || '');
  }, [markdown]);

  // Parser robusto y sobrio del informe ejecutivo (soporta formato nuevo y heredado)
  const { resumenEjecutivo, hallazgos, planAccion, recomendaciones } = useMemo(() => {
    if (!markdown) {
      return { resumenEjecutivo: '', hallazgos: [], planAccion: [], recomendaciones: [] };
    }

    const clean = markdown.replace(/^#\s*[^\n]*\n?/i, '').trim();

    // Limpieza de títulos de elementos (remueve prefijos numéricos ej "3.4", asteriscos y dos puntos)
    const sanitizeTitle = (t: string) => {
      return t
        .replace(/^\d+(\.\d+)*\s*[:.-]?\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/^[\*•\-\:\s]+/, '')
        .trim();
    };

    // Limpieza de cuerpos de texto (remueve asteriscos residuales y viñetas iniciales)
    const sanitizeBody = (b: string) => {
      return b
        .replace(/\*\*/g, '')
        .replace(/^[\*•\-\:\s]+/, '')
        .trim();
    };

    // 1. Resumen Ejecutivo
    let resumen = '';
    const resMatch = clean.match(/(?:##\s*1\.[^\n]*\n)([\s\S]*?)(?=(?:##\s*2\.)|$)/i);
    if (resMatch && resMatch[1]) {
      resumen = resMatch[1]
        .replace(/^\s*\([^\)]*\)\s*\n?/i, '')
        .replace(/^[•\-\*]\s+/gm, '')
        .replace(/\*\*/g, '')
        .trim();
    }

    // Si viene del formato antiguo (donde sección 1 eran debilidades directas), formular resumen estándar
    if (!resumen || resumen.length < 20 || /^\*\*/.test(resumen)) {
      resumen = `Durante la auditoría operativa del proceso de ${processName || 'este proceso'}, se constató un flujo de trabajo activo pero dependiente de verificaciones manuales y con desfases en el registro electrónico en ERP Odoo. La implementación de los criterios normados y los controles de cierre diario permitirán blindar la trazabilidad física y documental de la operación.`;
    }

    // 2. Hallazgos y Debilidades Críticas
    const hallazgosList: ParsedItem[] = [];
    const sec2Match = clean.match(/(?:##\s*(?:1|2)\.[^\n]*(?:DEBILIDADES|HALLAZGOS)[^\n]*\n)([\s\S]*?)(?=(?:##\s*(?:2|3)\.)|$)/i);
    const rawDebilidades = sec2Match && sec2Match[1] ? sec2Match[1] : (sec1MatchIsDebilidad(clean) ? resMatch?.[1] || '' : '');

    if (rawDebilidades) {
      const items = rawDebilidades.trim().split(/\n(?=[•\-\*]\s+|\d+(?:\.\d+)*\.\s+|\d+\.\s+)/);
      items.forEach((raw, idx) => {
        if (!raw) return;
        let item = raw.replace(/^[•\-\*]\s+/, '').trim();
        item = item.replace(/^\d+(\.\d+)*\s*[:.-]?\s*/, '').trim();
        if (!item || item.length < 5) return;

        const titleMatch = item.match(/^\*\*([^\*]+)\*\*[\:\s]*(.*)/s) || item.match(/^([^\n:\.]{3,65})[\:\s]+(.*)/s);
        let title = titleMatch ? titleMatch[1] : `Hallazgo Crítico #${idx + 1}`;
        let body = titleMatch && titleMatch[2] ? titleMatch[2] : item;

        // Limpiar sub-viñetas heredadas (Evidencia / Causa / Consecuencia) hacia texto fluido
        body = body
          .replace(/[-•]?\s*\*?\*?Evidencia Operativa[\:\s]*\*?\*?/gi, 'Evidencia:')
          .replace(/[-•]?\s*\*?\*?Causa Ra[íi]z[\:\s]*\*?\*?/gi, 'Causa:')
          .replace(/[-•]?\s*\*?\*?(?:Consecuencia y Riesgo|Impacto Operativo|Riesgo)[\:\s]*\*?\*?/gi, 'Impacto:')
          .replace(/\n+/g, ' ')
          .trim();

        title = sanitizeTitle(title);
        body = sanitizeBody(body);

        if (title && body) {
          hallazgosList.push({ id: `h-${idx + 1}`, title, body });
        }
      });
    }

    // 3. Plan de Acción y Estandarización
    const planList: ParsedItem[] = [];
    const sec3Match = clean.match(/(?:##\s*(?:2|3)\.[^\n]*(?:PLAN|PROPUESTA|MEJORAS)[^\n]*\n)([\s\S]*?)(?=(?:##\s*(?:3|4)\.)|$)/i);
    if (sec3Match && sec3Match[1]) {
      const items = sec3Match[1].trim().split(/\n(?=[•\-\*]\s+|\d+(?:\.\d+)*\.\s+|\d+\.\s+)/);
      items.forEach((raw, idx) => {
        if (!raw) return;
        let item = raw.replace(/^[•\-\*]\s+/, '').trim();
        item = item.replace(/^\d+(\.\d+)*\s*[:.-]?\s*/, '').trim();
        if (!item || item.length < 5) return;

        const titleMatch = item.match(/^\*\*([^\*]+)\*\*[\:\s]*(.*)/s) || item.match(/^([^\n:\.]{3,65})[\:\s]+(.*)/s);
        let title = titleMatch ? titleMatch[1] : `Acción de Mejora #${idx + 1}`;
        let body = titleMatch && titleMatch[2] ? titleMatch[2] : item;

        body = body
          .replace(/[-•]?\s*\*?\*?Cambio en el M[ée]todo[\:\s]*\*?\*?/gi, 'Método:')
          .replace(/[-•]?\s*\*?\*?Aplicaci[oó]n Pr[áa]ctica[^\:]*[\:\s]*\*?\*?/gi, 'Aplicación en Odoo:')
          .replace(/[-•]?\s*\*?\*?Resultado Operativo Esperado[\:\s]*\*?\*?/gi, 'Resultado:')
          .replace(/\n+/g, ' ')
          .trim();

        title = sanitizeTitle(title);
        body = sanitizeBody(body);

        if (title && body) {
          planList.push({ id: `p-${idx + 1}`, title, body });
        }
      });
    }

    // 4. Recomendaciones
    const recsList: string[] = [];
    const sec4Match = clean.match(/(?:##\s*4\.[^\n]*(?:RECOMENDACIONES|RECOMENDACI[OÓ]N|CONTROL)[^\n]*\n)([\s\S]*?)$/i);
    if (sec4Match && sec4Match[1]) {
      const items = sec4Match[1].trim().split(/\n(?=[•\-\*]\s+|\d+(?:\.\d+)*\.\s+|\d+\.\s+)/);
      items.forEach((raw) => {
        if (!raw) return;
        let line = raw.replace(/^[•\-\*]\s+|\d+(\.\d+)*\.\s+/, '').replace(/\*\*/g, '').trim();
        line = sanitizeBody(line);
        if (line && line.length > 10 && !line.startsWith('|')) {
          recsList.push(line);
        }
      });
    }

    // Fallbacks si vienen vacíos
    if (recsList.length === 0) {
      recsList.push(
        'Prohibir de forma terminante cualquier movimiento físico de mercancía o insumos sin comprobante validado previamente en ERP Odoo.',
        'Efectuar la conciliación diaria obligatoria al cierre del turno (5:00 p.m.) cotejando transacciones físicas contra el sistema.',
        'Auditar semanalmente el 100% de expedientes y comprobantes digitalizados en Google Drive corporativo para asegurar correlativos completos.'
      );
    }

    return {
      resumenEjecutivo: resumen,
      hallazgos: hallazgosList.slice(0, 4),
      planAccion: planList.slice(0, 4),
      recomendaciones: recsList.slice(0, 3)
    };
  }, [markdown, processName]);

  function sec1MatchIsDebilidad(text: string): boolean {
    return /##\s*1\.[^\n]*(?:DEBILIDADES|RIESGOS)/i.test(text);
  }

  // Copiar informe completo
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      if (showToast) showToast('Informe ejecutivo copiado al portapapeles.', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      if (showToast) showToast('No se pudo copiar el texto.', 'error');
    }
  };

  // Guardar edición manual
  const handleSaveTextEdit = () => {
    if (onUpdateMarkdown) {
      onUpdateMarkdown(editedText);
    }
    setIsEditing(false);
    if (showToast) showToast('Informe actualizado correctamente.', 'success');
  };

  if (!markdown) {
    return (
      <div className="bg-white border border-zinc-200 rounded-2xl p-10 text-center text-zinc-500 max-w-xl mx-auto my-8">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <h3 className="text-sm font-extrabold text-zinc-900 uppercase">Sin Diagnóstico Generado</h3>
        <p className="text-xs text-zinc-500 mt-1">
          Genera el manual de procedimientos para visualizar el informe ejecutivo de auditoría y diagnóstico operativo.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 text-zinc-900 font-sans">
      {/* DOCUMENTO EJECUTIVO SOBRIO: Formato Informe Formal Corporativo */}
      <div id="diagnostic-report-content" className="bg-white rounded-2xl border border-zinc-300 shadow-sm overflow-hidden">
        {/* Franja Amarilla Districueros El Canguro */}
        <div className="h-1.5 bg-[#fed700]" />

        {/* BARRA DE ACCIONES Y MEMBRETE EJECUTIVO */}
        <div className="px-6 sm:px-8 py-5 border-b border-zinc-200 bg-zinc-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              <span>Districueros El Canguro C.A.</span>
              <span>•</span>
              <span className="font-mono text-zinc-700">{code}</span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-zinc-950 uppercase tracking-tight mt-0.5">
              Informe Ejecutivo de Auditoría y Diagnóstico Operativo
            </h1>
          </div>

          {/* ACCIONES DIRECTAS: SIN BOTÓN DE IMPRIMIR, WORD Y PDF 100% FUNCIONALES */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center no-print">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-100 rounded-lg border border-zinc-300 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Copiar texto completo del informe"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (isEditing) {
                  setIsEditing(false);
                  setEditedText(markdown);
                } else {
                  setIsEditing(true);
                }
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                isEditing
                  ? 'bg-zinc-800 text-white border-zinc-800 hover:bg-zinc-900'
                  : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
              }`}
              title="Modificar texto del informe"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Ver Informe' : 'Editar'}</span>
            </button>

            {onExportWord && (
              <button
                type="button"
                onClick={onExportWord}
                className="px-3 py-1.5 text-xs font-bold text-zinc-800 bg-white hover:bg-zinc-100 rounded-lg border border-zinc-300 transition flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
                title="Descargar Manual y Diagnóstico en formato Word (.docx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                <span>Descargar Word</span>
              </button>
            )}

            {onExportPdf && (
              <button
                type="button"
                onClick={onExportPdf}
                className="px-3 py-1.5 text-xs font-black text-black bg-[#fed700] hover:bg-yellow-400 rounded-lg border border-black/30 transition flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
                title="Descargar Informe Ejecutivo de Diagnóstico en formato PDF (.pdf)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar PDF</span>
              </button>
            )}
          </div>
        </div>

        {/* METADATOS EJECUTIVOS EN TABLA SOBRIA */}
        <div className="px-6 sm:px-8 py-3 bg-white border-b border-zinc-200 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3 text-zinc-700">
          <div>
            <span className="text-[10px] font-bold uppercase text-zinc-500 block">Proceso Auditado</span>
            <span className="font-bold text-zinc-950 uppercase">{processName || 'N/A'}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-zinc-500 block">Dirección Adscrita</span>
            <span className="font-semibold text-zinc-900">{direction || 'N/A'}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-zinc-500 block">Dueño del Proceso</span>
            <span className="font-semibold text-zinc-900 truncate block">{owner || 'N/A'}</span>
          </div>
        </div>

        {/* MODO EDICIÓN vs MODO VISUALIZACIÓN INFORME FORMAL */}
        {isEditing ? (
          <div className="p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
              <span className="text-xs font-bold text-zinc-700 uppercase">
                Editor del Informe de Diagnóstico (Markdown)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedText(markdown);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 bg-zinc-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveTextEdit}
                  className="px-3.5 py-1.5 text-xs font-black text-black bg-[#fed700] hover:bg-yellow-400 rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </div>
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={22}
              className="w-full p-4 font-mono text-xs text-zinc-900 bg-zinc-50 border border-zinc-300 rounded-xl outline-none focus:border-amber-400 leading-relaxed resize-y"
            />
          </div>
        ) : (
          <div className="p-6 sm:p-8 space-y-7 text-sm leading-relaxed text-zinc-800">
            {/* 1. RESUMEN EJECUTIVO */}
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-900 pb-1.5 mb-2.5 border-b border-zinc-300 flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-amber-600" />
                <span>1. Resumen Ejecutivo</span>
              </h2>
              <p className="text-zinc-700 text-xs sm:text-[13px] leading-relaxed text-justify">
                {resumenEjecutivo}
              </p>
            </div>

            {/* 2. HALLAZGOS Y DEBILIDADES CRÍTICAS */}
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-900 pb-1.5 mb-2.5 border-b border-zinc-300">
                <span>2. Hallazgos y Debilidades Operativas Críticas</span>
              </h2>
              {hallazgos.length > 0 ? (
                <div className="space-y-3">
                  {hallazgos.map((item, idx) => (
                    <div key={item.id} className="text-xs sm:text-[13px]">
                      <div className="font-bold text-zinc-950 flex items-baseline gap-2">
                        <span className="text-amber-800 font-mono font-bold">{idx + 1}.</span>
                        <span>{item.title}</span>
                      </div>
                      <p className="text-zinc-700 pl-5 mt-0.5 leading-relaxed">
                        {item.body}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic pl-2">No se detectaron debilidades críticas en el análisis.</p>
              )}
            </div>

            {/* 3. PLAN DE ACCIÓN Y ESTANDARIZACIÓN INMEDIATA */}
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-900 pb-1.5 mb-2.5 border-b border-zinc-300">
                <span>3. Plan de Acción y Estandarización Propuesta</span>
              </h2>
              {planAccion.length > 0 ? (
                <div className="space-y-3">
                  {planAccion.map((item, idx) => (
                    <div key={item.id} className="text-xs sm:text-[13px]">
                      <div className="font-bold text-zinc-950 flex items-baseline gap-2">
                        <span className="text-zinc-900 font-mono font-bold">3.{idx + 1}</span>
                        <span>{item.title}</span>
                      </div>
                      <p className="text-zinc-700 pl-5 mt-0.5 leading-relaxed">
                        {item.body}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic pl-2">No se formularon acciones específicas.</p>
              )}
            </div>

            {/* 4. RECOMENDACIONES */}
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-900 pb-1.5 mb-2.5 border-b border-zinc-300">
                <span>4. Recomendaciones</span>
              </h2>
              <ul className="space-y-2 text-xs sm:text-[13px] text-zinc-700">
                {recomendaciones.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold leading-none mt-1">•</span>
                    <span className="leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* NOTA AL PIE */}
            <div className="pt-4 border-t border-zinc-200 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Districueros El Canguro C.A.</span>
              <span className="font-mono">Estándar Normativo DTH-GFD-MP</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
