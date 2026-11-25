import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Mic,
  MicOff,
  Building2,
  UserCheck,
  FileText,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  RotateCcw,
  Plus,
  AlertTriangle,
  Zap,
  CheckCircle,
  ClipboardList
} from 'lucide-react';
import { ESTRUCTURA_CANGURO, TIPOS_MUDA_LEAN } from '../data/canguroStructure';
import { InterviewData, ProcessManual } from '../types/processManual';
import { suggestInterviewQuestionsApi } from '../services/manualApiService';

interface InterviewWizardProps {
  onGenerateManual: (data: InterviewData) => Promise<void>;
  isGenerating: boolean;
  onLoadExampleData: () => void;
}

export const InterviewWizard: React.FC<InterviewWizardProps> = ({
  onGenerateManual,
  isGenerating,
  onLoadExampleData,
}) => {
  const [formData, setFormData] = useState<InterviewData>({
    direccion: 'Dirección de Operaciones Retail y Tiendas',
    gerencia: 'Gerencia de Tiendas y Puntos de Venta',
    nombreProceso: 'Atención al Cliente, Asesoría y Venta en Tienda Física',
    codigoSugerido: 'MAN-OPE-TDA-001',
    propietario: 'Gerente de Tiendas y Puntos de Venta',
    version: '1.0',
    tipoProceso: 'Operativo / Clave',
    entrevistado: 'Carlos Mendoza',
    cargoEntrevistado: 'Encargado de Tienda y Líder de Ventas',
    notasEntrevista: '',
    preguntasRespuestas: {
      entradas: 'El cliente entra a la tienda buscando un protector hidrogel o un cargador rápido para iPhone o Samsung. El inventario proviene del Almacén Central CDI con guías de entrega.',
      sistemas: 'Usamos el punto de venta (POS) y el sistema ERP para facturación y control de existencias en tienda. También el grupo de WhatsApp de encargados para consultas de stock.',
      aprobaciones: 'Los descuentos especiales por promociones los autoriza el Encargado de Tienda. Las devoluciones o notas de crédito las autoriza el Supervisor de Zona o Auditoría.',
      desperdicios: 'Frecuentemente el sistema se pone lento al procesar pagos en horas pico. A veces el cliente pide un repuesto o accesorio que en el sistema dice 1 unidad pero físicamente no está en vitrina (descuadre de inventario). Hay demora esperando autorización de notas de crédito.',
      salidas: 'El cliente recibe su accesorio instalado o probado, factura fiscal y comprobante de garantía Canguro sellado.'
    },
    objetivoPreliminar: 'Estandarizar el protocolo de atención, venta, facturación y entrega de accesorios en todas las tiendas Canguro Venezuela.',
    alcancePreliminar: 'Aplica a todas las sucursales a nivel nacional, desde el ingreso del cliente hasta la postventa inmediata.'
  });

  // Voice recording state (Web Speech API)
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [activeSpeechField, setActiveSpeechField] = useState<'notas' | 'entradas' | 'sistemas' | 'aprobaciones' | 'desperdicios' | 'salidas'>('notas');

  // Suggested questions state
  const [suggestedQuestions, setSuggestedQuestions] = useState<Array<{ categoria: string; pregunta: string; objetivo: string }>>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    // Check speech recognition support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(Boolean(SpeechRecognition));
  }, []);

  const toggleSpeechRecognition = (field: 'notas' | 'entradas' | 'sistemas' | 'aprobaciones' | 'desperdicios' | 'salidas') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-VE'; // Spanish - Venezuela
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
        setActiveSpeechField(field);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join(' ');

        if (field === 'notas') {
          setFormData((prev) => ({
            ...prev,
            notasEntrevista: prev.notasEntrevista ? `${prev.notasEntrevista} ${transcript}` : transcript
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            preguntasRespuestas: {
              ...prev.preguntasRespuestas,
              [field]: prev.preguntasRespuestas[field] ? `${prev.preguntasRespuestas[field]} ${transcript}` : transcript
            }
          }));
        }
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (err) {
      console.error(err);
      setIsRecording(false);
    }
  };

  // Preset selector
  const handleSelectPresetProcess = (dirIndex: number, gerIndex: number, procIndex: number) => {
    const dir = ESTRUCTURA_CANGURO[dirIndex];
    const ger = dir.gerencias[gerIndex];
    const proc = ger.procesosTipicos[procIndex];

    setFormData((prev) => ({
      ...prev,
      direccion: dir.nombre,
      gerencia: ger.nombre,
      codigoSugerido: `${ger.prefijoCodigo}-${String(procIndex + 1).padStart(3, '0')}`,
      nombreProceso: proc.nombre,
      objetivoPreliminar: proc.objetivoSugerido,
      alcancePreliminar: proc.alcanceSugerido,
      propietario: ger.nombre.replace('Gerencia de ', 'Gerente de ')
    }));
  };

  const handleFetchAiQuestions = async () => {
    setLoadingSuggestions(true);
    try {
      const data = await suggestInterviewQuestionsApi({
        direccion: formData.direccion,
        gerencia: formData.gerencia,
        nombreProceso: formData.nombreProceso,
        processName: formData.nombreProceso,
        narrative: `${formData.notasEntrevista} ${formData.preguntasRespuestas.desperdicios}`,
        draftNotes: `${formData.notasEntrevista} ${formData.preguntasRespuestas.desperdicios}`
      });
      const list = data?.data || data?.questions;
      if (Array.isArray(list)) {
        setSuggestedQuestions(
          list.map((q: any, i: number) => {
            if (typeof q === 'string') {
              return {
                categoria: `Punto Crítico #${i + 1}`,
                pregunta: q,
                objetivo: 'Aclarar estándar operativo para el manual'
              };
            }
            return {
              categoria: q.categoria || `Punto Crítico #${i + 1}`,
              pregunta: q.pregunta || String(q),
              objetivo: q.objetivo || 'Validar cumplimiento del estándar'
            };
          })
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombreProceso.trim()) {
      return;
    }
    onGenerateManual(formData);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Intro Hero with Lean Six Sigma Methodology Focus */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl border border-slate-700/60 mb-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center space-x-2 mb-3">
              <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                Automatización de Levantamiento Lean Six Sigma
              </span>
              <span className="text-slate-400 text-xs hidden sm:inline">Canguro Venezuela</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
              De la Entrevista al Manual Oficial en Minutos
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Agiliza las 10 horas tradicionales de redacción. Realiza la entrevista semiestructurada al colaborador,
              dicta o pega tus notas desordenadas, y nuestro motor de IA estructurará automáticamente el{' '}
              <strong className="text-orange-400 font-semibold">SIPOC, Gobernanza, Matriz RACI, Procedimiento Paso a Paso, Desperdicios (Muda)</strong> y{' '}
              <strong className="text-orange-400 font-semibold">Reglas de Negocio</strong> en formato oficial Canguro.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={onLoadExampleData}
              className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-600 transition"
            >
              <ClipboardList className="w-4 h-4 text-amber-400" />
              <span>Cargar Ejemplo Tienda / SAT</span>
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isGenerating}
              className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-500/25 transition active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGenerating ? 'Generando Manual...' : 'Generar Manual con IA'}</span>
            </button>
          </div>
        </div>

        {/* Quick Process Presets Selector */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3 flex items-center">
            <Building2 className="w-3.5 h-3.5 mr-1.5 text-orange-400" />
            Plantillas Rápidas por Área Canguro Venezuela (Clic para autocompletar):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleSelectPresetProcess(0, 0, 0)}
              className="text-left p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs text-slate-300 transition"
            >
              <span className="font-bold text-orange-400 block truncate">Tienda: Venta & Caja</span>
              <span className="text-[11px] text-slate-400">Atención y facturación</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectPresetProcess(0, 1, 0)}
              className="text-left p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs text-slate-300 transition"
            >
              <span className="font-bold text-orange-400 block truncate">SAT: Servicio Técnico</span>
              <span className="text-[11px] text-slate-400">Recepción y diagnóstico</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectPresetProcess(1, 0, 0)}
              className="text-left p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs text-slate-300 transition"
            >
              <span className="font-bold text-orange-400 block truncate">Logística: Almacén CDI</span>
              <span className="text-[11px] text-slate-400">Recepción e inspección</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectPresetProcess(1, 0, 2)}
              className="text-left p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs text-slate-300 transition"
            >
              <span className="font-bold text-orange-400 block truncate">Control: Inventario Cíclico</span>
              <span className="text-[11px] text-slate-400">Conteos y auditoría de stock</span>
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Bloque 1: Datos Organizacionales & Gobernanza Inicial */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3 mb-5 border-b border-slate-100 pb-4">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Ficha Técnica & Gobernanza del Proceso</h2>
              <p className="text-xs text-slate-500">Jerarquía organizacional y propietarios en Canguro Venezuela</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Dirección Responsable *
              </label>
              <select
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
              >
                {ESTRUCTURA_CANGURO.map((dir: any) => (
                  <option key={dir.id} value={dir.nombre}>
                    {dir.nombre}
                  </option>
                ))}
                <option value="Otra Dirección">Otra Dirección</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Gerencia *
              </label>
              <input
                type="text"
                value={formData.gerencia}
                onChange={(e) => setFormData({ ...formData, gerencia: e.target.value })}
                placeholder="Ej. Gerencia de Tiendas y Puntos de Venta"
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nombre Oficial del Proceso *
              </label>
              <input
                type="text"
                value={formData.nombreProceso}
                onChange={(e) => setFormData({ ...formData, nombreProceso: e.target.value })}
                placeholder="Ej. Atención al Cliente, Asesoría y Venta en Tienda Física"
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-semibold transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Código del Documento
              </label>
              <input
                type="text"
                value={formData.codigoSugerido}
                onChange={(e) => setFormData({ ...formData, codigoSugerido: e.target.value })}
                placeholder="Ej. MAN-OPE-TDA-001"
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Propietario del Proceso (Process Owner)
              </label>
              <input
                type="text"
                value={formData.propietario}
                onChange={(e) => setFormData({ ...formData, propietario: e.target.value })}
                placeholder="Ej. Gerente de Tiendas"
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tipo de Proceso (Enfoque ISO / Lean)
              </label>
              <select
                value={formData.tipoProceso}
                onChange={(e) => setFormData({ ...formData, tipoProceso: e.target.value })}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
              >
                <option value="Operativo / Clave">Operativo / Clave (Cadena de Valor)</option>
                <option value="Estratégico">Estratégico (Gobernanza y Dirección)</option>
                <option value="Apoyo / Soporte">Apoyo / Soporte (Mantenimiento, TI, RRHH)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Colaborador Entrevistado (Nombre y Apellido)
              </label>
              <input
                type="text"
                value={formData.entrevistado}
                onChange={(e) => setFormData({ ...formData, entrevistado: e.target.value })}
                placeholder="Ej. Carlos Mendoza"
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Cargo del Entrevistado
              </label>
              <input
                type="text"
                value={formData.cargoEntrevistado}
                onChange={(e) => setFormData({ ...formData, cargoEntrevistado: e.target.value })}
                placeholder="Ej. Encargado de Tienda Sambil Caracas"
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Bloque 2: Entrevista Semiestructurada Guiada (Lean Six Sigma) */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 border-b border-slate-100 pb-4 gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Cuestionario Semiestructurado de la Entrevista
                </h2>
                <p className="text-xs text-slate-500">
                  5 dimensiones Lean Six Sigma: Entradas, Sistemas, Gobernanza, Desperdicios (Muda) y Salidas
                </p>
              </div>
            </div>

            {speechSupported && (
              <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="text-xs font-semibold text-slate-700">Dictado por Voz:</span>
                <span className={`text-[11px] px-2 py-0.5 rounded font-bold ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-200 text-slate-600'}`}>
                  {isRecording ? `Grabando (${activeSpeechField})` : 'Inactivo'}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Dimensión A: Entradas & Proveedores (SIPOC) */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>A. Insumos, Proveedores y Detonante Inicial (Inputs & Suppliers)</span>
                </label>
                <button
                  type="button"
                  onClick={() => toggleSpeechRecognition('entradas')}
                  className={`text-xs px-2.5 py-1 rounded-md flex items-center space-x-1 transition ${
                    isRecording && activeSpeechField === 'entradas'
                      ? 'bg-red-600 text-white'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {isRecording && activeSpeechField === 'entradas' ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-orange-600" />}
                  <span>{isRecording && activeSpeechField === 'entradas' ? 'Detener' : 'Dictar'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                ¿Qué desencadena el proceso? ¿Qué documentos, piezas o solicitudes llegan y quién las provee?
              </p>
              <textarea
                rows={2}
                value={formData.preguntasRespuestas.entradas || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    preguntasRespuestas: { ...formData.preguntasRespuestas, entradas: e.target.value }
                  })
                }
                placeholder="Ej. El cliente solicita un repuesto o accesorio; llega la guía de despacho del CDI con bultos sellados..."
                className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
              />
            </div>

            {/* Dimensión B: Ejecución & Herramientas / Sistemas */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>B. Actividades Principales, Sistemas Informáticos & Herramientas</span>
                </label>
                <button
                  type="button"
                  onClick={() => toggleSpeechRecognition('sistemas')}
                  className={`text-xs px-2.5 py-1 rounded-md flex items-center space-x-1 transition ${
                    isRecording && activeSpeechField === 'sistemas'
                      ? 'bg-red-600 text-white'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {isRecording && activeSpeechField === 'sistemas' ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-orange-600" />}
                  <span>{isRecording && activeSpeechField === 'sistemas' ? 'Detener' : 'Dictar'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                ¿Qué pasos sigue el colaborador? ¿Qué software usan (ERP Profit Plus, Valery, Excel, Portal Canguro, WhatsApp)?
              </p>
              <textarea
                rows={3}
                value={formData.preguntasRespuestas.sistemas || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    preguntasRespuestas: { ...formData.preguntasRespuestas, sistemas: e.target.value }
                  })
                }
                placeholder="Ej. Paso 1: Escanea código de barras. Paso 2: Factura en Profit Plus. Paso 3: Procesa pago en punto..."
                className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
              />
            </div>

            {/* Dimensión C: Gobernanza, Autorizaciones & Matriz RACI */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>C. Gobernanza, Aprobaciones de Excepciones & Roles Clave</span>
                </label>
                <button
                  type="button"
                  onClick={() => toggleSpeechRecognition('aprobaciones')}
                  className={`text-xs px-2.5 py-1 rounded-md flex items-center space-x-1 transition ${
                    isRecording && activeSpeechField === 'aprobaciones'
                      ? 'bg-red-600 text-white'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {isRecording && activeSpeechField === 'aprobaciones' ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-orange-600" />}
                  <span>{isRecording && activeSpeechField === 'aprobaciones' ? 'Detener' : 'Dictar'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                ¿Quién autoriza excepciones, anulaciones, descuentos o diferencias? ¿Quién aprueba el resultado final?
              </p>
              <textarea
                rows={2}
                value={formData.preguntasRespuestas.aprobaciones || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    preguntasRespuestas: { ...formData.preguntasRespuestas, aprobaciones: e.target.value }
                  })
                }
                placeholder="Ej. El asesor ejecuta la venta, el Encargado aprueba descuentos, y Auditoría aprueba ajustes de inventario..."
                className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
              />
            </div>

            {/* Dimensión D: Desperdicios Lean (Muda) & Puntos de Dolor */}
            <div className="p-4 rounded-xl bg-orange-50/60 border border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-orange-950 flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span>D. Desperdicios (Muda), Cuellos de Botella y Errores Habituales</span>
                </label>
                <button
                  type="button"
                  onClick={() => toggleSpeechRecognition('desperdicios')}
                  className={`text-xs px-2.5 py-1 rounded-md flex items-center space-x-1 transition ${
                    isRecording && activeSpeechField === 'desperdicios'
                      ? 'bg-red-600 text-white'
                      : 'bg-white text-orange-900 border border-orange-300 hover:bg-orange-100'
                  }`}
                >
                  {isRecording && activeSpeechField === 'desperdicios' ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-orange-600" />}
                  <span>{isRecording && activeSpeechField === 'desperdicios' ? 'Detener' : 'Dictar'}</span>
                </button>
              </div>
              <p className="text-[11px] text-orange-800 mb-2">
                ¿Qué hace perder tiempo al colaborador? (Esperas de aprobación, lentitud del sistema, doble digitación en Excel, productos sin código).
              </p>
              <textarea
                rows={3}
                value={formData.preguntasRespuestas.desperdicios || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    preguntasRespuestas: { ...formData.preguntasRespuestas, desperdicios: e.target.value }
                  })
                }
                placeholder="Ej. Esperas de 30 minutos por respuesta de supervisión; caída de internet que detiene el POS; retrabajo por etiquetas mal impresas..."
                className="w-full text-xs sm:text-sm bg-white border border-orange-300 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
              />
            </div>

            {/* Dimensión E: Salidas, Entregables & Clientes */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-500" />
                  <span>E. Salidas, Entregables Tangibles & Clientes (Outputs & Customers)</span>
                </label>
                <button
                  type="button"
                  onClick={() => toggleSpeechRecognition('salidas')}
                  className={`text-xs px-2.5 py-1 rounded-md flex items-center space-x-1 transition ${
                    isRecording && activeSpeechField === 'salidas'
                      ? 'bg-red-600 text-white'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {isRecording && activeSpeechField === 'salidas' ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-orange-600" />}
                  <span>{isRecording && activeSpeechField === 'salidas' ? 'Detener' : 'Dictar'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                ¿Qué se le entrega al cliente interno o externo? ¿Qué registro o acta queda guardado como evidencia?
              </p>
              <textarea
                rows={2}
                value={formData.preguntasRespuestas.salidas || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    preguntasRespuestas: { ...formData.preguntasRespuestas, salidas: e.target.value }
                  })
                }
                placeholder="Ej. Factura fiscal emitida, producto probado y empacado, acta de entrega de turno firmada..."
                className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Bloque 3: Notas Rápidas / Transcripción Libre & Asistente de Preguntas */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 border-b border-slate-100 pb-4 gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Notas Libres de la Reunión / Minutas de Entrevista
                </h2>
                <p className="text-xs text-slate-500">
                  Pega aquí apuntes rápidos, notas de audio transcritas o fragmentos sin ordenar
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFetchAiQuestions}
              disabled={loadingSuggestions}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>{loadingSuggestions ? 'Analizando...' : 'Generar Preguntas Clave con IA'}</span>
            </button>
          </div>

          {/* AI suggested questions drawer if available */}
          {suggestedQuestions.length > 0 && (
            <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs">
              <p className="font-bold text-amber-900 mb-2 flex items-center">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 mr-1.5" />
                Preguntas recomendadas para formular al colaborador en vivo:
              </p>
              <div className="space-y-2">
                {suggestedQuestions.map((q, idx) => (
                  <div key={idx} className="bg-white p-2.5 rounded-lg border border-amber-200">
                    <span className="font-bold text-amber-800 text-[11px] block">{q.categoria}:</span>
                    <span className="text-slate-800 font-medium">{q.pregunta}</span>
                    <span className="text-slate-500 text-[10px] block mt-0.5">Propósito: {q.objetivo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            <div className="absolute right-3 top-3">
              <button
                type="button"
                onClick={() => toggleSpeechRecognition('notas')}
                className={`text-xs px-2.5 py-1 rounded-md flex items-center space-x-1 shadow-sm transition ${
                  isRecording && activeSpeechField === 'notas'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                {isRecording && activeSpeechField === 'notas' ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-orange-600" />}
                <span>{isRecording && activeSpeechField === 'notas' ? 'Detener Grabación' : 'Dictar por Voz'}</span>
              </button>
            </div>
            <textarea
              rows={5}
              value={formData.notasEntrevista}
              onChange={(e) => setFormData({ ...formData, notasEntrevista: e.target.value })}
              placeholder="Escribe o pega aquí todo lo que te contó el colaborador en la entrevista informal. No te preocupes por el orden o la redacción técnica, la IA convertirá esto en un documento ISO 9001 formal..."
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg p-3 pt-10 text-slate-900 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono transition"
            />
          </div>
        </div>

        {/* Action Button: Generate Full Manual */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-slate-900 rounded-2xl text-white shadow-xl gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center">
              <Zap className="w-5 h-5 text-orange-400 mr-2" />
              ¿Listo para estructurar el Manual Lean Six Sigma?
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              La IA consolidará las respuestas, calculará la Matriz RACI, el SIPOC, identificará desperdicios Muda y redactará las políticas oficiales.
            </p>
          </div>

          <button
            type="submit"
            disabled={isGenerating}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-xl shadow-lg shadow-orange-500/30 transition active:scale-95 disabled:opacity-50 text-sm"
          >
            <Sparkles className="w-5 h-5" />
            <span>{isGenerating ? 'Generando Manual Lean Six Sigma...' : 'Generar Manual Completo con IA'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
