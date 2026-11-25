# Plan de Implementación: Correcciones de Negritas Normativas y Depuración de la Base de Datos

Ajustes visuales y de formato en `server.ts`, `src/components/ManualsDatabaseView.tsx` y `src/components/GoogleDriveSyncCard.tsx` para unificar las negritas en Gerencia y Dirección en las secciones normativas del manual, y retirar los elementos no deseados marcados con "NO" en la Base de Datos.

---

## 1. Análisis de Correcciones Solicitadas

Conforme a las imágenes adjuntas (`image_43fe09cd.png`, `image_119da46a.png`, `image_064ed7f7.png`) y las respuestas confirmadas:

1. **Unificación de Negritas en Párrafos Normativos (Sección 1 y Sección 3)**:
   - **En Sección 1 (Dueño del Proceso)**:  
     *«Para la presente documentación, queda definida formalmente como Dueño del Proceso la **${meta.owner}**, adscrita a la **Dirección de ${meta.direction}** bajo la responsabilidad directa de su titular.»*  
     (Mantiene en negrita la Gerencia/Supervisión y la Dirección).
   - **En Sección 3 (Estructura Organizacional)**:  
     Actualmente aparecía en texto plano sin negrita y con el artículo "la" omitido (`...la estructura de Gerencia...`).  
     Se actualizará para que quede idéntica en estilo:  
     *«En estricto apego al Organigrama Corporativo de la **Dirección de ${meta.direction}** y las descripciones de cargo aprobadas, la estructura de la **${meta.owner}** se conforma de la siguiente manera:»*

2. **Depuración de Elementos en la Base de Datos (`image_064ed7f7.png`)**:
   - **Etiqueta `1 registrados` en el título**:  
     Eliminar el badge/pill `{manuals.length} registrados` al lado del título principal "Base de Datos de Manuales de Procedimientos".
   - **Tarjeta Métrica `BORRADORES`**:  
     Eliminar la tarjeta de "BORRADORES" del resumen métrico superior, reorganizando la cuadrícula a 2 columnas limpias: **TOTAL MANUALES** y **APROBADOS**.
   - **Botones Secundarios `Descargar` y `Subir` en Google Drive**:  
     Eliminar los dos botones secundarios redundantes marcados con una cruz roja, conservando el botón de acción principal **Sincronizar (Subir y Descargar)** y el botón de configuración de carpeta.

---

## 2. Plan de Cambios en el Código

### A. Backend y Prompts (`server.ts`)
- En `buildCanonicalDraftingPrompt` (Sección 3):
  - Actualizar la fórmula introductoria con negritas intermedias y el artículo "la":  
    `En estricto apego al Organigrama Corporativo de la **Dirección de ${meta.direction}** y las descripciones de cargo aprobadas, la estructura de la **${meta.owner}** se conforma de la siguiente manera:`
- En `sanitizeEstructuraOrganizacional`:
  - Asegurar que la expresión regular de validación y reemplazo aplique exactamente las negritas en `**Dirección de ${meta.direction}**` y `**${meta.owner}**` e incluya el artículo `"la"`.
- En `buildLocalCertifiedFallback`:
  - Sincronizar la introducción de la Sección 3 con las mismas negritas y artículo.

### B. Vista de Base de Datos (`src/components/ManualsDatabaseView.tsx`)
- En el encabezado:
  - Remover el elemento `<span>{manuals.length} registrados</span>` contiguo a `<h1>Base de Datos de Manuales de Procedimientos</h1>`.
- En el bloque de métricas superiores:
  - Cambiar la cuadrícula de `grid-cols-1 sm:grid-cols-3` a `grid-cols-1 sm:grid-cols-2`.
  - Eliminar el bloque JSX de la tarjeta "Borradores" (`stats.borradores`).

### C. Tarjeta de Sincronización Google Drive (`src/components/GoogleDriveSyncCard.tsx`)
- En el contenedor de acciones de sincronización (líneas ~440-460):
  - Retirar los botones `handleDownloadOnly` (`Descargar`) y `handleUploadOnly` (`Subir`).
  - Conservar el botón principal `Sincronizar (Subir y Descargar)` y el botón `Configurar Carpeta` (`Settings2`).

---

## 3. Plan de Verificación

1. **Compilación y Tipos:**
   - Ejecutar `compile_applet` y `lint_applet` simultáneamente para verificar cero errores de sintaxis y tipos en TypeScript y React.
2. **Reinicio de Servidor:**
   - Reiniciar el servidor con `restart_dev_server` y comprobar estado en `/api/health`.
3. **Validación Visual:**
   - Comprobar que en la Base de Datos no aparece el badge de "registrados", no aparece la tarjeta de "Borradores", y en la sincronización solo existe el botón principal unificado.
   - Comprobar que la introducción de la Sección 3 muestra en negrita la Dirección y la Gerencia con su respectivo artículo "la".
