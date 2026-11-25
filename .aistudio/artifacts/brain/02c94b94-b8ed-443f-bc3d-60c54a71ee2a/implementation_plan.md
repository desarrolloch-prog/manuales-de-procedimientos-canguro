# Base de Datos de Manuales de Procedimientos y Gestión de Estados [COMPLETADO]

Incorporación completada exitosamente: se creó la pestaña principal dedicada para la Base de Datos de Manuales con catálogo interactivo, métricas, filtros y buscador, gestión de estados (Borrador, En Pruebas, Aprobado), guardado automático continuo en almacenamiento persistente, opción de añadir manual en blanco y eliminación segura con modal de confirmación.

## Decisiones Críticas y Preferencias Confirmadas

> [!IMPORTANT]
> Decisiones confirmadas por el usuario:
> - **Ubicación**: Pestaña principal dedicada en la barra de vistas para consultar y gestionar la base de datos completa.
> - **Flujo de guardado y estados**: Selector de estado (`Borrador`, `En Pruebas`, `Aprobado`) con guardado automático continuo en almacenamiento persistente.

---

## 1. Resumen de Capacidades y Experiencia de Usuario

### A. Pestaña Principal: «Base de Datos de Manuales»
- Integrada en la barra de navegación superior junto a `Manual Oficial` y `Auditoría Lean`.
- Visualización de tabla ejecutiva con:
  - **Código y Versión** (ej. `DTH-GFD-MP-05 v01`).
  - **Nombre del Proceso y Gerencia**.
  - **Dirección Adscrita** y **Director Aprobador**.
  - **Estado**: Selector rápido de estado con colores distintivos (`Borrador` en ámbar, `En Pruebas` en azul cielo, `Aprobado` en verde esmeralda).
  - **Última Actualización / Fecha**.
  - **Acciones**:
    - **Cargar en Editor** (para retomar la edición inmediata con todos sus datos, firmantes y flujos).
    - **Duplicar** (para generar una nueva versión o variación).
    - **Descargar PDF / Word** directo.
    - **Eliminar** (con modal de confirmación).
- **Filtros rápidos y buscador**:
  - Filtro por estado (`Todos`, `Borradores`, `En Pruebas`, `Aprobados`).
  - Filtro por Dirección Adscrita.
  - Buscador en tiempo real por texto o código.
  - Indicadores métricos superiores: Total de manuales, Borradores activos, En Pruebas y Aprobados.

### B. Barra de Acciones del Manual Activo
En la barra de herramientas y en los parámetros:
- **Estado Actual del Manual**: Selector visual interactivo para cambiar entre `Borrador`, `En Pruebas` y `Aprobado`.
- **Indicador de Guardado Automático**: Muestra el estado del guardado continuo («Guardado hace un momento»).
- **Botón «Nuevo en Blanco»**: Limpia los campos y el visor para comenzar un nuevo manual desde cero sin arrastrar datos anteriores.
- **Botón «Eliminar Manual»**: Permite borrar el manual activo o descartar los cambios actuales.

---

## 2. Arquitectura de Datos y Persistencia

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ESTRUCTURA DE DATOS                             │
│                                                                        │
│  ProcessManualRecord {                                                 │
│    id: string;                    // UUID único                        │
│    codigo: string;                // DTH-GFD-MP-XX                     │
│    version: string;               // 01, 02...                         │
│    clasificacion: string;         // Crítico, Estratégico...           │
│    nombre: string;                // Nombre del Proceso                │
│    direccion: string;             // Dirección Adscrita                │
│    directorApprover: string;      // Nombre Director Aprobador         │
│    owner: string;                 // Dueño del Proceso                 │
│    narrative: string;             // Apuntes de la entrevista          │
│    status: 'borrador' | 'pruebas' | 'aprobado';                        │
│    manualMarkdown: string;        // Contenido completo                │
│    leanMarkdown: string;          // Auditoría Lean                    │
│    editableDoc: EditableDoc;      // Estructura editada                │
│    signers: SignerSlot[];         // 5 Firmantes con firmas            │
│    approvalAreas: ApprovalArea[]; // Seccion 6                         │
│    updatedAt: string;             // ISO Date                          │
│    createdAt: string;             // ISO Date                          │
│  }                                                                     │
└────────────────────────────────────────────────────────────────────────┘
```

- **Persistencia**: `localStorage` bajo la clave `canguro_manuals_database_v2` con sincronización en tiempo real.
- **Semilla Inicial**: Se precarga el caso oficial de `LOGÍSTICA INVERSA` como manual `Aprobado` para que la base de datos nunca aparezca vacía al iniciar.

---

## 3. Plan de Implementación por Pasos

1. **Definición de Tipos y Modelo (`src/types/processManual.ts`)**:
   - Crear el modelo extendido `StoredManualRecord` que conserve el estado completo del editor (formulario, firmantes, áreas aprobadora, markdown y páginas editadas).

2. **Hook y Lógica de Base de Datos en `src/App.tsx`**:
   - Estado de lista `manualsDatabase` sincronizado con `localStorage`.
   - Estado de id del manual activo `activeManualId`.
   - Estado de estatus activo: `currentManualStatus` (`'borrador' | 'pruebas' | 'aprobado'`).
   - Función `handleNewBlankManual()`: restablece el editor a un estado limpio en blanco.
   - Función `handleLoadManualFromDb(manual)`: carga un manual guardado restaurando todos sus estados.
   - Función `handleDeleteManualFromDb(id)`: elimina un manual de la base de datos.
   - Función `handleAutoSaveCurrentManual()`: actualiza automáticamente el registro del manual activo tras cada generación o edición.

3. **Componente de Base de Datos / Vista de Catálogo**:
   - Construir la vista de base de datos dentro del flujo de pestañas principales (`activeTab === 'database'`).
   - Métricas resumen, buscador, filtros por estado y dirección, tabla ejecutiva y menú de acciones por registro.

4. **Controles en la Barra Superior y Panel de Parámetros**:
   - Incorporar el selector de estado (`Borrador` / `En Pruebas` / `Aprobado`).
   - Agregar botones `Nuevo en Blanco` y `Eliminar Manual` con confirmación.
   - Pestaña `Base de Datos` con badge que indica la cantidad de manuales registrados.

5. **Verificación**:
   - Ejecutar `compile_applet` y `lint_applet` para garantizar cero errores de TypeScript y compilación.
