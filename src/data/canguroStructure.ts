export interface DireccionOficial {
  id: string;
  nombre: string;
  directorSugerido: string;
  dueñosHabituales: string[];
}

export const DIRECCIONES_CANGURO: DireccionOficial[] = [
  {
    id: 'OPERACIONES',
    nombre: 'OPERACIONES',
    directorSugerido: 'Luis González',
    dueñosHabituales: [
      'Gerencia de Tiendas y Puntos de Venta',
      'Gerencia de Servicio Técnico (SAT FIX)',
      'Supervisión de Zonas y Sucursales'
    ]
  },
  {
    id: 'COMPRAS',
    nombre: 'COMPRAS',
    directorSugerido: 'Juan Diego Ayala',
    dueñosHabituales: [
      'Gerencia de Compras e Importaciones',
      'Jefatura de Procura Internacional',
      'Coordinación de Garantías con Proveedores'
    ]
  },
  {
    id: 'COMERCIAL',
    nombre: 'COMERCIAL',
    directorSugerido: 'Juan Pablo Layrise',
    dueñosHabituales: [
      'Gerencia Comercial y Mercadeo',
      'Jefatura de Ventas Mayoristas',
      'Coordinación de Marketing Digital y Canales'
    ]
  },
  {
    id: 'TRANSPORTE Y LOGÍSTICA',
    nombre: 'TRANSPORTE Y LOGÍSTICA',
    directorSugerido: 'Gabriel Saavedra',
    dueñosHabituales: [
      'Gerencia de Transporte y Logística',
      'Supervisión de Logística Inversa',
      'Jefatura de Almacén CENDIS',
      'Coordinación de Despacho y Rutas'
    ]
  },
  {
    id: 'TALENTO HUMANO',
    nombre: 'TALENTO HUMANO',
    directorSugerido: 'Jeanette Arvelo',
    dueñosHabituales: [
      'Gerencia de Formación y Desarrollo',
      'Gerencia de Talento Humano y Selección',
      'Coordinación de Nómina y Compensación'
    ]
  },
  {
    id: 'TECNOLOGÍA',
    nombre: 'TECNOLOGÍA',
    directorSugerido: 'Harold Veracierta',
    dueñosHabituales: [
      'Gerencia de Sistemas e Infraestructura',
      'Jefatura de ERP Odoo y Desarrollos',
      'Coordinación de Soporte y Comunicaciones'
    ]
  },
  {
    id: 'ADMINISTRACIÓN Y FINANZAS',
    nombre: 'ADMINISTRACIÓN Y FINANZAS',
    directorSugerido: 'Gustavo Arria',
    dueñosHabituales: [
      'Gerencia de Tesorería y Facturación',
      'Gerencia de Contabilidad General',
      'Jefatura de Cuentas por Cobrar y Pagar'
    ]
  },
  {
    id: 'CONTROL INTERNO',
    nombre: 'CONTROL INTERNO',
    directorSugerido: 'Jacobo Caicedo',
    dueñosHabituales: [
      'Gerencia de Auditoría Interna',
      'Jefatura de Cumplimiento y Normas',
      'Coordinación de Control de Gestión'
    ]
  }
];

export const DIRECTORES_POR_DIRECCION: Record<string, string> = {
  'OPERACIONES': 'Luis González',
  'COMPRAS': 'Juan Diego Ayala',
  'COMERCIAL': 'Juan Pablo Layrise',
  'TRANSPORTE Y LOGÍSTICA': 'Gabriel Saavedra',
  'TALENTO HUMANO': 'Jeanette Arvelo',
  'TECNOLOGÍA': 'Harold Veracierta',
  'ADMINISTRACIÓN Y FINANZAS': 'Gustavo Arria',
  'CONTROL INTERNO': 'Jacobo Caicedo'
};

export const CODIGOS_NUMERICOS = Array.from({ length: 50 }, (_, i) => String(i + 1).padStart(2, '0'));
export const VERSIONES_NUMERICAS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];
export const CLASIFICACIONES_PROCESO = ['Crítico.', 'Estratégico.', 'Operativo / Soporte.'];

export const EJEMPLO_REAL_LOGISTICA = {
  codeNumber: '05',
  version: '01',
  classification: 'Crítico.',
  processName: 'LOGÍSTICA INVERSA',
  direction: 'TRANSPORTE Y LOGÍSTICA',
  owner: 'Gerencia de Transporte y Logística / Supervisión de Logística Inversa',
  directorApprover: 'Gabriel Saavedra',
  participants: 'Dirección de Logística, Dirección de Compras',
  tools: 'ERP Odoo, Google Drive, Email, WhatsApp',
  roles: 'Supervisor de Logística Inversa, Coordinador de Trazabilidad y Garantías / Técnico de Reacondicionamiento',
  narrative: `Cuando llega un camión de ruta a CENDIS, Despacho avisa inmediatamente a Logística Inversa. El operador descarga las cestas y paletas a la Zona Mixta y envía obligatoriamente un reporte fotográfico por WhatsApp al grupo oficial indicando: Ruta, Placa del camión y Cantidad exacta de cestas recibidas.

Luego se abre cesta por cesta y se audita el contenido físico contra el número de traslado emitido en el ERP Odoo por la tienda de origen. Si existen faltantes o sobrantes, el operador notifica al Supervisor de Logística Inversa para gestionar el ajuste de inventario en Odoo y contactar al Encargado de la tienda correspondiente.

Clasificación de la mercancía:
1. Devoluciones: Sobrestock en perfecto estado estético y operativo. Está terminantemente prohibido almacenar devoluciones en el área de reversa: en cuanto se confirma la auditoría en Odoo, se transfieren física y administrativamente al almacén de Picking para su redistribución.
2. Garantías: Accesorios o equipos con fallas técnicas o empaques deteriorados. Pasan a inspección minuciosa pieza por pieza en el banco de pruebas.
   - En el caso de cornetas, televisores y equipos mayores, se remiten al Servicio FIX para diagnóstico y reparación interna.
   - Si el empaque original está en óptimas condiciones, se mantiene el mismo SKU en Odoo.
   - Si el empaque está roto o rayado, se remite el empaque a Scrap y se solicita a Producción un Empaque Universal Canguro, reclasificando el producto en Odoo con el SKU correspondiente.
   - En combos de cubo + cable, se prueban ambos componentes por separado: el componente defectuoso va a Scrap y el componente operativo se reempaca de forma individual.
   - Los teléfonos en garantía se custodian en gavetas bajo llave, se consolidan en lotes y se envían a la Dirección de Compras para la emisión de Nota de Crédito con el fabricante/proveedor.

Cierre de jornada:
Todo movimiento del día debe quedar asentado en Odoo antes de las 5:00 p.m. Se realiza el arqueo físico de la Zona Mixta garantizando que no quede mercancía sin identificar.`,
  manualPreGenerado: `# MANUAL DE PROCEDIMIENTOS - LOGÍSTICA INVERSA

| Fecha de Emisión | Fecha de Actualización | Versión | Código | Clasificación del Proceso |
| :--- | :--- | :--- | :--- | :--- |
| 28/10/2026 | 28/10/2026 | 01 | DTH-GFD-MP-05 | Uso Interno |

## [1] OBJETIVO
Establecer de forma técnica y estandarizada los criterios operativos, controles normativos y gobernanza que rigen la Logística Inversa en Districueros El Canguro C.A., asegurando la trazabilidad en ERP Odoo y mitigando mermas.

## [2] ALCANCE
Abarca desde la recepción y auditoría de mercancías devueltas en la Zona Mixta de CENDIS, pasando por el diagnóstico técnico y reempaque, hasta la transferencia a picking o scrap en todas las sedes y tiendas de Districueros El Canguro C.A.

## [3] CONTROL DE VERSIONES
- **Descripción:** Nuevo

## [4] CLASIFICACIÓN
- **Clasificación del Proceso:** Crítico.

## [5] VISIÓN EXTENDIDA DEL PROCESO
**Inicio** ➔ **[Recepción en Zona Mixta]** ➔ **[Auditoría Física vs Odoo]** ➔ **[Diagnóstico y Pruebas]** ➔ **[Reempaque Universal]** ➔ **[Transferencia a Picking]** ➔ **[Conciliación Diaria]** ➔ **Fin**

## [6] ÁREAS APROBADORAS
| Área / Dirección / Gerencia | Rol en el Proceso |
| :--- | :--- |
| GERENCIA DE TRANSPORTE Y LOGÍSTICA | Dueño del proceso |
| Dirección de Transporte y Logística | Participante |
| Gerencia de Formación y Desarrollo | Participante |

===PAGINA_2===

## [7] HERRAMIENTAS TECNOLÓGICAS
- ERP Odoo
- Google Drive
- WhatsApp
- Correo Electrónico

## [8] DOCUMENTOS DEROGADOS
N/A

===PAGINA_3===

## [9] GLOSARIO DE TÉRMINOS
- **Albarán de Traslado:** Documento electrónico en ERP Odoo que formaliza la transferencia de stock.
- **CENDIS:** Centro Nacional de Distribución y almacenamiento de Districueros El Canguro C.A.
- **Discrepancia:** Diferencia física confirmada respecto al traslado registrado en sistema ERP Odoo.
- **ERP Odoo:** Plataforma informática central para el control de inventario, traslados y movimientos.
- **Logística Inversa:** Gestión operativa del flujo de mercancía devuelta para su reincorporación o baja.
- **Picking:** Alistamiento y verificación física de productos solicitados para despacho a tiendas.
- **SKU:** Identificador alfanumérico único en ERP Odoo para cada producto del catálogo comercial.
- **Zona Mixta:** Área física delimitada en muelle para la descarga transitoria y conteo previo a auditoría.

===PAGINA_4===

## [10] NORMAS DEL PROCESO

### 1. DUEÑO DEL PROCESO Y GOBERNANZA DOCUMENTAL
Para la presente documentación, queda definida formalmente como Dueño del Proceso la **Gerencia de Transporte y Logística**, adscrita a la **Dirección de Transporte y Logística** bajo la responsabilidad directa del Gerente de Logística Inversa.

**1.1. Obligatoriedad de Actualización:** La actualización del manual será de carácter obligatorio e inmediato ante cambios organizacionales, reestructuración operativa o ajustes de parametrización en ERP Odoo.

### 2. SEGURIDAD DE LA INFORMACIÓN, CONFIDENCIALIDAD Y USO DE HERRAMIENTAS
**2.1. Confidencialidad:** Toda la información manejada tiene carácter ESTRICTAMENTE CONFIDENCIAL Y DE USO INTERNO EXCLUSIVO.
**2.2. Custodia de Accesos:** Las credenciales de ERP Odoo y Google Drive son personales e intransferibles. Queda prohibido ceder accesos.
**2.3. Canales Oficiales:** ERP Odoo para registros y transferencias; WhatsApp para reportes inmediatos; Email para comunicaciones formales; Google Drive para resguardo de actas.

===PAGINA_5===

## [10] NORMAS DEL PROCESO

### 3. ESTRUCTURA ORGANIZACIONAL
En estricto apego al Organigrama Corporativo de la **Dirección de Transporte y Logística** y las descripciones de cargo aprobadas, la estructura de la **Gerencia de Transporte y Logística** se conforma de la siguiente manera:

**3.1. Director de Transporte y Logística**
Objetivo del Cargo: Definir lineamientos directivos, presupuestos y políticas del área.
Responsabilidades:
• Aprobar las políticas operativas y lineamientos rectores del área.
• Validar operaciones extraordinarias y asignación de recursos.
• Evaluar el cumplimiento de metas y acuerdos de servicio (SLA).

**3.2. Gerente de Transporte y Logística**
Objetivo del Cargo: Liderar la ejecución integral diaria del proceso asegurando trazabilidad.
Responsabilidades:
• Monitorear los flujos operativos y tiempos de ciclo del departamento.
• Auditar la conciliación física versus los registros en ERP Odoo.
• Resolver discrepancias técnicas y no conformidades operativas.

**3.3. Supervisor de Logística Inversa**
Objetivo del Cargo: Coordinar turnos operativos y certificar la calidad documental en tiempo real.
Responsabilidades:
• Distribuir tareas operativas y supervisar el orden en puestos de trabajo.
• Verificar que cada movimiento cuente con soporte formal en ERP Odoo.
• Asentar incidencias y garantizar cero pendientes al cierre de jornada.

===PAGINA_6===

## [10] NORMAS DEL PROCESO

**3.4. Analista de Logística Inversa**
Objetivo del Cargo: Ejecutar las tareas técnicas de inspección, cotejo y registro en sistema.
Responsabilidades:
• Inspeccionar insumos físicos y confrontar contra órdenes en ERP Odoo.
• Registrar transferencias y validar datos en los módulos del sistema.
• Cargar soportes firmados y expedientes en carpetas de Google Drive.

### 4. CRITERIOS TÉCNICOS DEL PROCESO DE LOGÍSTICA INVERSA

**4.1. Protocolo Obligatorio de Recepción y Evidencia Fotográfica:**
• Descarga y Registro: Al arribar el camión, descargar a Zona Mixta y remitir foto de placa y cestas vía WhatsApp.
• Validación Previa: Ninguna cesta podrá abrirse sin el registro fotográfico previo verificado.

**4.2. Auditoría Cesta por Cesta contra Traslado en ERP Odoo:**
• Cotejo Físico: Auditar minuciosamente el contenido de cada cesta contra la guía de traslado del ERP Odoo.
• Gestión de Desviaciones: Paralizar lotes con discrepancias y notificar a supervisión para regularizar en sistema.

**4.3. Clasificación Técnica de Garantías y Reempaque:**
• Banco de Pruebas: Evaluar funcionalidad técnica en banco; remitir equipos mayores a Servicio FIX.
• Empaque Universal: Sustituir empaques rotos por Empaque Universal Canguro reasignando SKU en Odoo.

**4.4. Conciliación Diaria y Cierre Operativo a las 5:00 p.m.:**
• Corte Diario: Efectuar el balance obligatorio entre cestas procesadas y transferencias en ERP Odoo.
• Cero Pendientes: Prohibido culminar el turno con traslados en borrador o mercancía sin conciliar.`,
  leanPreGenerado: `# INFORME EJECUTIVO DE AUDITORÍA Y DIAGNÓSTICO OPERATIVO
(Districueros El Canguro C.A.)

## 1. RESUMEN EJECUTIVO
Proceso activo pero vulnerable por desfases temporales entre movimientos en piso y registro en Odoo. La estandarización de criterios normados y resguardo en Google Drive garantizará trazabilidad auditable integral.

## 2. HALLAZGOS Y DEBILIDADES OPERATIVAS CRÍTICAS
• Desfase Transaccional en ERP Odoo: Movimientos físicos en piso sin confirmación electrónica inmediata.
• Vulnerabilidad en Custodia Documental: Empleo de comprobantes impresos sin digitalización en Drive.
• Manejo No Estandarizado de Devoluciones: Discrepancias canalizadas verbalmente entre turnos.

## 3. PLAN DE ACCIÓN Y ESTANDARIZACIÓN INMEDIATA
• Registro Sincrónico en Odoo: Obligatoriedad de registrar traslados en el momento de su ejecución.
• Digitalización en Turno: Carga sistemática de soportes firmados en Google Drive antes del cierre.
• Bitácora de No Conformidades: Tipificación formal de discrepancias con notificación inmediata.

## 4. RECOMENDACIONES
• Prohibir movimientos físicos de mercancía sin comprobante validado en ERP Odoo.
• Efectuar conciliación diaria obligatoria a las 5:00 p.m. entre piso y sistema.
• Auditar semanalmente expedientes digitalizados en Google Drive corporativo.`
};

export const ESTRUCTURA_CANGURO = DIRECCIONES_CANGURO.map((d) => ({
  id: d.id,
  nombre: d.nombre,
  gerencias: [
    {
      id: `${d.id}-gerencia`,
      nombre: d.dueñosHabituales[0] || `Gerencia de ${d.nombre}`,
      prefijoCodigo: 'DTH-GFD-MP',
      procesosTipicos: [
        {
          nombre: `Proceso Operativo de ${d.nombre}`,
          objetivoSugerido: `Estandarizar las operaciones de ${d.nombre}`,
          alcanceSugerido: `Aplica a la Dirección de ${d.nombre}`,
          preguntasClave: ['¿Cuáles son las actividades principales?']
        }
      ]
    }
  ]
}));

export const TIPOS_MUDA_LEAN = [
  { tipo: 'Esperas (Wait)', label: 'Demoras por autorizaciones o respuestas de otras áreas' },
  { tipo: 'Defectos / Retrabajos (Defects)', label: 'Discrepancias físicas versus ERP Odoo' },
  { tipo: 'Sobreprocesamiento (Overprocessing)', label: 'Registros duplicados entre sistemas y libretas' },
  { tipo: 'Inventario (Inventory)', label: 'Acumulación de mercancía pendiente de clasificar' }
];
