# Renovación de Parámetros de Dirección, Directores y Barra Ejecutiva Innovadora

Plan integral para dotar de control dinámico y persistente a las Direcciones Adscritas y Directores Aprobadores en los parámetros del proceso, depurar la etiqueta formal eliminando "(Canguro Venezuela)", y transformar la barra superior de acciones en una interfaz ejecutiva moderna con efecto vidrio, badges y agrupación estética.

## Decisiones de Usuario & Decisiones Críticas

> [!IMPORTANT]
> Se han incorporado las decisiones confirmadas por el usuario en la fase de clarificación interactiva:
> - **Gestión de Direcciones y Directores**: Gestor modal interactivo accesible desde los parámetros para agregar nuevas direcciones, editar directores existentes y eliminar direcciones obsoletas.
> - **Estilo de la Barra Superior**: Barra ejecutiva moderna con acabado de vidrio (*glassmorphism*), badges de estado pulidos y agrupación estética por función (Edición, Vistas, Exportación).
> - **Persistencia de Datos**: Almacenamiento local (*localStorage*) automático para conservar los directores y direcciones personalizadas entre sesiones sin perder configuraciones futuras.

---

## 1. Visión General & Concepto Central

- **Qué hace**: Permite a los líderes y redactores de procesos de Districueros El Canguro C.A. actualizar con total flexibilidad el organigrama de Direcciones Adscritas y Directores Aprobadores (Firma 4) desde el panel izquierdo, guardando los cambios de forma permanente en su navegador. Asimismo, moderniza la experiencia global mediante una barra de herramientas superior innovadora de nivel ejecutivo.
- **Público Objetivo**: Coordinadores y analistas de Formación y Desarrollo, directores de área y auditores de procesos corporativos.
- **Valor Clave**: Adaptabilidad futura ante cambios de directores o creación de nuevas direcciones operativas, sin requerir cambios de código fuente, manteniendo la formalidad y elegancia visual de la plataforma.

---

## 2. Experiencia de Usuario & Diseño Visual

### Flujo de Interacción
1. **Parámetros del Proceso (Panel Izquierdo)**:
   - En el campo **DIRECCIÓN ADSCRITA**, se retira la coletilla `(Canguro Venezuela)`, quedando el encabezado limpio: `DIRECCIÓN ADSCRITA`.
   - Junto al selector de Dirección Adscrita y en el bloque del **Director Aprobador (Firma 4 - Organigrama Oficial)**, se incorpora un botón de acción estilizado **"Administrar Direcciones & Directores"** (o icono de configuración de organigrama).
   - Al pulsar dicho botón, se abre un **Gestor Modal Interactivo**:
     - Visualiza la lista completa de direcciones con sus directores asignados.
     - Permite editar in situ el nombre de la dirección y el nombre del director titular.
     - Permite hacer clic en **"+ Nueva Dirección"** para ingresar una nueva gerencia/dirección corporativa con su director.
     - Permite eliminar direcciones que ya no existan en la organización.
     - Incluye botón de restablecimiento para volver a los valores originales de fábrica de Canguro Venezuela en caso de error.
   - En el selector principal de parámetros, el campo del Director Aprobador refleja de inmediato la selección y permite sobreescribir el nombre para el documento actual sin alterar el catálogo si se requiere una aprobación ad-hoc.

2. **Barra Superior Ejecutiva e Innovadora**:
   - **Estética Glassmorphism**: Fondo con desenfoque de fondo sutil `backdrop-blur-md bg-white/90 border-b border-zinc-200/80 shadow-xs`.
   - **Agrupación Inteligente**:
     - *Bloque de Marca & Documento*: Logotipo con insignia sutil de estado del manual.
     - *Bloque de Asistencia & Creación*: Botón "Cargar Ejemplo" con estilo cápsula refinada y microinteracción.
     - *Bloque de Edición & Vista*: Toggle de "Modo Edición" con indicador de estado (Activo/Inactivo) mediante badge visual nítido; botón de alternancia "Hoja Completa / Vista Dividida".
     - *Bloque de Exportación Premium*: Botón principal "Descargar PDF" destacado con el color emblemático `#fed700` y borde fino contrastado; botones discretos de "Imprimir" y "Word" agrupados con separador visual elegante.

---

## 3. Decisiones de Producto & Trade-Offs

- **Decisión 1: Gestor Modal vs. Edición en cascada en el panel**
  - *Enfoque*: Gestor Modal Interactivo dedicado.
  - *Por qué*: Mantiene el panel de parámetros limpio y compacto, evitando que una lista extensa de direcciones sature la vista de redacción y apuntes de entrevista.
- **Decisión 2: Persistencia en LocalStorage**
  - *Enfoque*: Guardar el mapeo `{ [direccion]: nombreDirector }` en `localStorage` (`canguro_directores_catalogo`).
  - *Por qué*: Garantiza que cuando el usuario cierre el navegador o vuelva mañana, las direcciones y directores agregados o editados permanezcan guardados de forma segura e inmediata en su equipo sin dependencias de backend complejas.
- **Decisión 3: Etiqueta de Dirección Adscrita**
  - *Enfoque*: Eliminar `(Canguro Venezuela)` de la etiqueta formal tanto en el formulario como en el encabezado si aplica, manteniendo la referencia institucional en el código y portada corporativa.

---

## 4. Arquitectura Técnica & Estrategia de Datos

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Barra Superior Ejecutiva                        │
│   [Logo Canguro] ── [Cargar Ejemplo] ── [Modo Edición] ── [Exportar]   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
          ┌─────────────────────────┴────────────────────────┐
          ▼                                                  ▼
┌───────────────────────────────────────┐  ┌─────────────────────────────┐
│ Panel Izquierdo: Parámetros           │  │ Visor del Manual & Hojas A4 │
│                                       │  │                             │
│ • Código, Versión, Clasificación      │  │ • Hoja 1: Macroflujograma,  │
│ • DIRECCIÓN ADSCRITA [Selector Limpio]│  │   Áreas aprobadoras dinámicas│
│ • Director Aprobador (Firma 4)        │  │ • Hojas 2-7: Normas Lean     │
│   ┌───────────────────────────────┐   │  │ • Cuadro de Firmas:         │
│   │ [⚙️ Administrar Direcciones]  │───┼──┤   Distribución horizontal   │
│   └───────────────┬───────────────┘   │  │   con firmas ampliadas 45%  │
└───────────────────┼───────────────────┘  └─────────────────────────────┘
                    ▼
     ┌───────────────────────────────┐
     │  Modal Gestor de Organigrama  │
     │  - Agregar Dirección          │
     │  - Editar Dirección/Director  │
     │  - Eliminar Dirección         │
     │  - Restablecer Valores Base   │
     │  - Sync con localStorage      │
     └───────────────────────────────┘
```

### Estructura de Datos & Estado
- Estado reactivo `directionsCatalog: Record<string, string>` inicializado desde `localStorage.getItem('canguro_directores_catalogo')` o con fallback al diccionario oficial de Canguro.
- `localStorage` se sincroniza automáticamente ante cualquier adición, edición o eliminación de directores/direcciones.
- Sincronización automática de `directorApprover` y del slot 3 de `signers` (Firma 4 - Director Aprobador) en el documento en vivo.

---

## 5. Plan de Verificación

1. **Prueba de Modal de Direcciones**: Abrir el modal, agregar una nueva dirección ficticia ("Dirección de Operaciones Especiales" con su director), verificar que se actualiza el selector y persiste tras recargar.
2. **Prueba de Edición de Director**: Cambiar el director de una dirección existente ("Harold Veracierta" por otro nombre) y constatar que se actualiza en el selector de parámetros y en la casilla de Firma 4 del pie de firmas.
3. **Prueba de Eliminación**: Eliminar una dirección y verificar que ya no aparece en el listado desplegable.
4. **Verificación de Etiqueta**: Confirmar que en ningún lugar del panel izquierdo diga `DIRECCIÓN ADSCRITA (Canguro Venezuela)`, sino únicamente `DIRECCIÓN ADSCRITA`.
5. **Verificación de la Barra Superior**: Comprobar el nuevo diseño ejecutivo con efecto vidrio, badges y contrastes en pantallas desktop y móviles.
6. **Compilación & Calidad**: Ejecutar `tsc --noEmit` y `vite build` para asegurar cero errores de tipo y una construcción limpia.
