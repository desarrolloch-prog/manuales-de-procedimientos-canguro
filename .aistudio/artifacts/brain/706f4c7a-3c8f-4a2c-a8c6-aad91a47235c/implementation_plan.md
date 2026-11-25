# Plan de Implementación: Modo Presentación a Pantalla Completa Real y Escalado Automático

## Contexto y Diagnóstico
En la captura enviada por el usuario (`image_04104641.png`), se identificaron dos problemas críticos al activar el modo presentación:
1. **La presentación no ocupa la pantalla completa del monitor:** Se queda restringida dentro del marco de la ventana/iframe del navegador, desaprovechando el espacio y sin activar la API Fullscreen nativa del sistema operativo.
2. **Corte vertical del contenido:** La Sección 6 (*ÁREAS APROBADORAS*) queda cortada por la mitad y el cuadro inferior con las 5 firmas oficiales desaparece completamente por debajo de la pantalla. Esto sucede porque el contenido interno requiere aproximadamente 840px de altura para desplegarse, y al forzar dimensiones sin un escalado de transformación (`transform: scale(...)`), el exceso de altura se desborda y se pierde.

---

## Solución Técnica y Cambios Propuestos

### 1. Pantalla Completa Nativa del Monitor (`Fullscreen API`)
- Al presionar el botón de **"Presentar"**, se activará automáticamente el modo pantalla completa nativo del navegador (`document.documentElement.requestFullscreen()`).
- Se añade un botón flotante discreto de pantalla completa (maximizar/restaurar) en la esquina superior derecha junto a la `✕`, visible al mover el ratón.
- Al salir de la presentación (tecla <kbd>Esc</kbd> o botón `✕`), se cerrará automáticamente la pantalla completa (`document.exitFullscreen()`).

### 2. Escalado Proporcional Inteligente (*Scale-to-Fit*)
- Implementar un cálculo reactivo de escala en `PresentationModeViewer`:
  - Se define la lámina oficial de manual a una resolución canónica de **1240px × 840px** (proporción exacta de la hoja A4 apaisada con margen corporativo).
  - Mediante un hook de tamaño de ventana (`window.innerWidth`, `window.innerHeight`), se calcula el factor de escala óptimo:
    $$\text{scale} = \min\left(\frac{\text{ancho disponible}}{1240}, \frac{\text{alto disponible}}{840}\right)$$
  - Se aplica `transform: scale(scale)` centrado en pantalla.
- **Resultado garantizado:**
  - El 100% de la lámina se visualiza sin ningún corte.
  - El membrete superior, el objetivo, el alcance, el flujograma, las áreas aprobadoras y los 5 cuadros de firmas estarán siempre visibles al mismo tiempo en cualquier resolución (pantallas de laptop, monitores 1080p, 2K, 4K o marcos integrados).
  - Cero barras de desplazamiento vertical u horizontal.

### 3. Navegación y Controles
- Controles discretos que aparecen únicamente al mover el cursor y se desvanecen automáticamente tras 2 segundos de inactividad:
  - Flechas laterales de avance y retroceso (`<` y `>`).
  - Botón de salir `✕` y botón de pantalla completa en la esquina superior derecha.
  - Navegación por teclado con <kbd>→</kbd>, <kbd>←</kbd>, <kbd>Espacio</kbd> y salida con <kbd>Esc</kbd>.

---

## Plan de Verificación
1. Abrir el manual y presionar el botón de **"Presentar"**.
2. Comprobar que el monitor entra en pantalla completa nativa.
3. Verificar que en la **Página 1**, tanto la Sección 6 (*Áreas Aprobadoras*) como la totalidad del **cuadro de las 5 firmas** se visualicen íntegros y nítidos sin cortes.
4. Navegar a las páginas subsiguientes (2 a 6) y verificar que todas las secciones y firmas se mantengan centradas y completas.
5. Probar la salida mediante <kbd>Esc</kbd> o la `✕` flotante y comprobar que la pantalla completa se restaura limpiamente.
6. Ejecutar `compile_applet` y `lint_applet` para garantizar cero errores de código.
