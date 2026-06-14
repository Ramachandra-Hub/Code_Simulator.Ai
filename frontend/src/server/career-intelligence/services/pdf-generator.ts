/** Minimal PDF 1.4 text generator — no external dependencies */

function escapePdfText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapLines(text: string, maxLen = 90): string[] {
  const lines: string[] = [];
  for (const raw of text.split("\n")) {
    let line = raw;
    while (line.length > maxLen) {
      lines.push(line.slice(0, maxLen));
      line = line.slice(maxLen);
    }
    lines.push(line);
  }
  return lines;
}

export interface PdfSection {
  heading: string;
  lines: string[];
}

export function createTextPdf(title: string, sections: PdfSection[]): Buffer {
  const contentLines: string[] = [];
  let y = 780;

  const addLine = (text: string, size = 11, bold = false) => {
    const font = bold ? "/F2" : "/F1";
    contentLines.push(`BT ${font} ${size} Tf 50 ${y} Td (${escapePdfText(text)}) Tj ET`);
    y -= size + 6;
  };

  addLine(title, 16, true);
  y -= 4;
  addLine(`Generated: ${new Date().toLocaleString()}`, 9);
  y -= 10;

  for (const section of sections) {
    if (y < 60) break;
    addLine(section.heading, 13, true);
    y -= 4;
    for (const line of section.lines.flatMap((l) => wrapLines(l))) {
      if (y < 50) break;
      addLine(line, 10);
    }
    y -= 8;
  }

  const stream = contentLines.join("\n");
  const streamLen = Buffer.byteLength(stream, "utf8");

  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>endobj",
    `4 0 obj<< /Length ${streamLen} >>stream\n${stream}\nendstream\nendobj`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj",
    "6 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>endobj",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj + "\n";
  }

  const xrefPos = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}
