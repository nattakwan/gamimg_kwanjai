const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const mdPath = path.resolve(__dirname, '../docs/HANDOVER_MANUAL.md');
const htmlPath = path.resolve(__dirname, '../docs/HANDOVER_MANUAL.html');
const pdfPath = path.resolve(__dirname, '../docs/HANDOVER_MANUAL.pdf');
const brainPdfPath = 'C:\\Users\\natta\\.gemini\\antigravity\\brain\\3db8ddc6-f5ac-4c6f-a5c9-312d79f013cc\\HANDOVER_MANUAL.pdf';

const mdContent = fs.readFileSync(mdPath, 'utf8');

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseMarkdown(md) {
  const lines = md.split('\n');
  let html = '';
  let inCodeBlock = false;
  let codeLang = '';
  let codeBuffer = [];
  let inList = false;
  let listType = 'ul';
  let inTable = false;
  let tableHeaderParsed = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Fenced Code Blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        const codeText = escapeHtml(codeBuffer.join('\n'));
        if (codeLang === 'mermaid') {
          html += `<div class="diagram-box"><pre class="mermaid-raw">${codeText}</pre></div>\n`;
        } else {
          html += `<pre class="code-block"><code class="lang-${codeLang}">${codeText}</code></pre>\n`;
        }
        inCodeBlock = false;
        codeBuffer = [];
        codeLang = '';
        continue;
      } else {
        inCodeBlock = true;
        codeLang = line.trim().slice(3).trim();
        codeBuffer = [];
        continue;
      }
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Close list if line is not list item
    if (inList && !line.match(/^(\*|-|\d+\.)\s/)) {
      html += `</${listType}>\n`;
      inList = false;
    }

    // Close table if line is not table row
    if (inTable && !line.trim().startsWith('|')) {
      html += `</tbody></table></div>\n`;
      inTable = false;
      tableHeaderParsed = false;
    }

    // Empty Line
    if (!line.trim()) {
      continue;
    }

    // Horizontal Rule
    if (line.match(/^---+$/)) {
      html += '<hr class="divider" />\n';
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      html += `<h1 class="doc-title">${formatInline(line.slice(2))}</h1>\n`;
      continue;
    }
    if (line.startsWith('## ')) {
      html += `<h2 class="sec-title">${formatInline(line.slice(3))}</h2>\n`;
      continue;
    }
    if (line.startsWith('### ')) {
      html += `<h3 class="sub-title">${formatInline(line.slice(4))}</h3>\n`;
      continue;
    }
    if (line.startsWith('#### ')) {
      html += `<h4 class="sub4-title">${formatInline(line.slice(5))}</h4>\n`;
      continue;
    }

    // Blockquote & Alerts
    if (line.startsWith('> ')) {
      const quoteText = line.slice(2);
      if (quoteText.includes('[!TIP]')) {
        html += `<div class="alert-box alert-tip"><span class="alert-icon">💡</span><div><strong>ข้อแนะนำที่เป็นประโยชน์ (Tip)</strong><p>${formatInline(quoteText.replace(/\[!TIP\]/, '').trim())}</p></div></div>\n`;
      } else if (quoteText.includes('[!NOTE]')) {
        html += `<div class="alert-box alert-note"><span class="alert-icon">ℹ️</span><div><strong>หมายเหตุ (Note)</strong><p>${formatInline(quoteText.replace(/\[!NOTE\]/, '').trim())}</p></div></div>\n`;
      } else {
        html += `<blockquote class="doc-quote">${formatInline(quoteText)}</blockquote>\n`;
      }
      continue;
    }

    // Tables
    if (line.trim().startsWith('|')) {
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      
      // Separator line e.g. | :--- | :--- |
      if (cells.every(c => c.match(/^:?-+:?$/))) {
        tableHeaderParsed = true;
        continue;
      }

      if (!inTable) {
        inTable = true;
        html += `<div class="table-container"><table>\n`;
        html += `<thead><tr>${cells.map(c => `<th>${formatInline(c)}</th>`).join('')}</tr></thead>\n<tbody>\n`;
        continue;
      } else {
        html += `<tr>${cells.map(c => `<td>${formatInline(c)}</td>`).join('')}</tr>\n`;
        continue;
      }
    }

    // Lists
    const ulMatch = line.match(/^(\*|-)\s+(.*)/);
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) html += `</${listType}>\n`;
        html += '<ul>\n';
        inList = true;
        listType = 'ul';
      }
      html += `<li>${formatInline(ulMatch[2])}</li>\n`;
      continue;
    }

    const olMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) html += `</${listType}>\n`;
        html += '<ol>\n';
        inList = true;
        listType = 'ol';
      }
      html += `<li>${formatInline(olMatch[2])}</li>\n`;
      continue;
    }

    // Paragraph
    html += `<p class="prose-p">${formatInline(line)}</p>\n`;
  }

  if (inList) html += `</${listType}>\n`;
  if (inTable) html += `</tbody></table></div>\n`;

  return html;
}

function formatInline(text) {
  return text
    // Math formulas
    .replace(/\$\$([^$]+)\$\$/g, '<span class="math-display"><code>$1</code></span>')
    .replace(/\$([^$]+)\$/g, '<span class="math-inline"><code>$1</code></span>')
    // Bold italic
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    // Markdown links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="doc-link">$1</a>');
}

const bodyHtml = parseMarkdown(mdContent);

const completeHtml = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>คู่มือสรุปการพัฒนาและส่งต่องานฉบับสมบูรณ์ - Battery Quest Power Racing Academy</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700;800&family=Sarabun:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 16mm 14mm 16mm 14mm;
      @bottom-right {
        content: counter(page);
      }
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Sarabun', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }

    .doc-container {
      max-width: 100%;
      margin: 0 auto;
    }

    /* Cover / Top Header */
    .header-banner {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      padding: 24px 28px;
      border-radius: 14px;
      margin-bottom: 24px;
      border-left: 6px solid #f59e0b;
      box-shadow: 0 4px 15px rgba(0,0,0,0.06);
    }

    .doc-title {
      font-family: 'Chakra Petch', sans-serif;
      font-size: 20pt;
      font-weight: 800;
      color: #f8fafc;
      margin: 0 0 6px 0;
      letter-spacing: -0.3px;
    }

    .header-sub {
      color: #94a3b8;
      font-size: 10pt;
      margin: 0;
    }

    .meta-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }

    .meta-pill {
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.2);
      color: #e2e8f0;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 8.5pt;
      font-family: 'Chakra Petch', sans-serif;
      font-weight: 600;
    }

    /* Headings */
    h1, h2, h3, h4 {
      font-family: 'Chakra Petch', sans-serif;
      color: #0f172a;
      page-break-after: avoid;
    }

    .sec-title {
      font-size: 14pt;
      font-weight: 700;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 28px;
      margin-bottom: 12px;
      color: #0369a1;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .sub-title {
      font-size: 12pt;
      font-weight: 700;
      margin-top: 20px;
      margin-bottom: 8px;
      color: #0f172a;
    }

    .sub4-title {
      font-size: 11pt;
      font-weight: 600;
      margin-top: 14px;
      margin-bottom: 6px;
      color: #334155;
    }

    .prose-p {
      margin: 6px 0 10px 0;
      color: #334155;
      text-align: justify;
    }

    /* Quotes and Alerts */
    .doc-quote {
      border-left: 4px solid #0284c7;
      background: #f0f9ff;
      padding: 10px 14px;
      margin: 10px 0;
      border-radius: 0 8px 8px 0;
      color: #0369a1;
      font-size: 10pt;
    }

    .alert-box {
      display: flex;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 10px;
      margin: 14px 0;
      page-break-inside: avoid;
    }

    .alert-tip {
      background: #fefce8;
      border: 1px solid #fef08a;
      color: #854d0e;
    }

    .alert-note {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      color: #334155;
    }

    .alert-icon {
      font-size: 16pt;
      line-height: 1;
    }

    /* Tables */
    .table-container {
      margin: 14px 0;
      overflow-x: auto;
      page-break-inside: avoid;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
    }

    th {
      background: #f1f5f9;
      color: #0f172a;
      font-family: 'Chakra Petch', sans-serif;
      font-weight: 700;
      text-align: left;
      padding: 8px 12px;
      border-bottom: 2px solid #cbd5e1;
    }

    td {
      padding: 7px 12px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
      color: #334155;
    }

    tr:nth-child(even) td {
      background: #f8fafc;
    }

    /* Code & Pre */
    .code-block {
      background: #0f172a;
      color: #f1f5f9;
      padding: 12px 14px;
      border-radius: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8.5pt;
      line-height: 1.45;
      overflow-x: auto;
      margin: 10px 0;
      page-break-inside: avoid;
      border: 1px solid #1e293b;
    }

    .diagram-box {
      background: #f8fafc;
      border: 1px dashed #94a3b8;
      border-radius: 8px;
      padding: 10px 14px;
      margin: 10px 0;
      page-break-inside: avoid;
    }

    .mermaid-raw {
      margin: 0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8.5pt;
      color: #0369a1;
      line-height: 1.4;
    }

    .inline-code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9pt;
      background: #f1f5f9;
      color: #0f172a;
      padding: 2px 5px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }

    .math-inline code, .math-display code {
      font-family: 'JetBrains Mono', monospace;
      background: #fef3c7;
      color: #92400e;
      padding: 2px 4px;
      border-radius: 4px;
    }

    .doc-link {
      color: #0284c7;
      text-decoration: none;
      font-weight: 600;
    }

    .divider {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 20px 0;
    }

    ul, ol {
      margin: 6px 0 10px 0;
      padding-left: 24px;
    }

    li {
      margin-bottom: 4px;
      color: #334155;
    }

    /* Footer print info */
    .doc-footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      margin-top: 30px;
      font-size: 8.5pt;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="doc-container">
    <div class="header-banner">
      <h1 class="doc-title">⚡ BATTERY QUEST: POWER RACING ACADEMY</h1>
      <p class="header-sub">คู่มือสรุปการพัฒนา สถาปัตยกรรมระบบ 15 ฉาก และขั้นตอนการส่งต่องาน (Handover Manual)</p>
      <div class="meta-pills">
        <span class="meta-pill">โปรเจกต์: Gaming Kwanjai</span>
        <span class="meta-pill">สแต็ก: React 19 + TypeScript + Three.js + Vite</span>
        <span class="meta-pill">สถานะ: 20/20 Stage Tests Passed</span>
        <span class="meta-pill">โฮสติ้ง: Vercel Production Live</span>
      </div>
    </div>

    ${bodyHtml}

    <div class="doc-footer">
      <span>เอกสารส่งมอบโครงการวิศวกรรมไฟฟ้า 3 มิติ (Gaming Kwanjai)</span>
      <span>GitHub: https://github.com/nattakwan/gamimg_kwanjai</span>
    </div>
  </div>
</body>
</html>
`;

fs.writeFileSync(htmlPath, completeHtml, 'utf8');
console.log('Generated HTML at:', htmlPath);

// Generate PDF via Microsoft Edge Headless
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

const edgeCmd = `"${edgePath}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${fileUrl}"`;
console.log('Running Edge to generate PDF...');
try {
  execSync(edgeCmd, { stdio: 'inherit' });
  console.log('Generated PDF at:', pdfPath);
  
  // Copy to brain artifact directory
  fs.copyFileSync(pdfPath, brainPdfPath);
  console.log('Copied PDF to Brain Artifact path:', brainPdfPath);
} catch (err) {
  console.error('Error generating PDF:', err.message);
}
