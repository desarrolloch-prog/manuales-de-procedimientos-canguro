import React, { useState, useRef } from 'react';
import {
  X,
  Save,
  RotateCcw,
  Settings,
  ShieldCheck,
  FileCode,
  Check,
  Upload,
  Trash2,
  Users,
  Building2,
  Eye,
  Info,
  Plus
} from 'lucide-react';
import type { SignerSlot } from '../App';
import { getOfficialSignatureFallback } from '../utils/officialSignatures';

export interface DirectorConfigItem {
  directionName: string;
  directorName: string;
  signatureUrl: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  codePrefix: string;
  onSavePrefix: (newPrefix: string) => void;
  signersConfig: SignerSlot[];
  onSaveSigners: (newSigners: SignerSlot[]) => void;
  directorsDirectory: Record<string, DirectorConfigItem>;
  onSaveDirectorsDirectory: (newDir: Record<string, DirectorConfigItem>) => void;
  availableDirections: string[];
  defaultTrainingArea: string;
  onSaveTrainingArea: (val: string) => void;
  onResetDefaults: () => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onApplyToCurrentManual?: (
    updatedSigners: SignerSlot[],
    updatedPrefix: string,
    updatedTrainingArea: string,
    updatedDirectors: Record<string, DirectorConfigItem>
  ) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  codePrefix,
  onSavePrefix,
  signersConfig,
  onSaveSigners,
  directorsDirectory,
  onSaveDirectorsDirectory,
  availableDirections,
  defaultTrainingArea,
  onSaveTrainingArea,
  onResetDefaults,
  onShowToast,
  onApplyToCurrentManual
}) => {
  const [activeTab, setActiveTab] = useState<'signers' | 'directors' | 'corporate'>('signers');
  const [localPrefix, setLocalPrefix] = useState<string>(codePrefix);
  const [localTrainingArea, setLocalTrainingArea] = useState<string>(defaultTrainingArea || 'Gerencia de Formación y Desarrollo');
  const [localSigners, setLocalSigners] = useState<SignerSlot[]>(() =>
    signersConfig.map((s) => ({ ...s }))
  );
  const [localDirectors, setLocalDirectors] = useState<Record<string, DirectorConfigItem>>(() => {
    const copy: Record<string, DirectorConfigItem> = {};
    availableDirections.forEach((dir) => {
      copy[dir] = directorsDirectory[dir]
        ? { ...directorsDirectory[dir] }
        : { directionName: dir, directorName: '', signatureUrl: '' };
    });
    return copy;
  });
  const [applyImmediately, setApplyImmediately] = useState<boolean>(true);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Referencias para carga de archivos
  const signerFileInputRef = useRef<HTMLInputElement | null>(null);
  const [targetSignerIdForUpload, setTargetSignerIdForUpload] = useState<string>('');
  
  const directorFileInputRef = useRef<HTMLInputElement | null>(null);
  const [targetDirectionForUpload, setTargetDirectionForUpload] = useState<string>('');

  if (!isOpen) return null;

  // Manejo de cambios en firmantes
  const handleSignerChange = (id: string, field: 'name' | 'position' | 'roleLabel', value: string) => {
    setLocalSigners((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  // Carga de firma gráfica para firmante
  const handleTriggerUploadSigner = (signerId: string) => {
    setTargetSignerIdForUpload(signerId);
    if (signerFileInputRef.current) {
      signerFileInputRef.current.value = '';
      signerFileInputRef.current.click();
    }
  };

  const handleSignerFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetSignerIdForUpload) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('Por favor selecciona una imagen válida (.png, .jpg, .webp)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        setLocalSigners((prev) =>
          prev.map((s) =>
            s.id === targetSignerIdForUpload
              ? { ...s, signatureUrl: dataUrl }
              : s
          )
        );
        onShowToast('Firma digital cargada con éxito', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetSignerSignature = (signerId: string) => {
    setLocalSigners((prev) =>
      prev.map((s) => {
        if (s.id === signerId) {
          return {
            ...s,
            signatureUrl: s.defaultSignatureUrl || ''
          };
        }
        return s;
      })
    );
    onShowToast('Firma restaurada a la versión predeterminada', 'info');
  };

  const handleRemoveSignerSignature = (signerId: string) => {
    setLocalSigners((prev) =>
      prev.map((s) => (s.id === signerId ? { ...s, signatureUrl: '' } : s))
    );
  };

  const handleRemoveSignerSlot = (signerId: string) => {
    if (localSigners.length <= 4) {
      onShowToast('El manual debe contar con al menos 4 firmantes.', 'info');
      return;
    }
    setLocalSigners((prev) => prev.filter((s) => s.id !== signerId));
    onShowToast('Cuadro de firma eliminado (Modo 4 Firmantes activo).', 'info');
  };

  const handleRestoreFifthSigner = () => {
    if (localSigners.length >= 5) return;
    const fifth: SignerSlot = {
      id: 'aprobado2',
      roleLabel: 'Aprobado por',
      name: 'Jeanette Arvelo',
      position: 'Director de Talento Humano',
      signatureUrl: getOfficialSignatureFallback('Jeanette Arvelo', 'aprobado2'),
      defaultSignatureUrl: getOfficialSignatureFallback('Jeanette Arvelo', 'aprobado2'),
      defaultName: 'Jeanette Arvelo',
      defaultPosition: 'Director de Talento Humano'
    };
    setLocalSigners((prev) => [...prev, fifth]);
    onShowToast('5º Firmante restaurado (Jeanette Arvelo - Talento Humano).', 'success');
  };

  // Manejo de Directores por Área (Puesto 4)
  const handleDirectorNameChange = (directionName: string, newDirectorName: string) => {
    setLocalDirectors((prev) => ({
      ...prev,
      [directionName]: {
        ...(prev[directionName] || { directionName, signatureUrl: '' }),
        directorName: newDirectorName
      }
    }));
  };

  const handleTriggerUploadDirector = (directionName: string) => {
    setTargetDirectionForUpload(directionName);
    if (directorFileInputRef.current) {
      directorFileInputRef.current.value = '';
      directorFileInputRef.current.click();
    }
  };

  const handleDirectorFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetDirectionForUpload) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('Por favor selecciona una imagen válida (.png, .jpg)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        setLocalDirectors((prev) => ({
          ...prev,
          [targetDirectionForUpload]: {
            ...(prev[targetDirectionForUpload] || { directionName: targetDirectionForUpload, directorName: '' }),
            signatureUrl: dataUrl
          }
        }));
        onShowToast(`Firma registrada para Director de ${targetDirectionForUpload}`, 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveDirectorSignature = (directionName: string) => {
    setLocalDirectors((prev) => ({
      ...prev,
      [directionName]: {
        ...(prev[directionName] || { directionName, directorName: '' }),
        signatureUrl: ''
      }
    }));
  };

  // Guardar todo
  const handleSaveAll = () => {
    const trimmedPrefix = localPrefix.trim() ? localPrefix.trim() : 'DTH-GFD-MP-';
    onSavePrefix(trimmedPrefix);
    onSaveSigners(localSigners);
    onSaveDirectorsDirectory(localDirectors);
    onSaveTrainingArea(localTrainingArea);

    if (applyImmediately && onApplyToCurrentManual) {
      onApplyToCurrentManual(localSigners, trimmedPrefix, localTrainingArea, localDirectors);
    }

    setSavedSuccess(true);
    onShowToast('Configuración y firmas guardadas correctamente', 'success');
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const handleResetToDefaults = () => {
    if (window.confirm('¿Deseas restablecer las firmas, codificación y directores a los valores oficiales de Districueros El Canguro C.A.?')) {
      onResetDefaults();
      setLocalPrefix('DTH-GFD-MP-');
      setLocalTrainingArea('Gerencia de Formación y Desarrollo');
      onShowToast('Valores y firmas oficiales restaurados a los parámetros de fábrica', 'info');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Input oculto para subir firmas de firmantes */}
        <input
          ref={signerFileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleSignerFileSelected}
          className="hidden"
        />

        {/* Input oculto para subir firmas de directores */}
        <input
          ref={directorFileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleDirectorFileSelected}
          className="hidden"
        />

        {/* Cabecera del modal */}
        <div className="px-5 py-3.5 bg-zinc-900 text-white flex items-center justify-between border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-black flex items-center justify-center font-bold shadow-xs">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Configuración del Sistema y Firmas
              </h2>
              <p className="text-[11px] text-zinc-400">
                Codificación corporativa, cuadro de firmas y catálogo oficial de directores
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de Navegación Interna */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-zinc-200 bg-zinc-50 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('signers')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'signers'
                ? 'border-amber-500 text-zinc-950 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${activeTab === 'signers' ? 'text-amber-500' : 'text-zinc-400'}`} />
            <span>Firmantes y Firmas Digitales ({localSigners.length} Cuadros)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('directors')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'directors'
                ? 'border-amber-500 text-zinc-950 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Users className={`w-3.5 h-3.5 ${activeTab === 'directors' ? 'text-amber-500' : 'text-zinc-400'}`} />
            <span>Directores por Área (Puesto 4 Dinámico)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('corporate')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'corporate'
                ? 'border-amber-500 text-zinc-950 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <FileCode className={`w-3.5 h-3.5 ${activeTab === 'corporate' ? 'text-amber-500' : 'text-zinc-400'}`} />
            <span>Codificación y Parámetros</span>
          </button>
        </div>

        {/* Cuerpo scrolleable del modal */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* PESTAÑA 1: CUADRO DE FIRMANTES Y FIRMAS DIGITALES */}
          {activeTab === 'signers' && (
            <div className="space-y-4">
              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-950">
                  <strong>Gestión de Firmas Oficiales:</strong> Aquí puedes cambiar los nombres, cargos y las imágenes de las firmas digitales de cada puesto. Puedes alternar entre <strong>5 firmantes (estándar)</strong> o <strong>4 firmantes</strong> para eliminar la duplicidad en la Dirección de Talento Humano.
                </div>
              </div>

              {/* Barra de control para 4 vs 5 firmantes */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-100 p-2.5 rounded-xl border border-zinc-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-800">
                    Cuadros Activos: <span className="font-black text-amber-700">{localSigners.length} Firmantes</span>
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    ({localSigners.length === 4 ? 'Ajustados al 25% de ancho en el documento' : 'Ajustados al 20% de ancho en el documento'})
                  </span>
                </div>
                {localSigners.length === 4 ? (
                  <button
                    type="button"
                    onClick={handleRestoreFifthSigner}
                    className="bg-amber-400 hover:bg-amber-300 text-black font-black text-xs px-2.5 py-1 rounded-md flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Restaurar 5º Firmante (Talento Humano)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRemoveSignerSlot(localSigners[localSigners.length - 1].id)}
                    className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs px-2.5 py-1 rounded-md flex items-center justify-center gap-1.5 cursor-pointer transition"
                    title="Eliminar el 5º cuadro de firma para quedar con 4 firmantes"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar 1 cuadro (Usar 4 Firmantes)</span>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {localSigners.map((signer, idx) => {
                  const isSlot4 = signer.id === 'aprobado1';
                  const hasCustomSignature = !!signer.signatureUrl && signer.signatureUrl !== signer.defaultSignatureUrl;

                  return (
                    <div
                      key={signer.id}
                      className="p-3 bg-zinc-50/80 border border-zinc-200 rounded-xl space-y-3 hover:border-zinc-300 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-zinc-200 text-zinc-800 font-black text-[10px] uppercase font-mono">
                            Puesto #{idx + 1}
                          </span>
                          <input
                            type="text"
                            value={signer.roleLabel}
                            onChange={(e) => handleSignerChange(signer.id, 'roleLabel', e.target.value)}
                            className="text-xs font-black text-zinc-900 bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-amber-400 outline-none"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          {isSlot4 && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              Dinámico según Dirección Adscrita
                            </span>
                          )}

                          {localSigners.length > 4 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSignerSlot(signer.id)}
                              className="text-red-600 hover:text-red-800 text-[10px] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                              title="Eliminar este cuadro de firma (quedar en 4 firmantes)"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Eliminar</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                        {/* Nombre y Cargo */}
                        <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold uppercase text-zinc-500 mb-0.5">
                              Nombre Completo
                            </label>
                            <input
                              type="text"
                              value={signer.name}
                              onChange={(e) => handleSignerChange(signer.id, 'name', e.target.value)}
                              placeholder="Nombre y Apellido"
                              className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-bold text-zinc-900 outline-none focus:border-amber-400"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold uppercase text-zinc-500 mb-0.5">
                              Cargo Oficial
                            </label>
                            <input
                              type="text"
                              value={signer.position}
                              onChange={(e) => handleSignerChange(signer.id, 'position', e.target.value)}
                              placeholder="Cargo oficial"
                              className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-900 outline-none focus:border-amber-400"
                            />
                          </div>
                        </div>

                        {/* Visualización y Carga de Firma Digital */}
                        <div className="md:col-span-5 flex items-center justify-between gap-2 p-1.5 bg-white rounded-lg border border-zinc-200">
                          {/* Miniatura de la firma con fondo cuadriculado para transparencia */}
                          <div className="w-20 h-10 bg-zinc-100 rounded border border-zinc-200 flex items-center justify-center p-1 shrink-0 overflow-hidden relative">
                            {signer.signatureUrl || getOfficialSignatureFallback(signer.name, signer.id) ? (
                              <img
                                src={signer.signatureUrl || getOfficialSignatureFallback(signer.name, signer.id)}
                                alt={`Firma ${signer.name}`}
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <span className="text-[9px] text-zinc-400 font-mono">Sin firma</span>
                            )}
                          </div>

                          {/* Acciones de firma */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleTriggerUploadSigner(signer.id)}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded transition cursor-pointer"
                              title="Subir nueva imagen de firma PNG/JPG"
                            >
                              <Upload className="w-3 h-3 text-zinc-600" />
                              <span>Cambiar</span>
                            </button>

                            {signer.defaultSignatureUrl && (
                              <button
                                type="button"
                                onClick={() => handleResetSignerSignature(signer.id)}
                                disabled={signer.signatureUrl === signer.defaultSignatureUrl}
                                className="p-1 text-zinc-500 hover:text-zinc-800 disabled:opacity-30 rounded hover:bg-zinc-100 transition cursor-pointer"
                                title="Restablecer a la firma original del sistema"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {signer.signatureUrl && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSignerSignature(signer.id)}
                                className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50 transition cursor-pointer"
                                title="Quitar firma"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PESTAÑA 2: CATÁLOGO DE DIRECTORES POR DIRECCIÓN (PUESTO 4) */}
          {activeTab === 'directors' && (
            <div className="space-y-4">
              <div className="bg-zinc-100 p-3 rounded-xl border border-zinc-200 flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-zinc-700">
                  <strong>Directorio Oficial de Directores Aprobadores (Puesto 4):</strong> Configura aquí el Director titular y la firma gráfica de cada Dirección. Cuando un manual pertenezca o cambie a una dirección, el puesto 4 de firmas adoptará automáticamente estos datos.
                </div>
              </div>

              <div className="space-y-2.5">
                {availableDirections.map((dirName) => {
                  const dirData = localDirectors[dirName] || {
                    directionName: dirName,
                    directorName: '',
                    signatureUrl: ''
                  };

                  return (
                    <div
                      key={dirName}
                      className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:border-zinc-300 transition"
                    >
                      {/* Nombre de Dirección */}
                      <div className="w-full md:w-56 shrink-0">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase block font-mono">
                          Dirección Adscrita
                        </span>
                        <span className="text-xs font-black text-zinc-900 uppercase truncate block" title={dirName}>
                          {dirName}
                        </span>
                      </div>

                      {/* Nombre del Director */}
                      <div className="flex-1 w-full">
                        <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-0.5">
                          Director Titular Aprobador
                        </label>
                        <input
                          type="text"
                          value={dirData.directorName}
                          onChange={(e) => handleDirectorNameChange(dirName, e.target.value)}
                          placeholder="Ej: Gabriel Saavedra"
                          className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-bold text-zinc-900 outline-none focus:border-amber-400"
                        />
                      </div>

                      {/* Firma del Director */}
                      <div className="flex items-center gap-2 shrink-0 bg-white p-1.5 rounded-lg border border-zinc-200 w-full md:w-auto justify-between md:justify-start">
                        <div className="w-20 h-9 bg-zinc-100 rounded border border-zinc-200 flex items-center justify-center p-1 overflow-hidden">
                          {dirData.signatureUrl ? (
                            <img
                              src={dirData.signatureUrl}
                              alt={`Firma ${dirData.directorName}`}
                              className="max-h-full max-w-full object-contain mix-blend-multiply"
                            />
                          ) : (
                            <span className="text-[9px] text-zinc-400 font-mono">Sin firma</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleTriggerUploadDirector(dirName)}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded transition cursor-pointer"
                            title={`Subir firma para Director de ${dirName}`}
                          >
                            <Upload className="w-3 h-3 text-zinc-600" />
                            <span>Firma</span>
                          </button>

                          {dirData.signatureUrl && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDirectorSignature(dirName)}
                              className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50 transition cursor-pointer"
                              title="Remover firma de este director"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PESTAÑA 3: CODIFICACIÓN Y PARÁMETROS CORPORATIVOS */}
          {activeTab === 'corporate' && (
            <div className="space-y-4">
              {/* Prefijo de Codificación */}
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-3">
                <div className="flex items-center gap-2 text-zinc-900 font-bold">
                  <FileCode className="w-4 h-4 text-amber-500" />
                  <span className="text-xs uppercase">1. Prefijo Oficial de Codificación</span>
                </div>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  Define el correlativo corporativo que antecederá al número de cada manual. Ejemplo: <code className="bg-zinc-200 px-1 py-0.5 rounded text-zinc-800 font-mono">GTH-GFD-MP-</code> o <code className="bg-zinc-200 px-1 py-0.5 rounded text-zinc-800 font-mono">DTH-GFD-MP-</code>.
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                      Prefijo de Código
                    </label>
                    <input
                      type="text"
                      value={localPrefix}
                      onChange={(e) => setLocalPrefix(e.target.value)}
                      placeholder="GTH-GFD-MP-"
                      className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg font-mono font-bold text-sm text-zinc-900 outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="shrink-0 bg-white border border-zinc-200 rounded-lg p-2.5 text-center min-w-[120px]">
                    <span className="block text-[9px] font-bold text-zinc-400 uppercase">Vista Previa</span>
                    <span className="font-mono font-black text-xs text-amber-700">
                      {localPrefix.trim() || 'GTH-GFD-MP-'}05
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie de acciones del modal */}
        <div className="px-5 py-3.5 bg-zinc-100 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 rounded-lg transition cursor-pointer"
              title="Restablecer valores y firmas originales de fábrica"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Valores de Fábrica</span>
            </button>

            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 cursor-pointer ml-2">
              <input
                type="checkbox"
                checked={applyImmediately}
                onChange={(e) => setApplyImmediately(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
              />
              <span className="text-[11px]">Aplicar de inmediato al manual actual</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 rounded-lg transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg transition shadow-xs cursor-pointer ${
                savedSuccess
                  ? 'bg-green-600 text-white'
                  : 'bg-amber-400 hover:bg-amber-300 text-zinc-950 border border-amber-500'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>¡Guardado!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Configuración</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
