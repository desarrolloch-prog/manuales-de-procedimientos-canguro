# Auto-Guardado Inteligente a 5s y Diferenciación de Estado de Sincronización en Google Drive

Sistema de guardado automático reactivo tras 5 segundos de inactividad en la edición, con alternador en el panel de Google Drive e indicadores visuales contextuales de "Sincronizado en Drive" frente a "Guardado localmente" en la barra de herramientas superior y en el centro de sincronización.

## User Review & Critical Decisions

> [!IMPORTANT]
> A continuación se detallan las decisiones confirmadas por el usuario durante la fase de aclaración y la arquitectura visual acordada:

- **Ubicación de los Indicadores de Estado**: Se implementará tanto en la barra superior (junto al botón principal "Guardar") como dentro de la tarjeta de Google Drive, ofreciendo visibilidad inmediata sin obligar a cambiar de vista.
- **Flujo de Auto-Guardado**: Tras detectar 5 segundos continuos sin actividad de tipeo, el sistema guarda de forma segura en la base de datos local (`manualsDatabase` en `localStorage`) y, si la sesión de Google Drive está activa y el auto-guardado está habilitado en su interruptor, procede de inmediato a sincronizar la copia oficial en la nube.
- **Micro-Retroalimentación No Intrusiva**: Se sustituyen los toasts flotantes repetitivos cada 5 segundos por indicadores de estado estables con tipografía limpia, iconos de estado animados (`Loader2` durante el guardado) y badges sutiles (`CloudCheck` vs `CheckCircle2`) con marcas de tiempo relativas.

---

## 1. Overview & Core Concept

- **What It Does**: Monitorea los cambios continuos del usuario mientras redacta o ajusta normas, criterios, metadatos y glosarios. Si transcurren 5 segundos sin pulsaciones de teclas, ejecuta un guardado debounce no bloqueante en la base de datos local y, si la opción de auto-guardado de Drive está encendida y hay token activo, sincroniza automáticamente el archivo en Google Drive sin interrumpir el flujo de trabajo ni desplegar alertas invasivas.
- **Target Audience / Persona**: Analistas de procesos, directores de área y redactores técnicos de Districueros El Canguro C.A. que necesitan redactar manuales extensos con la tranquilidad de que su avance nunca se perderá ante cortes de conexión o cierres accidentales.
- **Key Value**: Elimina la fricción del guardado manual repetitivo, protege contra pérdidas de datos y proporciona transparencia absoluta entre lo que está seguro en el almacenamiento del navegador y lo que ya se encuentra respaldado en la nube corporativa de Google Drive.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Activación del Auto-Guardado en el Panel Drive**:
   - El usuario abre la pestaña o panel de sincronización de Google Drive.
   - Encuentra una nueva sección de configuración con un interruptor toggle (`Switch`) claramente etiquetado: *"Auto-guardado tras 5 segundos de inactividad"*.
   - Debajo del interruptor se detalla: *"Guarda en la base de datos local y sincroniza automáticamente con tu carpeta oficial en Google Drive"*. El estado se persiste en `localStorage` (`canguro_drive_autosave_enabled`).

2. **Edición Activa con Detección de Pausa (5s)**:
   - Al escribir en cualquier sección del manual, el indicador de la barra superior muestra un punto ámbar sutil: `● Cambios pendientes...`.
   - Si el usuario continúa escribiendo, el temporizador de 5 segundos se reinicia automáticamente.
   - Tras 5 segundos de inactividad:
     - El indicador transiciona a `Guardando...` con un spinner discreto de 12px.
     - Guarda en la base local: si Google Drive no está conectado o el interruptor está apagado, el indicador cambia a `✓ Guardado localmente` (gris neutro corporativo/zinc).
     - Si Google Drive está vinculado y activo: el sistema ejecuta la sincronización en segundo plano y transiciona a `☁ Sincronizado en Drive (11:42)` con icono verde esmeralda y marca de tiempo.

3. **Verificación en el Panel de Google Drive**:
   - Dentro de la tarjeta de sincronización, una barra de estado visual muestra los dos niveles:
     - **Almacenamiento Local**: `✓ Guardado localmente en este equipo`.
     - **Google Drive**: `☁ Sincronizado con Drive` (con fecha y hora exacta del último respaldo) o `⚠ Pendiente de sincronizar a Drive` si hay cambios locales no subidos.

### Visual Identity & Theme Tokens

- **Alineación con la Constitución Visio Canguro**:
  - Se prohíbe el uso de "candy pills" o badges flotantes con bordes gruesos. La información de estado se presenta como texto refinado con iconos SVG nítidos y separadores tipográficos (`·`).
  - **Estado "Guardando / Sincronizando"**: Texto `text-zinc-500` con `Loader2` giratorio de 13px.
  - **Estado "Guardado localmente"**: Icono `CheckCircle2` o `Database` en `text-zinc-600` acompañado del texto `"Guardado localmente"` y hora en formato `tabular-nums`.
  - **Estado "Sincronizado en Drive"**: Icono `CloudCheck` en `text-emerald-700` sobre fondo sutil `bg-emerald-50/70 border border-emerald-200/60` con texto `"Sincronizado con Drive"`.
  - **Interruptor Toggle**: Interruptor ergonómico estilo iOS/macOS con track `bg-zinc-200` y estado activo `bg-amber-400 border border-amber-500` acorde con la identidad corporativa amarilla de El Canguro.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Temporizador de 5 Segundos (Debounce Inteligente)
- **Chosen Approach**: `useRef` con `clearTimeout` en cada mutación de `manualData`, narrativa, o campos de control que tengan `hasUnsavedChanges = true`.
- **Why**: 5 segundos es el estándar óptimo de la industria (similar a Google Docs o Notion) para evitar saturar las cuotas de la API de Google Drive mientras el redactor sigue componiendo oraciones complejas.
- **Alternatives Considered**: Guardado a 1 segundo (agotaría rápidamente las cuotas de Google Drive y provocaría bloqueos por generación repetitiva de PDF) o guardado periódico a 30 segundos (demasiado lento si se cierra la pestaña inesperadamente).

### Decision 2: Guardado en Dos Niveles (Local Primero, Drive Opcional)
- **Chosen Approach**: El auto-guardado local a `localStorage` siempre se ejecuta de forma sincrónica e inmediata tras los 5 segundos. La sincronización a Drive ocurre como promesa asincrónica paralela si la sesión está autenticada.
- **Why**: Asegura una latencia de 0 ms en la interfaz y garantiza que el usuario nunca pierda trabajo si se cae la conexión a internet.
- **Alternatives Considered**: Bloquear la edición hasta recibir la respuesta de la API de Google Drive (descartado por degradar la experiencia de usuario).

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        App.tsx (Main State)                            │
│  - manualData / narrative / fullCode (Editing State)                  │
│  - hasUnsavedChanges: boolean                                          │
│  - autoSaveEnabled: boolean (localStorage: 'canguro_drive_autosave')   │
│  - syncStatus: 'idle' | 'pending' | 'saving_local' | 'syncing_drive'   │
│                | 'saved_local' | 'synced_drive' | 'error'              │
│  - lastDriveSyncTimestamp: string                                      │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
         5s Debounce Timer                     State & Handlers
                    │                                │
                    ▼                                ▼
┌─────────────────────────────────────┐  ┌───────────────────────────────┐
│       Auto-Save Engine (App.tsx)    │  │  Top Ribbon (RibbonToolbar)   │
│  1. Reset timer on key stroke       │  │  - [Guardar] Button           │
│  2. On 5s idle:                     │  │  - Status Indicator:          │
│     a. Save to manualsDatabase      │  │    "☁ Sincronizado en Drive"  │
│     b. If Drive connected & enabled:│  │    vs "Guardado localmente"   │
│        upload to Google Drive       │  └───────────────────────────────┘
└───────────────────┬─────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             GoogleDriveSyncCard.tsx (Sync Control Center)              │
│  - Toggle Switch: "Auto-guardado cada 5s al escribir"                  │
│  - Sync Matrix: Local Database status vs Google Drive status           │
│  - Manual full sync buttons & Google Auth controls                     │
└────────────────────────────────────────────────────────────────────────┘
```

### Component & State Mapping

1. **`src/components/RibbonToolbar.tsx`**:
   - Añadir prop `syncStatus`: `'idle' | 'pending' | 'saving_local' | 'syncing_drive' | 'saved_local' | 'synced_drive' | 'error'`.
   - Añadir prop `lastSyncTime`: `string`.
   - Renderizar el componente `<SyncStatusIndicator status={syncStatus} lastSyncTime={lastSyncTime} />` a la izquierda del botón `Guardar`, optimizado para no romper el margen de 1440px ni empujar los botones de exportación Word/PDF.

2. **`src/components/GoogleDriveSyncCard.tsx`**:
   - Añadir prop `autoSaveDriveEnabled`: `boolean`.
   - Añadir prop `onToggleAutoSaveDrive`: `(enabled: boolean) => void`.
   - Añadir prop `syncStatus`: estado actual de sincronización.
   - Renderizar el bloque de configuración de guardado automático con interruptor toggle estilo corporativo.
   - Renderizar la tarjeta informativa comparativa de dos columnas: *"Estado en este equipo"* vs *"Estado en Google Drive"*.

3. **`src/App.tsx`**:
   - Crear estado `autoSaveDriveEnabled` inicializado desde `localStorage.getItem('canguro_drive_autosave_enabled') !== 'false'`.
   - Crear estado `syncStatus` con ciclo de vida completo:
     - Mutación detectada -> `'pending'` (5s timer activo).
     - Al expirar 5s -> `'saving_local'` -> guarda en `manualsDatabase` -> `'saved_local'`.
     - Si token + autoSaveDriveEnabled -> `'syncing_drive'` -> `syncSingleManualToGoogleDrive` -> `'synced_drive'`.
   - Conectar los nuevos handlers a `RibbonToolbar` y `GoogleDriveSyncCard`.
