# Plan de Implementación: Canguro Process Engine 4.1

## Resumen Ejecutivo
Con base en los requerimientos del usuario y sus respuestas aclaratorias:
1. **Barra de Herramientas Minimalista Flotante:** Reemplazará la sección pesada de "Accesibilidad & Escala" y "Restablecer Firmas" con una barra compacta, flotante y elegante con controles de navegación rápida (Avanzar/Retroceder entre las 7 páginas, selector directo de página), ajuste dinámico de tamaño de fuente (10pt a 16pt), familia tipográfica (Arial corporativo, Inter, Roboto), interlineado, zoom y menú compacto de acciones (Restablecer firmas, alternar edición Markdown/Visual, exportar PDF).
2. **Corrección de Estado Inicial:** Eliminar la carga automática de un manual predeterminado al abrir la aplicación. La interfaz mostrará un estado inicial limpio e intuitivo ("Esperando generación o carga de manual") y solo renderizará las 7 páginas cuando el usuario haga clic explícitamente en "Generar Manual" o cargue un documento de la base de datos.
3. **Carga y Extracción de Documentos Variables (PDF, JSON, TXT, CSV):** Incorporar un componente de arrastrar y soltar (Drag & Drop) que extraiga el texto de archivos adjuntos y lo integre automáticamente a las notas de la entrevista como contexto enriquecido de entrada para Gemini.
4. **Reescritura Rigurosa del Prompt Normativo ISO 9001 (`server.ts`):** 
   - Redefinir la estructura de extracción y generación con lenguaje técnico empresarial prescriptivo de alta dirección.
   - **Objetivo:** Redacción continua y formal, vinculada directamente a la gestión de calidad, trazabilidad y control de riesgos.
   - **Alcance:** Definición exacta del ciclo de vida del proceso (evento detonante, entradas, transformaciones, sistemas y destinatario final).
   - **Cargos Operativos:** Asignación coherente y no genérica de roles organizacionales reales (Analistas, Coordinadores, Supervisores) con responsabilidades RACI.
   - **Herramientas Oficiales:** Discriminación estricta entre módulos del ERP Odoo, equipos físicos (scanners Zebra/Honeywell, balanzas, impresoras) y canales autorizados.
   - **Parámetros Operativos:** Definición de KPIs, SLAs, tolerancias y frecuencias de revisión.
5. **Mejora del Gestor de Base de Datos:** Búsqueda en tiempo real, filtros por Dirección/Clasificación, exportación e importación rápida.

---

## Fases de Ejecución

### Fase 1: Estado Inicial y Barra de Herramientas Minimalista Flotante (`src/App.tsx`)
- Modificar el estado inicial de `manualMarkdown` y `editableDoc` para que inicien en `null`/vacío cuando no hay manual generado ni seleccionado.
- Diseñar el componente `DocumentToolbarFloating`:
  - Controles de página: `[< Anterior]`, `Página X de 7` con dropdown de salto inmediato a cualquier sección, `[Siguiente >]`.
  - Controles tipográficos: Tamaño de fuente (`-` / `12pt Arial` / `+`), selector de fuentes estándar, zoom (`75%`, `90%`, `100%`, `110%`, `125%`).
  - Menú compacto desplegable: "Restablecer Firmas Originales", "Modo Edición Markdown / Visual", "Exportar PDF Oficial", "Exportar Word".
- Eliminar la barra obsoleta y voluminosa de "ACCESIBILIDAD DE ESCALA".

### Fase 2: Componente de Carga de Archivos Variables (`PDF`, `JSON`, `TXT`, `CSV`)
- Crear `src/components/DocumentAttachmentUploader.tsx`.
- Soporte para lectura inmediata de:
  - Archivos `.json`: parseo legible y formateo estructurado.
  - Archivos `.txt` / `.csv`: lectura de texto plano estructurado.
  - Archivos `.pdf`: extracción de texto mediante worker/lector o endpoint en servidor para garantizar lectura precisa sin dependencias pesadas que rompan el empaquetado.
- Agregar visualización de etiquetas de archivos adjuntos con conteo de palabras y opción de eliminar o inspeccionar texto extraído.
- Inyección del texto extraído en el payload de generación hacia `/api/generate-manual`.

### Fase 3: Rediseño Integral de Prompts Normativos ISO 9001 (`server.ts`)
- Reestructurar el prompt de sistema y de usuario en `server.ts`:
  - **Objetivo Corporativo:** Estricto párrafo continuo sin viñetas, formulado con verbos infinitivos de alto nivel, estableciendo el propósito normativo, alcance de aseguramiento de calidad y mitigación de desviaciones según ISO 9001:2015.
  - **Alcance Operativo Integral:** Límites precisos del proceso: inicio, interacciones departamentales, aplicaciones informáticas (Odoo) y culminación del flujo.
  - **Cargos Operativos Realistas:** Mapeo de cargos coherentes con la estructura de Districueros El Canguro C.A., especificando quién ejecuta, quién supervisa y quién audita.
  - **Herramientas y Tecnologías Oficiales:** Mapeo de software corporativo (ERP Odoo, Google Workspace) y equipos de captura física de datos.
  - **Parámetros y Reglas de Negocio:** Parámetros medibles (tiempos de ciclo, tolerancias de merma, niveles de inventario, SLAs de respuesta).
- Mantener el mecanismo multi-modelo de respaldo resiliente (`gemini-2.5-flash`, `gemini-3.8-flash`, `gemini-2.5-pro`, `gemini-flash-latest`) con timeout de 60s y sin parámetros de `thinkingConfig`.

### Fase 4: Optimización del Gestor de Base de Datos y Experiencia Visual
- Enriquecer la ventana modal de "Base de Datos de Manuales":
  - Buscador predictivo por título, código o área.
  - Filtro por Dirección (DTH, GFD, etc.).
  - Acciones rápidas: Cargar al editor, Duplicar, Exportar JSON y Eliminar.
- Asegurar que la tipografía Arial 12pt, los colores oficiales (`#fed700` y negro puro) y el cuadro de 5 firmas en la página 7 se mantengan milimétricamente conformes al estándar corporativo.

### Fase 5: Pruebas y Validación
- Compilación del proyecto (`compile_applet`).
- Verificación de linter (`lint_applet`).
- Prueba de generación de manual con archivo adjunto y validación de las 7 páginas.
