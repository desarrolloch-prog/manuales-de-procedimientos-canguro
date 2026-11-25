import React from 'react';
import {
  Download,
  FileSpreadsheet,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building2,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import { ProcessManual } from '../types/processManual';

interface ManualPreviewProps {
  manual: ProcessManual;
  onEdit: () => void;
  onExportWord: () => void;
  onPrintPdf: () => void;
}

export const ManualPreview: React.FC<ManualPreviewProps> = ({
  manual,
  onEdit,
  onExportWord,
  onPrintPdf,
}) => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Top action bar (hidden in print) */}
      <div className="no-print bg-slate-900 rounded-2xl p-4 mb-8 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Vista Oficial del Documento Formal</h2>
            <p className="text-xs text-slate-400">
              Formato corporativo estándar de Calidad & Procesos de Canguro Venezuela
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onEdit}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editar Contenido</span>
          </button>

          <button
            onClick={onExportWord}
            className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-sm transition active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Word (.docx)</span>
          </button>

          <button
            onClick={onPrintPdf}
            className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-xl shadow-sm transition active:scale-95"
            title="Descargar archivo PDF oficial"
          >
            <Download className="w-4 h-4" />
            <span>Descargar PDF (.pdf)</span>
          </button>
        </div>
      </div>

      {/* Official Paper Document View */}
      <div className="bg-white rounded-xl shadow-2xl p-8 sm:p-14 border border-slate-300 text-slate-900 printable-document">
        {/* Header Table (Membrete Institucional) */}
        <div className="border-2 border-slate-900 mb-6">
          <div className="grid grid-cols-12 divide-x-2 divide-slate-900">
            {/* Col 1: Logo & Company */}
            <div className="col-span-3 bg-slate-900 text-white p-4 flex flex-col justify-center items-center text-center">
              <span className="text-xl font-black tracking-widest text-orange-400">CANGURO</span>
              <span className="text-xs font-bold tracking-wider text-slate-300">VENEZUELA</span>
              <span className="text-[9px] uppercase text-slate-400 mt-1 border-t border-slate-700 pt-1">
                Gestión de Calidad & Procesos
              </span>
            </div>

            {/* Col 2: Document Title */}
            <div className="col-span-6 p-4 flex flex-col justify-center items-center text-center bg-slate-50">
              <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                Manual de Procedimientos
              </span>
              <h1 className="text-base sm:text-lg font-black text-slate-950 uppercase mt-0.5 leading-snug">
                {manual.nombre}
              </h1>
              <span className="text-[11px] font-semibold text-orange-600 mt-1">
                Metodología Lean Six Sigma
              </span>
            </div>

            {/* Col 3: Metadata Box */}
            <div className="col-span-3 p-3 bg-slate-50 text-[11px] flex flex-col justify-center space-y-1">
              <div>
                <span className="font-bold text-slate-700">Código: </span>
                <span className="font-mono font-bold text-slate-900">{manual.codigo}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700">Versión: </span>
                <span className="font-bold text-slate-900">{manual.version}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700">Emisión: </span>
                <span className="text-slate-800">{manual.fechaEmision}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700">Vigencia: </span>
                <span className="text-emerald-700 font-semibold">2 años</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ficha Técnica del Proceso */}
        <div className="border border-slate-300 rounded-lg overflow-hidden mb-8 text-xs">
          <div className="bg-slate-100 px-4 py-2 font-bold text-slate-800 border-b border-slate-300 uppercase tracking-wide">
            Ficha Técnica del Proceso
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            <div className="p-3 space-y-2">
              <div>
                <span className="font-bold text-slate-700">Dirección: </span>
                <span className="text-slate-900">{manual.direccion}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700">Gerencia: </span>
                <span className="text-slate-900">{manual.gerencia}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700">Macroproceso: </span>
                <span className="text-slate-900">{manual.macroproceso || 'Gestión Operativa'}</span>
              </div>
            </div>
            <div className="p-3 space-y-2">
              <div>
                <span className="font-bold text-slate-700">Tipo de Proceso: </span>
                <span className="text-slate-900 font-semibold">{manual.tipoProceso}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700">Propietario del Proceso (Owner): </span>
                <span className="text-slate-900 font-semibold">{manual.propietario}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700">Normativa de Referencia: </span>
                <span className="text-slate-900">ISO 9001:2015 / Lean Six Sigma</span>
              </div>
            </div>
          </div>
        </div>

        {/* 1. OBJETIVO */}
        <div className="mb-8 avoid-break">
          <h2 className="text-sm font-black text-orange-600 uppercase tracking-wider border-b-2 border-orange-500 pb-1 mb-3">
            1. Objetivo del Procedimiento
          </h2>
          <div className="text-xs sm:text-sm text-slate-800 leading-relaxed space-y-3">
            <p>
              <strong className="text-slate-950 font-bold">1.1 Objetivo General: </strong>
              {manual.objetivoGeneral}
            </p>
            <div>
              <strong className="text-slate-950 font-bold block mb-1.5">1.2 Objetivos Específicos:</strong>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                {manual.objetivosEspecificos.map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* 2. ALCANCE */}
        <div className="mb-8 avoid-break">
          <h2 className="text-sm font-black text-orange-600 uppercase tracking-wider border-b-2 border-orange-500 pb-1 mb-3">
            2. Alcance y Aplicabilidad
          </h2>
          <div className="text-xs sm:text-sm text-slate-800 space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <p>
              <strong className="text-slate-900 font-semibold">Inicia en: </strong>
              {manual.alcance.iniciaEn}
            </p>
            <p>
              <strong className="text-slate-900 font-semibold">Incluye: </strong>
              {manual.alcance.incluye}
            </p>
            <p>
              <strong className="text-slate-900 font-semibold">Termina en: </strong>
              {manual.alcance.terminaEn}
            </p>
            <p>
              <strong className="text-slate-900 font-semibold">Áreas y Sedes Aplicables: </strong>
              {manual.alcance.areasAplicables?.join(', ')}
            </p>
          </div>
        </div>

        {/* 3. GOBERNANZA & MATRIZ RACI */}
        <div className="mb-8 avoid-break">
          <h2 className="text-sm font-black text-orange-600 uppercase tracking-wider border-b-2 border-orange-500 pb-1 mb-3">
            3. Estructura Organizacional & Matriz RACI
          </h2>
          <p className="text-xs text-slate-700 leading-relaxed mb-4">
            {manual.gobernanza.descripcionJerarquica}
          </p>

          <div className="overflow-x-auto border border-slate-300 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="p-2.5">Fase / Actividad Crítica</th>
                  <th className="p-2.5 text-center w-24">R (Responsable)</th>
                  <th className="p-2.5 text-center w-24">A (Aprueba)</th>
                  <th className="p-2.5 text-center w-24">C (Consulta)</th>
                  <th className="p-2.5 text-center w-24">I (Informa)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {manual.gobernanza.matrizRaci.map((raci, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-2.5 font-medium text-slate-900">{raci.faseActividad}</td>
                    <td className="p-2.5 text-center font-bold text-slate-800">{raci.r}</td>
                    <td className="p-2.5 text-center font-bold text-orange-600">{raci.a}</td>
                    <td className="p-2.5 text-center text-slate-600">{raci.c}</td>
                    <td className="p-2.5 text-center text-slate-600">{raci.i}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 italic">
            * RACI: R = Responsible (Ejecuta la tarea), A = Accountable (Aprueba y asume la responsabilidad), C = Consulted (Aporta opinión técnica previa), I = Informed (Se le notifica el resultado).
          </p>
        </div>

        {/* 4. SIPOC */}
        <div className="mb-8 avoid-break page-break">
          <h2 className="text-sm font-black text-orange-600 uppercase tracking-wider border-b-2 border-orange-500 pb-1 mb-3">
            4. Diagrama SIPOC (Lean Six Sigma)
          </h2>
          <div className="overflow-x-auto border border-slate-300 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-orange-600 text-white font-bold text-center">
                <tr>
                  <th className="p-2.5 border-r border-orange-500">S (Proveedores)</th>
                  <th className="p-2.5 border-r border-orange-500">I (Entradas)</th>
                  <th className="p-2.5 border-r border-orange-500">P (Proceso)</th>
                  <th className="p-2.5 border-r border-orange-500">O (Salidas)</th>
                  <th className="p-2.5">C (Clientes)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 align-top">
                {Array.from({
                  length: Math.max(
                    manual.sipoc.proveedores.length,
                    manual.sipoc.entradas.length,
                    manual.sipoc.macroPasos.length,
                    manual.sipoc.salidas.length,
                    manual.sipoc.clientes.length
                  )
                }).map((_, rowIdx) => (
                  <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-2.5 border-r border-slate-200 text-slate-700">
                      {manual.sipoc.proveedores[rowIdx] || ''}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 text-slate-700">
                      {manual.sipoc.entradas[rowIdx] || ''}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 font-semibold text-slate-900">
                      {manual.sipoc.macroPasos[rowIdx] ? `${rowIdx + 1}. ${manual.sipoc.macroPasos[rowIdx]}` : ''}
                    </td>
                    <td className="p-2.5 border-r border-slate-200 text-slate-700">
                      {manual.sipoc.salidas[rowIdx] || ''}
                    </td>
                    <td className="p-2.5 text-slate-700">
                      {manual.sipoc.clientes[rowIdx] || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. ANÁLISIS LEAN & DESPERDICIOS MUDA */}
        <div className="mb-8 avoid-break">
          <h2 className="text-sm font-black text-orange-600 uppercase tracking-wider border-b-2 border-orange-500 pb-1 mb-3">
            5. Análisis de Desperdicios (Muda) & Plan de Mejora Kaizen
          </h2>
          <div className="space-y-2.5">
            {manual.analisisLean.desperdiciosMudaIdentificados.map((muda, i) => (
              <div key={i} className="p-3 rounded-lg border border-red-200 bg-red-50/30 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-red-700 uppercase tracking-wide">
                    [{muda.tipoMuda}]
                  </span>
                  <span className="font-semibold text-slate-900">{muda.descripcion}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5 pt-1.5 border-t border-red-100 text-[11px]">
                  <div>
                    <span className="font-bold text-slate-600">Impacto operativo: </span>
                    <span className="text-slate-800">{muda.impacto}</span>
                  </div>
                  <div>
                    <span className="font-bold text-emerald-800">Acción Kaizen de mitigación: </span>
                    <span className="text-emerald-900 font-semibold">{muda.accionKaizen}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6. POLÍTICAS Y REGLAS DE NEGOCIO */}
        <div className="mb-8 avoid-break">
          <h2 className="text-sm font-black text-orange-600 uppercase tracking-wider border-b-2 border-orange-500 pb-1 mb-3">
            6. Políticas y Normas Corporativas
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-slate-800">
            {manual.politicasYReglas.map((pol, idx) => (
              <div key={idx} className="flex items-start space-x-2">
                <span className="font-bold text-orange-600 font-mono w-6 text-right">
                  6.{idx + 1}
                </span>
                <p className="flex-1 leading-relaxed">{pol}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 7. PROCEDIMIENTO PASO A PASO */}
        <div className="mb-8 avoid-break page-break">
          <h2 className="text-sm font-black text-orange-600 uppercase tracking-wider border-b-2 border-orange-500 pb-1 mb-3">
            7. Procedimiento Detallado (Paso a Paso)
          </h2>
          <div className="overflow-x-auto border border-slate-300 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="p-2.5 text-center w-10">#</th>
                  <th className="p-2.5 w-44">Actividad & Responsable</th>
                  <th className="p-2.5">Descripción Operativa de la Tarea</th>
                  <th className="p-2.5 w-48">Sistema, Doc & Control de Calidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {manual.pasosProcedimiento.map((paso, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-2.5 text-center font-bold font-mono text-orange-600 align-top">
                      {paso.numero}
                    </td>
                    <td className="p-2.5 align-top">
                      <span className="font-bold text-slate-950 block">{paso.actividad}</span>
                      <span className="text-[11px] font-semibold text-slate-600 block mt-0.5">
                        Rol: {paso.responsable}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-800 align-top leading-relaxed">
                      {paso.descripcion}
                    </td>
                    <td className="p-2.5 text-[11px] align-top space-y-1">
                      <div>
                        <span className="font-semibold text-slate-600">Herramienta: </span>
                        <span className="text-slate-900">{paso.sistemaOherramienta}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600">Registro: </span>
                        <span className="text-slate-900">{paso.documentoSoporte}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600">SLA: </span>
                        <span className="font-bold text-orange-600">{paso.tiempoEstimado}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-emerald-700">Control de Calidad: </span>
                        <span className="text-emerald-800 font-medium">{paso.controlCalidad}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 8. KPIS */}
        <div className="mb-8 avoid-break">
          <h2 className="text-sm font-black text-orange-600 uppercase tracking-wider border-b-2 border-orange-500 pb-1 mb-3">
            8. Indicadores Clave de Gestión (KPIs)
          </h2>
          <div className="overflow-x-auto border border-slate-300 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="p-2.5">Indicador</th>
                  <th className="p-2.5">Fórmula de Medición</th>
                  <th className="p-2.5 text-center">Meta</th>
                  <th className="p-2.5 text-center">Frecuencia</th>
                  <th className="p-2.5">Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {manual.indicadoresKpi.map((kpi, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-2.5 font-bold text-slate-900">{kpi.nombre}</td>
                    <td className="p-2.5 font-mono text-slate-700">{kpi.formula}</td>
                    <td className="p-2.5 text-center font-bold text-emerald-600">{kpi.meta}</td>
                    <td className="p-2.5 text-center text-slate-600">{kpi.frecuencia}</td>
                    <td className="p-2.5 text-slate-700">{kpi.responsableMedicion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 9. GLOSARIO */}
        <div className="mb-8 avoid-break">
          <h2 className="text-sm font-black text-orange-600 uppercase tracking-wider border-b-2 border-orange-500 pb-1 mb-3">
            9. Glosario de Términos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {manual.glosario.map((g, i) => (
              <div key={i} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <strong className="text-slate-900 font-bold block">{g.termino}</strong>
                <span className="text-slate-600 leading-snug">{g.definicion}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 10. FIRMAS DE APROBACIÓN */}
        <div className="avoid-break pt-4">
          <h2 className="text-sm font-black text-orange-600 uppercase tracking-wider border-b-2 border-orange-500 pb-1 mb-4">
            10. Firmas de Aprobación & Control Documental
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs">
            <div className="border border-slate-300 rounded-lg p-4 bg-slate-50 flex flex-col justify-between h-40">
              <span className="font-bold text-slate-800 uppercase tracking-wider block text-[11px]">
                ELABORADO POR
              </span>
              <div className="border-t border-slate-400 pt-2 mt-auto">
                <span className="font-bold text-slate-900 block">{manual.controlAprobaciones.elaboradoPor.nombre}</span>
                <span className="text-slate-600 text-[11px] block">{manual.controlAprobaciones.elaboradoPor.cargo}</span>
                <span className="text-slate-400 text-[10px] block mt-1">Fecha: {manual.controlAprobaciones.elaboradoPor.fecha}</span>
              </div>
            </div>

            <div className="border border-slate-300 rounded-lg p-4 bg-slate-50 flex flex-col justify-between h-40">
              <span className="font-bold text-slate-800 uppercase tracking-wider block text-[11px]">
                REVISADO POR
              </span>
              <div className="border-t border-slate-400 pt-2 mt-auto">
                <span className="font-bold text-slate-900 block">{manual.controlAprobaciones.revisadoPor.nombre}</span>
                <span className="text-slate-600 text-[11px] block">{manual.controlAprobaciones.revisadoPor.cargo}</span>
                <span className="text-slate-400 text-[10px] block mt-1">Fecha: {manual.controlAprobaciones.revisadoPor.fecha}</span>
              </div>
            </div>

            <div className="border border-slate-300 rounded-lg p-4 bg-slate-50 flex flex-col justify-between h-40">
              <span className="font-bold text-slate-800 uppercase tracking-wider block text-[11px]">
                APROBADO POR
              </span>
              <div className="border-t border-slate-400 pt-2 mt-auto">
                <span className="font-bold text-slate-900 block">{manual.controlAprobaciones.aprobadoPor.nombre}</span>
                <span className="text-slate-600 text-[11px] block">{manual.controlAprobaciones.aprobadoPor.cargo}</span>
                <span className="text-slate-400 text-[10px] block mt-1">Fecha: {manual.controlAprobaciones.aprobadoPor.fecha}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
