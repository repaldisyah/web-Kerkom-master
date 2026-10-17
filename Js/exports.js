(() => {
  if (!document.querySelector('link[href*="exports.css"]')) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = new URL('../Css/exports.css', document.currentScript.src).href;
    document.head.append(style);
  }
  const enc = new TextEncoder();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[ch]));
  const bytes = value => enc.encode(String(value));
  const concat = parts => { const size = parts.reduce((n, part) => n + part.length, 0); const out = new Uint8Array(size); let at = 0; parts.forEach(part => { out.set(part, at); at += part.length; }); return out; };
  const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = data => { let c = 0xffffffff; data.forEach(b => { c = crcTable[(c ^ b) & 255] ^ (c >>> 8); }); return (c ^ 0xffffffff) >>> 0; };
  const u16 = n => new Uint8Array([n & 255, (n >>> 8) & 255]);
  const u32 = n => new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);
  function zip(files) {
    const local = [], central = []; let offset = 0;
    for (const [name, content] of Object.entries(files)) {
      const filename = bytes(name), data = typeof content === 'string' ? bytes(content) : content, crc = crc32(data);
      const head = concat([u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(filename.length), u16(0), filename]);
      local.push(head, data);
      central.push(concat([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(filename.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), filename]));
      offset += head.length + data.length;
    }
    const centralBytes = concat(central), entries = central.length;
    return concat([...local, centralBytes, u32(0x06054b50), u16(0), u16(0), u16(entries), u16(entries), u32(centralBytes.length), u32(offset), u16(0)]);
  }
  function download(blob, filename) { const link = document.createElement('a'); const url = URL.createObjectURL(blob); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500); }
  const colName = n => { let out = ''; while (n) { n--; out = String.fromCharCode(65 + n % 26) + out; n = Math.floor(n / 26); } return out; };
  function xlsx({ title, period, description, headers, rows }) {
    const matrix = [[title], [period], [description || ''], [], headers, ...rows];
    const sheetRows = matrix.map((row, ri) => `<row r="${ri + 1}">${row.map((value, ci) => {
      const ref = `${colName(ci + 1)}${ri + 1}`;
      const styleId = ri === 0 ? 3 : ri === 4 ? 2 : (typeof value === 'number' && Number.isFinite(value) ? 1 : 0);
      if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}" s="${styleId}"><v>${value}</v></c>`;
      return `<c r="${ref}" s="${styleId}" t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
    }).join('')}</row>`).join('');
    const cols = headers.map((_, i) => `<col min="${i + 1}" max="${i + 1}" width="22" customWidth="1"/>`).join('');
    const files = {
      '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
      '_rels/.rels': '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Laporan" sheetId="1" r:id="rId1"/></sheets></workbook>',
      'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0;[Red](#,##0)"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="16"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF17324D"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
      'xl/worksheets/sheet1.xml': `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${cols}</cols><sheetData>${sheetRows}</sheetData><autoFilter ref="A5:${colName(headers.length)}${matrix.length}"/></worksheet>`
    };
    return zip(files);
  }
  function docx({ title, period, description, headers, rows }) {
    const p = text => `<w:p><w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
    const display = value => typeof value === 'number' ? new Intl.NumberFormat('id-ID').format(value) : String(value ?? '');
    const columnWidth = Math.floor(14500 / headers.length);
    const row = (data, head = false) => `<w:tr>${head ? '<w:trPr><w:tblHeader w:val="true"/></w:trPr>' : ''}${data.map(text => `<w:tc><w:tcPr>${head ? '<w:shd w:fill="17324D"/>' : ''}<w:tcW w:w="${columnWidth}" w:type="dxa"/></w:tcPr><w:p><w:r>${head ? '<w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr>' : ''}<w:t xml:space="preserve">${esc(display(text))}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`;
    const table = `<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>${row(headers, true)}${rows.map(data => row(data.map(String))).join('')}</w:tbl>`;
    return zip({
      '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
      '_rels/.rels': '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
      'word/document.xml': `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${p(title)}${p(period)}${description ? p(description) : ''}${table}<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr></w:body></w:document>`
    });
  }
  function pdf({ title, period, description, headers, rows }) {
    const clean = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, '?').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const display = value => typeof value === 'number' ? new Intl.NumberFormat('id-ID').format(value) : String(value ?? '');
    const lines = [title, period, ...(description ? [description] : []), '', headers.join(' | '), ...rows.map(row => row.map(display).join(' | '))];
    const pages = []; let page = [];
    for (const line of lines) { const wrapped = String(line).match(/.{1,105}(?:\s|$)|.{1,105}/g) || ['']; for (const segment of wrapped) { if (page.length >= 38) { pages.push(page); page = [headers.join(' | ')]; } page.push(segment.trim()); } }
    if (page.length) pages.push(page);
    const objects = ['']; const add = value => { objects.push(value); return objects.length - 1; };
    const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const pageIds = [];
    pages.forEach(linesPage => {
      let stream = 'BT\n/F1 9 Tf\n42 555 Td\n13 TL\n';
      linesPage.forEach((line, i) => { if (i === 0 && pageIds.length === 0) stream += '/F1 14 Tf\n'; else if (i === 1 && pageIds.length === 0) stream += '/F1 10 Tf\n'; else stream += '/F1 8 Tf\n'; stream += `(${clean(line)}) Tj\nT*\n`; });
      stream += 'ET';
      const contentId = add(`<< /Length ${bytes(stream).length} >>\nstream\n${stream}\nendstream`);
      const pageId = add(`<< /Type /Page /Parent PAGES /MediaBox [0 0 842 595] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${contentId} 0 R >>`);
      pageIds.push(pageId);
    });
    const pagesId = add(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
    pageIds.forEach(id => { objects[id] = objects[id].replace('/Parent PAGES', `/Parent ${pagesId} 0 R`); });
    const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    let output = '%PDF-1.4\n%âãÏÓ\n', offsets = [0];
    for (let i = 1; i < objects.length; i++) { offsets[i] = bytes(output).length; output += `${i} 0 obj\n${objects[i]}\nendobj\n`; }
    const xref = bytes(output).length; output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < objects.length; i++) output += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    output += `trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return bytes(output);
  }
  function exportFile(data, format) {
    const safe = `${data.filename || 'laporan'}-${String(data.period || '').replace(/[^\d-]/g, '') || 'data'}`;
    const payload = format === 'pdf' ? pdf(data) : format === 'xlsx' ? xlsx(data) : docx(data);
    const types = { pdf: 'application/pdf', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
    const ext = format === 'docx' ? 'docx' : format;
    download(new Blob([payload], { type: types[format] }), `${safe}.${ext}`);
  }
  window.NusaExports = { exportFile };
})();
