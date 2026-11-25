# Corrección de Sincronización con Google Drive y Control de Texto (CONTINUACIÓN)

Solución integral y robusta para resolver los errores de conectividad, autorización y permisos en la sincronización con Google Drive (incorporando además respaldo y restauración local directa JSON), y habilitar la edición interactiva y configuración del texto "(CONTINUACIÓN)" tanto directamente en la hoja del manual como desde la barra de herramientas.

## User Review & Critical Decisions

> [!IMPORTANT]
> Decisiones confirmadas por el usuario:
> 1. **Sincronización con Google Drive**: Se atenderán todos los vectores de error reportados (bloqueo de ventanas emergentes, dominios no autorizados, restricciones de permisos 403/404 a carpetas compartidas y fallas de red), complementando con un módulo de Respaldo y Restauración local directa en formato JSON para garantizar cero pérdida de datos.
> 2. **Texto de (CONTINUACIÓN)**: Se implementará tanto la **edición directa in-place en el documento** (haciendo clic y editando el texto en modo edición) como un **control de formato en la barra de herramientas** para alternar estilos predefinidos (ej. "(CONTINUACIÓN)", "(CONT.)", "(PARTE 2)", "(HOJA 2)", o sin sufijo) y persistirlos en el manual.

---

## 1. Overview & Core Concept

1. **Diagnóstico y Reparación de Google Drive**:
   - **Manejo de Autenticación Resiliente**: Soporte multinivel que combina Firebase Auth Popup, Google Identity Services (GIS) directo y modo manual con token Bearer, solventando bloqueos de popup y advertencias de dominio.
   - **Gestión de Carpetas y Permisos (403/404)**: Detección inteligente si la carpeta corporativa predeterminada carece de permisos para la cuenta del usuario actual, activando automáticamente o con un clic la creación/vinculación de una carpeta propia en su Drive (`Manuales Canguro - DTH-GFD-MP`) sin interrumpir el flujo.
   - **Respaldo Local Directo**: Botones para "Exportar Copia de Seguridad JSON" y "Restaurar / Fusionar Copia JSON" en el explorador, permitiendo respaldar y restaurar la base de datos completa de inmediato sin depender exclusivamente de la conexión con Drive.

2. **Edición y Control de "(CONTINUACIÓN)"**:
   - En la actualidad, tanto el encabezado de continuación de la Sección 3 (`3. ESTRUCTURA ORGANIZACIONAL (CONTINUACIÓN)`) como el de la Sección 4 (`4. CRITERIOS TÉCNICOS... (CONTINUACIÓN)`) están codificados como cadenas fijas no editables.
   - Se habilitará `contentEditable` en ambos encabezados durante el modo de edición para que el usuario pueda escribir el texto exacto que desee (o eliminarlo).
   - Se integrará en la barra de herramientas / configuración un selector rápido de estilo de continuación:
     - `Estándar`: "(CONTINUACIÓN)"
     - `Abreviado`: "(CONT.)"
     - `Numerado`: "(PARTE X)" o "(HOJA X)"
     - `Limpio`: Sin etiqueta de continuación
     - `Personalizado`: Texto libre guardado en los metadatos del manual.

---

## 2. User Experience & Visual Design

- **Panel de Sincronización Google Drive (`GoogleDriveSyncCard`)**:
  - Estado de cuenta claro con avatar del usuario de Google, correo y estado de la carpeta.
  - Indicador de errores con diagnósticos legibles en español y acciones de solución en un clic: "Reintentar Conexión", "Crear mi carpeta en Drive", "Descargar Copia Local JSON".
  - Barra de sincronización unificada con selector de "Sincronizar (Subir y Descargar)" y herramientas de respaldo local.
- **Visualizador y Editor de Páginas (`ManualPageRenderer` & `RibbonToolbar`)**:
  - En modo edición, los encabezados de continuación de página en las secciones 3 y 4 contarán con borde punteado ámbar interactivo y foco al hacer clic.
  - En la barra de herramientas (o menú de opciones del documento), se añade un desplegable ergonómico de estilo para "Sufijo de Continuación".

---

## 3. Technical Architecture & Component Flow

```
┌────────────────────────────────────────────────────────┐
│                   App UI & Layout                      │
├───────────────────────────┬────────────────────────────┤
│   GoogleDriveSyncCard     │     RibbonToolbar          │
│   - Firebase / GIS Auth   │     - Toggle Edición       │
│   - 403/404 Folder Repair │     - Selector Continuación│
│   - Backup/Restore JSON   │     - Guardar Manual       │
└─────────────┬─────────────┴──────────────┬─────────────┘
              │                            │
              ▼                            ▼
┌───────────────────────────┐┌───────────────────────────┐
│   googleDriveService.ts   ││  ManualPageRenderer.tsx   │
│ - ensureAccessibleFolder  ││ - Sec 3: Editable Banner  │
│ - Smart Merge Algorithm   ││ - Sec 4: Editable Title   │
│ - Export/Import JSON file ││ - Custom continuationTag  │
└───────────────────────────┘└───────────────────────────┘
```

---

## 4. Plan de Ejecución Técnico

1. **Actualización de `googleDriveService.ts`**:
   - Reforzar el manejo de excepciones de autenticación y errores 401, 403 y 404.
   - Robustecer `ensureAccessibleDriveFolder` para crear automáticamente la carpeta en Drive del usuario cuando la compartida no tenga permisos de escritura.
   - Implementar funciones para exportar la base de datos completa a un archivo `.json` descargable y leer un archivo `.json` importado por el usuario con fusión inteligente (`mergeManualsDatabases`).

2. **Mejoras en `GoogleDriveSyncCard.tsx`**:
   - Incorporar botones directos de "Descargar Respaldo JSON" y "Subir / Fusionar Respaldo JSON".
   - Mejorar los mensajes de error para que indiquen exactamente la causa (ej. falta de permisos en carpeta corporativa) y ofrezcan el botón de solución con un solo clic.

3. **Edición Dinámica de "(CONTINUACIÓN)" en `ManualPageRenderer.tsx`**:
   - Hacer editable el bloque `normas_estructura_continuation` (Sección 3) y el título de continuación de criterios (Sección 4).
   - Permitir guardar el texto personalizado en el estado del manual (`manualData.continuationLabel` o estructura editable).
   - Añadir soporte en `ManualData` y `processManual.ts` para conservar la configuración del sufijo.

4. **Integración en `App.tsx` y `RibbonToolbar.tsx`**:
   - Vincular los manejadores de actualización de texto de continuación.
   - Proveer el selector rápido de formato de continuación en la barra.
   - Verificar la exportación en PDF y DOCX para reflejar fielmente el texto modificado.

5. **Compilación y Verificación**:
   - Ejecutar `compile_applet` y `lint_applet` para garantizar cero errores de sintaxis e importaciones.
