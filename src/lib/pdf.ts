import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { RefereeDetails, RequestContext } from "./types";

type Args = {
  context: RequestContext;
  referee: RefereeDetails;
  letterBody: string;
  typedSignature: string;
  drawnSignaturePng?: string | null;
  signedAt: Date;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function wrapText(
  text: string,
  font: import("pdf-lib").PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  const paragraphs = text.replace(/\r\n/g, "\n").split(/\n/);
  for (const paragraph of paragraphs) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      const width = font.widthOfTextAtSize(candidate, size);
      if (width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function buildReferencePdf({
  context,
  referee,
  letterBody,
  typedSignature,
  drawnSignaturePng,
  signedAt,
}: Args): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);

  const bodySize = 11;
  const lineHeight = 15;

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let cursorY = PAGE_HEIGHT - MARGIN;

  const ensureSpace = (needed: number) => {
    if (cursorY - needed < MARGIN) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      cursorY = PAGE_HEIGHT - MARGIN;
    }
  };

  const drawLine = (
    text: string,
    f: import("pdf-lib").PDFFont = font,
    size = bodySize
  ) => {
    ensureSpace(lineHeight);
    page.drawText(text, {
      x: MARGIN,
      y: cursorY - size,
      size,
      font: f,
      color: rgb(0.07, 0.07, 0.07),
    });
    cursorY -= lineHeight;
  };

  const drawWrapped = (
    text: string,
    f: import("pdf-lib").PDFFont = font,
    size = bodySize
  ) => {
    const lines = wrapText(text, f, size, CONTENT_WIDTH);
    for (const line of lines) drawLine(line, f, size);
  };

  // Header
  drawLine("Character Reference", fontBold, 16);
  cursorY -= 6;
  drawLine(formatDate(signedAt), fontItalic, 10);
  cursorY -= 10;

  // Letter body
  drawWrapped(letterBody.trim());
  cursorY -= 12;

  // Signature block
  drawLine("Yours sincerely,", font, bodySize);
  cursorY -= 4;

  if (drawnSignaturePng && drawnSignaturePng.startsWith("data:image/png")) {
    try {
      const base64 = drawnSignaturePng.split(",")[1];
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const img = await pdf.embedPng(bytes);
      const targetWidth = 200;
      const scale = targetWidth / img.width;
      const targetHeight = img.height * scale;
      ensureSpace(targetHeight + 6);
      page.drawImage(img, {
        x: MARGIN,
        y: cursorY - targetHeight,
        width: targetWidth,
        height: targetHeight,
      });
      cursorY -= targetHeight + 6;
    } catch {
      // ignore embed errors and fall through to typed signature only
    }
  }

  drawLine(typedSignature, fontBold, bodySize);
  cursorY -= 2;

  // Referee details
  if (referee.occupation) drawLine(referee.occupation, font, bodySize);
  drawLine(`Email: ${referee.email}`, font, bodySize);
  if (referee.phone) drawLine(`Phone: ${referee.phone}`, font, bodySize);
  if (referee.address) drawLine(referee.address, font, bodySize);

  cursorY -= 16;
  drawLine(
    `Signed electronically by ${referee.fullName} on ${signedAt.toLocaleString()}.`,
    fontItalic,
    9
  );
  drawLine(
    `Reference subject: ${context.subjectName}. Relationship: ${referee.relationship}. Years known: ${referee.yearsKnown}.`,
    fontItalic,
    9
  );

  return pdf.save();
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  const blob = new Blob([ab], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
