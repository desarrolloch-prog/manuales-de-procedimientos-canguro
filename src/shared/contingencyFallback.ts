import {
  sanitizeCargoTitle,
  type ManualData,
  type CargoData,
  type GlosarioItem,
  type CriterioData
} from '../types/processManual';
import type { ProcessMetadata, AttachedTextFile, AttachedMediaFile } from './types';
import { toTitleCase } from './textUtils';
import { manualDataToMarkdown } from '../utils/paginate';

/**
 * Extractor inteligente de roles a partir de descriptores adjuntos y notas con sanitización estricta
 */
export function extractRolesFromInputs(
  meta: ProcessMetadata,
  narrative: string,
  textFiles: AttachedTextFile[] = [],
  mediaFiles: AttachedMediaFile[] = []
): CargoData[] {
  const discoveredTitles: string[] = [];

  // 1. Extraer nombres limpios de los archivos adjuntos (descriptores de cargo)
  const allFiles = [...textFiles.map((f) => f.name), ...mediaFiles.map((f) => f.name)];
  allFiles.forEach((fn) => {
    const clean = sanitizeCargoTitle(fn);
    if (clean && clean.length > 3 && !/manual|procedimiento|captura|image/i.test(clean)) {
      if (!discoveredTitles.some((t) => t.toLowerCase() === clean.toLowerCase())) {
        discoveredTitles.push(clean);
      }
    }
  });

  // 2. Extraer de líneas de texto de archivos y de la narrativa
  const combinedText = `${narrative}\n${textFiles.map((f) => f.content).join('\n')}`;
  const lines = combinedText.split('\n');
  lines.forEach((line) => {
    const trimmed = line.trim();
    const cargoMatch = trimmed.match(
      /(?:(?:descriptor|cargo|puesto|rol)\s*(?:de|del)?\s*:\s*|\b3\.\d+\.?\s+)([^:.\n\r]+)/i
    );
    if (cargoMatch) {
      const candidate = sanitizeCargoTitle(cargoMatch[1]);
      if (candidate.length > 3 && candidate.length < 60 && !discoveredTitles.some((t) => t.toLowerCase() === candidate.toLowerCase())) {
        discoveredTitles.push(candidate);
      }
    }
  });

  if (discoveredTitles.length > 0) {
    return discoveredTitles.map((rawTitle, idx) => {
      const nivel = `3.${idx + 1}`;
      const cleanTitle = sanitizeCargoTitle(rawTitle);
      return {
        nivel,
        titulo: cleanTitle,
        objetivoCargo: `Garantizar la ejecución técnica, control de calidad y estricto apego normativo en las responsabilidades asignadas a ${cleanTitle} dentro de la ${meta.owner}, velando por la trazabilidad y mitigación de riesgos en ERP Odoo.`,
        responsabilidades: [
          `Ejecutar y validar las actividades operativas inherentes a ${cleanTitle} según el protocolo de ${meta.processName}.`,
          'Registrar sincrónicamente los movimientos y transacciones en los módulos correspondientes del ERP Odoo.',
          'Auditar la concordancia física y digital de los comprobantes y expedientes del área.',
          'Notificar de forma inmediata a la supervisión cualquier no conformidad, merma o desviación técnica.',
          'Resguardar los soportes documentales y actas firmadas en las carpetas autorizadas de Google Drive.'
        ]
      };
    });
  }

  return [];
}

/**
 * Extractor de glosario contextualizado de alta fidelidad según el proceso operativo
 */
export function extractGlossaryFromInputs(
  meta: ProcessMetadata,
  narrative: string,
  textFiles: AttachedTextFile[] = []
): GlosarioItem[] {
  const combined = `${meta.processName} ${meta.direction} ${meta.owner} ${narrative} ${textFiles.map((t) => t.name + ' ' + t.content).join(' ')}`.toLowerCase();

  const isCuentasPorCobrar = /cuentas?\s*por\s*cobrar|cobranza|facturaci[oó]n|cr[eé]dito|cartera/i.test(combined);
  const isNomina = /n[oó]mina|salario|sueldo|compensaci[oó]n|quincena/i.test(combined);
  const isReclutamiento = /reclutamiento|selecci[oó]n|headhunting|vacante|entrevista|postulante/i.test(combined);
  const isInfraestructura = /infraestructura|desarrollo|expansi[oó]n|obras|proyectos|mantenimiento/i.test(combined);
  const isLogistica = /log[ií]stica|almac[eé]n|despacho|inventario|cendis|traslado/i.test(combined);

  if (isCuentasPorCobrar) {
    return [
      { termino: 'Antigüedad de Saldos (Aging)', definicion: 'Reporte analítico estructurado que clasifica cronológicamente las facturas emitidas por cobrar según sus días de vencimiento para priorizar acciones de cobro.' },
      { termino: 'Conciliación Bancaria', definicion: 'Validación cruzada y cotejo diario entre los movimientos de los extractos bancarios corporativos y los recibos de cobro registrados en ERP Odoo.' },
      { termino: 'ERP Odoo Facturación', definicion: 'Módulo corporativo para la emisión formal de facturas electrónicas, registro sincrónico de cobros y conciliación de cartera de clientes.' },
      { termino: 'Estado de Cuenta', definicion: 'Resumen financiero emitido periódicamente al cliente detallando facturas activas, pagos recibidos, notas de crédito y el saldo pendiente exigible.' },
      { termino: 'Nota de Crédito', definicion: 'Documento contable digital emitido en ERP Odoo para anular o disminuir formalmente montos facturados ante devoluciones comerciales o ajustes validados.' },
      { termino: 'Recibo de Cobro', definicion: 'Comprobante formal emitido en sistema que certifica la recepción de transferencias, depósitos o cheques y su imputación contra facturas pendientes.' },
      { termino: 'Retenciones Fiscales (IVA / ISLR)', definicion: 'Comprobantes fiscales emitidos por clientes especiales que deducen porcentajes normados, requiriendo verificación previa en el portal del SENIAT.' },
      { termino: 'SLA de Cobranza', definicion: 'Acuerdo de nivel de servicio que delimita los plazos máximos tolerables desde la emisión de la factura hasta su notificación y cobro efectivo.' }
    ];
  }

  if (isNomina) {
    return [
      { termino: 'Archivo TXT de Dispersión Bancaria', definicion: 'Archivo plano de datos estructurado generado desde Odoo para ejecutar la transferencia masiva de sueldos y salarios a través de la banca electrónica.' },
      { termino: 'Compensación Variable y Complemento', definicion: 'Estructura de pagos complementarios (bonificaciones por logro, comisiones o complementos de productividad) cargados y validados por la Dirección.' },
      { termino: 'Cortes Quincenales', definicion: 'Fechas límite normativas (días 10 y 25 de cada mes) en las que se congela la recolección de incidencias para calcular la prenómina ordinaria.' },
      { termino: 'Cuadre Contable Tripartito', definicion: 'Proceso de conciliación mensual donde se compara la masa salarial procesada por Nómina, los desembolsos de Tesorería y los asientos de Contabilidad.' },
      { termino: 'Matriz de Incidencias', definicion: 'Consolidado analítico de asistencias, inasistencias justificadas/injustificadas, reposos médicos, horas extras y observaciones emitidas por Control Interno.' },
      { termino: 'Parafiscales', definicion: 'Obligaciones y aportes económicos legales tributables ante entes gubernamentales (IVSS, FAOV, INCES, MINTRA, CONAPDIS).' },
      { termino: 'Prenómina', definicion: 'Borrador de cálculo cuantitativo previo al pago final, utilizado para auditar diferencias contra la matriz de incidencias y la tasa oficial BCV.' },
      { termino: 'Tasa Oficial BCV', definicion: 'Tipo de cambio publicado por el Banco Central de Venezuela utilizado como referencia obligatoria para la conversión de conceptos bimonetarios.' }
    ];
  }

  if (isReclutamiento) {
    return [
      { termino: 'Headhunting', definicion: 'Búsqueda dirigida, especializada y confidencial ejecutada para la captación de perfiles ejecutivos, gerenciales o directivos de alto nivel en el mercado.' },
      { termino: 'Kit de Ingreso', definicion: 'Conjunto normativo de documentos físicos y digitales (expediente corporativo) recopilados y validados antes de la contratación formal del trabajador.' },
      { termino: 'Modelo BNC', definicion: 'Protocolo bancario obligatorio mediante el cual todo nuevo colaborador gestiona la apertura de su cuenta nómina en el Banco Nacional de Crédito.' },
      { termino: 'Monitor de Vacantes', definicion: 'Tablero de control centralizado para registrar requisiciones, estatus de entrevistas, distribución de zonas y tiempos de cobertura nacional.' },
      { termino: 'Pruebas Psicotécnicas', definicion: 'Instrumentos de evaluación psicológica y técnica aplicados a postulantes para validar rasgos de perfil, aptitudes y competencias requeridas por el cargo.' },
      { termino: 'Requisición de Personal', definicion: 'Formulario oficial emitido por la gerencia solicitante que autoriza la apertura de un proceso de búsqueda según organigrama y presupuesto.' },
      { termino: 'SLA de Contratación', definicion: 'Plazos de notificación previa obligatoria asignados para la logística de ingreso y cobertura de vacantes operativas o administrativas.' }
    ];
  }

  if (isInfraestructura) {
    return [
      { termino: 'Acta de Cierre de Obra', definicion: 'Instrumento documental emitido conjuntamente entre el Técnico Regional y el Encargado de Tienda donde se certifica a satisfacción la entrega de las instalaciones.' },
      { termino: 'Cajas Logísticas', definicion: 'Empaques o contenedores estandarizados utilizados por Insumos y Despacho para agrupar de forma segura las piezas, herrajes y materiales remitidos a tienda.' },
      { termino: 'Cómputo Métrico', definicion: 'Cálculo analítico y cuantitativo de las cantidades exactas de materiales, insumos, herramientas y horas-hombre requeridas según planos arquitectónicos.' },
      { termino: 'Coordinación Regional de Infraestructura', definicion: 'Segmentación territorial operativa encargada de supervisar, fiscalizar y desplegar directamente a los técnicos de mantenimiento en los puntos de venta.' },
      { termino: 'ERP Odoo Infraestructura', definicion: 'Módulo central de Districueros El Canguro C.A. empleado para canalizar solicitudes de compra, control de insumos y consumos directos de mantenimiento.' },
      { termino: 'Especialistas Técnicos', definicion: 'Personal operativo certificado en disciplinas críticas de infraestructura (mantenimiento HVAC, cortinas de aire, electricidad y carpintería metálica).' },
      { termino: 'Fabricación In Situ', definicion: 'Proceso de construcción, ensamble o corte de estructuras metálicas, lonas o mobiliario realizado en taller CENDIS o en la tienda física de destino.' },
      { termino: 'Presupuesto Mensual de Procura', definicion: 'Techo financiero asignado al departamento para la adquisición de materiales e insumos a través del ERP Odoo según orden de prioridad técnica.' }
    ];
  }

  if (isLogistica) {
    return [
      { termino: 'Albarán de Traslado', definicion: 'Documento electrónico oficial emitido en el ERP Odoo que ampara y formaliza la transferencia de stock entre dependencias de Districueros El Canguro C.A., acreditando custodia.' },
      { termino: 'CENDIS', definicion: 'Centro Nacional de Distribución de Districueros El Canguro C.A., infraestructura logística central donde convergen los procesos de abastecimiento y redistribución.' },
      { termino: 'Discrepancia Operativa', definicion: 'Desalineación cuantitativa o cualitativa confirmada entre los registros transaccionales del ERP Odoo y el conteo físico verificado en piso.' },
      { termino: 'ERP Odoo', definicion: 'Plataforma informática central de Districueros El Canguro C.A. para la administración unificada de inventarios, compras, ventas, facturación y trazabilidad.' },
      { termino: 'Guía de Despacho', definicion: 'Comprobante formal físico y digital que respalda el traslado y custodia de mercancías en las rutas de distribución nacional.' },
      { termino: 'Picking Logístico', definicion: 'Proceso operativo de alistamiento, recolección y verificación física de productos solicitados por tienda para su posterior despacho en CENDIS.' },
      { termino: 'Reacondicionamiento', definicion: 'Proceso operativo mediante el cual se limpian, prueban, reparan o reempaquetan productos para restituirles su condición óptima apta para exhibición.' },
      { termino: 'SKU (Stock Keeping Unit)', definicion: 'Identificador alfanumérico único e irrepetible asignado en el maestro de ERP Odoo para individualizar cada artículo comercializado.' },
      { termino: 'SLA (Service Level Agreement)', definicion: 'Plazo máximo estandarizado de respuesta y ciclo operativo establecido formalmente entre departamentos para asegurar continuidad.' }
    ];
  }

  // Heurística general para cualquier otro proceso corporativo:
  return [
    { termino: `Auditoría Interna de ${meta.processName}`, definicion: `Protocolo de fiscalización y control normativo para evaluar la adherencia a los procedimientos de ${meta.processName} y mitigación de riesgos.` },
    { termino: 'Discrepancia Operativa', definicion: 'Diferencia confirmada entre los registros asentados en sistema y la evidencia física o documental levantada durante la ejecución de las actividades.' },
    { termino: 'ERP Odoo', definicion: 'Plataforma de gestión empresarial unificada donde se asientan, validan y concilian las operaciones y flujos documentales del área.' },
    { termino: 'Expediente Digital Auditable', definicion: 'Carpeta corporativa estructurada en Google Drive donde se almacenan cronológicamente las actas, comprobantes y soportes del proceso con nomenclaturas autorizadas.' },
    { termino: 'No Conformidad', definicion: 'Incumplimiento de un requisito operativo, desviación en parámetros técnicos o discrepancia documental que requiere remediación inmediata.' },
    { termino: 'SLA (Service Level Agreement)', definicion: `Tiempo máximo estandarizado normado para completar cada etapa del proceso de ${meta.processName} garantizando continuidad operativa.` },
    { termino: 'Trazabilidad Integral', definicion: 'Capacidad de rastrear de forma unívoca el origen, responsables, aprobaciones jerárquicas y sellos de tiempo de cualquier transacción en las plataformas oficiales.' }
  ];
}

/**
 * Fallback determinista local contextualizado según el estándar oficial Canguro
 */
export function buildLocalCertifiedFallback(
  meta: ProcessMetadata,
  narrative: string,
  textFiles: AttachedTextFile[] = [],
  mediaFiles: AttachedMediaFile[] = []
): { manualData: ManualData; manual: string; lean: string } {
  const pName = meta.processName.toUpperCase();
  const dirName = meta.direction.toUpperCase();
  const ownerName = meta.owner;
  const emisionDate = meta.emisionDate || meta.today;
  const actualizacionDate = meta.actualizacionDate || meta.today;

  const areas = (Array.isArray(meta.approvalAreas) && meta.approvalAreas.length > 0)
    ? meta.approvalAreas.map((a) => ({ name: a.name, role: a.role || (a.isOwner ? 'Dueño del proceso' : 'Participante'), isOwner: a.isOwner }))
    : [
        { name: ownerName, role: 'Dueño del proceso', isOwner: true },
        { name: `Dirección de ${meta.direction}`, role: 'Participante' },
        { name: 'Gerencia de Formación y Desarrollo', role: 'Participante' }
      ];

  const tools = (meta.tools && meta.tools.trim())
    ? meta.tools.split(/[,;\n•]+/).map((t) => t.trim()).filter(Boolean)
    : ['ERP Odoo', 'Google Drive', 'WhatsApp', 'Email'];

  const supervisorRole = meta.roles && meta.roles.includes('/') ? meta.roles.split('/')[0].trim() : `Supervisor de ${meta.processName}`;
  const analistaRole = meta.roles && meta.roles.includes('/') ? meta.roles.split('/')[1].trim() : `Analista de ${meta.processName}`;

  const isInfraestructura = /infraestructura|desarrollo|expansi[oó]n|obras|proyectos|mantenimiento/i.test(`${meta.processName} ${meta.direction}`);
  const isLogisticaInversa = /log[ií]stica\s+inversa|devoluci[oó]n/i.test(meta.processName);

  // Flujo canónico de exactamente 6 fases cortas para la Página 1 (sin Inicio ni Fin)
  let flowPhases: string[] = [];
  if (isInfraestructura) {
    flowPhases = [
      'Recepción de solicitud de proyecto',
      'Validación de disponibilidad de Insumos',
      'Fabricación y traslado al área de despacho',
      'Arribo de materiales y despliegue de tecnicos',
      'Ejecución de actividades en el sitio',
      'Notificación de finalización del proyecto'
    ];
  } else if (isLogisticaInversa) {
    flowPhases = [
      'Descarga y Recepción en Zona Mixta',
      'Auditoría Cesta por Cesta vs Odoo',
      'Prueba Técnica y Clasificación de Garantías',
      'Reacondicionamiento y Reempaque',
      'Transferencia a Picking en CENDIS',
      'Cierre y Conciliación Diaria'
    ];
  } else {
    flowPhases = [
      'Recepción de Requerimiento',
      'Validación y Verificación en Odoo',
      'Procesamiento Técnico Especializado',
      'Control de Calidad y Verificación',
      'Entrega Conforme y Despacho',
      'Conciliación Final y Cierre en Drive'
    ];
  }

  // Criterios Técnicos estructurados con subtítulos y viñetas minuciosas
  let criterios: CriterioData[] = [];
  if (isInfraestructura) {
    criterios = [
      {
        numero: '4.1',
        titulo: 'Clasificación de Solicitudes y Matriz de Prioridades',
        texto: 'Toda solicitud remitida por los grupos de WhatsApp corporativos o indicada por la Directiva debe ser clasificada de forma inmediata según su nivel de criticidad técnica y urgencia en tienda.'
      },
      {
        numero: '4.2',
        titulo: 'Flujo de Proyectos Nuevos, Diseño y Fabricación en CENDIS',
        vinetas: [
          { etiqueta: 'Levantamiento y Plano', detalle: 'El equipo de Proyectos efectúa el levantamiento del local y elabora el plano arquitectónico con la distribución de áreas y layouts.' },
          { etiqueta: 'Cómputo Métrico de Materiales', detalle: 'Sobre la base del plano, se calculan exactamente los materiales, accesorios e insumos necesarios para la remodelación y la mueblería a fabricar.' },
          { etiqueta: 'Solicitud a Insumos', detalle: 'Se transmite el requerimiento a la Coordinación de Gestión y Traslado / Insumos (CENDIS) vía WhatsApp para verificar existencias en almacén.' },
          { etiqueta: 'Fabricación In Situ', detalle: 'La mueblería, estructuras metálicas y lonas requeridas se fabrican en el taller del CENDIS por el equipo de Infraestructura. (Si las dimensiones o condiciones lo exigen, la fabricación se ejecutará directamente en sitio).' },
          { etiqueta: 'Facturación y Despacho', detalle: 'El área de Insumos emite la factura/traslado en el ERP Odoo, adjunta la documentación física y empaca los materiales en cajas logísticas. El lote se entrega a Despacho para su envío a la tienda en la Ruta de transporte programada.' }
        ]
      },
      {
        numero: '4.3',
        titulo: 'Gestión Presupuestaria Mensual y Solicitudes de Procura en Odoo',
        vinetas: [
          { etiqueta: 'Techo Presupuestario Mensual', detalle: 'La Gerencia de Infraestructura y Proyectos opera bajo un presupuesto de compras mensual asignado.' },
          { etiqueta: 'Procesamiento de Compras', detalle: 'Cuando el material requerido no existe en stock dentro de Insumos/CENDIS, se emite una Solicitud de Procura mediante Odoo dirigida a la Gerencia de Gestión de Compras.' }
        ]
      },
      {
        numero: '4.4',
        titulo: 'Despliegue Técnico y Ejecución Regional en Sitio: Asignación Geográfica',
        vinetas: [
          { etiqueta: 'Asignación Geográfica', detalle: 'El Coordinador Regional correspondiente (Capital, Centro, Oriente Norte o Oriente Sur) asigna la cuadrilla de Técnicos de Mantenimiento más cercana a la tienda para llevar a cabo los trabajos de instalación o reparación.' },
          { etiqueta: 'Reporte Diario de Avances', detalle: 'Durante la ejecución de la obra, el personal técnico debe reportar obligatoriamente todos los días el estado de avance mediante fotografías y videos en el grupo de WhatsApp del proyecto.' }
        ]
      },
      {
        numero: '4.5',
        titulo: 'Cierre de Obra y Modificación de Evaluación del Proyecto',
        vinetas: [
          { etiqueta: 'Inspección Conjunta', detalle: 'Al finalizar la instalación o reparación, el técnico/coordinador regional realiza una inspección visual conjunta con el Gerente/Encargado de la tienda.' },
          { etiqueta: 'Cierre Administrativo en Odoo', detalle: 'La Gerencia de Infraestructura y Proyectos / Supervisión de Infraestructura valida la entrega, modifica la evaluación del proyecto en la planificación central y procede al cierre administrativo del requerimiento en Odoo.' }
        ]
      }
    ];
  } else if (isLogisticaInversa) {
    criterios = [
      {
        numero: '4.1',
        titulo: 'Protocolo Obligatorio de Recepción y Evidencia Fotográfica',
        texto: 'Al arribar cualquier camión de ruta a CENDIS, el operador de Logística Inversa debe realizar la descarga hacia la Zona Mixta e inmediatamente remitir por el canal oficial de WhatsApp una fotografía legible donde se aprecie la placa del vehículo, número de ruta y la totalidad de cestas recibidas. Ninguna cesta podrá abrirse sin este registro previo.'
      },
      {
        numero: '4.2',
        titulo: 'Auditoría Cesta por Cesta contra Traslado en ERP Odoo',
        vinetas: [
          { etiqueta: 'Apertura Individual', detalle: 'Cada cesta debe abrirse individualmente y su contenido físico debe auditarse contra la guía de traslado del sistema ERP Odoo.' },
          { etiqueta: 'Gestión de Discrepancias', detalle: 'En caso de detectarse faltantes, sobrantes o productos no declarados, se paraliza el lote y se genera la notificación al Supervisor de Logística Inversa para contactar a la tienda remitente y regularizar el saldo en Odoo.' }
        ]
      },
      {
        numero: '4.3',
        titulo: 'Prohibición de Almacenamiento Prolongado de Devoluciones',
        vinetas: [
          { etiqueta: 'Rotación Inmediata', detalle: 'Queda terminantemente prohibido acumular o almacenar devoluciones por sobrestock en el área de reversa.' },
          { etiqueta: 'Transferencia a Picking', detalle: 'En el momento en que se certifique que el producto está 100% operativo y en óptimo estado estético, debe transferirse en ERP Odoo y ubicarse físicamente en el Almacén de Picking de CENDIS en un plazo máximo de 24 horas.' }
        ]
      },
      {
        numero: '4.4',
        titulo: 'Clasificación y Protocolo Técnico de Garantías',
        vinetas: [
          { etiqueta: 'Banco de Pruebas Técnicas', detalle: 'Todo producto devuelto por defecto debe pasar por el banco de pruebas técnicas. Los equipos mayores (audio, televisores) son derivados formalmente al Servicio Técnico FIX.' },
          { etiqueta: 'Accesorios Menores y Reempaque', detalle: 'Para accesorios menores (cargadores, cables), se prueba cada componente por separado; si el empaque original está roto, se descarta a scrap o se empaca en Empaque Universal Canguro.' }
        ]
      },
      {
        numero: '4.5',
        titulo: 'Cierre de Jornada y Conciliación Diaria a las 5:00 p.m.',
        vinetas: [
          { etiqueta: 'Corte Obligatorio', detalle: 'A las 5:00 p.m. se realiza la conciliación diaria de cestas procesadas versus registros en ERP Odoo.' },
          { etiqueta: 'Cero Pendientes', detalle: 'No se permite dejar traslados abiertos o sin confirmar al cierre de la jornada.' }
        ]
      }
    ];
  } else {
    criterios = [
      {
        numero: '4.1',
        titulo: `Validación Previa y Recepción en ${meta.processName}`,
        texto: `Ninguna actividad u operación de ${meta.processName} podrá iniciarse formalmente sin contar con la solicitud, requerimiento u orden debidamente validada en ERP Odoo o canal oficial correspondiente.`
      },
      {
        numero: '4.2',
        titulo: `Flujo Operativo Estandarizado de ${meta.processName}`,
        vinetas: [
          { etiqueta: 'Verificación Inicial', detalle: 'Cotejo minucioso de especificaciones técnicas y requisitos de entrada en ERP Odoo.' },
          { etiqueta: 'Procesamiento en Sistema', detalle: 'Registro sincrónico de cada fase del proceso en los módulos autorizados del ERP Odoo.' },
          { etiqueta: 'Custodia y Traslado', detalle: 'Empaque o asignación formal conforme a los estándares de Districueros El Canguro C.A.' }
        ]
      },
      {
        numero: '4.3',
        titulo: 'Protocolo ante Discrepancias y Excepciones Operativas',
        vinetas: [
          { etiqueta: 'Notificación Inmediata', detalle: 'Cualquier desviación detectada en la operación debe notificarse por el grupo oficial de WhatsApp y correo a la supervisión.' },
          { etiqueta: 'Aprobación de Desviaciones', detalle: 'Toda excepción o ajuste que exceda los límites estándar requerirá la aprobación previa en ERP Odoo del Dueño del Proceso o Director del Área.' }
        ]
      },
      {
        numero: '4.4',
        titulo: 'Digitalización y Resguardo en Google Drive',
        vinetas: [
          { etiqueta: 'Carga de Expedientes', detalle: 'Todos los soportes firmados, guías y actas deben cargarse en las carpetas designadas de Google Drive en un plazo no mayor a 24 horas.' },
          { etiqueta: 'Trazabilidad Auditable', detalle: 'Los nombres de archivo deben incluir la fecha, correlativo de Odoo y código del documento.' }
        ]
      },
      {
        numero: '4.5',
        titulo: 'Conciliación Diaria y Cierre Operativo a las 5:00 p.m.',
        vinetas: [
          { etiqueta: 'Corte Diario', detalle: 'A las 5:00 p.m. de cada jornada hábil se efectúa el balance entre las órdenes procesadas físicamente y los registros en ERP Odoo.' },
          { etiqueta: 'Acta de Cierre', detalle: 'Se emite la certificación diaria asegurando que no queden transacciones en borrador ni discrepancias sin asentar.' }
        ]
      }
    ];
  }

  const extractedCargos = extractRolesFromInputs(meta, narrative, textFiles, mediaFiles);

  const manualData: ManualData = {
    codigo: meta.code,
    tituloProceso: meta.processName,
    objetivo: isInfraestructura
      ? 'Establecer de forma técnica, estandarizada y rigurosa los criterios de actuación, metodologías de trabajo, controles normativos y gobernanza operativa que rigen el proceso de Infraestructura en Districueros El Canguro C.A., bajo la adscripción de la Dirección Comercial y la Gerencia de Infraestructura y Proyectos, abarcando la recepción y priorización de requerimientos de la red de tiendas, la elaboración e interpretación de planos, la cubicación técnica de cómputos métricos, la fabricación de mueblería y estructuras, el procesamiento de traslados en ERP Odoo, solicitudes de procura prioritarias y el control riguroso del presupuesto mensual para garantizar aperturas y adecuaciones en tiempos récord.'
      : `Establecer de forma técnica, estandarizada y rigurosa los criterios de actuación, metodologías de trabajo, controles normativos y gobernanza operativa que rigen el proceso de ${meta.processName} en Districueros El Canguro C.A., bajo la adscripción de la ${meta.direction}, abarcando desde la recepción y validación documental inicial hasta el cierre conforme en ERP Odoo para garantizar el control operativo, la mitigación de mermas, el cumplimiento de los acuerdos de nivel de servicio (SLA) y la trazabilidad integral de activos en todas las dependencias corporativas.`,
    alcance: isInfraestructura
      ? 'El alcance comprende la totalidad del ciclo operativo del proceso de Infraestructura: desde la captación y clasificación de solicitudes vía WhatsApp corporativo, el levantamiento arquitectónico de planos para nuevas sedes o remodelaciones, la cubicación y cálculo del cómputo métrico de materiales, la tramitación de compras prioritarias u homologadas al presupuesto mensual en ERP Odoo, la fabricación de mobiliario, herrajes y lonas en taller CENDIS o en sitio, el empaque en cajas logísticas, el despacho mediante rutas programadas, el despliegue de cuadrillas técnicas regionales y especialistas (HVAC, electricidad, acabados), la gestión de imprevistos en obra, hasta la inspección visual conjunta y el cierre administrativo formal del proyecto.'
      : `El alcance comprende la totalidad del ciclo operativo y administrativo de la ${ownerName}: desde la recepción o requerimiento inicial de la operación, pasando por la validación técnica documental, el cotejo físico en piso, la autorización jerárquica correspondiente, el registro sincrónico en los módulos autorizados del ERP Odoo, la gestión de contingencias o discrepancias, hasta la entrega formal conforme, conciliación de saldos y el resguardo digital auditable de expedientes en Google Drive corporativo, siendo de estricto cumplimiento para todas las sucursales, centros de distribución (CENDIS), almacenes y dependencias administrativas de Districueros El Canguro C.A. a nivel nacional.`,
    versionDesc: meta.version === '01' ? 'Nuevo' : `Actualización v${meta.version}`,
    clasificacion: meta.classification || 'Crítico.',
    flujo: flowPhases,
    areasAprobadoras: areas,
    herramientas: tools.map((t) => {
      const clean = t.replace(/\s*\([^)]*\)/g, '').trim();
      if (clean.toLowerCase().includes('odoo')) return 'ERP Odoo';
      if (clean.toLowerCase().includes('drive') || clean.toLowerCase().includes('workspace')) return 'Google Workspace';
      if (clean.toLowerCase().includes('whatsapp')) return 'WhatsApp';
      if (clean.toLowerCase().includes('email') || clean.toLowerCase().includes('correo')) return 'Email';
      return clean;
    }),
    documentosDerogados: ['N/A'],
    glosario: extractGlossaryFromInputs(meta, narrative, textFiles),
    cargos: extractedCargos.length > 0
      ? extractedCargos
      : isInfraestructura
      ? [
          { nivel: '3.1', titulo: 'Director Comercial', objetivoCargo: 'Liderar la estrategia comercial y de expansión del negocio a nivel corporativo, asegurando la infraestructura adecuada para los puntos de venta y velando por el cumplimiento estricto de los estándares de marca y experiencia del cliente en toda la red nacional.', responsabilidades: ['Aprobar los planes de expansión, remodelaciones mayores y aperturas de nuevas tiendas a nivel nacional.', 'Validar la asignación presupuestaria mensual y extraordinaria para proyectos de infraestructura.', 'Supervisar el cumplimiento de los estándares arquitectónicos corporativos en toda la red de tiendas.', 'Autorizar desviaciones presupuestarias críticas y contratos con proveedores de obras civiles.'] },
          { nivel: '3.2', titulo: 'Gerente Corporativo de Desarrollo y Expansión', objetivoCargo: 'Dirigir la estrategia de crecimiento territorial, búsqueda de nuevas plazas comerciales estratégicas y adecuación civil de sedes corporativas para consolidar la presencia de mercado de Canguro Venezuela.', responsabilidades: ['Prospectar nuevas ubicaciones comerciales para tiendas y sedes operativas a nivel nacional.', 'Coordinar las negociaciones de arrendamiento, adecuación civil y trámites permisológicos con centros comerciales.', 'Monitorear los hitos de entrega de obras con la Gerencia de Infraestructura y Proyectos.', 'Auditar la viabilidad técnica y comercial de los locales antes del inicio de obra.'] },
          { nivel: '3.3', titulo: 'Gerente de Infraestructura y Proyectos', objetivoCargo: 'Dirigir, planificar y controlar de forma integral los proyectos de arquitectura, diseño de layouts, fabricación de mueblería en CENDIS y programas de mantenimiento preventivo/correctivo de la red de tiendas a nivel nacional.', responsabilidades: ['Gestionar el presupuesto mensual de procura en ERP Odoo asegurando el techo asignado.', 'Supervisar el taller central de fabricación de estructuras y muebles en CENDIS.', 'Coordinar con la Gerencia de Compras la adquisición prioritaria de materiales e insumos críticos.', 'Aprobar los cómputos métricos, planos constructivos y especificaciones técnicas de obra.', 'Evaluar los reportes fotográficos de avance diario y autorizar la entrega final de obras.'] },
          { nivel: '3.4', titulo: 'Supervisor de Infraestructura', objetivoCargo: 'Coordinar y auditar la ejecución operativa de las obras, despliegues técnicos de mantenimiento, fabricación de mobiliario y atención ágil de emergencias en las tiendas de las cuatro regiones operativas.', responsabilidades: ['Distribuir cuadrillas técnicas en las cuatro regiones operativas (Capital, Centro, Oriente Norte y Oriente Sur).', 'Supervisar la fabricación, empaque y despacho de cajas logísticas desde CENDIS.', 'Monitorear reportes fotográficos de avance diario remitidos en los grupos de WhatsApp de obra.', 'Auditar la calidad de terminaciones, finiquitos y firmas de actas de conformidad.', 'Gestionar el inventario de repuestos y herramientas asignadas a las cuadrillas en zona.'] },
          { nivel: '3.5', titulo: 'Coordinador de Proyectos', objetivoCargo: 'Liderar la fase técnica de diseño arquitectónico, levantamiento de planos en sitio, layouts comerciales y cubicación exacta de cómputos métricos para aperturas y remodelaciones de la red.', responsabilidades: ['Elaborar planos arquitectónicos en AutoCAD/Visio y distribución comercial de locales.', 'Calcular cómputos métricos exactos de materiales, perfiles metálicos y consumibles.', 'Transmitir solicitudes de materiales al área de Insumos vía WhatsApp y ERP Odoo.', 'Efectuar inspecciones técnicas en sitio para validar condiciones físicas y eléctricas del local.'] },
          { nivel: '3.6', titulo: 'Coordinadores de Infraestructura por Región', objetivoCargo: 'Garantizar la atención técnica oportuna, supervisión de obras en sitio y ejecución rigurosa de mantenimientos preventivos y correctivos dentro de sus respectivas áreas geográficas asignadas.', responsabilidades: ['Asignar y acompañar a los técnicos de mantenimiento en las tiendas de su región.', 'Controlar existencias de herramientas, repuestos críticos y materiales en almacenes zonales.', 'Efectuar la inspección visual conjunta de cierre de obra con el Encargado de Tienda.', 'Certificar las horas-hombre y gastos operativos de las cuadrillas de su demarcación.'] },
          { nivel: '3.7', titulo: 'Técnicos de Mantenimiento', objetivoCargo: 'Ejecutar físicamente con excelencia técnica los trabajos de instalación, construcción, reparación, mantenimiento preventivo/correctivo e intervención de servicios en las sedes de la empresa.', responsabilidades: ['Ejecutar labores de albañilería, electricidad, pintura, HVAC, cortinas de aire y carpintería.', 'Reportar avances diarios de forma obligatoria mediante fotografías y videos en WhatsApp.', 'Firmar las actas de entrega de trabajos en conjunto con la administración de la tienda.', 'Custodiar las herramientas asignadas y hacer uso estricto de equipos de protección personal (EPP).'] }
        ]
      : [
          {
            nivel: '3.1',
            titulo: `Director de ${meta.direction}`,
            objetivoCargo: `Definir lineamientos directivos, presupuestos y políticas estratégicas que rigen la ${meta.direction}, asegurando rentabilidad, control de riesgos y excelencia en el servicio a tiendas.`,
            responsabilidades: [
              'Aprobar las políticas operativas, reglamentos y lineamientos rectores del área.',
              'Validar y autorizar operaciones extraordinarias de alto impacto financiero o comercial en ERP Odoo.',
              'Asignar los recursos técnicos, presupuestarios y humanos indispensables para la continuidad operativa.',
              'Evaluar periódicamente los indicadores clave de desempeño (KPI) y acuerdos de nivel de servicio (SLA).',
              'Representar al área ante la Junta Directiva y liderar comités de mejora continua.'
            ]
          },
          {
            nivel: '3.2',
            titulo: ownerName,
            objetivoCargo: 'Liderar, planificar y coordinar la ejecución integral diaria de las actividades del proceso, asegurando el cumplimiento estricto de los estándares normativos y la trazabilidad en ERP Odoo.',
            responsabilidades: [
              'Monitorear el apego estricto a los flujos operativos y tiempos de ciclo normados del departamento.',
              'Auditar la conciliación física versus los registros oficiales en ERP Odoo en cada corte operativo.',
              'Resolver discrepancias técnicas y no conformidades reportadas por los supervisores de turno.',
              'Emitir informes ejecutivos periódicos sobre la eficiencia operativa y control de mermas.',
              'Asegurar el resguardo sistemático de soportes y expedientes digitales en Google Drive corporativo.'
            ]
          },
          {
            nivel: '3.3',
            titulo: supervisorRole,
            objetivoCargo: 'Supervisar en sitio o plataforma los turnos operativos, distribuir asignaciones y certificar la calidad documental y física en tiempo real de cada transacción procesada.',
            responsabilidades: [
              'Distribuir las tareas al personal operativo y velar por el orden y disciplina en los puestos de trabajo.',
              'Verificar que cada movimiento u operación física cuente con soporte formal previamente validado en ERP Odoo.',
              'Asentar incidencias y no conformidades en el sistema y coordinar su conciliación inmediata.',
              'Certificar que al culminar la jornada a las 5:00 p.m. no queden transacciones en borrador ni pendientes sin justificación.',
              'Validar los reportes de turno y transmitirlos por los canales autorizados de WhatsApp y correo.'
            ]
          },
          {
            nivel: '3.4',
            titulo: analistaRole,
            objetivoCargo: 'Ejecutar las tareas técnicas de procesamiento, validación física/documental, registro transaccional en plataformas oficiales y archivo de comprobantes auditables.',
            responsabilidades: [
              'Inspeccionar los insumos físicos y confrontarlos minuciosamente contra las solicitudes en sistema.',
              'Ejecutar la operación técnica conforme a las especificaciones y estándares de Districueros El Canguro C.A.',
              'Ingresar la información sincrónica en ERP Odoo asegurando fidelidad de datos y correlativos completos.',
              'Digitalizar y cargar los soportes firmados y actas en las carpetas autorizadas de Google Drive antes del fin de turno.',
              'Notificar de forma inmediata a la supervisión cualquier desviación, daño físico o discrepancia detectada.'
            ]
          }
        ],
    criterios,
    lean: {
      resumen: 'Se evidencia un proceso operativo con alto compromiso del personal pero vulnerable por la desconexión temporal entre el movimiento físico de insumos y su confirmación formal en ERP Odoo. La estandarización de los criterios técnicos normados, el establecimiento de candados transaccionales y el resguardo sistemático de evidencias en Google Drive permitirán alcanzar trazabilidad auditable integral, erradicar discrepancias en cortes diarios y reducir tiempos de ciclo en un 28%.',
      hallazgos: [
        'Desfase en la Sincronización Transaccional en ERP Odoo: Las transferencias y movimientos físicos ocurren en piso con antelación a su asentamiento formal en el sistema, generando ventanas de vulnerabilidad de stock.',
        'Vulnerabilidad en la Custodia y Trazabilidad Documental Física: Empleo de comprobantes y guías impresas sin digitalización sistemática inmediata en carpetas corporativas de Google Drive.',
        'Manejo No Estandarizado de Discrepancias y Devoluciones: Las anomalías detectadas en recepción se canalizan mediante notas al margen o acuerdos verbales entre turnos sin folio correlativo formal.',
        'Dependencia de Validaciones Jerárquicas Presenciales: Tiempos muertos en puntos de control a la espera de autorizaciones manuales en piso que retrasan el flujo de salida hacia tiendas.',
        'Carencia de Bitácora Digital Centralizada de No Conformidades: Ausencia de registro estadístico inmediato que permita correlacionar incidencias recurrentes por proveedor o tienda remitente.'
      ],
      plan: [
        'Registro Sincrónico y Candados de Sistema: Obligatoriedad de registrar cada movimiento físico al momento exacto de su ejecución en el módulo de Inventarios de ERP Odoo, bloqueando operaciones sin comprobante.',
        'Protocolo Estandarizado de Digitalización Inmediata: Digitalización sistemática de cada soporte firmado y carga en Google Drive corporativo antes del cierre de turno, empleando nomenclatura estandarizada.',
        'Bitácora Formal de Discrepancias y No Conformidades: Tipificación obligatoria de incidencias en formulario institucional vinculado a notificación automática inmediata a la supervisión de área.',
        'Automatización de Autorizaciones por Umbrales: Parametrización en ERP Odoo de flujos de aprobación delegados para operaciones estándar, agilizando despachos sin sacrificar control.',
        'Implementación de Tableros Kanban de Seguimiento: Monitor visual en tiempo real que muestre el estatus y SLA de cada solicitud desde su ingreso hasta la conformidad de entrega.'
      ],
      recomendaciones: [
        'Prohibir de forma terminante cualquier movimiento físico de mercancía sin comprobante validado previamente en ERP Odoo.',
        'Efectuar la conciliación diaria obligatoria a las 5:00 p.m. entre movimientos físicos y registros electrónicos del sistema.',
        'Auditar semanalmente el 100% de expedientes digitalizados en Google Drive corporativo asegurando correlativos completos y firmas requeridas.',
        'Establecer reuniones quincenales de control de gestión entre el Dueño del Proceso y la Supervisión para analizar métricas de cumplimiento de SLA y mermas.'
      ]
    }
  };

  const manual = manualDataToMarkdown(manualData, meta);

  const lean = `# INFORME EJECUTIVO DE AUDITORÍA Y DIAGNÓSTICO OPERATIVO
(Districueros El Canguro C.A.)

## 1. RESUMEN EJECUTIVO
${manualData.lean?.resumen || ''}

## 2. HALLAZGOS Y DEBILIDADES OPERATIVAS CRÍTICAS
${(manualData.lean?.hallazgos || []).map((h: any) => typeof h === 'string' ? `• ${h}` : `• **${h.titulo || 'Hallazgo'}:** ${h.detalle || ''}`).join('\n')}

## 3. PLAN DE ACCIÓN Y ESTANDARIZACIÓN INMEDIATA
${(manualData.lean?.plan || []).map((p: any) => typeof p === 'string' ? `• ${p}` : `• **${p.titulo || 'Acción'}:** ${p.detalle || ''}`).join('\n')}

## 4. RECOMENDACIONES
${(manualData.lean?.recomendaciones || []).map((r) => `• ${r}`).join('\n')}`;

  return { manualData, manual, lean };
}
