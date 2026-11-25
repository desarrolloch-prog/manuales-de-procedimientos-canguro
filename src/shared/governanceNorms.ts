import { toTitleCase } from './textUtils';

export const NORMAS_GOBERNANZA_DOCUMENTAL_FIJAS = (owner: string, direction: string, processName?: string): string => {
  const cleanProcess = processName
    ? toTitleCase(processName.trim())
    : toTitleCase(owner.replace(/^gerencia\s+de\s+/i, '').trim());
  return `### 1. DUEÑO DEL PROCESO Y GOBERNANZA DOCUMENTAL

Para la presente documentación, queda definida formalmente como Dueño del Proceso la **${owner}**, adscrita a la **Dirección de ${direction}** bajo la responsabilidad directa del Gerente de ${cleanProcess}.

**1.1. Obligatoriedad de Actualización:** La actualización del manual será de carácter obligatorio e inmediato ante los siguientes eventos:
• Cambios en la estructura organizacional de la Dirección de ${direction} o en las descripciones de cargo asociadas.
• Reestructuración de los flujos operativos.
• Modificaciones en las reglas de parametrización del ERP Odoo.
• Variaciones en las directrices y normativas operativas del área.`;
};

export const NORMAS_SEGURIDAD_INFORMACION_FIJAS = `### 2. SEGURIDAD DE LA INFORMACIÓN, CONFIDENCIALIDAD Y USO DE HERRAMIENTAS

**2.1. Confidencialidad:** Toda la información manejada en el proceso tiene carácter ESTRICTAMENTE CONFIDENCIAL Y DE USO INTERNO EXCLUSIVO de Districueros El Canguro C.A.

**2.2. Custodia de Accesos:** Las credenciales de acceso a las plataformas habilitadoras (ERP Odoo, Google Drive corporativo y cuentas asociadas) son personales e intransferibles. Queda expresamente prohibido ceder accesos, compartir contraseñas o divulgar información operativa a personal no autorizado o terceros ajenos a la organización.

**2.3. Canales Oficiales de Transmisión:**
El flujo formal de información y comunicación operativa se limitará estrictamente a:
• **ERP Odoo:** Para el registro obligatorio de transferencias internas, validación de stock, emisión de traslados a tiendas, facturación y consumos.
• **WhatsApp:** Para el envío inmediato de reportes, coordinación operativa y notificaciones.
• **Email:** Canal oficial para realizar las comunicaciones formales y notificaciones.
• **Google Drive:** Para el resguardo de matrices de control, expedientes y trazabilidad documental.`;
