"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";
import { FONT_FAMILIES, type FontFamily, type Mark, type Point, type Tool } from "@/lib/types";
import { COLORS, errorMessage } from "./editor-shared";

type PdfPageProps = {
  doc: PDFDocumentProxy; pageNumber: number; zoom: number; tool: Tool; color: string; busy: boolean;
  lineSize: number; font: FontFamily; fontSize: number;
  marks: Mark[]; selected: string | null; onSelect: (id: string | null) => void;
  onAdd: (mark: Mark) => void; onChange: (id: string, text: string) => void;
  onTextFocus: () => void; onError: (message: string) => void;
};

export function PdfPage({ doc, pageNumber, zoom, tool, color, busy, lineSize, font, fontSize, marks, selected, onSelect, onAdd, onChange, onTextFocus, onError }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState<PDFPageProxy | null>(null);
  const [dimensions, setDimensions] = useState({ width: 612, height: 792 });
  const [draft, setDraft] = useState<Point[]>([]);
  const draftRef = useRef<Point[]>([]);
  const textEditRef = useRef<{ id: string; changed: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    doc.getPage(pageNumber + 1).then((result) => {
      if (!active) return;
      setPage(result);
      const viewport = result.getViewport({ scale: 1 });
      setDimensions({ width: viewport.width, height: viewport.height });
    }).catch((reason: unknown) => { if (active) onError(`Could not load page ${pageNumber + 1}: ${errorMessage(reason)}`); });
    return () => { active = false; };
  }, [doc, pageNumber, onError]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !page) return;
    const ratio = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: zoom * ratio });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) { onError("Could not display the PDF page."); return; }
    const task: RenderTask = page.render({ canvas, canvasContext: context, viewport });
    task.promise.catch((reason: unknown) => {
      if (reason instanceof Error && reason.name !== "RenderingCancelledException") onError(`Could not render page ${pageNumber + 1}: ${reason.message}`);
    });
    return () => { task.cancel(); };
  }, [page, zoom, pageNumber, onError]);

  function point(event: React.PointerEvent): Point {
    const bounds = surfaceRef.current!.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)) };
  }
  function start(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !page) return;
    if (tool === "select") { onSelect(null); return; }
    const position = point(event);
    if (tool === "text") {
      onAdd({ id: crypto.randomUUID(), kind: "text", page: pageNumber, ...position, text: "", size: fontSize, font, color });
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    draftRef.current = [position];
    setDraft([position]);
  }
  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (!draftRef.current.length) return;
    const next = [...draftRef.current, point(event)];
    draftRef.current = next;
    setDraft(next);
  }
  function finish() {
    if (!draftRef.current.length || (tool !== "draw" && tool !== "highlight")) return;
    onAdd({ id: crypto.randomUUID(), kind: tool === "draw" ? "ink" : "highlight", page: pageNumber, points: draftRef.current, size: lineSize, color: tool === "highlight" && color === COLORS[0] ? "#f0bf3f" : color });
    draftRef.current = [];
    setDraft([]);
  }
  const width = dimensions.width * zoom;
  const height = dimensions.height * zoom;
  const paths = marks.filter((mark) => mark.kind !== "text");
  return <div className="page-wrap">
    <div ref={surfaceRef} className={`pdf-page tool-${tool}`} style={{ width, height }} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={() => { draftRef.current = []; setDraft([]); }}>
      <canvas ref={canvasRef} style={{ width, height }} />
      <svg className="annotation-layer" width={width} height={height}>
        {paths.map((mark) => mark.points.length === 1
          ? <circle key={mark.id} cx={mark.points[0].x * width} cy={mark.points[0].y * height} r={mark.size * zoom / 2} fill={mark.color} opacity={mark.kind === "highlight" ? 0.3 : 1} style={{ pointerEvents: tool === "select" ? "all" : "none", cursor: "pointer", filter: selected === mark.id ? "drop-shadow(0 0 3px #4479dc)" : undefined }} onPointerDown={(event) => { event.stopPropagation(); onSelect(mark.id); }} />
          : <polyline key={mark.id} points={mark.points.map((p) => `${p.x * width},${p.y * height}`).join(" ")} fill="none" stroke={mark.color} strokeWidth={mark.size * zoom} opacity={mark.kind === "highlight" ? 0.3 : 1} strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: tool === "select" ? "stroke" : "none", cursor: "pointer", filter: selected === mark.id ? "drop-shadow(0 0 3px #4479dc)" : undefined }} onPointerDown={(event) => { event.stopPropagation(); onSelect(mark.id); }} />)}
        {draft.length > 0 && <polyline points={draft.map((p) => `${p.x * width},${p.y * height}`).join(" ")} fill="none" stroke={tool === "highlight" && color === COLORS[0] ? "#f0bf3f" : color} strokeWidth={lineSize * zoom} opacity={tool === "highlight" ? 0.3 : 1} strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      {marks.map((mark) => mark.kind === "text" && <textarea key={mark.id} disabled={busy} aria-label={`Text annotation on page ${pageNumber + 1}`} autoFocus={selected === mark.id && tool === "text"} className={`text-mark ${selected === mark.id ? "selected" : ""}`} style={{ left: mark.x * width, top: mark.y * height, fontSize: mark.size * zoom, fontFamily: FONT_FAMILIES[mark.font ?? "sans"].css, color: mark.color, width: Math.max(140, Math.max(...mark.text.split("\n").map((line) => line.length)) * mark.size * 0.9 + 12) * zoom, height: Math.max(30, mark.text.split("\n").length * mark.size * 1.25 + 6) * zoom, pointerEvents: tool === "select" || selected === mark.id && tool === "text" ? "auto" : "none" }} value={mark.text} wrap="off" placeholder="Type here..." onPointerDown={(event) => { event.stopPropagation(); onSelect(mark.id); }} onFocus={() => { onSelect(mark.id); textEditRef.current = { id: mark.id, changed: false }; }} onBlur={() => { textEditRef.current = null; }} onChange={(event) => {
        if (textEditRef.current?.id === mark.id && !textEditRef.current.changed) {
          onTextFocus();
          textEditRef.current.changed = true;
        }
        onChange(mark.id, event.target.value);
      }} />)}
    </div>
    <div className="page-number">{String(pageNumber + 1).padStart(2, "0")} <span>/</span> {String(doc.numPages).padStart(2, "0")}</div>
  </div>;
}
