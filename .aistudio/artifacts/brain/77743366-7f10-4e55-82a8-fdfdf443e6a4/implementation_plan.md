# Auditoría y Reingeniería del Motor de Análisis Multimodal y Paginación Dinámica de Cargos (DTH-GFD-MP)

Auditoría integral del flujo de ingesta y generación documental de Districueros El Canguro C.A., corrigiendo la omisión de análisis multimodal, erradicando los fallbacks predeterminados silenciosos y habilitando la paginación multi-página escalable para estructuras organizacionales con múltiples descriptores de cargo (hasta 9 o más roles analizados).

## Decisiones Críticas Confirmadas por el Usuario

> [!IMPORTANT]
> Acuerdos de diseño y arquitectura confirmados en la fase de clarificación interactiva:
> - **Distribución de Roles Organizacionales**: Se establece un límite estricto de **máximo tres (3) cargos por página** con salto de página automático dentro de la Sección 3 (Estructura Organizacional).
> - **Exhaustividad de Descriptores Adjuntos**: El motor de análisis procesará e incorporará el **100% de los descriptores de cargo** y documentos adjuntos sin omisión ni truncamiento artificial (si se adjuntan 9 descriptores, se analizan y plasman los 9 cargos completos).
> - **Cero Términos Predeterminados en Glosario y Criterios**: Queda terminantemente prohibido cargar glosarios o criterios genéricos; ambos deben ser extraídos e interpretados **exclusivamente a partir del material y descriptores provistos**.

---

## 1. Diagnóstico Forense y Auditoría del Sistema Actual

### Causas Raíz Detectadas:
1. **Límites Artificiales en el Prompt y JSON Schema (`server.ts`)**:
   - El prompt maestro instruía al modelo: *"Extrae los cargos reales vinculados directamente al proceso (de 4 a 6 cargos según el organigrama)"*.
   - El esquema JSON limitaba la descripción a *"4 a 8 cargos"*.
   - Esto obligaba a la IA a descartar los descriptores adicionales (tomando solo 3 o 4 cargos).
2. **Activación Silenciosa de la Plantilla de Fallback**:
   - Al adjuntar múltiples PDFs o imágenes de descriptores de cargo en Base64, el payload superaba el límite de Express (`30mb`) o excedía los tiempos de procesamiento.
   - La función `executeGeminiWithRetry` capturaba el error y ejecutaba de inmediato `buildLocalCertifiedFallback`, la cual inyectaba datos hardcodeados (el glosario de ejemplo con *Albarán*, *CENDIS*, etc., y los 4 cargos preestablecidos de la plantilla de logística/infraestructura), dando la impresión de que "no interpretaba nada".
3. **Paginación Rígida en `src/utils/paginate.ts`**:
   - La Página 5 estaba codificada para albergar hasta 4 cargos (`maxCargosPage5 = 4`), y todos los cargos restantes se empujaban a una sola página adicional (`remainingCargos`), provocando desbordamiento y pérdida visual sin respetar los 3 cargos por hoja.

---

## 2. Experiencia de Usuario y Distribución Canónica de Páginas

La estructura de páginas mantendrá la geometría oficial Visio A4 Horizontal (1122 x 794 px) con presupuesto vertical innegociable de 586px útiles, cuadro de 4 firmas corporativas y encabezado formal:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PÁG 1: PORTADA OFICIAL (Ficha técnica, Objetivo, Alcance, Flujo de 6-8 fases│
├─────────────────────────────────────────────────────────────────────────────┤
│ PÁG 2: SECCIONES 7 Y 8 (Herramientas Tecnológicas y Documentos Derogados)  │
├─────────────────────────────────────────────────────────────────────────────┤
│ PÁG 3: SECCIÓN 9 (Glosario de Términos analizado al 100% sin predeterminados│
├─────────────────────────────────────────────────────────────────────────────┤
│ PÁG 4: SECCIÓN 10 - NORMAS DEL PROCESO (1. Gobernanza y 2. Seguridad)       │
├─────────────────────────────────────────────────────────────────────────────┤
│ PÁG 5: SECCIÓN 10 - 3. ESTRUCTURA ORGANIZACIONAL (Intro + Cargos 3.1 a 3.3) │
├─────────────────────────────────────────────────────────────────────────────┤
│ PÁG 6: SECCIÓN 10 - 3. ESTRUCTURA (CONTINUACIÓN) (Cargos 3.4 a 3.6)         │
├─────────────────────────────────────────────────────────────────────────────┤
│ PÁG 7: SECCIÓN 10 - 3. ESTRUCTURA (CONTINUACIÓN) (Cargos 3.7 a 3.9)         │
├─────────────────────────────────────────────────────────────────────────────┤
│ PÁG 8+: SECCIÓN 10 - 4. CRITERIOS TÉCNICOS (4.1 en adelante según análisis) │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Visualización de Progreso**: Si una llamada a Gemini requiere reintento o experimenta latencia al procesar 9 archivos, la UI mostrará feedback explícito del estado del análisis en tiempo real, sin conmutar silenciosamente a plantillas preestablecidas.

---

## 3. Decisiones Técnicas y de Arquitectura

1. **Aumento de Cuota de Carga en Express**:
   - Elevar el límite del parser de `server.ts` a `100mb` para admitir múltiples PDFs y capturas en alta resolución sin disparar error 413.
2. **Reingeniería del Prompt Maestro Multimodal**:
   - Reemplazar la restricción de 4-6 cargos por una directiva imperativa: *"Debes analizar e incorporar la totalidad de los descriptores de cargo adjuntos en su integridad (si hay 9 documentos, extrae 9 cargos con sus objetivos y 4 a 6 responsabilidades cada uno)"*.
   - Reforzar la regla de abstención: queda terminantemente prohibido utilizar el glosario estándar si hay documentos cargados; debe sintetizar los términos presentes en los descriptores y notas.
3. **Paginación Modular en `paginate.ts`**:
   - Agrupar `cargoBlocks` en chunks estrictos de máximo 3 cargos por página.
   - En la primera página de estructura (Página 5), renderizar el encabezado y el bloque introductivo junto a los primeros 3 cargos.
   - Generar páginas de continuación dedicadas exclusivamente a los siguientes grupos de 3 cargos (ej. página con 3.4-3.6, siguiente con 3.7-3.9), con encabezado formal de continuación y pie de firmas intacto.
   - Desplazar dinámicamente la sección de Criterios Técnicos para que inicie inmediatamente después del último cargo, paginando sus viñetas según el alto medido.
4. **Visibilidad de Errores vs. Fallbacks**:
   - En caso de falla real de la API de IA, el sistema informará al usuario la causa específica del error (ej. timeout o clave inválida) con opción de reintentar, en lugar de reemplazar silenciosamente los 9 descriptores por una plantilla que ignora los archivos.

---

## 4. Diagrama de Flujo del Pipeline Multimodal

```
[Usuario adjunta 9 Descriptores PDF/TXT + Notas]
                       │
                       ▼
            [Express Server (100MB)]
                       │
                       ▼
       [GoogleGenAI: gemini-3.8-flash]
   Prompt: "Analizar 100% de descriptores,
    extraer todos los cargos, glosario real
        y criterios técnicos profundos"
                       │
                       ▼
           [JSON Estructurado ManualData]
      (9 Cargos, Glosario real, Criterios)
                       │
                       ▼
          [Motor paginateBlocks()]
   - Pág 1: Portada
   - Pág 2: Herramientas
   - Pág 3: Glosario (100% del material)
   - Pág 4: Normas 1 y 2
   - Pág 5: Estructura Org (Cargos 1 a 3)
   - Pág 6: Estructura Org (Cargos 4 a 6)
   - Pág 7: Estructura Org (Cargos 7 a 9)
   - Pág 8: Criterios Técnicos Específicos
                       │
                       ▼
      [Renderizado DOM + Exportación PDF/DOCX]
```
