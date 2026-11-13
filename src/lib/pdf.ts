import { PDFDocument, degrees, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import JSZip from "jszip";
import type { PDFDocumentProxy, PageViewport } from "pdfjs-dist";
import { FONT_FAMILIES, type EditableData, type FontFamily, type Mark, type Point } from "./types";
import { combinedImageSize } from "./image-layout";

const DATA_FILE = "paperwork-editor-data-v1.json";
const ORIGINAL_FILE = "paperwork-original-v1.pdf";

export async function pdfjs() {
  const lib = await import("pdfjs-dist");
  lib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  return lib;
}

export async function openPdf(bytes: Uint8Array) {
  const lib = await pdfjs();
  let doc = await lib.getDocument({ data: bytes.slice() }).promise;
  let base = bytes;
  let marks: Mark[] = [];
  const attachments = await doc.getAttachments();
  const data = attachments?.get(DATA_FILE);
  const original = attachments?.get(ORIGINAL_FILE);
  if (data && original) {
    const dataBytes = data.content ?? await doc.getAttachmentContent(DATA_FILE);
    const originalBytes = original.content ?? await doc.getAttachmentContent(ORIGINAL_FILE);
    if (!dataBytes || !originalBytes) throw new Error("Could not read the embedded editing data.");
    const parsed: unknown = JSON.parse(new TextDecoder().decode(dataBytes));
    if (!isEditableData(parsed)) throw new Error("This PDF contains invalid Paperwork editing data.");
    base = new Uint8Array(originalBytes);
    await doc.loadingTask.destroy();
    doc = await lib.getDocument({ data: base.slice() }).promise;
    if (parsed.marks.some((mark) => mark.page >= doc.numPages)) {
      await doc.loadingTask.destroy();
      throw new Error("This PDF contains annotations for pages that do not exist.");
    }
    marks = parsed.marks;
  }
  return { doc, base, marks };
}

function isEditableData(value: unknown): value is EditableData {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  if (data.version !== 1 || !Array.isArray(data.marks)) return false;
  const validPoint = (p: unknown): p is Point =>
    !!p && typeof p === "object" &&
    typeof (p as Point).x === "number" && Number.isFinite((p as Point).x) &&
    typeof (p as Point).y === "number" && Number.isFinite((p as Point).y);
  return data.marks.every((mark: unknown) => {
    if (!mark || typeof mark !== "object") return false;
    const m = mark as Record<string, unknown>;
    if (typeof m.id !== "string" || !Number.isInteger(m.page) || (m.page as number) < 0 ||
      typeof m.color !== "string" || !/^#[0-9a-f]{6}$/i.test(m.color) ||
      typeof m.size !== "number" || !Number.isFinite(m.size) || m.size <= 0) return false;
    if (m.kind === "text") {
      return typeof m.text === "string" &&
        (m.font === undefined || (typeof m.font === "string" && Object.hasOwn(FONT_FAMILIES, m.font))) &&
        validPoint(m);
    }
    return (m.kind === "ink" || m.kind === "highlight") &&
      Array.isArray(m.points) && m.points.length > 0 && m.points.every(validPoint);
  });
}

function color(hex: string) {
  return rgb(
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  );
}

function pdfPoint(viewport: PageViewport, point: Point) {
  return viewport.convertToPdfPoint(point.x * viewport.width, point.y * viewport.height);
}

export async function savePdf(
  base: Uint8Array,
  doc: PDFDocumentProxy,
  marks: Mark[],
  compact = true,
) {
  const output = await PDFDocument.load(base);
  type EmbeddedFont = Awaited<ReturnType<typeof output.embedFont>>;
  const fonts = new Map<FontFamily, EmbeddedFont[]>();
  if (marks.some((mark) => mark.kind === "text" && mark.text)) {
    output.registerFontkit(fontkit);
    const urls: Record<FontFamily, URL[]> = {
      sans: [
        new URL("@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff", import.meta.url),
        new URL("@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/noto-sans/files/noto-sans-cyrillic-400-normal.woff", import.meta.url),
        new URL("@fontsource/noto-sans/files/noto-sans-cyrillic-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/noto-sans/files/noto-sans-greek-400-normal.woff", import.meta.url),
        new URL("@fontsource/noto-sans/files/noto-sans-greek-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/noto-sans/files/noto-sans-vietnamese-400-normal.woff", import.meta.url),
        new URL("@fontsource/noto-sans/files/noto-sans-devanagari-400-normal.woff", import.meta.url),
      ],
      serif: [
        new URL("@fontsource/noto-serif/files/noto-serif-latin-400-normal.woff", import.meta.url),
        new URL("@fontsource/noto-serif/files/noto-serif-latin-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/noto-serif/files/noto-serif-cyrillic-400-normal.woff", import.meta.url),
        new URL("@fontsource/noto-serif/files/noto-serif-cyrillic-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/noto-serif/files/noto-serif-greek-400-normal.woff", import.meta.url),
        new URL("@fontsource/noto-serif/files/noto-serif-greek-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/noto-serif/files/noto-serif-vietnamese-400-normal.woff", import.meta.url),
      ],
      mono: [
        new URL("@fontsource/noto-sans-mono/files/noto-sans-mono-latin-400-normal.woff", import.meta.url),
        new URL("@fontsource/noto-sans-mono/files/noto-sans-mono-latin-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/noto-sans-mono/files/noto-sans-mono-cyrillic-400-normal.woff", import.meta.url),
        new URL("@fontsource/noto-sans-mono/files/noto-sans-mono-cyrillic-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/noto-sans-mono/files/noto-sans-mono-greek-400-normal.woff", import.meta.url),
        new URL("@fontsource/noto-sans-mono/files/noto-sans-mono-greek-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/noto-sans-mono/files/noto-sans-mono-vietnamese-400-normal.woff", import.meta.url),
      ],
      roboto: [
        new URL("@fontsource/roboto/files/roboto-latin-400-normal.woff", import.meta.url),
        new URL("@fontsource/roboto/files/roboto-latin-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/roboto/files/roboto-cyrillic-400-normal.woff", import.meta.url),
        new URL("@fontsource/roboto/files/roboto-cyrillic-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/roboto/files/roboto-greek-400-normal.woff", import.meta.url),
        new URL("@fontsource/roboto/files/roboto-greek-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/roboto/files/roboto-vietnamese-400-normal.woff", import.meta.url),
        new URL("@fontsource/roboto/files/roboto-math-400-normal.woff", import.meta.url),
        new URL("@fontsource/roboto/files/roboto-symbols-400-normal.woff", import.meta.url),
      ],
      arimo: [
        new URL("@fontsource/arimo/files/arimo-latin-400-normal.woff", import.meta.url),
        new URL("@fontsource/arimo/files/arimo-latin-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/arimo/files/arimo-cyrillic-400-normal.woff", import.meta.url),
        new URL("@fontsource/arimo/files/arimo-cyrillic-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/arimo/files/arimo-greek-400-normal.woff", import.meta.url),
        new URL("@fontsource/arimo/files/arimo-greek-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/arimo/files/arimo-vietnamese-400-normal.woff", import.meta.url),
        new URL("@fontsource/arimo/files/arimo-hebrew-400-normal.woff", import.meta.url),
      ],
      inter: [
        new URL("@fontsource/inter/files/inter-latin-400-normal.woff", import.meta.url),
        new URL("@fontsource/inter/files/inter-latin-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/inter/files/inter-cyrillic-400-normal.woff", import.meta.url),
        new URL("@fontsource/inter/files/inter-cyrillic-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/inter/files/inter-greek-400-normal.woff", import.meta.url),
        new URL("@fontsource/inter/files/inter-greek-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/inter/files/inter-vietnamese-400-normal.woff", import.meta.url),
      ],
      lato: [
        new URL("@fontsource/lato/files/lato-latin-400-normal.woff", import.meta.url),
        new URL("@fontsource/lato/files/lato-latin-ext-400-normal.woff", import.meta.url),
      ],
      montserrat: [
        new URL("@fontsource/montserrat/files/montserrat-latin-400-normal.woff", import.meta.url),
        new URL("@fontsource/montserrat/files/montserrat-latin-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/montserrat/files/montserrat-cyrillic-400-normal.woff", import.meta.url),
        new URL("@fontsource/montserrat/files/montserrat-cyrillic-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/montserrat/files/montserrat-vietnamese-400-normal.woff", import.meta.url),
      ],
      openSans: [
        new URL("@fontsource/open-sans/files/open-sans-latin-400-normal.woff", import.meta.url),
        new URL("@fontsource/open-sans/files/open-sans-latin-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/open-sans/files/open-sans-cyrillic-400-normal.woff", import.meta.url),
        new URL("@fontsource/open-sans/files/open-sans-cyrillic-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/open-sans/files/open-sans-greek-400-normal.woff", import.meta.url),
        new URL("@fontsource/open-sans/files/open-sans-greek-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/open-sans/files/open-sans-vietnamese-400-normal.woff", import.meta.url),
        new URL("@fontsource/open-sans/files/open-sans-hebrew-400-normal.woff", import.meta.url),
        new URL("@fontsource/open-sans/files/open-sans-math-400-normal.woff", import.meta.url),
        new URL("@fontsource/open-sans/files/open-sans-symbols-400-normal.woff", import.meta.url),
      ],
      sourceSans: [
        new URL("@fontsource/source-sans-3/files/source-sans-3-latin-400-normal.woff", import.meta.url),
        new URL("@fontsource/source-sans-3/files/source-sans-3-latin-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/source-sans-3/files/source-sans-3-cyrillic-400-normal.woff", import.meta.url),
        new URL("@fontsource/source-sans-3/files/source-sans-3-cyrillic-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/source-sans-3/files/source-sans-3-greek-400-normal.woff", import.meta.url),
        new URL("@fontsource/source-sans-3/files/source-sans-3-greek-ext-400-normal.woff", import.meta.url),
        new URL("@fontsource/source-sans-3/files/source-sans-3-vietnamese-400-normal.woff", import.meta.url),
      ],
    };
    const families = new Set(marks.flatMap((mark) => mark.kind === "text" && mark.text ? [mark.font ?? "sans"] : []));
    for (const family of families) {
      const familyUrls = family === "sans" ? urls.sans : [...urls[family], ...urls.sans];
      const files = await Promise.all(familyUrls.map(async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Could not load the font needed to save text.");
        const bytes = new Uint8Array(await response.arrayBuffer());
        return { bytes, supported: new Set(fontkit.create(bytes).characterSet) };
      }));
      const used = new Set<number>();
      const unsupported = marks.flatMap((mark) => mark.kind === "text" && (mark.font ?? "sans") === family ? Array.from(mark.text) : [])
        .find((character) => {
          if (character === "\n" || character === "\r") return false;
          const index = files.findIndex((file) => file.supported.has(character.codePointAt(0)!));
          if (index >= 0) used.add(index);
          return index < 0;
        });
      if (unsupported) throw new Error(`The PDF font cannot represent “${unsupported}”. This character cannot currently be saved.`);
      const familyFonts: EmbeddedFont[] = [];
      for (const index of [...used].sort((a, b) => a - b)) familyFonts.push(await output.embedFont(files[index].bytes, { subset: true }));
      fonts.set(family, familyFonts);
    }
  }

  for (let i = 0; i < doc.numPages; i++) {
    const pageMarks = marks.filter((mark) => mark.page === i);
    if (!pageMarks.length) continue;
    const viewport = (await doc.getPage(i + 1)).getViewport({ scale: 1 });
    const page = output.getPage(i);
    for (const mark of pageMarks) {
      if (mark.kind === "text") {
        const familyFonts = fonts.get(mark.font ?? "sans");
        if (!mark.text || !familyFonts?.length) continue;
        const [originX, originY] = pdfPoint(viewport, { x: mark.x, y: mark.y });
        const [rightX, rightY] = pdfPoint(viewport, { x: mark.x + 1 / viewport.width, y: mark.y });
        const [downX, downY] = pdfPoint(viewport, { x: mark.x, y: mark.y + 1 / viewport.height });
        const angle = Math.atan2(rightY - originY, rightX - originX) * 180 / Math.PI;
        const lines = mark.text.replace(/\r/g, "").split("\n");
        lines.forEach((line, index) => {
          if (!line) return;
          const offset = mark.size * (0.95 + index * 1.25);
          let advance = 0;
          let run = "";
          let runFont = familyFonts.find((font) => font.getCharacterSet().includes(line.codePointAt(0)!))!;
          const drawRun = () => {
            if (!run) return;
            page.drawText(run, {
              x: originX + (downX - originX) * offset + (rightX - originX) * advance,
              y: originY + (downY - originY) * offset + (rightY - originY) * advance,
              size: mark.size,
              font: runFont,
              color: color(mark.color),
              rotate: degrees(angle),
            });
            advance += runFont.widthOfTextAtSize(run, mark.size);
            run = "";
          };
          for (const character of line) {
            if (!runFont.getCharacterSet().includes(character.codePointAt(0)!)) {
              drawRun();
              runFont = familyFonts.find((font) => font.getCharacterSet().includes(character.codePointAt(0)!))!;
            }
            run += character;
          }
          drawRun();
        });
      } else {
        if (mark.points.length === 1) {
          const [x, y] = pdfPoint(viewport, mark.points[0]);
          page.drawCircle({ x, y, size: mark.size / 2, color: color(mark.color), opacity: mark.kind === "highlight" ? 0.3 : 1 });
        }
        for (let n = 0; n < mark.points.length - 1; n++) {
          const [x, y] = pdfPoint(viewport, mark.points[n]);
          const [endX, endY] = pdfPoint(viewport, mark.points[n + 1]);
          page.drawLine({
            start: { x, y },
            end: { x: endX, y: endY },
            thickness: mark.size,
            color: color(mark.color),
            opacity: mark.kind === "highlight" ? 0.3 : 1,
          });
        }
      }
    }
  }
  if (marks.length) {
    const data: EditableData = { version: 1, marks };
    await output.attach(base, ORIGINAL_FILE, { mimeType: "application/pdf", description: "Original document for Paperwork editing" });
    await output.attach(new TextEncoder().encode(JSON.stringify(data)), DATA_FILE, {
      mimeType: "application/json",
      description: "Editable Paperwork annotations",
    });
  }
  return output.save({ useObjectStreams: compact });
}

export function download(data: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportImages(
  doc: PDFDocumentProxy,
  marks: Mark[],
  filename: string,
  format: "png" | "jpeg",
  layout: "separate" | "combined",
) {
  await Promise.all(marks.filter((mark) => mark.kind === "text" && mark.text).flatMap((mark) =>
    mark.kind === "text" ? [
      document.fonts.load(`${mark.size * 2}px "${FONT_FAMILIES[mark.font ?? "sans"].family}"`, mark.text),
      document.fonts.load(`${mark.size * 2}px "Noto Sans"`, mark.text),
    ] : [],
  ));
  const extension = format === "jpeg" ? "jpg" : "png";
  async function renderPage(i: number) {
    const page = await doc.getPage(i + 1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create an image canvas.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    paintMarks(context, marks.filter((mark) => mark.page === i), viewport.width, viewport.height, 2);
    return canvas;
  }
  async function encode(canvas: HTMLCanvasElement, description: string) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, `image/${format}`, 0.92));
    if (!blob || blob.type !== `image/${format}`) throw new Error(`Could not export ${description} as ${format.toUpperCase()}.${layout === "combined" ? " Choose one image per page instead." : ""}`);
    return blob;
  }
  if (layout === "combined") {
    const sizes = [];
    for (let i = 0; i < doc.numPages; i++) {
      const viewport = (await doc.getPage(i + 1)).getViewport({ scale: 2 });
      sizes.push({ width: Math.ceil(viewport.width), height: Math.ceil(viewport.height) });
    }
    const size = combinedImageSize(sizes);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create the combined image canvas. Choose one image per page instead.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, size.width, size.height);
    let y = 0;
    for (let i = 0; i < doc.numPages; i++) {
      const page = await renderPage(i);
      context.drawImage(page, Math.floor((size.width - page.width) / 2), y);
      y += page.height;
      page.width = 0;
      page.height = 0;
    }
    download(await encode(canvas, "the combined image"), `${filename}-combined.${extension}`, `image/${format}`);
    return;
  }
  const zip = new JSZip();
  for (let i = 0; i < doc.numPages; i++) {
    const canvas = await renderPage(i);
    zip.file(`page-${String(i + 1).padStart(3, "0")}.${extension}`, await encode(canvas, `page ${i + 1}`));
    canvas.width = 0;
    canvas.height = 0;
  }
  download(await zip.generateAsync({ type: "blob" }), `${filename}-${format}.zip`, "application/zip");
}

export function paintMarks(ctx: CanvasRenderingContext2D, marks: Mark[], width: number, height: number, scale: number) {
  for (const mark of marks) {
    ctx.save();
    if (mark.kind === "text") {
      ctx.fillStyle = mark.color;
      ctx.font = `${mark.size * scale}px ${FONT_FAMILIES[mark.font ?? "sans"].css}`;
      ctx.textBaseline = "top";
      mark.text.replace(/\r/g, "").split("\n").forEach((line, index) => {
        ctx.fillText(line, mark.x * width, mark.y * height + index * mark.size * scale * 1.25);
      });
    } else {
      ctx.strokeStyle = mark.color;
      ctx.globalAlpha = mark.kind === "highlight" ? 0.3 : 1;
      ctx.lineWidth = mark.size * scale;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(mark.points[0].x * width, mark.points[0].y * height);
      if (mark.points.length === 1) ctx.lineTo(mark.points[0].x * width + 0.01, mark.points[0].y * height);
      else mark.points.slice(1).forEach((point) => ctx.lineTo(point.x * width, point.y * height));
      ctx.stroke();
    }
    ctx.restore();
  }
}
