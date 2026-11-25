# Plan de Implementación: Réplica Exacta del Estándar Visio Canguro (DTH-GFD-MP)

A partir de los requerimientos y de las imágenes adjuntas con las correcciones en rojo ("NO", "TODO UNIFORME") sobre el documento de referencia (`DTH-GFD-MP-13`), se establece el plan de trabajo para ajustar el diseño visual, la diagramación y la estructura de contenidos del manual de procedimientos.

---

## 1. Rediseño de Encabezados de Sección (Eliminación de la Cápsula Entera)

### Problema Identificado en las Capturas
En las capturas aportadas por el usuario, el encabezado amarillo aparecía como una cápsula corrida completa (`rounded-full` de extremo a extremo sin diferenciación de número), señalada explícitamente con un "NO" en rojo y la indicación "TODO UNIFORME".

### Solución Visual a Implementar
Reemplazar la clase `.canguro-pill-banner` por el ensamble oficial de dos piezas idéntico a Visio:
- **Insignia Numérica Izquierda**:
  - Elemento ovalado / cápsula independiente con fondo amarillo institucional (`#fed700`), borde negro de `1.5px`, alto fijo de `26px - 28px` y ancho mínimo de `32px - 38px`.
  - Contiene el número de sección en fuente negrita negra pura (ej. `1`, `7`, `8`, `9`).
- **Barra de Título Derecha**:
  - Barra rectangular con esquinas suavemente redondeadas (`rounded-[6px]` o `rounded-[8px]`, nunca `rounded-full`), fondo amarillo institucional (`#fed700`), borde negro de `1.5px`.
  - Texto centrado en mayúsculas sostenidas, fuente Arial en negrita (`font-black`), espaciado uniforme y altura idéntica a la insignia izquierda.
- **Uniformidad**:
  - Aplicar exactamente la misma proporción, márgenes superior/inferior y paleta en los encabezados de las secciones 1 a 10 y sus continuaciones.

---

## 2. Diagramación Canónica de 6 Páginas

Garantizar que la paginación distribuya la información de manera limpia, consistente y sin desbordes a lo largo de 6 páginas exactas:

- **Página 1**:
  - Tabla de Encabezado institucional ("1 de 6").
  - Sección 1: `OBJETIVO` (caja blanca borde negro fino).
  - Sección 2: `ALCANCE` (caja blanca borde negro fino).
  - Sección 3: `CONTROL DE VERSIONES` (tabla formal con versión, fecha y descripción del cambio).
  - Sección 4: `CLASIFICACIÓN` (Uso Interno).
  - Sección 5: `VISIÓN EXTENDIDA DEL PROCESO` (diagrama de flujo horizontal limpio con 6 a 8 cajas cortas secuenciales entre `[Inicio]` y `[Fin]`).
  - Sección 6: `ÁREAS APROBADORAS` (tabla formal de revisión y aprobación).
  - Cuadro oficial de 4 firmas en el pie de página.

- **Página 2**:
  - Tabla de Encabezado institucional ("2 de 6").
  - Sección 7: `HERRAMIENTAS TECNOLÓGICAS` (caja blanca con viñetas limpias: ERP Odoo, Google Drive, WhatsApp, etc.).
  - Sección 8: `DOCUMENTOS DEROGADOS` (caja blanca formal con registro o indicación "No aplica").
  - Cuadro oficial de 4 firmas en el pie de página.

- **Página 3**:
  - Tabla de Encabezado institucional ("3 de 6").
  - Sección 9: `GLOSARIO DE TÉRMINOS` (caja blanca con 6 a 10 términos clave del proceso, con el término en negrita `• Término:` seguido de su definición técnica precisa).
  - Cuadro oficial de 4 firmas en el pie de página.

- **Página 4**:
  - Tabla de Encabezado institucional ("4 de 6").
  - Sección 10: `NORMAS DEL PROCESO`:
    - `1. Dueño del Proceso`: Cargo responsable del liderazgo operativo.
    - `2. Seguridad de la Información`: Políticas y confidencialidad.
    - `3. Estructura Organizacional`: Introducción y los dos primeros cargos (`3.1`, `3.2`) con sus responsabilidades en viñetas ordenadas.
  - Cuadro oficial de 4 firmas en el pie de página.

- **Página 5**:
  - Tabla de Encabezado institucional ("5 de 6").
  - Continuación de Sección 10: `NORMAS DEL PROCESO`:
    - Continuación de `3. Estructura Organizacional`: Cargos operativos restantes (`3.3`, `3.4`, `3.5`) y sus responsabilidades funcionales.
  - Cuadro oficial de 4 firmas en el pie de página.

- **Página 6**:
  - Tabla de Encabezado institucional ("6 de 6").
  - Continuación de Sección 10: `NORMAS DEL PROCESO`:
    - `4. Criterios Técnicos del Proceso de [NOMBRE DEL PROCESO]`: Criterios técnicos específicos numerados (`4.1`, `4.2`, `4.3`, etc.), cada uno estructurado con sus viñetas técnicas detalladas (`• Etiqueta: Detalle operativo`).
  - Cuadro oficial de 4 firmas en el pie de página.

---

## 3. Cuadro Oficial de 4 Firmas en Todas las Páginas

- Mantener de forma mandatoria el bloque de 4 firmas institucionales al pie de **todas y cada una de las 6 páginas**:
  - Columna 1: `Elaborado por` (Analista de Procesos / Cargo emisor).
  - Columna 2: `Revisado por` (Jefatura de Operaciones / Calidad).
  - Columna 3: `Validado por` (Gerencia de Operaciones / Auditoría).
  - Columna 4: `Aprobado por` (Gerencia General / Dirección de Talento Humano).
- Altura controlada, líneas punteadas/sólidas para firma manual o sello, tipografía uniforme a 7-8pt para no invadir el área de contenido.

---

## 4. Tipografía, Espaciados y Márgenes Uniformes

- **Tipografía**: Arial en todo el documento. Tamaño base 9pt / 9.5pt, interlineado estándar 1.35.
- **Contenedores de Contenido**: Bordes finos color negro (`border border-black`), esquinas ligeramente redondeadas (`rounded-[8px]`), relleno interior uniforme (`p-3.5 sm:p-4`).
- **Exportación Word (.docx) y PDF**: Sincronizar los estilos de exportación para que el encabezado de dos piezas y las tablas de firmas mantengan la fidelidad visual al exportarse.

---

## 5. Verificación y Validación

1. Compilar el código mediante `compile_applet` y validar sintaxis con `lint_applet`.
2. Verificar en el visor de páginas que las 6 páginas se rendericen sin solapamiento, con los nuevos encabezados de 2 piezas y con el cuadro de firmas presente en todas las páginas.
3. Probar con casos de estudio (Logística Inversa, Infraestructura) para constatar la consistencia global del formato.
