# Plan de Implementación: Control Total de Guardado, Interfaz Limpia y Progreso en Generación

Reestructuración integral de la interacción y la interfaz del generador de manuales corporativos según las directrices del usuario: desacoplar la carga de ejemplos para requerir generación explícita, eliminar redundancias y textos prescindibles, simplificar el modo edición, unificar los contadores en una barra de porcentaje progresivo con etapas, dar control manual del guardado con indicador de cambios pendientes y condensar la sección de errores Lean a un resumen ejecutivo de alto impacto.

---

## 1. Desacoplamiento de Carga de Ejemplo (`handleLoadPreset`)
- **Problema actual**: Al presionar "Ejemplo", la app carga los parámetros e inmediatamente inyecta y renderiza el manual pregenerado y el diagnóstico Lean en la vista de hojas.
- **Solución**:
  - `handleLoadPreset` poblará **exclusivamente** los campos del formulario de entrada:
    - Código (`05`), Versión (`01`), Clasificación (`Crítico.`), Proceso (`LOGÍSTICA INVERSA`), Dirección (`TRANSPORTE Y LOGÍSTICA`), Dueño del proceso, Director aprobador (`Gabriel Saavedra`) y la narrativa/transcripción de la entrevista.
  - No asignará `manualMarkdown`, `leanMarkdown` ni creará páginas en `editableDoc`.
  - El visor del manual permanecerá en estado limpio de bienvenida indicando que los parámetros han sido cargados y listos para generar.
  - El manual y la auditoría Lean **únicamente** se generarán y mostrarán cuando el usuario pulse el botón **"Generar Manual de Procedimientos"**.

---

## 2. Depuración y Limpieza Visual de la Interfaz (Anti-Ruido)
1. **Encabezado Superior**:
   - Eliminar el badge textual `DTH-GFD-MP` redundante al lado del título corporativo "MANUALES DE PROCEDIMIENTOS".
2. **Panel de Parámetros**:
   - Eliminar el texto secundario `"Metadatos oficiales y notas"` del subtítulo del formulario.
   - En el campo *Dueño del Proceso*, eliminar la aclaratoria entre paréntesis `(Cargo Responsable)`, dejando limpiamente: `Dueño del Proceso`.
   - Bajo el campo *Director Aprobador*, eliminar la línea informativa `"Cargo: Director de ..."`.
3. **Control de Edición Directa**:
   - Reducir el botón `Edición: Activa` que ocupa demasiado espacio.
   - Diseñar un botón compacto y funcional: icono `<Edit3 />` + texto `"Edición"`, que alterne su estado activo/inactivo con un fondo distintivo sin ocupar espacio horizontal excesivo.
   - Eliminar el toast y banner `"Haz clic en cualquier palabra para editarla"` al activarse la edición.
4. **Barra de Accesibilidad y Escala**:
   - Eliminar el botón secundario inactivo `"100%"` que no cumple función. Mantener únicamente los controles de zoom intuitivos (`-` y `+` con el porcentaje central).

---

## 3. Indicador de Carga: Porcentaje Progresivo y Etapas de Análisis
- **Problema actual**: Existen 2 contadores duplicados de segundos (uno en el botón y otro en el panel de carga central).
- **Solución elegida por el usuario**:
  - Eliminar los dos contadores de segundos cronometrados.
  - Implementar una **barra de progreso con porcentaje estimado (0% a 100%)** y **etapas visuales reales del pipeline analítico**:
    - **0% - 25%**: *Paso 1: Extracción forense de entidades, reglas y tiempos...*
    - **25% - 65%**: *Paso 2: Redacción técnica corporativa y análisis Lean Six Sigma en paralelo...*
    - **65% - 85%**: *Paso 3: Verificación cruzada y eliminación de alucinaciones...*
    - **85% - 100%**: *Paso 4: Ensamblaje de páginas formales, tablas de gobernanza y flujograma...*
  - En el botón de generación, mostrar el estado sincronizado con el porcentaje (ej. `"Generando... 45%"`), ofreciendo una experiencia profesional y confiable.

---

## 4. Control Manual de Guardado (Eliminación del Autoguardado)
- **Problema actual**: El `useEffect` con debounce de 700ms sobreescribe la base de datos de forma automática e invisible.
- **Solución elegida por el usuario**:
  - **Desactivar el guardado automático**: las ediciones en los campos de parámetros y en el documento solo se guardarán en la base de datos cuando el usuario lo decida.
  - **Estado de cambios pendientes (`hasUnsavedChanges`)**:
    - Detectar cuándo el usuario ha modificado cualquier parámetro o página desde la última vez que guardó.
  - **Botón destacado "Guardar Manual"**:
    - Ubicado de forma visible tanto en la barra superior como en el panel de parámetros.
    - Si hay cambios pendientes: badge o acento visual `"Cambios sin guardar"`.
    - Al hacer clic: guarda el registro en la base de datos local, actualiza la estampa de tiempo `"Guardado a las hh:mm"` y emite un toast de confirmación.

---

## 5. Optimización del Análisis y Síntesis de Errores Lean
1. **Resumen Ejecutivo de Errores Operativos**:
   - En `server.ts`, ajustar la instrucción del Paso C (Auditoría Lean) para que la Sección 1 (`Errores Operativos y Brechas de Control Interno Detectadas`) genere un **resumen ejecutivo conciso y directo (3 o 4 viñetas clave)** sin extenderse en detalles redundantes.
   - En la interfaz, mantener la tabla de las 8 Mudas limpia y enfocar el texto previo en este resumen sintético.
2. **Profundización Analítica de Casos**:
   - Ajustar los prompts del pipeline analítico para maximizar la fidelidad forense ante entrevistas reales con casos operativos, capturando reglas de excepción, tiempos de SLA, sistemas complementarios y responsabilidades sin suposiciones genéricas.

---

## 6. Verificación y Pruebas
1. Cargar el ejemplo oficial de Logística Inversa y verificar que solo llene los campos de entrada sin mostrar el manual hasta pulsar "Generar".
2. Probar la barra de porcentaje y etapas durante la generación.
3. Verificar que los textos redundantes (`DTH-GFD-MP`, `Metadatos oficiales y notas`, `Cargo...`, `(Cargo Responsable)`, `Haz clic en cualquier palabra...`, botón `100%`) han sido eliminados.
4. Editar campos o texto en el manual, comprobar que se active el estado de "Cambios sin guardar" y que el botón "Guardar Manual" guarde exactamente cuando el usuario lo solicite.
5. Ejecutar `compile_applet` para certificar compilación limpia sin errores.
