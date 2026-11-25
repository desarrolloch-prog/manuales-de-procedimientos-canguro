# Plan de Arquitectura: Estandarización y Paginación Determinista DTH-GFD-MP

Refactorización integral del motor de generación, paginación y renderizado de manuales de procedimientos para Canguro Venezuela, sustituyendo la partición heurística por un flujo determinista basado en datos JSON puros, un motor de medición DOM real (`src/utils/paginate.ts`) y estandarización visual estricta en hoja A4 fija de 1120 × 792 px.

---

## Decisiones Críticas y Confirmadas

> [!IMPORTANT]
> - **El LLM no pagina**: Gemini 3.8 Flash devolverá exclusivamente un esquema JSON validado (`application/json`) con las secciones técnicas (Objetivo, Alcance, Flujo, Herramientas, Glosario, Cargos, Criterios y Diagnóstico Lean), eliminando de raíz `===PAGINA_N===` y cualquier corte artificial.
> - **Única Fuente de Verdad para Paginación (`src/utils/paginate.ts`)**: Se eliminan todas las funciones dispersas de partición (`partitionLongNormsPage`, `ensamblarPaginas`, `splitManualIntoPages`). La paginación se calcula midiendo el `offsetHeight` real de los bloques en el DOM contra el espacio disponible de la hoja Visio A4 (`792px - cabecera - pie de firmas`).
> - **Bloques Atómicos que NUNCA se parten**: Cada cargo completo (título + objetivo + responsabilidades), cada término del glosario y cada criterio técnico es una unidad atómica. Si no cabe, pasa completo a la siguiente hoja.
> - **Espaciado compacto estilo Word (1.0)**: Se unifican los bloques de organigrama y se erradican los márgenes inflados entre campos (Objetivo, Responsabilidades, Viñetas), permitiendo selección continua y espaciado compacto (Arial 9.5pt, `line-height: 1.35`).

---

## 1. Arquitectura del Sistema y Flujo de Datos

```
┌────────────────────────────────────────────────────────┐
│                   Entrada / Gemini                     │
│  - server.ts: generateManual con JSON Schema           │
│  - Devuelve ManualData estructurado (sin paginación)   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│          Estado Centralizado (ManualData JSON)         │
│  - App.tsx: editableDoc almacena ManualData            │
│  - Editor WYSIWYG edita directamente el JSON          │
│  - Compatibilidad: parseLegacyMarkdown() para antiguos │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│     Motor Único de Paginación (src/utils/paginate.ts)   │
│  - Mide offsetHeight real de bloques en DOM oculto     │
│  - Altura útil = 792px - Header (86px) - Footer (72px) │
│  - Empaca bloques atómicos (Glosario, Cargos, Criterios)│
│  - Balanceo de última página si ocupación < 35%        │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│  Vista Previa / Pantalla │  │ Exportación PDF / DOCX   │
│  - .page-sheet fija      │  │ - Consume el mismo array │
│    1120x792px            │  │   de páginas paginadas   │
│  - Arial 9.5pt           │  │ - 1 hoja = 1 página A4   │
│  - Sin saltos huérfanos  │  │   sin discrepancias      │
└──────────────────────────┘  └──────────────────────────┘
```

---

## 2. Especificación Técnica por Componente

### 1. `server.ts` (API Backend de Gemini)
- Sustituir `buildCanonicalDraftingPrompt` por un prompt estructurado sin instrucciones de páginas ni separadores `===PAGINA_N===`.
- Configurar Gemini con `responseMimeType: "application/json"` y `responseSchema`:
  ```typescript
  export interface ManualData {
    objetivo: string;
    alcance: string;
    versionDesc: string;
    clasificacion: string;
    flujo: string[];
    areasAprobadoras: { name: string; role: string }[];
    herramientas: string[];
    documentosDerogados: string[];
    glosario: { termino: string; definicion: string }[];
    cargos: {
      nivel: string;
      titulo: string;
      objetivoCargo: string;
      responsabilidades: string[];
    }[];
    criterios: {
      numero: string;
      titulo: string;
      texto: string;
    }[];
    lean: {
      resumen: string;
      hallazgos: string[];
      plan: string[];
      recomendaciones: string[];
    };
  }
  ```
- Eliminar de raíz: `partitionLongNormsPage`, `ensamblarPaginas`, `cleanResponsibilityBolds`, y cualquier inyección o reemplazo de `(CONTINUACIÓN)`.

### 2. Nuevo Módulo `src/utils/paginate.ts`
- Definición de tipos de bloques renderizables:
  - `GlosarioItemBlock` (término + definición)
  - `NormasGobernanzaBlock` (1. Dueño y 2. Seguridad fijas)
  - `CargoOrganigramaBlock` (cargo completo: título + objetivo + lista de responsabilidades compacta)
  - `CriterioTecnicoBlock` (criterio técnico completo: número + título + texto)
- Hook / Función `usePaginateManual(data: ManualData, config: PageConfig)`:
  - Mide con un contenedor oculto calibrado con la misma fuente y ancho de 1120px.
  - Asigna bloques a páginas respetando la altura útil de $792\text{ px} - \text{Header} - \text{Footer} - \text{PillBanner}$.
  - Pág. 1: Siempre fija (Portada: Objetivo, Alcance, Flujo, Versión, Áreas).
  - Pág. 2: Siempre fija (Herramientas Tecnológicas + Documentos Derogados).
  - Pág. 3 en adelante: Glosario (Sección 9) y Normas del Proceso (Sección 10) distribuidos de forma natural y compacta.
  - Si la última página queda con ocupación menor al 35%, rebalancea redistribuyendo los últimos bloques entre las dos páginas finales.
  - Elimina cualquier sufijo textual `(CONTINUACIÓN)`; en páginas siguientes de normas solo se renderiza la píldora limpia `[10] NORMAS DEL PROCESO`.

### 3. Rediseño de Espaciado y Selección (Estilo Word 1.0)
- En `src/index.css`:
  - `.page-sheet`:
    ```css
    width: 1120px;
    height: 792px;
    max-width: 1120px;
    min-height: 792px;
    max-height: 792px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    font-size: 9.5pt !important;
    line-height: 1.35 !important;
    ```
  - Unificar las cajas de cargos del organigrama: en lugar de 6 cajas separadas con márgenes enormes para un mismo cargo, el cargo completo se aloja en un único contenedor con espaciado compacto (estilo párrafo de Word).
  - Habilitar selección continua de texto entre líneas dentro del cargo y de la sección sin desconexiones de cajas discontinuas.
  - Soporte de line-height calibrado a `1.0` / `1.15` / `1.35` desde la barra de herramientas.

### 4. `src/App.tsx` (Refactorización del Consumidor)
- Eliminar:
  - `splitManualIntoPages`
  - `partitionLongNormsPage`
  - Manipulaciones de string `===PAGINA_N===`
- Implementar `parseLegacyMarkdownToManualData()` para migrar manuales guardados anteriormente sin perder información.
- Conectar la renderización de las páginas al resultado estructurado de `src/utils/paginate.ts`.
- Sincronizar el paginador dinámico: cada hoja muestra con precisión `Página X de Total` donde `Total` proviene directamente del cálculo unificado.

### 5. `src/utils/pdfExport.ts` y `src/utils/docxExport.ts`
- Modificar `generateManualPdf` para que capture exactamente las hojas generadas por `paginate.ts` ya montadas en el DOM (o generadas virtualmente), garantizando que el PDF resultante tenga exactamente las mismas páginas, dimensiones y contenido que la vista previa en pantalla.

---

## 3. Plan de Verificación

1. **Prueba 1: Manual Estándar de Almacén / Logística (4 cargos, 8 criterios)**
   - Verificar que se compagine en 5 o 6 páginas limpias sin páginas casi vacías ni términos huérfanos.
2. **Prueba 2: Manual Extenso (6 cargos, 12 criterios)**
   - Verificar que fluya de manera uniforme a 7 u 8 páginas sin partir ningún cargo a la mitad ni cortar firmas.
3. **Prueba 3: Cambio de Interlineado a 1.0**
   - Comprobar en el editor que al seleccionar los bloques del organigrama y aplicar interlineado 1.0 queden estrechamente unidos como en Word, optimizando el espacio vertical y recalculando la paginación de inmediato.
4. **Prueba 4: Descarga en PDF**
   - Descargar el PDF y verificar que cada página mida $297 \times 210\text{ mm}$ (A4 apaisado), que los encabezados y firmas coincidan al 100% con la pantalla y que no exista la palabra `(CONTINUACIÓN)`.
