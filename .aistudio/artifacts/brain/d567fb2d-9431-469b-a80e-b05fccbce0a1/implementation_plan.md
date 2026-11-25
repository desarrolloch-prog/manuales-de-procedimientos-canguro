# Plan de Implementación: Análisis Forense Multimodal de Documentos y Eliminación de Datos Predeterminados

## Diagnóstico y Causa Raíz
El usuario reporta que el manual generado contiene un glosario con términos predeterminados y un diagrama de flujo no alineado con la información suministrada.
**Causa:** Debido a una conmutación prematura por timeout o fallo transitorio en el backend, el sistema activó la plantilla estática de contingencia (`buildLocalCertifiedFallback`), la cual inyectaba un glosario fijo de 10 términos de almacén/logística genéricos y un flujo estándar, sin analizar los documentos ni las imágenes subidas por el usuario.

---

## Decisiones Confirmadas por el Usuario
1. **Glosario de Términos:** Extraer estricta y únicamente los términos técnicos, conceptos y siglas presentes en los documentos suministrados (cero términos predeterminados o importados).
2. **Visión Extendida del Proceso:** Diseñar el flujo fiel al diagrama o secuencia exacta contenida en los documentos o imágenes adjuntas.
3. **Procesamiento de Información:** Análisis multimodal exhaustivo de documentos (PDF, tablas, notas) e imágenes (diagramas de flujo de Visio/capturas) sin depender de plantillas fijas.

---

## Fases de Implementación

### Fase 1: Reingeniería del Prompt y Motor Multimodal en `server.ts`
- **Recepción Multimodal Completa:** Verificar que las imágenes adjuntas (diagramas de flujo de Visio, capturas PNG/JPG) y los textos de documentos (.pdf, .json, .txt, .csv, .md, .docx) se codifiquen en formato Base64/inlineData y se entreguen íntegramente a Gemini.
- **Instrucción Estricta Anti-Plantilla:**
  - `flujo`: Instrucción mandatoria de inspeccionar visual y textualmente los diagramas adjuntos para transcribir las fases operativas reales del proceso del usuario.
  - `glosario`: Prohibición absoluta de usar listas predeterminadas. La IA debe examinar el contenido y extraer solo los términos técnicos, siglas o conceptos definidos o empleados en el material provisto.
- **Calibración de Modelo y Latencia:**
  - Priorizar `gemini-3.1-flash-lite` y `gemini-3.8-flash` con timeouts resilientes (25s) y configuración de reintentos inmediata, evitando que la conexión se corte por `Failed to fetch`.

### Fase 2: Eliminación de Fallback Silencioso con Datos Predeterminados
- En lugar de sustituir silenciosamente el contenido por un glosario genérico de logística cuando no sea ese el proceso, si se requiere una plantilla de emergencia, esta debe construirse dinámicamente extrayendo palabras clave de los apuntes y textos del usuario, o reportar con claridad el resultado del análisis forense.

### Fase 3: Sincronización del Editor y Experiencia Visual
- Garantizar que la herramienta de espaciado e interlineado continúe operando sobre la selección activa o bloque editable.
- Mantener la edición unificada del glosario en cuadro continuo con viñetas automáticas.
- Conservar las firmas laterales y la opción de eliminar páginas mediante el botón 'X'.

---

## Verificación y Pruebas
1. Prueba de compilación (`compile_applet`) y validación de tipos (`lint_applet`).
2. Ejecución de prueba con documentos e imágenes reales para certificar que el glosario generado contenga únicamente los términos de dichos archivos.
3. Comprobación de que la visión extendida del proceso replique fielmente los bloques de la imagen/documento provisto en menos de 10 segundos.
