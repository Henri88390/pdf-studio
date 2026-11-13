"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check, CircleHelp, FileText, LoaderCircle, LockKeyhole, Pen,
  Plus, Type, Upload, X,
} from "lucide-react";
import { download, exportImages, openPdf, savePdf } from "@/lib/pdf";
import type { FontFamily, Mark, Tool } from "@/lib/types";
import { COLORS, errorMessage, type Compression, type DocumentState } from "./editor-shared";
import { OptimizeModal } from "./compress-modal";
import { EditorHeader } from "./editor-header";
import { EditorSidebar } from "./editor-sidebar";
import { ImageExportModal } from "./image-export-modal";
import { PdfPage } from "./pdf-page";
import { EditorToolbar } from "./editor-toolbar";

const fileStem = (name: string) => name.replace(/\.pdf$/i, "") || "document";
const changeZoom = (zoom: number, direction: number) => Math.min(1.8, Math.max(0.6, +(zoom + direction * 0.1).toFixed(1)));
export default function Editor() {
  const [document, setDocument] = useState<DocumentState | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [history, setHistory] = useState<Mark[][]>([]);
  const [future, setFuture] = useState<Mark[][]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState(COLORS[0]);
  const [penSize, setPenSize] = useState(2.5);
  const [markerSize, setMarkerSize] = useState(16);
  const [font, setFont] = useState<FontFamily>("sans");
  const [fontSize, setFontSize] = useState(18);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [menu, setMenu] = useState<"export" | "compress" | "image-export" | null>(null);
  const [imageFormat, setImageFormat] = useState<"png" | "jpeg">("png");
  const [imageLayout, setImageLayout] = useState<"separate" | "combined">("separate");
  const [compression, setCompression] = useState<Compression>("compact");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const revisionRef = useRef(0);
  const snapshot = useCallback(() => {
    revisionRef.current += 1;
    setHistory((previous) => [...previous.slice(-49), marks]);
    setFuture([]);
    setDirty(true);
  }, [marks]);

  const undo = useCallback(() => {
    if (!history.length) return;
    setFuture((previous) => [...previous, marks]);
    setMarks(history[history.length - 1]);
    setHistory((previous) => previous.slice(0, -1));
    setSelected(null);
    setDirty(true);
    revisionRef.current += 1;
  }, [history, marks]);

  const redo = useCallback(() => {
    if (!future.length) return;
    setHistory((previous) => [...previous, marks]);
    setMarks(future[future.length - 1]);
    setFuture((previous) => previous.slice(0, -1));
    setSelected(null);
    setDirty(true);
    revisionRef.current += 1;
  }, [future, marks]);

  useEffect(() => {
    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [dirty]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (busy || menu === "compress" || menu === "image-export") return;
      const target = event.target as HTMLElement;
      if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selected) {
        event.preventDefault();
        snapshot();
        setMarks((previous) => previous.filter((mark) => mark.id !== selected));
        setSelected(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, menu, redo, selected, snapshot, undo]);

  useEffect(() => {
    const area = canvasAreaRef.current;
    if (!area || !document) return;
    function onWheel(event: WheelEvent) {
      if (!event.ctrlKey || event.deltaY === 0) return;
      event.preventDefault();
      setZoom((previous) => changeZoom(previous, event.deltaY < 0 ? 1 : -1));
    }
    area.addEventListener("wheel", onWheel, { passive: false });
    return () => area.removeEventListener("wheel", onWheel);
  }, [document]);

  async function load(file: File) {
    if (busy) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF file.");
      return;
    }
    if (dirty && !window.confirm("You have unsaved changes. Open another file anyway?")) return;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const result = await openPdf(new Uint8Array(await file.arrayBuffer()));
      setDocument({ doc: result.doc, base: result.base, name: file.name, originalSize: file.size });
      setMarks(result.marks);
      setHistory([]);
      setFuture([]);
      setSelected(null);
      setDirty(false);
      revisionRef.current = 0;
      setZoom(1);
      setTool("select");
      if (document) void document.doc.loadingTask.destroy();
    } catch (reason) {
      setError(`Could not open this PDF: ${errorMessage(reason)}`);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function run(action: "save" | "png" | "jpeg") {
    if (!document || busy) return;
    setMenu(null);
    setBusy(true);
    setError("");
    setNotice("");
    const savedRevision = revisionRef.current;
    try {
      const stem = fileStem(document.name);
      if (action === "save") {
        const bytes = await savePdf(document.base, document.doc, marks);
        download(new Uint8Array(bytes), `${stem}-edited.pdf`, "application/pdf");
        if (revisionRef.current === savedRevision) setDirty(false);
        setNotice("Your PDF has been downloaded.");
      } else {
        await exportImages(document.doc, marks, stem, action, imageLayout);
        setNotice(imageLayout === "combined" ? "Combined image downloaded." : "Page images downloaded as a ZIP.");
      }
    } catch (reason) {
      setError(`Could not ${action === "save" ? "save" : "export"}: ${errorMessage(reason)}`);
    } finally {
      setBusy(false);
    }
  }

  function addMark(mark: Mark) {
    snapshot();
    setMarks((previous) => [...previous, mark]);
    setSelected(mark.id);
  }

  const selectedMark = marks.find((mark) => mark.id === selected);
  const selectedText = selectedMark?.kind === "text" && (tool === "select" || tool === "text") ? selectedMark : null;
  const selectedStroke = selectedMark && selectedMark.kind !== "text" &&
    (tool === "select" || (tool === "draw" && selectedMark.kind === "ink") || (tool === "highlight" && selectedMark.kind === "highlight")) ? selectedMark : null;
  function changeStrokeSize(value: number) {
    const size = Math.min(40, Math.max(1, value));
    if (selectedStroke?.kind === "ink" || (!selectedStroke && tool === "draw")) setPenSize(size); else setMarkerSize(size);
    if (selectedStroke && selectedStroke.size !== size) {
      snapshot();
      setMarks((previous) => previous.map((mark) => mark.id === selectedStroke.id && mark.kind !== "text" ? { ...mark, size } : mark));
    }
  }
  function updateTextStyle(style: { font?: FontFamily; size?: number }) {
    if (style.font !== undefined) setFont(style.font);
    if (style.size !== undefined) setFontSize(style.size);
    if (!selectedText) return;
    if ((style.font === undefined || style.font === (selectedText.font ?? "sans")) &&
      (style.size === undefined || style.size === selectedText.size)) return;
    snapshot();
    setMarks((previous) => previous.map((mark) => mark.id === selectedText.id && mark.kind === "text" ? { ...mark, ...style } : mark));
  }
  return (
    <main className="app-shell" onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
    }} onDrop={(event) => {
      event.preventDefault();
      setDragging(false);
      if (menu !== "compress" && menu !== "image-export" && event.dataTransfer.files[0]) void load(event.dataTransfer.files[0]);
    }}>
      <input ref={inputRef} type="file" accept=".pdf,application/pdf" hidden onChange={(event) => {
        if (event.target.files?.[0]) void load(event.target.files[0]);
      }} />
      <EditorHeader name={document?.name ?? null} dirty={dirty} busy={busy} menu={menu} onMenuChange={setMenu}
        onOpen={() => inputRef.current?.click()} onSave={() => void run("save")} onImageExport={(format) => {
          setImageFormat(format); setImageLayout("separate"); setMenu("image-export");
        }} />

      <div className="workspace">
        <EditorSidebar tool={tool} hasDocument={!!document} busy={busy} onToolChange={setTool} onCompress={() => setMenu("compress")} />

        <section className="editor-area">
          <EditorToolbar tool={tool} selectedMark={selectedMark} selectedText={selectedText} selectedStroke={selectedStroke}
            penSize={penSize} markerSize={markerSize} color={color} font={font} fontSize={fontSize} zoom={zoom} busy={busy}
            hasDocument={!!document} canUndo={!!history.length} canRedo={!!future.length} onUndo={undo} onRedo={redo}
            onStrokeSizeChange={changeStrokeSize} onTextStyleChange={updateTextStyle} onDelete={() => {
              snapshot(); setMarks((previous) => previous.filter((mark) => mark.id !== selected)); setSelected(null);
            }} onColorChange={setColor} onZoom={(direction) => setZoom((value) => changeZoom(value, direction))} />
          {(error || notice) && <div className={`message ${error ? "error" : "success"}`} role={error ? "alert" : "status"}><span>{error || notice}</span><button aria-label="Dismiss" onClick={() => { setError(""); setNotice(""); }}><X size={15} /></button></div>}
          <div ref={canvasAreaRef} className={`canvas-area ${dragging ? "dragging" : ""} ${busy ? "busy" : ""}`}>
            {document ? <div className="pages">
              <div className="document-caption"><span><span className="caption-dot" /> DOCUMENT</span><span>{document.doc.numPages} {document.doc.numPages === 1 ? "PAGE" : "PAGES"}</span></div>
              {Array.from({ length: document.doc.numPages }, (_, page) => <PdfPage key={`${document.name}-${page}-${document.doc.fingerprints[0]}`} doc={document.doc} pageNumber={page} zoom={zoom} tool={tool} color={color} busy={busy} lineSize={tool === "highlight" ? markerSize : penSize} font={font} fontSize={fontSize} marks={marks.filter((mark) => mark.page === page)} selected={selected} onSelect={setSelected} onAdd={addMark} onChange={(id, text) => { revisionRef.current += 1; setDirty(true); setMarks((previous) => previous.map((mark) => mark.id === id && mark.kind === "text" ? { ...mark, text } : mark)); }} onTextFocus={snapshot} onError={setError} />)}
              <div className="end-note"><Check size={14} /> End of document</div>
            </div> : <div className="empty-state">
              <div className="empty-icon"><FileText size={34} strokeWidth={1.4} /><span><Plus size={16} /></span></div>
              <div className="eyebrow"><span /> PDF EDITOR</div>
              <h1>Edit your PDF</h1>
              <p>Draw, highlight, and add editable text.</p>
              <button className="button button-primary empty-button" onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Upload size={17} />} Open a PDF</button>
              <div className="drop-hint">or drag and drop a file anywhere</div>
              <div className="empty-divider" />
              <div className="feature-row"><span><Pen size={15} /> Draw</span><span><Type size={15} /> Add text</span><span><LockKeyhole size={15} /> Local processing</span></div>
            </div>}
          </div>
          <div className="bottom-bar"><span><span className="bottom-dot" /> Files are processed locally</span><span><CircleHelp size={14} /> {document ? "Select an annotation to edit or delete it" : "PDF editor"}</span></div>
        </section>
      </div>
      {menu === "image-export" && document && <ImageExportModal format={imageFormat} layout={imageLayout}
        onLayoutChange={setImageLayout} onClose={() => setMenu(null)} onExport={() => void run(imageFormat)} />}
      {menu === "compress" && document && <OptimizeModal document={document} marks={marks} compression={compression} onChange={setCompression} onClose={() => setMenu(null)} onDownload={(bytes) => {
        download(new Uint8Array(bytes), `${fileStem(document.name)}-optimized.pdf`, "application/pdf");
        setMenu(null);
        setError("");
        setNotice("Compressed PDF downloaded. Lossless compression may not reduce every file.");
      }} />}
    </main>
  );
}

