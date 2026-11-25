# Sincronización Multiusuario Bidireccional de Manuales con Google Drive

Sincronización en la nube bidireccional que permite a cualquier miembro del equipo de Districueros El Canguro C.A. conectarse con su cuenta de Google, descargar la base de datos compartida y subir sus cambios, aplicando una fusión inteligente de versiones basada en marcas de tiempo para garantizar coherencia sin pérdida de información.

---

### Decisiones Críticas y Aprobación del Usuario

> [!IMPORTANT]
> Se han incorporado las respuestas confirmadas en la fase de aclaración para definir el comportamiento exacto del sistema:

- **Mecanismo de Sincronización**: **Sincronización bidireccional con Google Drive**. Los usuarios podrán descargar datos remotos y subir cambios locales con un solo clic.
- **Acceso de Usuarios**: **Cualquier usuario con cuenta de Google** que inicie sesión mediante el botón oficial de Google en la aplicación.
- **Resolución de Conflictos**: **Fusión automática por versión más reciente (`updatedAt`)**. Cuando dos usuarios modifiquen el mismo manual, el sistema comparará los sellos de tiempo ISO para conservar la versión más reciente de cada registro y combinar los manuales nuevos de ambos.

---

## 1. Visión General y Concepto Central

### ¿Qué resuelve?
Hasta ahora, la sincronización solo enviaba datos desde el navegador hacia Google Drive (subida unidireccional). Si otro usuario ingresaba desde otro computador con su cuenta de Google, encontraba su almacenamiento local vacío y no podía descargar la base de datos existente sin sobrescribir o perder información.

Con esta implementación:
1. Cualquier usuario que ingrese con su cuenta de Google puede pulsar **"Sincronizar (Subir y Descargar)"** o **"Descargar de Drive"**.
2. La aplicación descarga el archivo maestro `Base_de_Datos_Manuales_Canguro_CA.json` y los manuales individuales de la carpeta compartida de Google Drive.
3. El motor de fusión combina los manuales locales y los remotos:
   - Incorpora manuales creados por otros colaboradores.
   - Si un manual existe en ambos lados, compara la marca de tiempo `updatedAt` y conserva la versión más reciente.
   - Sube de vuelta el consolidado completo a Google Drive para que todos los usuarios queden inmediatamente actualizados con la misma información.

---

## 2. Experiencia de Usuario y Diseño Visual

### Flujos Clave de Interacción
1. **Inicio de Sesión y Detección de Estado**:
   - En la pestaña de la **Base de Datos**, la tarjeta de Google Drive muestra el perfil activo del usuario (avatar, nombre y correo de Google).
   - Si no está conectado, el botón invita a `"Conectar con Google"`.
2. **Acción de Sincronización Integral (1-Click Sync)**:
   - Botón principal destacado: **"Sincronizar Todo"** (con animación de carga durante la transferencia).
   - Opciones avanzadas desplegables / botones secundarios:
     - **"Descargar de la Nube"**: Descarga y combina los manuales remotos en el almacenamiento local.
     - **"Subir a la Nube"**: Publica todos los cambios locales hacia la carpeta oficial en Google Drive.
3. **Retroalimentación Dinámica de Fusión**:
   - Barra de estado en tiempo real que informa las fases:
     1. *Verificando permisos y listando archivos en Drive...*
     2. *Descargando base de datos remota...*
     3. *Fusionando X manuales (Y locales, Z remotos)...*
     4. *Actualizando archivo maestro en la nube...*
   - Notificación emergente (toast) con resumen claro: *"Sincronización completada: 12 manuales actualizados, 3 nuevos incorporados"*.
4. **Indicador de Estado de Sincronización en la Tabla**:
   - Cada manual en la tabla de la base de datos mostrará un distintivo visual sutil:
     - `Nube (Al día)`: En sincronía con el archivo maestro de Drive.
     - `Modificado localmente`: Ediciones locales pendientes de sincronizar.
5. **Configuración y Carpeta Compartida**:
   - Enlace directo con icono para abrir la carpeta compartida en Google Drive.
   - Botón para inspeccionar o cambiar el ID de carpeta si el equipo utiliza una carpeta específica de su dirección o gerencia.

---

## 3. Decisiones de Producto y Compensaciones Técnicas

### Decisión 1: Sincronización por Fusión Inteligente (Smart Merge)
- **Enfoque Elegido**: Comparación registro por registro mediante `id` (o código del procedimiento) y marca de tiempo ISO `updatedAt`.
- **Por qué**: Evita la pérdida involuntaria del trabajo de un analista si otro colaborador sincroniza simultáneamente, garantizando que los manuales nuevos nunca sean eliminados y que las ediciones más recientes prevalezcan.
- **Alternativa Descartada**: Sobrescritura total ciega, la cual destruiría manuales creados localmente si se descarga la nube, o borraría manuales creados por otros compañeros si se sube lo local.

### Decisión 2: Compatibilidad de Permisos y Carpeta Compartida en Drive
- **Enfoque Elegido**: Mantener el folder ID oficial corporativo y permitir a cualquier usuario con cuenta de Google sincronizar siempre que tenga acceso a la carpeta de Drive (compartida en la organización). Se añade manejo resiliente de errores para guiar al usuario si requiere solicitar acceso a la carpeta de Drive.
- **Por qué**: Respeta las políticas de seguridad de Google Workspace y evita exponer credenciales administrativas en el cliente.

---

## 4. Arquitectura Técnica y Estrategia de Datos

### Diagrama del Sistema y Flujo de Fusión

```
┌─────────────────────────────────────────────────────────────┐
│                       USUARIO A / B                         │
│               (Cualquier cuenta de Google)                  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Google Sign-In (OAuth Token)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 GoogleDriveSyncCard / UI                    │
│   • Botón "Sincronizar (Subir & Descargar)"                 │
│   • Botón "Descargar de Drive" / "Subir a Drive"            │
│   • Indicador de progreso & Último sincronizado por/fecha    │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      LOCAL STORAGE           │ │     GOOGLE DRIVE (API)     │
│   • Manuales locales         │ │  • Carpeta Compartida      │
│   • Borradores en edición    │ │  • Base_de_Datos...json    │
└──────────────┬───────────────┘ └─────────────┬──────────────┘
               │                               │
               └───────────────┬───────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            MOTOR DE FUSIÓN (Smart Merge Engine)             │
│                                                             │
│   1. Mapeo por ID único y código (DTH-GFD-MP-XX)            │
│   2. Si solo existe en Remoto -> Añadir a Local             │
│   3. Si solo existe en Local  -> Añadir a Nube              │
│   4. Si existe en Ambos       -> Conservar MAX(updatedAt)   │
│   5. Guarda nuevo conjunto en localStorage                  │
│   6. Actualiza archivo consolidado en Google Drive          │
└─────────────────────────────────────────────────────────────┘
```

### Funciones a Implementar en `googleDriveService.ts`
1. `downloadDatabaseFromDrive(token: string)`:
   - Descarga `Base_de_Datos_Manuales_Canguro_CA.json` o lee los archivos de manuales existentes en la carpeta.
   - Parsea y valida la estructura de cada manual.
2. `mergeManualsDatabases(localManuals, remoteManuals)`:
   - Algoritmo determinístico de fusión de dos listas de `StoredManualRecord`.
   - Retorna la lista consolidada y métricas (`nuevosDescargados`, `localesSubidos`, `actualizados`).
3. `bidirectionalSyncWithDrive(localManuals, token, onProgress)`:
   - Ejecuta la descarga remota, invoca `mergeManualsDatabases`, actualiza el almacenamiento local mediante callback, y sube el archivo maestro actualizado y los manuales sincronizados a Google Drive.
4. `saveFolderIdPreference(folderId: string)`:
   - Permite flexibilizar el ID de carpeta compartida si el equipo lo requiere.

---

## Plan de Verificación

1. **Prueba de Autenticación Multiusuario**:
   - Conectar con la cuenta de Google actual y verificar que el token de Google Drive se genere sin errores de permisos.
2. **Prueba de Descarga desde Drive**:
   - Probar la lectura del archivo remoto `Base_de_Datos_Manuales_Canguro_CA.json` para cargar registros en una base de datos local limpia o con registros previos.
3. **Prueba de Fusión Inteligente**:
   - Simular un manual modificado localmente y otro manual modificado en la nube para comprobar que el algoritmo respeta la marca de tiempo más reciente (`updatedAt`) sin duplicar ni borrar registros.
4. **Prueba de Verificación de Build**:
   - Ejecutar `compile_applet` para asegurar cero errores de TypeScript y compilación óptima de Vite.
