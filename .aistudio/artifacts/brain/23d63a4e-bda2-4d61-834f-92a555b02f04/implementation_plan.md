# Plan de Implementación: Estandarización a Dimensiones Visio (A4 Horizontal) y Paginación Dinámica

## Resumen Ejecutivo
Estandarizar todas las páginas de los manuales de procedimientos (tanto en la previsualización interactiva como en la descarga PDF) a las **dimensiones exactas de Microsoft Visio en A4 horizontal (297 × 210 mm, relación de aspecto 1.4142)**. Se implementa una política de **paginación dinámica continua**: cuando la información de una sección supere la capacidad física de una página, se distribuirá automáticamente en páginas subsiguientes numeradas (`Página X de Y`), garantizando que **todas las páginas conserven su encabezado institucional arriba y su cuadro de firmas oficial abajo sin que nada se corte ni se desborde**.

---

## Decisiones Críticas y Preferencias Confirmadas

> [!IMPORTANT]
> Confirmaciones del usuario en la fase de entrevistas:
> - **Formato Estándar**: A4 horizontal tipo Visio ($297 \times 210\text{ mm}$, relación $1.4142$).
> - **Gestión de Contenido Extenso**: Dividir automáticamente en páginas continuas numeradas correlativamente sin recortar información.
> - **Control Documental**: Presencia obligatoria del encabezado institucional y del cuadro de firmas oficial en **todas y cada una de las páginas**.

---

## 1. Arquitectura de Página Estándar Visio

```
┌────────────────────────────────────────────────────────────────────────┐
│  ENCABEZADO INSTITUCIONAL CANGURO (Logo, Fechas, Código, Pág X de Y)   │ ~82px
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ÁREA DE CONTENIDO ÚTIL MODULAR                                        │
│  - Dimensiones controladas y proporcionales                            │ ~562px
│  - Distribución vertical equilibrada                                   │
│  - Paginación automática si el contenido supera el límite físico       │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│  CUADRO OFICIAL DE 5 FIRMAS (Elaborado, Revisado, Aprobado)            │ ~74px
└────────────────────────────────────────────────────────────────────────┘
  Total Hoja: 1060px × 750px (Relación de Aspecto A4 Visio: 1.4133 ≈ 297/210)
```

---

## 2. Cambios Técnicos Propuestos

### A. Estandarización Geométrica en `src/index.css` y `src/App.tsx`
1. **Contenedor `.page-sheet` Normalizado**:
   - Relación de aspecto fija de hoja Visio: ancho base $1060\text{ px}$ y altura $750\text{ px}$ (`aspect-[1060/750]`, $1.4133$).
   - Acolchado interno uniforme: `p-4 sm:p-5` ($16\text{–}20\text{ px}$).
   - Disposición flex vertical estricta: `flex flex-col justify-between`.
2. **Componentes con Alturas Calibradas**:
   - `HeaderTable`: Fijo en la parte superior (`shrink-0`).
   - `OfficialSignaturesFooter`: Fijo en la parte inferior (`shrink-0`).
   - `page-body`: Área central flexible (`flex-1 overflow-hidden flex flex-col justify-between`), con espacio exacto de $560\text{–}570\text{ px}$.

### B. Motor de Paginación Inteligente y Flujo Continuo (`src/App.tsx`)
1. **División Dinámica de Secciones Extensas**:
   - **Estructura Organizacional (Sección 3)**: Si contiene más de 3 cargos con descripciones y responsabilidades, se divide automáticamente en:
     - `Página N`: Cargos 3.1 y 3.2.
     - `Página N+1`: Cargos 3.3, 3.4 y subsiguientes con banner `3. ESTRUCTURA ORGANIZACIONAL (CONTINUACIÓN)`.
   - **Normas del Proceso (Sección 1 y 2)**: Dueño del Proceso y Seguridad se mantienen consolidados; si los criterios de seguridad o canales son extensos, fluyen limpiamente.
   - **Criterios Técnicos (Sección 4)**: Si los criterios 4.1 a 4.7 contienen párrafos extensos de auditoría o validación, se distribuyen en páginas consecutivas respetando las viñetas sin apretar el texto.
   - **Glosario de Términos**: Si excede 9 términos, se divide en 2 páginas continuas de glosario.
2. **Actualización Automática de Numeración**:
   - El contador total `totalPages = 1 + editableDoc.pages.length` se recalcula en tiempo real, reflejando automáticamente `1 de 6`, `2 de 7`, etc., en todos los encabezados.

### C. Motor de Exportación a PDF (`src/utils/pdfExport.ts`)
1. **Configuración jsPDF A4 Apaisado (Landscape)**:
   - Formato: `'a4'`, orientación: `'landscape'` ($297\text{ mm} \times 210\text{ mm}$).
   - Márgenes técnicos: $5\text{ mm}$ en los 4 bordes.
   - Área imprimible: $287\text{ mm} \times 200\text{ mm}$.
2. **Captura Fiel 1:1 con Estándar Visio**:
   - Dimensiones de captura: $1060\text{ px} \times 750\text{ px}$ (ratio exacto $1.4133$).
   - Proyección en jsPDF: $282.8\text{ mm} \times 200\text{ mm}$ centrado a $7.1\text{ mm}$ en X y $5.0\text{ mm}$ en Y.
   - Retiro temporal de sombras y bordes de pantalla para evitar marcos dobles.
   - El cuadro de firmas se ubica exactamente en la base de la hoja útil, 100% visible e intacto en cada página.

---

## 3. Plan de Verificación y Pruebas

1. **Compilación y Linteo**:
   - Ejecutar `compile_applet` y `lint_applet` para certificar cero errores de TypeScript y dependencias.
2. **Validación Visual de Hojas**:
   - Comprobar que la Página 1, Página 2, Página 3 y subsiguientes tengan idéntica altura y proporción visual.
   - Verificar que en manuales con 6, 7 u 8 páginas, cada una contenga su encabezado con la numeración correcta y el cuadro de 5 firmas completo.
3. **Validación de Exportación PDF**:
   - Generar el PDF y verificar que las dimensiones físicas del archivo correspondan a A4 ($841.8 \times 595.2\text{ pt}$).
   - Constatar que el cuadro de firmas no esté recortado en ninguna página y que no existan desbordamientos.
