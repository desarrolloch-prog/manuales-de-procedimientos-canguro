import { ProcessManual } from '../types/processManual';

export const SAMPLE_MANUAL_CANGURO: ProcessManual = {
  id: 'canguro-ope-tda-001',
  codigo: 'MAN-OPE-TDA-001',
  nombre: 'Atención al Cliente, Asesoría Especializada y Venta en Tienda Física',
  version: '1.0',
  fechaEmision: new Date().toISOString().split('T')[0],
  macroproceso: 'Operaciones Comerciales & Retail',
  tipoProceso: 'Operativo / Clave',
  propietario: 'Gerente de Tiendas y Puntos de Venta',
  direccion: 'Dirección de Operaciones Retail y Tiendas',
  gerencia: 'Gerencia de Tiendas y Puntos de Venta',
  objetivoGeneral: 'Estandarizar el protocolo de atención, asesoría técnica en accesorios y tecnología móvil, facturación y entrega del producto en la red nacional de sucursales de Canguro Venezuela, garantizando una experiencia de compra ágil, satisfacción del cliente y trazabilidad del inventario según normas de calidad Lean Six Sigma.',
  objetivosEspecificos: [
    'Asegurar un tiempo de respuesta menor a 30 segundos en el saludo inicial al cliente que ingresa a la sucursal.',
    'Verificar al 100% la compatibilidad y funcionalidad física de los accesorios (protectores, cargadores, cables, audífonos) antes del cobro para minimizar devoluciones (First Pass Yield > 98%).',
    'Registrar con exactitud los medios de pago recibidos (Punto de Venta, Biopago, Zelle, Efectivo Bs/USD) cumpliendo con las regulaciones fiscales vigentes.',
    'Disminuir las mermas y discrepancias de stock en sucursal mediante descarga inmediata en el sistema ERP.'
  ],
  alcance: {
    iniciaEn: 'Ingreso del cliente a la sucursal o vitrina de Canguro Venezuela.',
    incluye: 'Saludo institucional, detección de necesidades del dispositivo móvil, demostración del producto, prueba de encendido/carga si aplica, registro en sistema de facturación, procesamiento de cobro multimoneda, empaque y entrega de garantía.',
    terminaEn: 'Entrega del producto empacado, factura fiscal emitida y despedida de cortesía al cliente.',
    areasAplicables: [
      'Red de Sucursales Gran Caracas',
      'Sucursales Región Central, Occidente y Oriente',
      'Encargados de Tienda',
      'Asesores de Ventas',
      'Cajeros'
    ]
  },
  gobernanza: {
    descripcionJerarquica: 'El proceso depende jerárquicamente de la Dirección de Operaciones Retail, supervisado por la Gerencia de Tiendas a través de los Supervisores de Zona. En cada tienda, el Encargado de Sucursal es el responsable directo de vigilar el cumplimiento del protocolo, la custodia del inventario y la validación de anulaciones o excepciones.',
    rolesClave: [
      {
        cargo: 'Gerente de Tiendas',
        rolEnProceso: 'Dueño del Proceso (Process Owner)',
        responsabilidadPrincipal: 'Aprobar políticas operativas, vigilar KPIs de ventas y devoluciones, y autorizar cambios de versión al manual.'
      },
      {
        cargo: 'Supervisor de Zona',
        rolEnProceso: 'Auditor Operativo',
        responsabilidadPrincipal: 'Auditar el cumplimiento del protocolo en tienda, autorizar notas de crédito especiales y revisar arqueos.'
      },
      {
        cargo: 'Encargado de Tienda',
        rolEnProceso: 'Líder de Sucursal',
        responsabilidadPrincipal: 'Supervisar la atención al cliente, custodiar el inventario, autorizar descuentos promocionales y realizar cierre diario de caja.'
      },
      {
        cargo: 'Asesor de Ventas / Cajero',
        rolEnProceso: 'Ejecutor Operativo',
        responsabilidadPrincipal: 'Brindar asesoría técnica personalizada, realizar pruebas de producto, facturar en el sistema y entregar comprobantes.'
      }
    ],
    matrizRaci: [
      {
        faseActividad: '1. Bienvenida y Asesoría Técnica del Accesorio',
        r: 'Asesor de Ventas',
        a: 'Encargado de Tienda',
        c: 'Gerencia de Mercadeo',
        i: 'Supervisor de Zona'
      },
      {
        faseActividad: '2. Prueba Física y Verificación de Compatibilidad',
        r: 'Asesor de Ventas',
        a: 'Encargado de Tienda',
        c: 'Servicio Técnico (SAT)',
        i: 'Cliente'
      },
      {
        faseActividad: '3. Autorización de Descuento o Promoción Especial',
        r: 'Encargado de Tienda',
        a: 'Supervisor de Zona',
        c: 'Dirección Comercial',
        i: 'Asesor de Ventas'
      },
      {
        faseActividad: '4. Facturación en ERP y Cobro Multimoneda',
        r: 'Cajero / Asesor',
        a: 'Encargado de Tienda',
        c: 'Tesoreria / Administración',
        i: 'Auditoría Interna'
      },
      {
        faseActividad: '5. Entrega de Mercancía y Sellado de Garantía Canguro',
        r: 'Asesor de Ventas',
        a: 'Encargado de Tienda',
        c: 'Gerencia de Calidad',
        i: 'Cliente'
      },
      {
        faseActividad: '6. Arqueo y Conciliación Diaria de Caja',
        r: 'Encargado de Tienda',
        a: 'Auditoría Interna',
        c: 'Tesoreria Central',
        i: 'Gerencia de Tiendas'
      }
    ]
  },
  sipoc: {
    proveedores: [
      'Almacén Central CDI (Suministro de stock)',
      'Gerencia de Mercadeo (Listas de precios y promociones)',
      'Cliente (Requerimiento de compra)',
      'Bancos y Plataformas de Pago (Puntos de venta, Biopago)'
    ],
    entradas: [
      'Inventario físico verificado en tienda',
      'Requerimiento específico del cliente (modelo de teléfono)',
      'Lista oficial de precios y descuentos vigentes en ERP',
      'Efectivo o instrumentos de pago electrónicos'
    ],
    macroPasos: [
      'Recepción y saludo institucional al cliente',
      'Indagación del modelo de celular y asesoría técnica',
      'Comprobación de compatibilidad y prueba de funcionamiento',
      'Facturación en sistema y cobro de la transacción',
      'Empaque, entrega de comprobante de garantía y despedida'
    ],
    salidas: [
      'Accesorio o dispositivo verificado y empacado',
      'Factura fiscal emitida y ticket de compra',
      'Certificado de garantía sellado con vigencia',
      'Actualización inmediata de inventario en ERP'
    ],
    clientes: [
      'Cliente final (comprador en tienda)',
      'Departamento de Contabilidad y Tesorería',
      'Auditoría y Control de Inventarios'
    ]
  },
  analisisLean: {
    desperdiciosMudaIdentificados: [
      {
        tipoMuda: 'Esperas (Wait)',
        descripcion: 'Demora en la aprobación de notas de crédito o descuentos por falta de supervisor en línea.',
        impacto: 'Cliente insatisfecho esperando en fila hasta 15 minutos en horario pico.',
        accionKaizen: 'Establecer matriz de autorización delegada en el Encargado de Tienda con límite de hasta $50 sin consulta previa.'
      },
      {
        tipoMuda: 'Defectos / Retrabajos (Defects)',
        descripcion: 'Venta de cables o protectores que no corresponden al modelo exacto del teléfono del cliente.',
        impacto: 'Devoluciones al día siguiente, reclamos y tiempo perdido en postventa.',
        accionKaizen: 'Verificación técnica obligatoria: Probar el accesorio o validar la cámara/medida frente al cliente antes de imprimir la factura fiscal.'
      },
      {
        tipoMuda: 'Sobreprocesamiento (Overprocessing)',
        descripcion: 'El cajero anota la venta en una libreta manual y luego la digita en el sistema ERP.',
        impacto: 'Doble trabajo, retraso en la fila y riesgo de error por transcripción manual.',
        accionKaizen: 'Eliminar el cuaderno manual; capacitar al personal para facturación directa en pantalla del sistema.'
      }
    ],
    puntosCriticosCalidad: [
      'Inspección visual del conector y empaque del accesorio antes del cobro.',
      'Verificación de autenticidad de billetes en divisas con detector UV y rotulador.',
      'Cotejo del monto cobrado en el punto de venta contra el total de la factura fiscal.'
    ]
  },
  politicasYReglas: [
    'Es obligatorio saludar a todo cliente antes de 30 segundos con el slogan oficial de Canguro Venezuela y una actitud cortés y orientada al servicio.',
    'Ningún producto o accesorio puede salir de la sucursal sin su correspondiente factura fiscal emitida y entregada al cliente.',
    'En el caso de protectores de hidrogel o vidrio templado, la instalación en tienda por parte del asesor es un valor agregado de cortesía y debe ser probada ante el cliente.',
    'Todo cobro en divisas en efectivo debe ser verificado con luz ultravioleta y registrado en el arqueo con el número de serie de los billetes mayores a $50.',
    'Queda terminantemente prohibido utilizar el stock de exhibición o productos averiados para la venta sin previa desincorporación formal en el sistema ERP.',
    'Las devoluciones por garantía serán procesadas previa verificación de la factura de compra original dentro del lapso de garantía estipulado (30 a 90 días según el accesorio).'
  ],
  pasosProcedimiento: [
    {
      numero: 1,
      actividad: 'Saludo y Recepción del Cliente',
      responsable: 'Asesor de Ventas',
      descripcion: 'El asesor saluda al cliente con la frase institucional: "¡Bienvenido a Canguro Venezuela! ¿En qué accesorio o solución para tu teléfono te podemos asesorar hoy?". Observa con atención el modelo del dispositivo del cliente.',
      sistemaOherramienta: 'Protocolo de Servicio al Cliente',
      documentoSoporte: 'Checklist de Bienvenida',
      tiempoEstimado: '30 segundos',
      controlCalidad: 'Contacto visual directo y tono empático'
    },
    {
      numero: 2,
      actividad: 'Detección de Necesidad y Consulta de Modelo',
      responsable: 'Asesor de Ventas',
      descripcion: 'Consulta la marca y modelo exacto del equipo (ej. iPhone 14 Pro Max, Samsung A54, Xiaomi Redmi Note 12). Si el cliente tiene dudas, solicita autorización para verificar en "Configuración > Acerca del teléfono".',
      sistemaOherramienta: 'Catálogo de Accesorios Canguro',
      documentoSoporte: 'Ficha de Compatibilidad',
      tiempoEstimado: '1 minuto',
      controlCalidad: 'Confirmación exacta del modelo para evitar despachos erróneos'
    },
    {
      numero: 3,
      actividad: 'Demostración de Opciones y Prueba Física de Compatibilidad',
      responsable: 'Asesor de Ventas',
      descripcion: 'Presenta al menos 2 opciones de accesorios (ej. versión estándar versus versión premium de carga rápida). Extrae la muestra y realiza la prueba de compatibilidad física frente al cliente (probar que el case coincida con cámaras y botones; o probar que el cable active la carga rápida en el multímetro/tester de tienda).',
      sistemaOherramienta: 'Probador / Tester de Carga USB en Mostrador',
      documentoSoporte: 'Muestra de Exhibición',
      tiempoEstimado: '2 minutos',
      controlCalidad: 'Control de calidad: El cliente valida visualmente que el accesorio funciona antes de comprar'
    },
    {
      numero: 4,
      actividad: 'Registro de la Venta en Sistema ERP',
      responsable: 'Asesor de Ventas / Cajero',
      descripcion: 'Escanea el código de barras del SKU seleccionado mediante el lector óptico en el sistema de facturación. Verifica que la descripción y el precio en pantalla coincidan con la etiqueta del empaque.',
      sistemaOherramienta: 'Sistema ERP / Facturación Tiendas',
      documentoSoporte: 'Pantalla de Venta',
      tiempoEstimado: '45 segundos',
      controlCalidad: 'Uso obligatorio del lector de código de barras (prohibido tecleo manual de código)'
    },
    {
      numero: 5,
      actividad: 'Procesamiento del Pago Multimoneda',
      responsable: 'Cajero / Asesor',
      descripcion: 'Indica al cliente el monto total en Bolívares y su equivalente en divisas a la tasa oficial BCV. Procesa el medio de pago seleccionado: Punto de Venta (espera voucher aprobado), Biopago o Efectivo (pasa billetes por máquina detectora UV). Registra el tipo de moneda en el sistema.',
      sistemaOherramienta: 'Terminal POS / Detector UV / ERP',
      documentoSoporte: 'Voucher Bancario / Recibo de Caja',
      tiempoEstimado: '1.5 minutos',
      controlCalidad: 'Cotejo de número de referencia bancaria contra el reporte del sistema'
    },
    {
      numero: 6,
      actividad: 'Emisión de Factura Fiscal y Sellado de Garantía',
      responsable: 'Cajero / Asesor',
      descripcion: 'Imprime la factura fiscal en la impresora autorizada. Aplica el sello húmedo oficial de "Garantía Canguro Venezuela" en el reverso de la factura, indicando la fecha de vencimiento (30, 60 o 90 días) y firma del asesor.',
      sistemaOherramienta: 'Impresora Fiscal Autorizada',
      documentoSoporte: 'Factura Fiscal con Sello de Garantía',
      tiempoEstimado: '30 segundos',
      controlCalidad: 'Legibilidad completa de la impresión fiscal y sello de garantía visible'
    },
    {
      numero: 7,
      actividad: 'Empaque, Instalación de Cortesía y Despedida',
      responsable: 'Asesor de Ventas',
      descripcion: 'Si la compra incluye mica hidrogel o vidrio, procede a la instalación técnica en la mesa de trabajo con rodillo y luz UV. Empaca los productos en la bolsa institucional Canguro, entrega la factura y se despide cordialmente: "Gracias por tu compra en Canguro Venezuela, ¡esperamos verte pronto!".',
      sistemaOherramienta: 'Mesa de Instalación / Bolsa Canguro',
      documentoSoporte: 'Entrega en Mano al Cliente',
      tiempoEstimado: '2 a 3 minutos',
      controlCalidad: 'Mica sin burbujas ni polvo atrapado; entrega con bolsa sellada'
    }
  ],
  indicadoresKpi: [
    {
      nombre: 'Tiempo Total de Ciclo de Atención (Lead Time)',
      formula: 'Hora de emisión de factura - Hora de saludo inicial',
      meta: '< 7 minutos por cliente',
      frecuencia: 'Monitoreo diario por muestreo',
      responsableMedicion: 'Encargado de Tienda / Supervisor'
    },
    {
      nombre: 'Rendimiento de Primer Intento (First Pass Yield - FPY)',
      formula: '(Ventas sin reclamo ni devolución en 48h / Total de ventas) * 100',
      meta: '≥ 98.5%',
      frecuencia: 'Semanal',
      responsableMedicion: 'Gerencia de Calidad & Procesos'
    },
    {
      nombre: 'Índice de Discrepancia de Caja (Cash Discrepancy Rate)',
      formula: '(Diferencias en Arqueo / Total Facturado) * 100',
      meta: '≤ 0.05%',
      frecuencia: 'Diario al cierre',
      responsableMedicion: 'Auditoría Interna y Tesorería'
    }
  ],
  glosario: [
    {
      termino: 'CDI',
      definicion: 'Centro de Distribución e Importaciones principal de Canguro Venezuela.'
    },
    {
      termino: 'SKU',
      definicion: 'Stock Keeping Unit o identificador unívoco asignado en el ERP para individualizar cada artículo y modelo.'
    },
    {
      termino: 'Muda',
      definicion: 'Término Lean que representa cualquier desperdicio o actividad que no agrega valor al cliente (esperas, retrabajos, desórdenes de inventario).'
    },
    {
      termino: 'SLA',
      definicion: 'Service Level Agreement o Tiempo Estándar de Ejecución comprometido para cada tarea.'
    },
    {
      termino: 'RACI',
      definicion: 'Matriz de asignación de responsabilidades: Responsable, Aprobador, Consultado e Informado.'
    }
  ],
  controlAprobaciones: {
    elaboradoPor: {
      nombre: 'Analista de Procesos Lean Six Sigma',
      cargo: 'Analista de Organización y Métodos - Canguro Venezuela',
      fecha: new Date().toISOString().split('T')[0]
    },
    revisadoPor: {
      nombre: 'Gerente de Tiendas y Puntos de Venta',
      cargo: 'Gerente de Operaciones Retail',
      fecha: new Date().toISOString().split('T')[0]
    },
    aprobadoPor: {
      nombre: 'Dirección General de Operaciones',
      cargo: 'Director de Operaciones - Canguro Venezuela, C.A.',
      fecha: new Date().toISOString().split('T')[0]
    }
  }
};
