# Estandarización de Gobernanza, Aislamiento de Manuales y Renderizado de Negritas

Consolidación arquitectónica para garantizar el aislamiento absoluto y auto-guardado atómico al alternar manuales en la base de datos, renderizar texto enriquecido en negrita real sin asteriscos residuales (`**`), y actualizar la fórmula canónica de Gobernanza Documental en la Sección 10 para designar la titularidad bajo la figura del Gerente del Proceso en formato Tipo Título.

### Decisiones Críticas Confirmadas

> [!IMPORTANT]
> A partir de las aclaraciones confirmadas por el usuario en la Fase 1, se establecen las siguientes definiciones vinculantes:
> 
> - **Fórmula de Gobernanza (Sección 10)**: La cláusula de titularidad concluirá con: `"...bajo la responsabilidad directa del Gerente de [Proceso en Formato Título]"` (ejemplo: *"del Gerente de Logística Inversa"*), aplicándose de forma idéntica en el backend de generación (`server.ts`), en el generador canónico de Markdown (`paginate.ts`) y en el renderizador visual (`ManualPageRenderer.tsx`).
> - **Tratamiento de Negritas al Desactivar Edición**: Los asteriscos de Markdown (`**texto**`) ingresados o generados se decodificarán automáticamente como etiquetas HTML semánticas (`<strong>texto</strong>`), ocultando los caracteres `**` y mostrando una tipografía limpia en negrita tanto en modo lectura como en la exportación PDF y Word.
> - **Aislamiento y Transición entre Manuales**: Al seleccionar un nuevo manual desde la base de datos teniendo cambios sin guardar en el manual activo, el sistema ejecutará un guardado automático atómico y aislado del manual saliente antes de purgar los estados en memoria y cargar el manual entrante, cancelando cualquier temporizador de debounce en cola.

---

## 1. Visión General y Alcance del Cambio

### Qué Hace la Solución
1. **Aislamiento Estricto de Estado y Ciclo de Vida**: Corrige la fuga de memoria y colisión de datos donde las modificaciones de un manual previo se filtraban o sobreescribían al manual siguiente al seleccionarlo en la base de datos. Implementa persistencia completa de la estructura `manualData` dentro de `StoredManualRecord`, cancela temporizadores asíncronos pendientes y resetea limpiamente todas las dependencias reactivas (`cargos`, `criterios`, `glosario`, `páginas intermedias`, `firmas`).
2. **Motor Universal de Renderizado Inline de Negritas**: Reemplaza el volcado de texto plano en viñetas de criterios, cargos, responsabilidades, glosario y notas intermedias por un parser unificado que convierte cualquier patrón `**...**` en negritas tipográficas (`<strong>...</strong>`), asegurando que al salir del modo edición no quede ningún asterisco visible en el lienzo.
3. **Estandarización Canónica de la Gobernanza Documental**: Actualiza la redacción estándar de la cláusula 1 de las Normas del Proceso para sustituir la expresión genérica *"bajo la responsabilidad directa de su titular"* por *"bajo la responsabilidad directa del Gerente de [Nombre del Proceso]"*, convirtiendo el nombre del proceso a formato Tipo Título automáticamente.

### Valor para el Usuario
Elimina la corrupción de datos al navegar entre manuales corporativos, proporciona un acabado estético formal listo para auditoría sin caracteres de marcado expuestos, y asegura la concordancia exacta con la estructura jerárquica de Districueros El Canguro C.A.

---

## 2. Experiencia de Usuario y Diseño Visual

### Flujo de Navegación Aislado
1. **Edición en Caliente**: El usuario edita parámetros, cargos o criterios de un manual existente.
2. **Cambio de Documento en Base de Datos**: El usuario hace clic en otro manual de la lista.
   - Si existen cambios pendientes, el sistema ejecuta un guardado silencioso inmediato sobre el registro del manual activo antes de desmontarlo.
   - Se limpian y reinicializan todas las variables locales (`manualData`, `editableDoc`, `approvalAreas`, `participantAreasText`, etc.).
   - Se carga el nuevo manual de forma atómica y pura, garantizando que el 100% de los datos desplegados correspondan exclusivamente al manual recién abierto.
3. **Visualización Impecable de Negritas**:
   - Durante el modo edición, el usuario puede ingresar texto normalmente con o sin `**` o usar combinaciones de formato.
   - Al desmarcar el botón *"Edición"*, el motor de renderizado procesa todos los bloques y reemplaza los asteriscos por peso tipográfico `font-bold` (700) sobre fondo blanco formal, sin marcas residuales.

### Estilo Tipográfico y Jerarquía
- **Arial 9.5pt / Interlineado Compacto**: Manteniendo la fidelidad estricta al estándar Visio oficial (297 x 210 mm).
- **Tratamiento Visual de Cargos y Criterios**: Cada viñeta conserva su etiqueta en negrita (`Parámetro:`) y destaca los términos técnicos especificados entre asteriscos dentro de su detalle.

---

## 3. Decisiones de Producto y Arquitectura

### 1. Inclusión de `manualData` en el Registro Persistente
- **Enfoque Seleccionado**: Guardar el objeto estructurado `manualData` completo dentro del registro `StoredManualRecord` tanto en `handleSaveActiveManual` como en `executeSilentAutoSave`, y regenerar `manualMarkdown` mediante `manualDataToMarkdown` para mantener sincronizadas ambas fuentes de verdad.
- **Razón**: Anteriormente, solo se guardaba `editableDoc` y un `manualMarkdown` desfasado. Al reabrir manuales, la estructura de cargos y criterios debía re-parsearse o se perdían las ediciones profundas, provocando errores de colisión de datos.

### 2. Protocolo de Transición y Cancelación de Timers
- **Enfoque Seleccionado**: En `handleLoadManualFromDb`, cancelar inmediatamente `autoSaveTimerRef.current`, ejecutar un flush sincrónico si había modificaciones en el documento previo bajo su propio ID, limpiar el estado y cargar el nuevo registro con valores por defecto seguros.
- **Razón**: Previene que el temporizador de auto-guardado de 5 segundos se dispare después de haber cambiado `activeManualId`, evitando que sobreescriba el manual recién cargado con los datos del manual saliente.

### 3. Normalizador Inline de Formato (`formatInline`)
- **Enfoque Seleccionado**: Generalizar `formatInline(text)` en un módulo utilitario común e integrarlo en `CriterioBlockView`, `CargoBlockView`, `GlosarioItem`, `renderFormattedIntermediateContent` y `Page1EditableLayout`. Adicionalmente, sanitizar viñetas para remover asteriscos literales si la etiqueta ya posee negrita estructural.
- **Razón**: Garantiza que el usuario pueda escribir `**palabra**` y verla convertida inmediatamente en negrita sin que queden caracteres sueltos al imprimir o desactivar el modo edición.

---

## 4. Arquitectura Técnica y Estrategia de Datos

### Diagrama de Flujo y Aislamiento de Estado

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Base de Datos / UI                             │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                    1. Clic en "Abrir Manual B"
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               Manejador de Carga: handleLoadManualFromDb                │
│                                                                         │
│  a) Cancelar autoSaveTimerRef activo (clearTimeout)                     │
│  b) Si hasUnsavedChanges = true: Guardar Manual A con su propio ID      │
│  c) Resetear estados en memoria (manualData, signers, approvalAreas)   │
│  d) Hidratar estado exclusivamente con los datos de Manual B            │
│  e) Establecer hasUnsavedChanges = false, syncStatus = 'saved_local'    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                     2. Renderizado de Páginas
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               Motor de Renderizado (ManualPageRenderer)                 │
│                                                                         │
│  - Sección 10 Gobernanza:                                               │
│    "...bajo la responsabilidad directa del Gerente de [Proceso Title]"  │
│                                                                         │
│  - Bloques de Criterios, Cargos y Glosario (isEditing = false):         │
│    formatInline(texto) ──► Transforma **palabra** en <strong>palabra    │
│    Elimina asteriscos visibles en pantalla y en exportación PDF/DOCX    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Módulos a Actualizar
- `src/App.tsx`:
  - Asegurar la inclusión de `manualData` en `StoredManualRecord` al guardar y auto-guardar.
  - Sincronizar `manualMarkdown` llamando a `manualDataToMarkdown(manualData, currentMeta)`.
  - En `handleLoadManualFromDb`, cancelar debounces pendientes, resetear todos los campos sin arrastrar valores residuales y aislar la carga.
  - Actualizar `renderFormattedIntermediateContent` para preservar negritas reales sin asteriscos.
- `src/components/ManualPageRenderer.tsx`:
  - Aplicar `formatInline` en `CargoBlockView`, `CriterioBlockView` (`v.detalle`, `rawTexto`), `GlosarioItem` y `RenderBlockView`.
  - Actualizar el bloque de `normas_dueno` para finalizar con `"bajo la responsabilidad directa del Gerente de [Proceso]"`.
- `server.ts` y `src/utils/paginate.ts`:
  - Sincronizar la constante de gobernanza documental en el prompt de Gemini y en el generador de Markdown para usar el estándar `"del Gerente de [Proceso]"`.
