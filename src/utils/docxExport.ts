/**
 * Exportador oficial de Manuales de Procedimiento DTH-GFD-MP
 * Districueros El Canguro C.A. (Canguro Venezuela)
 * Paleta Oficial: Negro (#18181B), Amarillo (#FFCC00), Escala de Grises
 */

export interface ExportManualPayload {
  code: string;
  version: string;
  processName: string;
  direction: string;
  directorApprover: string;
  manualMarkdown: string;
  leanMarkdown?: string;
}

export function exportManualToWordDoc(payload: ExportManualPayload): void {
  const { code, version, processName, manualMarkdown, leanMarkdown } = payload;

  // Convert markdown to clean Word HTML with formal corporate typography and borders
  const htmlContent = convertMarkdownToWordHtml(manualMarkdown);
  const leanHtmlContent = leanMarkdown ? convertMarkdownToWordHtml(leanMarkdown) : '';

  const wordTemplate = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${code} - ${processName}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 8.5in 11.0in;
      margin: 1.0in 1.0in 1.0in 1.0in;
      mso-header-margin: 0.5in;
      mso-footer-margin: 0.5in;
      mso-paper-source: 0;
    }
    div.Section1 { page: Section1; }
    
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      color: #18181B;
      line-height: 1.45;
    }
    
    h1 {
      color: #18181B;
      font-size: 15pt;
      font-weight: bold;
      border-bottom: 2.5pt solid #F59E0B;
      padding-bottom: 4pt;
      margin-top: 16pt;
      margin-bottom: 10pt;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
    }
    
    h2 {
      background-color: #F59E0B;
      color: #000000;
      font-size: 11pt;
      font-weight: bold;
      padding: 5pt 10pt;
      margin-top: 14pt;
      margin-bottom: 8pt;
      border: 1pt solid #000000;
      border-radius: 999pt;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      text-align: center;
    }
    
    h3 {
      color: #000000;
      font-size: 10.5pt;
      font-weight: bold;
      margin-top: 10pt;
      margin-bottom: 4pt;
      border-bottom: 1pt solid #D4D4D8;
      padding-bottom: 2pt;
    }
    
    p {
      margin-bottom: 8pt;
      text-align: justify;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12pt 0;
      font-size: 10pt;
    }
    
    th {
      background-color: #18181B;
      color: #FFFFFF;
      font-weight: bold;
      padding: 6pt 8pt;
      border: 1px solid #3F3F46;
      text-align: left;
    }
    
    td {
      padding: 6pt 8pt;
      border: 1px solid #D4D4D8;
      vertical-align: top;
      color: #18181B;
    }
    
    tr:nth-child(even) td {
      background-color: #F8FAFC;
    }
    
    ul, ol {
      margin: 6pt 0 10pt 20pt;
    }
    
    li {
      margin-bottom: 4pt;
    }
    
    strong {
      color: #09090B;
      font-weight: bold;
    }

    .page-break {
      page-break-before: always;
      mso-break-type: section-break;
    }
  </style>
</head>
<body>
  <div class="Section1">
    ${htmlContent}
    ${leanHtmlContent ? `<div class="page-break"></div>${leanHtmlContent}` : ''}
  </div>
</body>
</html>`;

  const blob = new Blob(['\ufeff' + wordTemplate], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${code}_Manual_de_Procedimientos_${processName.replace(/[^a-zA-Z0-9_-]/g, '_')}_v${version}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function convertMarkdownToWordHtml(md: string): string {
  if (!md) return '';

  const lines = md.split('\n');
  let html = '';
  let inTable = false;
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Tables
    if (line.startsWith('|') && line.endsWith('|')) {
      if (/^\|[\s\-:|]+\|$/.test(line)) {
        continue; // delimiter row
      }
      let isFirstRow = false;
      if (!inTable) {
        if (inList) { html += '</ul>\n'; inList = false; }
        html += '<table>\n';
        inTable = true;
        isFirstRow = true;
      }

      const cells = line.slice(1, -1).split('|').map(c => c.trim());
      const isHeaderRow = isFirstRow || line.includes('Fecha de Emisión') || line.includes('Área /') || line.includes('Realizado por') || line.includes('Proceso /') || line.includes('Nombre del Indicador');

      html += '<tr>\n';
      cells.forEach(cell => {
        const formattedCell = formatInlineMarkdown(cell).replace(/<br\s*\/?>/gi, '<br/>');
        if (isHeaderRow) {
          html += `  <th>${formattedCell}</th>\n`;
        } else {
          html += `  <td>${formattedCell}</td>\n`;
        }
      });
      html += '</tr>\n';
      continue;
    } else if (inTable) {
      html += '</table>\n';
      inTable = false;
    }

    // Unordered lists
    if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      if (!inList) {
        html += '<ul>\n';
        inList = true;
      }
      const itemText = line.replace(/^[-*•]\s+/, '');
      html += `  <li>${formatInlineMarkdown(itemText)}</li>\n`;
      continue;
    } else if (inList) {
      html += '</ul>\n';
      inList = false;
    }

    if (!line) {
      html += '<p style="margin: 4pt 0;"></p>\n';
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      html += `<h1>${formatInlineMarkdown(line.slice(2))}</h1>\n`;
    } else if (line.startsWith('## ')) {
      html += `<h2>${formatInlineMarkdown(line.slice(3))}</h2>\n`;
    } else if (line.startsWith('### ')) {
      html += `<h3>${formatInlineMarkdown(line.slice(4))}</h3>\n`;
    } else {
      html += `<p>${formatInlineMarkdown(line)}</p>\n`;
    }
  }

  if (inTable) html += '</table>\n';
  if (inList) html += '</ul>\n';

  return html;
}

function formatInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background-color: #F4F4F5; padding: 2px 4px; font-family: monospace;">$1</code>');
}
