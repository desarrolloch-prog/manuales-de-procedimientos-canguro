# Optimización Vertical Integral: Glosario Unificado en 1 Página, Herramientas Limpias y Criterios 4.1 a 4.5 Continuos

Este plan aborda la resolución quirúrgica de los 3 errores evidenciados en el documento PDF exportado: eliminación del salto forzado en el Glosario (consolidando hasta 10 términos en una única página), estandarización de las Herramientas Tecnológicas a nombres limpios de software sin aclaratorias entre paréntesis, y maximización del presupuesto vertical útil (586px) para evitar saltos innecesarios en la estructura organizacional y permitir los 5 criterios técnicos continuos en una misma hoja.

> [!IMPORTANT]
> **Decisiones Confirmadas con el Usuario en Fase 1:**
> - **Glosario de Términos en 1 Sola Página**: Abarcar hasta 10 términos técnicos con alta densidad analítica en la Página 3. Se elimina la regla arbitraria de corte en 8 términos, aprovechando el alto útil de 586px con interlineado óptimo.
> - **Herramientas Tecnológicas Limpias**: Nombres estrictamente limpios del software (ej. *ERP Odoo*, *Google Drive*, *WhatsApp Business*, *Email Corporativo*), erradicando menciones a módulos o aclaratorias en paréntesis.
> - **Aprovechamiento Integral del Margen Vertical (Criterios 4.1 a 4.5)**: Maximizar el área útil para albergar hasta 5 criterios técnicos en la misma página junto a su encabezado formal, evitando saltos huérfanos (como el de 4.5 solo en página 9). Solo se generará salto si se trata de 6 o más criterios técnicos extensos.

---

## 1. Overview & Core Concept

El objetivo es lograr un documento formal perfectamente balanceado, compacto y sin páginas semi-vacías ni desbordamientos artificiales:
1. **Página 3 (Glosario de Términos)**: Despliegue de los 8 a 10 términos del proceso en un único contenedor sin división en una segunda hoja (eliminando la Página 4 residual que solo contenía 2 términos).
2. **Página 2 (Herramientas Tecnológicas)**: Presentación minimalista y sobria de las herramientas habilitadoras, limpiando cualquier texto accesorio o redundante entre paréntesis.
3. **Página 5 (Estructura Organizacional)**: Ajuste de capacidad para que los 4 cargos del organigrama (3.1 Director, 3.2 Gerente/Supervisión, 3.3 Supervisor, 3.4 Analista) coexistan en la Página 5 sin desterrar al Analista a una página solitaria.
4. **Página 6 (Criterios Técnicos 4.1 a 4.5)**: Utilización del 100% del alto útil disponible para presentar el encabezado *4. CRITERIOS TÉCNICOS DEL PROCESO DE...* junto con los criterios 4.1, 4.2, 4.3, 4.4 y 4.5 de forma continua y ordenada.

---

## 2. User Experience & Visual Design

- **Densidad Visual y Armonía Documental (A4 Horizontal Visio)**:
  - Cada hoja aprovecha de forma equilibrada sus 586px de altura central útil, enmarcada entre el encabezado oficial (74px) y el pie de firmas (82px).
  - Se eliminan las "páginas desiertas" (páginas con solo 1 o 2 elementos flotando y 70% de espacio en blanco).
- **Herramientas Tecnológicas**:
  - Listado limpio con viñetas formales:
    - • ERP Odoo
    - • Google Drive
    - • WhatsApp Business
    - • Email Corporativo
- **Criterios Técnicos**:
  - Margen vertical entre criterios ajustado a 4px (en lugar de márgenes inflados), permitiendo que hasta 5 criterios técnicos con sus viñetas operativas convivan en la misma página.
  - El documento resultante pasa de 9 páginas infladas a 6 páginas canónicas perfectas.

---

## 3. Key Product Decisions & Trade-Offs

- **Consolidación del Glosario en Página 3**:
  - *Enfoque Elegido*: Suprimir el corte rígido `slice(0, 8)` en el paginador. La caja de glosario utiliza un interlineado compacto (1.15) y padding vertical equilibrado para que 8 a 10 términos ocupen exactamente entre 380px y 480px, sin jamás rebasar los 586px ni disparar una página 4 redundante.
  - *Por qué*: Evita la fragmentación documental y respeta la capacidad física comprobada de la página.
- **Capacidad de Cargos en la Sección 3**:
  - *Enfoque Elegido*: Elevar el límite de cargos en la Página 5 de 3 a 4 cargos. En los procesos estándar de Canguro (Dirección, Gerencia, Coordinación/Supervisión y Analista), los 4 cargos caben holgadamente dentro de los 480px disponibles dentro de la caja blanca.
  - *Por qué*: Erradica la página 7 huérfana donde el Analista aparecía completamente aislado.
- **Aprovechamiento Integral para Criterios 4.1 a 4.5**:
  - *Enfoque Elegido*: Ajustar el umbral dinámico de empaquetado de criterios a 520px netos y compactar el espaciado entre viñetas (`gap-0.5`, `my-1`). Los criterios 4.1 a 4.5 permanecen juntos en la misma página. Únicamente si el análisis real del proceso genera 6 o más criterios se habilitará un salto de página formal.
  - *Por qué*: Elimina la anomalía de la página 9 donde el criterio 4.5 quedaba descolgado sin justificación.
- **Sanitización de Herramientas**:
  - *Enfoque Elegido*: Regla estricta tanto en el prompt del backend como en el saneamiento del frontend para eliminar cualquier bloque entre paréntesis `\s*\([^)]*\)` en el nombre de la herramienta.

---

## 4. Technical Architecture & Data Strategy

### Estructura Canónica de 6 Páginas Optimizada

```
┌─────────────────────────────────────────────────────────────────┐
│ PÁG 1: PORTADA EJECUTIVA                                        │
│  - Objetivo, Alcance, Control de Versiones, Clasificación       │
│  - Visión Extendida del Proceso (Flujo horizontal de 6-8 fases) │
│  - Áreas Aprobadoras y Cuadro Oficial de 4 o 5 Firmas          │
├─────────────────────────────────────────────────────────────────┤
│ PÁG 2: BASES TECNOLÓGICAS Y NORMATIVAS                          │
│  - [7] Herramientas Tecnológicas (Solo nombres limpios)         │
│  - [8] Documentos Derogados                                     │
├─────────────────────────────────────────────────────────────────┤
│ PÁG 3: GLOSARIO DE TÉRMINOS UNIFICADO                           │
│  - [9] Glosario de Términos (Hasta 10 términos de alta densidad) │
│  - 100% contenido en 1 sola página (Sin salto a pág 4)         │
├─────────────────────────────────────────────────────────────────┤
│ PÁG 4: GOBERNANZA Y SEGURIDAD                                   │
│  - [10] Normas: 1. Dueño del Proceso y Gobernanza Documental    │
│  - [10] Normas: 2. Seguridad de la Información y Canales        │
├─────────────────────────────────────────────────────────────────┤
│ PÁG 5: ESTRUCTURA ORGANIZACIONAL COMPLETA                       │
│  - [10] Normas: 3. Estructura Organizacional                    │
│  - Cargos 3.1, 3.2, 3.3 y 3.4 integrados en la misma hoja       │
├─────────────────────────────────────────────────────────────────┤
│ PÁG 6: CRITERIOS TÉCNICOS DEL PROCESO                           │
│  - [10] Normas: 4. CRITERIOS TÉCNICOS DEL PROCESO               │
│  - Criterios 4.1, 4.2, 4.3, 4.4 y 4.5 continuos en la misma hoja│
│  - (Salto a Pág 7 reservado estrictamente si existen 6+ ítems) │
└─────────────────────────────────────────────────────────────────┘
```

### Cambios Concretos en Módulos

1. **`src/utils/paginate.ts`**:
   - Glosario: eliminar la partición `remainingGlosario` y el límite de 8; alojar el glosario completo (hasta 10 términos) en la Página 3.
   - Cargos: aumentar la capacidad en Página 5 a 4 cargos (`maxCargosPage5 = 4`), de modo que el Analista (3.4) no se divida en una página adicional.
   - Criterios: optimizar el cálculo de altura y admitir hasta 5 criterios técnicos en la primera página de la Sección 4, activando una nueva página únicamente si hay 6 o más criterios o si la altura medida física excede los 525px.
   - Herramientas: limpiar automáticamente cualquier texto entre paréntesis en `parseLegacyMarkdownToManualData` y en la generación de markdown.

2. **`server.ts`**:
   - En el prompt `buildManualPrompt`:
     - Instrucción categórica para Herramientas Tecnológicas: listar únicamente el nombre formal del software (ej. "ERP Odoo", "Google Drive", "WhatsApp Business", "Email Corporativo"), prohibiendo expresamente colocar módulos o descripciones entre paréntesis.
     - Instrucción para Criterios Técnicos: estructurar 5 criterios analíticos de alto rigor que aprovechen el margen disponible.
   - En `manualResponseSchema`: documentar la restricción en la propiedad `herramientas`.

3. **`src/components/ManualPageRenderer.tsx`**:
   - Compactar ligeramente los márgenes verticales de los bloques de criterio (`my-1` en lugar de `my-1.5`, `py-0.5`), garantizando que 5 criterios con 2 a 3 viñetas cada uno quepan cómodamente en los 525px de espacio interior de la caja blanca.
   - En `UnifiedGlosarioBox`, optimizar el interlineado y padding para que 10 términos se lean con comodidad y elegancia sin exceder los 480px.
