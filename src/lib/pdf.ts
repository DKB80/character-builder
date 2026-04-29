import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import type { Referee, RequestContext } from "./types";

type BuildPdfOpts = {
  context: RequestContext;
  referee: Referee;
  letter: string;
  typedName: string;
  signatureDataUrl: string;
  signedAt: Date;
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 72;
const FONT_SIZE = 11;
const LINE_HEIGHT = 16;

export async function buildPdf(opts: BuildPdfOpts): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const newPage = () => {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  };

  const drawLine = (
    text: string,
    options: { font?: PDFFont; size?: number } = {}
  ) => {
    const f = options.font || font;
    const size = options.size || FONT_SIZE;
    if (y - LINE_HEIGHT < MARGIN) newPage();
    page.drawText(text, { x: MARGIN, y, font: f, size, color: rgb(0, 0, 0) });
    y -= LINE_HEIGHT;
  };

  const wrap = (text: string, f: PDFFont, size: number): string[] => {
    const maxWidth = PAGE_WIDTH - MARGIN * 2;
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = "";
    for (const w of words) {
      const test = current ? current + " " + w : w;
      if (f.widthOfTextAtSize(test, size) > maxWidth) {
        if (current) lines.push(current);
        current = w;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [""];
  };

  const paragraphs = opts.letter.replace(/\r\n/g, "\n").split(/\n\n+/);
  for (const para of paragraphs) {
    const lines = para.split("\n");
    for (const line of lines) {
      for (const wrapped of wrap(line, font, FONT_SIZE)) {
        drawLine(wrapped);
      }
    }
    y -= LINE_HEIGHT * 0.5;
  }

  y -= LINE_HEIGHT;

  const sigBytes = dataUrlToBytes(opts.signatureDataUrl);
  const sigImage = await doc.embedPng(sigBytes);
  const sigWidth = 200;
  const sigHeight = (sigImage.height / sigImage.width) * sigWidth;

  const blockHeight = sigHeight + LINE_HEIGHT * 7;
  if (y - blockHeight < MARGIN) newPage();

  page.drawImage(sigImage, {
    x: MARGIN,
    y: y - sigHeight,
    width: sigWidth,
    height: sigHeight,
  });
  y -= sigHeight + 4;

  drawLineOnPage(page, MARGIN, y, MARGIN + 250, y, rgb(0.6, 0.6, 0.6));
  y -= LINE_HEIGHT;

  drawLine(opts.typedName, { font: fontBold });
  if (opts.referee.relationship) {
    drawLine(`${opts.referee.relationship} of ${opts.context.subject.name}`);
  }
  if (opts.referee.knownDuration) {
    drawLine(`Known for: ${opts.referee.knownDuration}`);
  }
  if (opts.referee.email) {
    drawLine(`Email: ${opts.referee.email}`);
  }
  if (opts.referee.mobile) {
    drawLine(`Mobile: ${opts.referee.mobile}`);
  }
  drawLine(`Signed: ${opts.signedAt.toISOString()}`, {
    font: fontItalic,
    size: 9,
  });

  y -= LINE_HEIGHT * 0.5;
  const noticeText = `Electronic-signature notice: This document was signed electronically by ${opts.typedName} on ${opts.signedAt.toLocaleString()}. The typed name, drawn signature, timestamp, and the relationship details above were captured at the time of signing.`;
  for (const wrapped of wrap(noticeText, fontItalic, 9)) {
    if (y - LINE_HEIGHT < MARGIN) newPage();
    page.drawText(wrapped, {
      x: MARGIN,
      y,
      font: fontItalic,
      size: 9,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= LINE_HEIGHT * 0.85;
  }

  return doc.save();
}

function drawLineOnPage(
  page: PDFPage,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: ReturnType<typeof rgb>
) {
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness: 0.5,
    color,
  });
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
