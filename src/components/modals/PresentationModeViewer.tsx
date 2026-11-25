import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  Maximize2,
  Minimize2,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  HeaderTable,
  Page1EditableLayout,
  Page2EditableBlock,
  SubsequentPageEditable,
  OfficialSignaturesFooter,
  renderFormattedIntermediateContent
} from '../views/ManualDocumentPages';
import { SectionPillBanner, PaginatedContentSections } from '../ManualPageRenderer';
import { ErrorBoundary } from '../ErrorBoundary';
import type { SignerSlot } from '../../types/processManual';
import type { PaginatedPage } from '../../utils/paginate';
import type { ManualData } from '../../types/processManual';
import type { ApprovalAreaRecord as ApprovalArea } from '../../shared';

export function PresentationModeViewer({
  fullCode,
  version,
  classification,
  processName,
  direction,
  emisionDate,
  actualizacionDate,
  editableDoc,
  approvalAreas,
  signers,
  selectedFont,
  selectedFontSize,
  selectedLineHeight,
  slideIndex,
  onSlideChange,
  onClose,
  pages = [],
  manualData
}: {
  fullCode: string;
  version: string;
  classification: string;
  processName: string;
  direction: string;
  emisionDate: string;
  actualizacionDate: string;
  editableDoc: {
    objetivo: string;
    alcance: string;
    versionDesc: string;
    clasificacion: string;
    flowSteps: string[];
    ownerArea: string;
    directionArea: string;
    trainingArea: string;
    pages: string[];
  };
  approvalAreas: ApprovalArea[];
  signers: SignerSlot[];
  selectedFont: string;
  selectedFontSize: string;
  selectedLineHeight: string;
  slideIndex: number;
  onSlideChange: (idx: number) => void;
  onClose: () => void;
  pages?: PaginatedPage[];
  manualData?: ManualData;
}) {
  const totalSlides = Math.max(1, pages.length > 0 ? pages.length : 1 + editableDoc.pages.length);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    try {
      return typeof document !== 'undefined' && !!document.fullscreenElement;
    } catch {
      return false;
    }
  });
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1240,
    height: typeof window !== 'undefined' ? window.innerHeight : 830
  }));

  const safeExitFullscreen = () => {
    try {
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        const p = document.exitFullscreen();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      }
    } catch {
      // Safe ignore
    }
  };

  const safeRequestFullscreen = () => {
    try {
      if (typeof document !== 'undefined' && document.fullscreenEnabled && !document.fullscreenElement) {
        const p = document.documentElement.requestFullscreen();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      }
    } catch {
      // Safe ignore
    }
  };

  const handleExit = () => {
    safeExitFullscreen();
    onClose();
  };

  const toggleFullscreen = () => {
    try {
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        safeExitFullscreen();
      } else {
        safeRequestFullscreen();
      }
    } catch {
      // Safe ignore
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      try {
        setIsFullscreen(typeof document !== 'undefined' && !!document.fullscreenElement);
      } catch {
        setIsFullscreen(false);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('fullscreenchange', handleFsChange);
    }

    const handleResize = () => {
      if (typeof window !== 'undefined') {
        setViewportSize({
          width: window.innerWidth,
          height: window.innerHeight
        });
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('fullscreenchange', handleFsChange);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        onSlideChange(Math.min(totalSlides - 1, slideIndex + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        onSlideChange(Math.max(0, slideIndex - 1));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleExit();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slideIndex, totalSlides, onSlideChange, onClose]);

  // Referencia a la lámina activa para medición precisa de altura renderizada
  const slideRef = useRef<HTMLDivElement | null>(null);
  const [slideHeight, setSlideHeight] = useState<number>(840);

  // useLayoutEffect y ResizeObserver para medir la altura real renderizada de la lámina activa
  useLayoutEffect(() => {
    const el = slideRef.current;
    if (!el) return;

    const measureHeight = () => {
      if (el) {
        const realHeight = Math.max(840, el.scrollHeight || el.offsetHeight || 840);
        setSlideHeight(realHeight);
      }
    };

    measureHeight();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        measureHeight();
      });
      ro.observe(el);
    }

    return () => {
      if (ro) ro.disconnect();
    };
  }, [slideIndex, editableDoc.pages, approvalAreas, signers, viewportSize]);

  // Dimensiones canónicas y factor de escala dinámico en función de la altura real de esa página específica (Estándar Visio A4: 1120 x 792 px)
  const realWidth = 1120;
  const realHeight = Math.max(792, slideHeight);
  const availW = typeof window !== 'undefined' ? window.innerWidth - 40 : viewportSize.width - 40;
  const availH = typeof window !== 'undefined' ? window.innerHeight - 56 : viewportSize.height - 56;
  const scale = Math.min(
    Math.max(0.1, availW / realWidth),
    Math.max(0.1, availH / realHeight)
  );

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 flex items-center justify-center p-0 select-none overflow-hidden group animate-in fade-in duration-150">
      {/* Botones flotantes discretos en la esquina superior derecha (aparecen suavemente al mover el ratón) */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-2.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all shadow-2xl cursor-pointer border border-zinc-700/60"
          title={isFullscreen ? 'Salir de pantalla completa (F)' : 'Pantalla completa (F)'}
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
        <button
          type="button"
          onClick={handleExit}
          className="p-2.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all shadow-2xl cursor-pointer border border-zinc-700/60"
          title="Salir de la presentación (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Flechas de navegación laterales discretas y flotantes */}
      {slideIndex > 0 && (
        <button
          type="button"
          onClick={() => onSlideChange(Math.max(0, slideIndex - 1))}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-zinc-900/60 hover:bg-zinc-800 text-white/70 hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-80 hover:!opacity-100 shadow-2xl cursor-pointer border border-zinc-700/60"
          title="Página anterior (←)"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
      )}

      {slideIndex < totalSlides - 1 && (
        <button
          type="button"
          onClick={() => onSlideChange(Math.min(totalSlides - 1, slideIndex + 1))}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-zinc-900/60 hover:bg-zinc-800 text-white/70 hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-80 hover:!opacity-100 shadow-2xl cursor-pointer border border-zinc-700/60"
          title="Página siguiente (→ o Espacio)"
        >
          <ChevronRight className="w-7 h-7" />
        </button>
      )}

      {/* Indicador discreto y sutil de página actual (solo visible al pasar el ratón) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-50 opacity-0 group-hover:opacity-75 transition-opacity duration-200 bg-zinc-900/90 text-zinc-300 text-[11px] font-mono px-3 py-1 rounded-full border border-zinc-700/60 pointer-events-none shadow-md">
        Pág. {slideIndex + 1} de {totalSlides}
      </div>

      {/* HOJA DEL MANUAL ESCALADA PROPORCIONALMENTE (ESTÁNDAR VISIO A4: 1120px x auto, minHeight: 792px): CERO CORTES */}
      <div
        ref={slideRef}
        key={`presentation-slide-${slideIndex}`}
        style={{
          width: '1120px',
          minHeight: '792px',
          height: 'auto',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          flexShrink: 0
        }}
        className="bg-white text-black shadow-2xl p-5 sm:p-6 flex flex-col justify-between rounded-lg border border-zinc-300 box-border select-text"
      >
        {(() => {
          const activePage = pages && pages[slideIndex];

          if (slideIndex === 0 || activePage?.type === 'portada') {
            return (
              <div className="flex flex-col justify-between h-full min-h-[792px]">
                <div className="shrink-0">
                  <HeaderTable
                    pageNumber={1}
                    totalPages={totalSlides}
                    code={fullCode}
                    version={version}
                    classification={classification}
                    processName={processName}
                    direction={direction}
                    emisionDate={emisionDate}
                    actualizacionDate={actualizacionDate}
                  />
                </div>
                <div className="flex-1 px-1 py-1 text-black text-xs sm:text-[13px] leading-relaxed">
                  <Page1EditableLayout
                    doc={editableDoc}
                    approvalAreas={approvalAreas}
                    isEditing={false}
                    onUpdateField={() => {}}
                    onAddStep={() => {}}
                    onRemoveStep={() => {}}
                    onUpdateStep={() => {}}
                    onAddApprovalArea={() => {}}
                    onRemoveApprovalArea={() => {}}
                    onUpdateApprovalArea={() => {}}
                  />
                </div>
                <div className="shrink-0 mt-3">
                  <OfficialSignaturesFooter
                    signers={signers}
                    isEditing={false}
                    onUpdateSigner={() => {}}
                    onUploadSignature={() => {}}
                    onResetSigner={() => {}}
                  />
                </div>
              </div>
            );
          }

          if (activePage?.type === 'herramientas_derogados') {
            return (
              <div className="flex flex-col justify-between h-full min-h-[792px]">
                <div className="shrink-0">
                  <HeaderTable
                    pageNumber={2}
                    totalPages={totalSlides}
                    code={fullCode}
                    version={version}
                    classification={classification}
                    processName={processName}
                    direction={direction}
                    emisionDate={emisionDate}
                    actualizacionDate={actualizacionDate}
                  />
                </div>
                <div className="page-body flex-1 py-1">
                  <Page2EditableBlock
                    herramientas={manualData?.herramientas || []}
                    documentosDerogados={manualData?.documentosDerogados || ['N/A']}
                    isEditing={false}
                  />
                </div>
                <div className="shrink-0 mt-3">
                  <OfficialSignaturesFooter
                    signers={signers}
                    isEditing={false}
                    onUpdateSigner={() => {}}
                    onUploadSignature={() => {}}
                    onResetSigner={() => {}}
                  />
                </div>
              </div>
            );
          }

          if (activePage?.type === 'content') {
            return (
              <div className="flex flex-col justify-between h-full min-h-[792px]">
                <div className="shrink-0">
                  <HeaderTable
                    pageNumber={activePage.pageNumber}
                    totalPages={totalSlides}
                    code={fullCode}
                    version={version}
                    classification={classification}
                    processName={processName}
                    direction={direction}
                    emisionDate={emisionDate}
                    actualizacionDate={actualizacionDate}
                  />
                </div>
                <div className="page-body flex-1 py-1">
                  <ErrorBoundary fallbackMessage="Se detectó una inconsistencia de formato en esta página del manual.">
                    <PaginatedContentSections
                      sections={activePage.sections || []}
                      isEditing={false}
                      selectedLineHeight={selectedLineHeight}
                      processName={processName}
                      continuationLabel={manualData?.continuationLabel}
                    />
                  </ErrorBoundary>
                </div>
                <div className="shrink-0 mt-3">
                  <OfficialSignaturesFooter
                    signers={signers}
                    isEditing={false}
                    onUpdateSigner={() => {}}
                    onUploadSignature={() => {}}
                    onResetSigner={() => {}}
                  />
                </div>
              </div>
            );
          }

          if (activePage?.type === 'intermediate') {
            const intData = activePage.intermediateData;
            return (
              <div className="flex flex-col justify-between h-full min-h-[792px]">
                <div className="shrink-0">
                  <HeaderTable
                    pageNumber={activePage.pageNumber}
                    totalPages={totalSlides}
                    code={fullCode}
                    version={version}
                    classification={classification}
                    processName={processName}
                    direction={direction}
                    emisionDate={emisionDate}
                    actualizacionDate={actualizacionDate}
                  />
                </div>
                <div className="page-body flex-1 py-1">
                  <div className="flex-1 flex flex-col justify-start h-full overflow-hidden">
                    <SectionPillBanner
                      number={intData?.sectionNumber || '10'}
                      title={intData?.sectionTitle || 'NORMAS DEL PROCESO'}
                    />
                    <div className="border border-black rounded-[14px] bg-white p-3.5 my-0.5 flex-1 flex flex-col justify-start shadow-2xs overflow-hidden">
                      <h3 className="font-black text-black border-b border-black/30 pb-0.5 mb-1.5 uppercase text-[11.5px]">
                        {intData?.subtitle || 'DISPOSICIONES Y LINEAMIENTOS OPERATIVOS COMPLEMENTARIOS'}
                      </h3>
                      <div
                        className="text-black text-[11px] whitespace-pre-wrap leading-relaxed overflow-y-auto"
                        style={{ lineHeight: selectedLineHeight, fontFamily: selectedFont, fontSize: selectedFontSize }}
                      >
                        {renderFormattedIntermediateContent(intData?.content || '')}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 mt-3">
                  <OfficialSignaturesFooter
                    signers={signers}
                    isEditing={false}
                    onUpdateSigner={() => {}}
                    onUploadSignature={() => {}}
                    onResetSigner={() => {}}
                    onRemoveSigner={() => {}}
                    onAddFifthSigner={() => {}}
                  />
                </div>
              </div>
            );
          }

          // Fallback legacy para editableDoc.pages
          return (
            <div className="flex flex-col justify-between h-full min-h-[792px]">
              <div className="shrink-0">
                <HeaderTable
                  pageNumber={slideIndex + 1}
                  totalPages={totalSlides}
                  code={fullCode}
                  version={version}
                  classification={classification}
                  processName={processName}
                  direction={direction}
                  emisionDate={emisionDate}
                  actualizacionDate={actualizacionDate}
                />
              </div>
              <div className="flex-1 px-1 py-1 text-black text-xs sm:text-[13px] leading-relaxed flex flex-col">
                <SubsequentPageEditable
                  pageIndex={slideIndex - 1}
                  content={editableDoc.pages[slideIndex - 1] || ''}
                  isEditing={false}
                  onUpdateContent={() => {}}
                />
              </div>
              <div className="shrink-0 mt-3">
                <OfficialSignaturesFooter
                  signers={signers}
                  isEditing={false}
                  onUpdateSigner={() => {}}
                  onUploadSignature={() => {}}
                  onResetSigner={() => {}}
                />
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
