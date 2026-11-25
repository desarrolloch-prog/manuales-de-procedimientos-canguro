import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  Wand2,
  Save,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import {
  ProcessManual,
  PasoProcedimiento,
  ItemRaci,
  DesperdicioMuda,
  IndicadorKpi,
  RolClave
} from '../types/processManual';
import { refineSectionApi } from '../services/manualApiService';

interface ManualEditorProps {
  manual: ProcessManual;
  onUpdateManual: (updated: ProcessManual) => void;
  onExportWord: () => void;
  onPrintPdf: () => void;
  onSaveToStorage: () => void;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
}

export const ManualEditor: React.FC<ManualEditorProps> = ({
  manual,
  onUpdateManual,
  onExportWord,
  onPrintPdf,
  onSaveToStorage,
  isSaving,
  hasUnsavedChanges,
}) => {
  const [activeSection, setActiveSection] = useState<string>('pasos');
  const [aiRefineSection, setAiRefineSection] = useState<string | null>(null);
  const [aiInstruction, setAiInstruction] = useState<string>('');
  const [isRefining, setIsRefining] = useState(false);

  // Helper updater
  const updateField = <K extends keyof ProcessManual>(field: K, value: ProcessManual[K]) => {
    onUpdateManual({
      ...manual,
      [field]: value,
      updatedAt: new Date().toISOString()
    });
  };

  // AI Refine Section handler
  const handleRefineWithAi = async () => {
    if (!aiRefineSection || !aiInstruction.trim()) return;
    setIsRefining(true);

    try {
      let currentContent: any = '';
      if (aiRefineSection === 'objetivoGeneral') currentContent = manual.objetivoGeneral;
      else if (aiRefineSection === 'alcance') currentContent = manual.alcance;
      else if (aiRefineSection === 'gobernanza') currentContent = manual.gobernanza;
      else if (aiRefineSection === 'sipoc') currentContent = manual.sipoc;
      else if (aiRefineSection === 'analisisLean') currentContent = manual.analisisLean;
      else if (aiRefineSection === 'politicasYReglas') currentContent = manual.politicasYReglas;
      else if (aiRefineSection === 'pasosProcedimiento') currentContent = manual.pasosProcedimiento;
      else if (aiRefineSection === 'indicadoresKpi') currentContent = manual.indicadoresKpi;

      const data = await refineSectionApi({
        sectionName: aiRefineSection,
        currentContent,
        instruction: aiInstruction,
        processContext: {
          codigo: manual.codigo,
          nombre: manual.nombre,
          direccion: manual.direccion,
          gerencia: manual.gerencia,
          tipoProceso: manual.tipoProceso
        }
      });
      if (data.success && data.result) {
        if (aiRefineSection === 'objetivoGeneral' && typeof data.result === 'string') {
          updateField('objetivoGeneral', data.result);
        } else if (aiRefineSection in manual) {
          updateField(aiRefineSection as keyof ProcessManual, data.result as ProcessManual[keyof ProcessManual]);
        }
        setAiRefineSection(null);
        setAiInstruction('');
      } else {
        console.warn('No se pudo mejorar la sección:', data?.error || 'Error desconocido');
      }
    } catch (err: any) {
      console.warn('Error de conexión:', err?.message);
    } finally {
      setIsRefining(false);
    }
  };

  // Pasos helpers
  const handleAddStep = () => {
    const newStep: PasoProcedimiento = {
      numero: manual.pasosProcedimiento.length + 1,
      actividad: 'Nueva Actividad',
      responsable: 'Operador / Asesor',
      descripcion: 'Detalle técnico de la actividad a ejecutar en la tienda o departamento.',
      sistemaOherramienta: 'ERP Profit Plus / Valery',
      documentoSoporte: 'Comprobante / Registro',
      tiempoEstimado: '10 minutos',
      controlCalidad: 'Verificación visual de conformidad'
    };
    updateField('pasosProcedimiento', [...manual.pasosProcedimiento, newStep]);
  };

  const handleUpdateStep = (index: number, updated: Partial<PasoProcedimiento>) => {
    const newSteps = [...manual.pasosProcedimiento];
    newSteps[index] = { ...newSteps[index], ...updated };
    updateField('pasosProcedimiento', newSteps);
  };

  const handleDeleteStep = (index: number) => {
    const filtered = manual.pasosProcedimiento.filter((_, i) => i !== index);
    const renumbered = filtered.map((s, i) => ({ ...s, numero: i + 1 }));
    updateField('pasosProcedimiento', renumbered);
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === manual.pasosProcedimiento.length - 1)) return;
    const target = direction === 'up' ? index - 1 : index + 1;
    const newSteps = [...manual.pasosProcedimiento];
    const temp = newSteps[index];
    newSteps[index] = newSteps[target];
    newSteps[target] = temp;
    const renumbered = newSteps.map((s, i) => ({ ...s, numero: i + 1 }));
    updateField('pasosProcedimiento', renumbered);
  };

  // RACI helpers
  const handleAddRaciItem = () => {
    const newItem: ItemRaci = {
      faseActividad: 'Nueva Actividad Crítica',
      r: 'Asesor / Operador',
      a: 'Encargado / Gerente',
      c: 'Auditoría / Calidad',
      i: 'Supervisión'
    };
    updateField('gobernanza', {
      ...manual.gobernanza,
      matrizRaci: [...manual.gobernanza.matrizRaci, newItem]
    });
  };

  const handleUpdateRaciItem = (index: number, field: keyof ItemRaci, val: string) => {
    const newRaci = [...manual.gobernanza.matrizRaci];
    newRaci[index] = { ...newRaci[index], [field]: val };
    updateField('gobernanza', { ...manual.gobernanza, matrizRaci: newRaci });
  };

  const handleDeleteRaciItem = (index: number) => {
    updateField('gobernanza', {
      ...manual.gobernanza,
      matrizRaci: manual.gobernanza.matrizRaci.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Top Banner with Quick Actions */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700 font-bold border border-orange-200">
              {manual.codigo}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
              v{manual.version}
            </span>
            <span className="text-xs text-slate-400">
              {manual.direccion} / {manual.gerencia}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            {manual.nombre}
          </h1>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={onSaveToStorage}
            disabled={isSaving}
            className={`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition ${
              hasUnsavedChanges
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Guardando...' : hasUnsavedChanges ? 'Guardar Cambios' : 'Guardado'}</span>
          </button>

          <button
            onClick={onExportWord}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95"
            title="Descargar Microsoft Word (.docx) formal listo para entrega"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Descargar Word (.docx)</span>
          </button>

          <button
            onClick={onPrintPdf}
            className="flex items-center space-x-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95"
            title="Descargar archivo PDF oficial"
          >
            <Download className="w-4 h-4" />
            <span>Descargar PDF (.pdf)</span>
          </button>
        </div>
      </div>

      {/* AI Refine Modal / Drawer if active */}
      {aiRefineSection && (
        <div className="mb-6 p-5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-orange-950 flex items-center">
              <Sparkles className="w-4 h-4 text-orange-600 mr-1.5" />
              Perfeccionar Sección con IA: <span className="underline ml-1">{aiRefineSection}</span>
            </h3>
            <button
              onClick={() => setAiRefineSection(null)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Cancelar
            </button>
          </div>
          <p className="text-xs text-orange-800 mb-3">
            Indica qué deseas que la IA ajuste (ej. &quot;Añadir 2 políticas de seguridad de inventario&quot;, &quot;Redactar los pasos con lenguaje más formal ISO 9001&quot;, &quot;Calcular tiempos SLA más estrictos&quot;).
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={aiInstruction}
              onChange={(e) => setAiInstruction(e.target.value)}
              placeholder="Ej. Añade validaciones contra errores de facturación y especifica el sistema ERP Odoo..."
              className="flex-1 text-xs sm:text-sm bg-white border border-orange-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            <button
              onClick={handleRefineWithAi}
              disabled={isRefining || !aiInstruction.trim()}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 flex items-center space-x-1"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>{isRefining ? 'Optimizando...' : 'Aplicar'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Editor Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-3 overflow-x-auto gap-2">
        {[
          { id: 'ficha', label: 'Ficha & General' },
          { id: 'objetivo', label: '1. Objetivo & Alcance' },
          { id: 'gobernanza', label: '2. Gobernanza & RACI' },
          { id: 'sipoc', label: '3. Diagrama SIPOC' },
          { id: 'lean', label: '4. Análisis Lean & Muda' },
          { id: 'politicas', label: '5. Políticas de Negocio' },
          { id: 'pasos', label: '6. Procedimiento Paso a Paso' },
          { id: 'kpis', label: '7. KPIs & Glosario' },
          { id: 'firmas', label: '8. Firmas de Aprobación' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-t-lg transition whitespace-nowrap border-b-2 ${
              activeSection === tab.id
                ? 'border-orange-600 text-orange-600 bg-orange-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Editor Content Area */}
      <div className="bg-white rounded-b-2xl p-6 shadow-sm border border-t-0 border-slate-200 min-h-[500px]">
        {/* Section: Ficha Técnica */}
        {activeSection === 'ficha' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Datos Generales & Ficha Técnica</h2>
                <p className="text-xs text-slate-500">Encabezado y control documental Canguro Venezuela</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Código del Documento</label>
                <input
                  type="text"
                  value={manual.codigo}
                  onChange={(e) => updateField('codigo', e.target.value)}
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Versión</label>
                <input
                  type="text"
                  value={manual.version}
                  onChange={(e) => updateField('version', e.target.value)}
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha de Emisión</label>
                <input
                  type="date"
                  value={manual.fechaEmision}
                  onChange={(e) => updateField('fechaEmision', e.target.value)}
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Oficial del Procedimiento</label>
                <input
                  type="text"
                  value={manual.nombre}
                  onChange={(e) => updateField('nombre', e.target.value)}
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Proceso</label>
                <input
                  type="text"
                  value={manual.tipoProceso}
                  onChange={(e) => updateField('tipoProceso', e.target.value)}
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección</label>
                <input
                  type="text"
                  value={manual.direccion}
                  onChange={(e) => updateField('direccion', e.target.value)}
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gerencia</label>
                <input
                  type="text"
                  value={manual.gerencia}
                  onChange={(e) => updateField('gerencia', e.target.value)}
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Propietario del Proceso (Owner)</label>
                <input
                  type="text"
                  value={manual.propietario}
                  onChange={(e) => updateField('propietario', e.target.value)}
                  className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section: Objetivo & Alcance */}
        {activeSection === 'objetivo' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">1. Objetivo y Alcance</h2>
                <p className="text-xs text-slate-500">Propósito fundamental y límites del procedimiento</p>
              </div>
              <button
                onClick={() => setAiRefineSection('objetivoGeneral')}
                className="flex items-center space-x-1 text-xs text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg border border-orange-200 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mejorar con IA</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Objetivo General</label>
              <textarea
                rows={3}
                value={manual.objetivoGeneral}
                onChange={(e) => updateField('objetivoGeneral', e.target.value)}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-900"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-800">Objetivos Específicos</label>
                <button
                  type="button"
                  onClick={() => updateField('objetivosEspecificos', [...manual.objetivosEspecificos, 'Nuevo objetivo específico'])}
                  className="flex items-center space-x-1 text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md hover:bg-slate-200"
                >
                  <Plus className="w-3 h-3" />
                  <span>Añadir</span>
                </button>
              </div>
              <div className="space-y-2">
                {manual.objetivosEspecificos.map((obj, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 w-4">{i + 1}.</span>
                    <input
                      type="text"
                      value={obj}
                      onChange={(e) => {
                        const newObjs = [...manual.objetivosEspecificos];
                        newObjs[i] = e.target.value;
                        updateField('objetivosEspecificos', newObjs);
                      }}
                      className="flex-1 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5"
                    />
                    <button
                      type="button"
                      onClick={() => updateField('objetivosEspecificos', manual.objetivosEspecificos.filter((_, idx) => idx !== i))}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Límites del Alcance</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Inicia en (Detonante):</label>
                  <textarea
                    rows={2}
                    value={manual.alcance.iniciaEn}
                    onChange={(e) => updateField('alcance', { ...manual.alcance, iniciaEn: e.target.value })}
                    className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Incluye (Actividades):</label>
                  <textarea
                    rows={2}
                    value={manual.alcance.incluye}
                    onChange={(e) => updateField('alcance', { ...manual.alcance, incluye: e.target.value })}
                    className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Termina en (Cierre):</label>
                  <textarea
                    rows={2}
                    value={manual.alcance.terminaEn}
                    onChange={(e) => updateField('alcance', { ...manual.alcance, terminaEn: e.target.value })}
                    className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section: Gobernanza & RACI */}
        {activeSection === 'gobernanza' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">2. Gobernanza & Matriz RACI</h2>
                <p className="text-xs text-slate-500">Responsables (R), Aprobadores (A), Consultados (C) e Informados (I)</p>
              </div>
              <button
                onClick={() => setAiRefineSection('gobernanza')}
                className="flex items-center space-x-1 text-xs text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg border border-orange-200 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mejorar con IA</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Descripción Jerárquica del Proceso en Canguro Venezuela
              </label>
              <textarea
                rows={3}
                value={manual.gobernanza.descripcionJerarquica}
                onChange={(e) => updateField('gobernanza', { ...manual.gobernanza, descripcionJerarquica: e.target.value })}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg p-3"
              />
            </div>

            {/* RACI Matrix Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Matriz RACI</h3>
                <button
                  type="button"
                  onClick={handleAddRaciItem}
                  className="flex items-center space-x-1 text-xs text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200"
                >
                  <Plus className="w-3.5 h-3.5 text-orange-600" />
                  <span>Añadir Fila RACI</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 text-white font-bold">
                    <tr>
                      <th className="p-3">Fase / Actividad Crítica</th>
                      <th className="p-3 w-32">R (Responsable)</th>
                      <th className="p-3 w-32">A (Aprobador)</th>
                      <th className="p-3 w-32">C (Consultado)</th>
                      <th className="p-3 w-32">I (Informado)</th>
                      <th className="p-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {manual.gobernanza.matrizRaci.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.faseActividad}
                            onChange={(e) => handleUpdateRaciItem(idx, 'faseActividad', e.target.value)}
                            className="w-full bg-transparent border-0 font-medium text-slate-800 p-1 focus:bg-white focus:ring-1 focus:ring-orange-500 rounded"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.r}
                            onChange={(e) => handleUpdateRaciItem(idx, 'r', e.target.value)}
                            className="w-full bg-transparent border-0 text-slate-700 p-1 font-bold focus:bg-white focus:ring-1 focus:ring-orange-500 rounded"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.a}
                            onChange={(e) => handleUpdateRaciItem(idx, 'a', e.target.value)}
                            className="w-full bg-transparent border-0 text-orange-600 font-bold p-1 focus:bg-white focus:ring-1 focus:ring-orange-500 rounded"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.c}
                            onChange={(e) => handleUpdateRaciItem(idx, 'c', e.target.value)}
                            className="w-full bg-transparent border-0 text-slate-600 p-1 focus:bg-white focus:ring-1 focus:ring-orange-500 rounded"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.i}
                            onChange={(e) => handleUpdateRaciItem(idx, 'i', e.target.value)}
                            className="w-full bg-transparent border-0 text-slate-600 p-1 focus:bg-white focus:ring-1 focus:ring-orange-500 rounded"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRaciItem(idx)}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Section: SIPOC */}
        {activeSection === 'sipoc' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">3. Diagrama SIPOC Lean Six Sigma</h2>
                <p className="text-xs text-slate-500">Mapeo de alto nivel de Entradas, Proceso y Salidas</p>
              </div>
              <button
                onClick={() => setAiRefineSection('sipoc')}
                className="flex items-center space-x-1 text-xs text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg border border-orange-200 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mejorar con IA</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {/* Suppliers */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <h4 className="font-bold text-xs text-orange-600 uppercase mb-2">S - Proveedores</h4>
                <div className="space-y-2">
                  {manual.sipoc.proveedores.map((s, i) => (
                    <input
                      key={i}
                      type="text"
                      value={s}
                      onChange={(e) => {
                        const arr = [...manual.sipoc.proveedores];
                        arr[i] = e.target.value;
                        updateField('sipoc', { ...manual.sipoc, proveedores: arr });
                      }}
                      className="w-full text-[11px] bg-white border border-slate-300 rounded p-1.5"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => updateField('sipoc', { ...manual.sipoc, proveedores: [...manual.sipoc.proveedores, 'Nuevo Proveedor'] })}
                    className="w-full text-[10px] text-slate-600 py-1 bg-white border border-dashed rounded hover:bg-slate-100"
                  >
                    + Agregar
                  </button>
                </div>
              </div>

              {/* Inputs */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <h4 className="font-bold text-xs text-blue-600 uppercase mb-2">I - Entradas</h4>
                <div className="space-y-2">
                  {manual.sipoc.entradas.map((inp, i) => (
                    <input
                      key={i}
                      type="text"
                      value={inp}
                      onChange={(e) => {
                        const arr = [...manual.sipoc.entradas];
                        arr[i] = e.target.value;
                        updateField('sipoc', { ...manual.sipoc, entradas: arr });
                      }}
                      className="w-full text-[11px] bg-white border border-slate-300 rounded p-1.5"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => updateField('sipoc', { ...manual.sipoc, entradas: [...manual.sipoc.entradas, 'Nueva Entrada'] })}
                    className="w-full text-[10px] text-slate-600 py-1 bg-white border border-dashed rounded hover:bg-slate-100"
                  >
                    + Agregar
                  </button>
                </div>
              </div>

              {/* Process */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <h4 className="font-bold text-xs text-purple-600 uppercase mb-2">P - Macro Pasos</h4>
                <div className="space-y-2">
                  {manual.sipoc.macroPasos.map((p, i) => (
                    <input
                      key={i}
                      type="text"
                      value={p}
                      onChange={(e) => {
                        const arr = [...manual.sipoc.macroPasos];
                        arr[i] = e.target.value;
                        updateField('sipoc', { ...manual.sipoc, macroPasos: arr });
                      }}
                      className="w-full text-[11px] bg-white border border-slate-300 rounded p-1.5 font-medium"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => updateField('sipoc', { ...manual.sipoc, macroPasos: [...manual.sipoc.macroPasos, 'Nuevo Paso'] })}
                    className="w-full text-[10px] text-slate-600 py-1 bg-white border border-dashed rounded hover:bg-slate-100"
                  >
                    + Agregar
                  </button>
                </div>
              </div>

              {/* Outputs */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <h4 className="font-bold text-xs text-emerald-600 uppercase mb-2">O - Salidas</h4>
                <div className="space-y-2">
                  {manual.sipoc.salidas.map((o, i) => (
                    <input
                      key={i}
                      type="text"
                      value={o}
                      onChange={(e) => {
                        const arr = [...manual.sipoc.salidas];
                        arr[i] = e.target.value;
                        updateField('sipoc', { ...manual.sipoc, salidas: arr });
                      }}
                      className="w-full text-[11px] bg-white border border-slate-300 rounded p-1.5"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => updateField('sipoc', { ...manual.sipoc, salidas: [...manual.sipoc.salidas, 'Nueva Salida'] })}
                    className="w-full text-[10px] text-slate-600 py-1 bg-white border border-dashed rounded hover:bg-slate-100"
                  >
                    + Agregar
                  </button>
                </div>
              </div>

              {/* Customers */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <h4 className="font-bold text-xs text-amber-600 uppercase mb-2">C - Clientes</h4>
                <div className="space-y-2">
                  {manual.sipoc.clientes.map((c, i) => (
                    <input
                      key={i}
                      type="text"
                      value={c}
                      onChange={(e) => {
                        const arr = [...manual.sipoc.clientes];
                        arr[i] = e.target.value;
                        updateField('sipoc', { ...manual.sipoc, clientes: arr });
                      }}
                      className="w-full text-[11px] bg-white border border-slate-300 rounded p-1.5"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => updateField('sipoc', { ...manual.sipoc, clientes: [...manual.sipoc.clientes, 'Nuevo Cliente'] })}
                    className="w-full text-[10px] text-slate-600 py-1 bg-white border border-dashed rounded hover:bg-slate-100"
                  >
                    + Agregar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section: Análisis Lean & Desperdicios Muda */}
        {activeSection === 'lean' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">4. Desperdicios (Muda) & Kaizen Detectados</h2>
                <p className="text-xs text-slate-500">Oportunidades de optimización identificadas durante la entrevista</p>
              </div>
              <button
                onClick={() => setAiRefineSection('analisisLean')}
                className="flex items-center space-x-1 text-xs text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg border border-orange-200 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mejorar con IA</span>
              </button>
            </div>

            <div className="space-y-4">
              {manual.analisisLean.desperdiciosMudaIdentificados.map((muda, i) => (
                <div key={i} className="p-4 rounded-xl border border-red-200 bg-red-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-700 uppercase tracking-wide">
                      Muda: {muda.tipoMuda}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const filtered = manual.analisisLean.desperdiciosMudaIdentificados.filter((_, idx) => idx !== i);
                        updateField('analisisLean', { ...manual.analisisLean, desperdiciosMudaIdentificados: filtered });
                      }}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block">Descripción del Desperdicio:</label>
                    <input
                      type="text"
                      value={muda.descripcion}
                      onChange={(e) => {
                        const list = [...manual.analisisLean.desperdiciosMudaIdentificados];
                        list[i] = { ...list[i], descripcion: e.target.value };
                        updateField('analisisLean', { ...manual.analisisLean, desperdiciosMudaIdentificados: list });
                      }}
                      className="w-full text-xs bg-white border border-slate-300 rounded p-1.5"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block">Impacto en la Operación:</label>
                      <input
                        type="text"
                        value={muda.impacto}
                        onChange={(e) => {
                          const list = [...manual.analisisLean.desperdiciosMudaIdentificados];
                          list[i] = { ...list[i], impacto: e.target.value };
                          updateField('analisisLean', { ...manual.analisisLean, desperdiciosMudaIdentificados: list });
                        }}
                        className="w-full text-xs bg-white border border-slate-300 rounded p-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-emerald-800 block">Acción Kaizen Recomendada:</label>
                      <input
                        type="text"
                        value={muda.accionKaizen}
                        onChange={(e) => {
                          const list = [...manual.analisisLean.desperdiciosMudaIdentificados];
                          list[i] = { ...list[i], accionKaizen: e.target.value };
                          updateField('analisisLean', { ...manual.analisisLean, desperdiciosMudaIdentificados: list });
                        }}
                        className="w-full text-xs bg-white border border-emerald-300 text-emerald-900 rounded p-1.5 font-medium"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  const newItem: DesperdicioMuda = {
                    tipoMuda: 'Esperas',
                    descripcion: 'Demora en la respuesta de soporte',
                    impacto: 'Incremento del Lead Time',
                    accionKaizen: 'Establecer SLA máximo de 15 minutos con alerta automática'
                  };
                  updateField('analisisLean', {
                    ...manual.analisisLean,
                    desperdiciosMudaIdentificados: [...manual.analisisLean.desperdiciosMudaIdentificados, newItem]
                  });
                }}
                className="flex items-center space-x-1.5 text-xs text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg border border-orange-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Desperdicio / Muda</span>
              </button>
            </div>
          </div>
        )}

        {/* Section: Políticas & Reglas de Negocio */}
        {activeSection === 'politicas' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">5. Políticas y Reglas de Negocio</h2>
                <p className="text-xs text-slate-500">Normas corporativas obligatorias para el personal de Canguro Venezuela</p>
              </div>
              <button
                onClick={() => setAiRefineSection('politicasYReglas')}
                className="flex items-center space-x-1 text-xs text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg border border-orange-200 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mejorar con IA</span>
              </button>
            </div>

            <div className="space-y-3">
              {manual.politicasYReglas.map((pol, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-xs font-mono font-bold text-orange-600 mt-1.5 w-6">{idx + 1}.</span>
                  <textarea
                    rows={2}
                    value={pol}
                    onChange={(e) => {
                      const list = [...manual.politicasYReglas];
                      list[idx] = e.target.value;
                      updateField('politicasYReglas', list);
                    }}
                    className="flex-1 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg p-2"
                  />
                  <button
                    type="button"
                    onClick={() => updateField('politicasYReglas', manual.politicasYReglas.filter((_, i) => i !== idx))}
                    className="text-slate-400 hover:text-red-500 p-1 mt-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => updateField('politicasYReglas', [...manual.politicasYReglas, 'Nueva política corporativa de cumplimiento obligatorio.'])}
                className="flex items-center space-x-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg font-semibold"
              >
                <Plus className="w-3.5 h-3.5 text-orange-600" />
                <span>Añadir Política</span>
              </button>
            </div>
          </div>
        )}

        {/* Section: Procedimiento Paso a Paso */}
        {activeSection === 'pasos' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">6. Procedimiento Detallado (Paso a Paso)</h2>
                <p className="text-xs text-slate-500">Secuencia cronológica con roles, sistemas, SLAs y controles de calidad</p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setAiRefineSection('pasosProcedimiento')}
                  className="flex items-center space-x-1 text-xs text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg border border-orange-200 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Mejorar Pasos con IA</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddStep}
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-lg shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Paso</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {manual.pasosProcedimiento.map((paso, idx) => (
                <div
                  key={idx}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-xs hover:border-orange-300 transition"
                >
                  <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center space-x-3">
                      <span className="w-7 h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold text-xs">
                        {paso.numero}
                      </span>
                      <input
                        type="text"
                        value={paso.actividad}
                        onChange={(e) => handleUpdateStep(idx, { actividad: e.target.value })}
                        placeholder="Nombre de la actividad (ej. Verificar mercadería contra guía)"
                        className="text-xs sm:text-sm font-bold text-slate-900 border-0 bg-transparent p-1 focus:bg-slate-50 focus:ring-1 focus:ring-orange-500 rounded flex-1 sm:w-96"
                      />
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => handleMoveStep(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        title="Mover arriba"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveStep(idx, 'down')}
                        disabled={idx === manual.pasosProcedimiento.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        title="Mover abajo"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStep(idx)}
                        className="p-1 text-slate-400 hover:text-red-500 ml-2"
                        title="Eliminar paso"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Step Description */}
                  <div className="mb-3">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Descripción Operativa Detallada (Cómo se ejecuta, paso a paso):
                    </label>
                    <textarea
                      rows={3}
                      value={paso.descripcion}
                      onChange={(e) => handleUpdateStep(idx, { descripcion: e.target.value })}
                      className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
                    />
                  </div>

                  {/* Metadata Row: Responsable, Sistema, Doc Soporte, SLA, Control Calidad */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Responsable / Rol
                      </label>
                      <input
                        type="text"
                        value={paso.responsable}
                        onChange={(e) => handleUpdateStep(idx, { responsable: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 font-medium text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Sistema / Herramienta
                      </label>
                      <input
                        type="text"
                        value={paso.sistemaOherramienta}
                        onChange={(e) => handleUpdateStep(idx, { sistemaOherramienta: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Documento Soporte
                      </label>
                      <input
                        type="text"
                        value={paso.documentoSoporte}
                        onChange={(e) => handleUpdateStep(idx, { documentoSoporte: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        SLA / Tiempo Estándar
                      </label>
                      <input
                        type="text"
                        value={paso.tiempoEstimado}
                        onChange={(e) => handleUpdateStep(idx, { tiempoEstimado: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 font-bold text-orange-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
                        Control de Calidad / Verificación
                      </label>
                      <input
                        type="text"
                        value={paso.controlCalidad}
                        onChange={(e) => handleUpdateStep(idx, { controlCalidad: e.target.value })}
                        className="w-full text-xs bg-emerald-50/50 border border-emerald-200 text-emerald-800 rounded px-2.5 py-1.5 font-medium"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: KPIs & Glosario */}
        {activeSection === 'kpis' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">7. Indicadores Clave (KPIs) & Glosario</h2>
                <p className="text-xs text-slate-500">Métricas cuantitativas de desempeño y definiciones</p>
              </div>
              <button
                onClick={() => setAiRefineSection('indicadoresKpi')}
                className="flex items-center space-x-1 text-xs text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg border border-orange-200 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mejorar con IA</span>
              </button>
            </div>

            {/* KPIs */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">Indicadores Lean Six Sigma</h3>
              <div className="space-y-3">
                {manual.indicadoresKpi.map((kpi, i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                    <div>
                      <label className="text-[10px] text-slate-500 block font-semibold">Indicador:</label>
                      <input
                        type="text"
                        value={kpi.nombre}
                        onChange={(e) => {
                          const list = [...manual.indicadoresKpi];
                          list[i] = { ...list[i], nombre: e.target.value };
                          updateField('indicadoresKpi', list);
                        }}
                        className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded p-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block font-semibold">Fórmula:</label>
                      <input
                        type="text"
                        value={kpi.formula}
                        onChange={(e) => {
                          const list = [...manual.indicadoresKpi];
                          list[i] = { ...list[i], formula: e.target.value };
                          updateField('indicadoresKpi', list);
                        }}
                        className="w-full text-xs font-mono text-slate-700 bg-white border border-slate-300 rounded p-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block font-semibold">Meta:</label>
                      <input
                        type="text"
                        value={kpi.meta}
                        onChange={(e) => {
                          const list = [...manual.indicadoresKpi];
                          list[i] = { ...list[i], meta: e.target.value };
                          updateField('indicadoresKpi', list);
                        }}
                        className="w-full text-xs font-bold text-emerald-600 bg-white border border-slate-300 rounded p-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block font-semibold">Frecuencia:</label>
                      <input
                        type="text"
                        value={kpi.frecuencia}
                        onChange={(e) => {
                          const list = [...manual.indicadoresKpi];
                          list[i] = { ...list[i], frecuencia: e.target.value };
                          updateField('indicadoresKpi', list);
                        }}
                        className="w-full text-xs text-slate-700 bg-white border border-slate-300 rounded p-1.5"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-500 block font-semibold">Responsable:</label>
                        <input
                          type="text"
                          value={kpi.responsableMedicion}
                          onChange={(e) => {
                            const list = [...manual.indicadoresKpi];
                            list[i] = { ...list[i], responsableMedicion: e.target.value };
                            updateField('indicadoresKpi', list);
                          }}
                          className="w-full text-xs text-slate-700 bg-white border border-slate-300 rounded p-1.5"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => updateField('indicadoresKpi', manual.indicadoresKpi.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-red-500 mt-3"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Glosario */}
            <div className="border-t pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">Glosario de Términos</h3>
              <div className="space-y-2">
                {manual.glosario.map((g, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={g.termino}
                      onChange={(e) => {
                        const list = [...manual.glosario];
                        list[idx] = { ...list[idx], termino: e.target.value };
                        updateField('glosario', list);
                      }}
                      className="w-40 text-xs font-bold bg-slate-50 border border-slate-300 rounded p-1.5"
                    />
                    <input
                      type="text"
                      value={g.definicion}
                      onChange={(e) => {
                        const list = [...manual.glosario];
                        list[idx] = { ...list[idx], definicion: e.target.value };
                        updateField('glosario', list);
                      }}
                      className="flex-1 text-xs bg-slate-50 border border-slate-300 rounded p-1.5"
                    />
                    <button
                      type="button"
                      onClick={() => updateField('glosario', manual.glosario.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section: Firmas de Aprobación */}
        {activeSection === 'firmas' && (
          <div className="space-y-6">
            <div className="border-b pb-3">
              <h2 className="text-base font-bold text-slate-900">8. Control de Cambios & Firmas de Aprobación</h2>
              <p className="text-xs text-slate-500">Firmas oficiales de elaboración, revisión y aprobación</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Elaborado por */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block text-center border-b pb-2">
                  ELABORADO POR (Analista de Procesos)
                </span>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block">Nombre:</label>
                  <input
                    type="text"
                    value={manual.controlAprobaciones.elaboradoPor.nombre}
                    onChange={(e) =>
                      updateField('controlAprobaciones', {
                        ...manual.controlAprobaciones,
                        elaboradoPor: { ...manual.controlAprobaciones.elaboradoPor, nombre: e.target.value }
                      })
                    }
                    className="w-full text-xs bg-white border border-slate-300 rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block">Cargo:</label>
                  <input
                    type="text"
                    value={manual.controlAprobaciones.elaboradoPor.cargo}
                    onChange={(e) =>
                      updateField('controlAprobaciones', {
                        ...manual.controlAprobaciones,
                        elaboradoPor: { ...manual.controlAprobaciones.elaboradoPor, cargo: e.target.value }
                      })
                    }
                    className="w-full text-xs bg-white border border-slate-300 rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block">Fecha:</label>
                  <input
                    type="date"
                    value={manual.controlAprobaciones.elaboradoPor.fecha}
                    onChange={(e) =>
                      updateField('controlAprobaciones', {
                        ...manual.controlAprobaciones,
                        elaboradoPor: { ...manual.controlAprobaciones.elaboradoPor, fecha: e.target.value }
                      })
                    }
                    className="w-full text-xs bg-white border border-slate-300 rounded p-1.5"
                  />
                </div>
              </div>

              {/* Revisado por */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block text-center border-b pb-2">
                  REVISADO POR (Gerente de Área)
                </span>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block">Nombre:</label>
                  <input
                    type="text"
                    value={manual.controlAprobaciones.revisadoPor.nombre}
                    onChange={(e) =>
                      updateField('controlAprobaciones', {
                        ...manual.controlAprobaciones,
                        revisadoPor: { ...manual.controlAprobaciones.revisadoPor, nombre: e.target.value }
                      })
                    }
                    className="w-full text-xs bg-white border border-slate-300 rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block">Cargo:</label>
                  <input
                    type="text"
                    value={manual.controlAprobaciones.revisadoPor.cargo}
                    onChange={(e) =>
                      updateField('controlAprobaciones', {
                        ...manual.controlAprobaciones,
                        revisadoPor: { ...manual.controlAprobaciones.revisadoPor, cargo: e.target.value }
                      })
                    }
                    className="w-full text-xs bg-white border border-slate-300 rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block">Fecha:</label>
                  <input
                    type="date"
                    value={manual.controlAprobaciones.revisadoPor.fecha}
                    onChange={(e) =>
                      updateField('controlAprobaciones', {
                        ...manual.controlAprobaciones,
                        revisadoPor: { ...manual.controlAprobaciones.revisadoPor, fecha: e.target.value }
                      })
                    }
                    className="w-full text-xs bg-white border border-slate-300 rounded p-1.5"
                  />
                </div>
              </div>

              {/* Aprobado por */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block text-center border-b pb-2">
                  APROBADO POR (Dirección General)
                </span>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block">Nombre:</label>
                  <input
                    type="text"
                    value={manual.controlAprobaciones.aprobadoPor.nombre}
                    onChange={(e) =>
                      updateField('controlAprobaciones', {
                        ...manual.controlAprobaciones,
                        aprobadoPor: { ...manual.controlAprobaciones.aprobadoPor, nombre: e.target.value }
                      })
                    }
                    className="w-full text-xs bg-white border border-slate-300 rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block">Cargo:</label>
                  <input
                    type="text"
                    value={manual.controlAprobaciones.aprobadoPor.cargo}
                    onChange={(e) =>
                      updateField('controlAprobaciones', {
                        ...manual.controlAprobaciones,
                        aprobadoPor: { ...manual.controlAprobaciones.aprobadoPor, cargo: e.target.value }
                      })
                    }
                    className="w-full text-xs bg-white border border-slate-300 rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block">Fecha:</label>
                  <input
                    type="date"
                    value={manual.controlAprobaciones.aprobadoPor.fecha}
                    onChange={(e) =>
                      updateField('controlAprobaciones', {
                        ...manual.controlAprobaciones,
                        aprobadoPor: { ...manual.controlAprobaciones.aprobadoPor, fecha: e.target.value }
                      })
                    }
                    className="w-full text-xs bg-white border border-slate-300 rounded p-1.5"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
