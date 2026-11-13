"use client";

import { useEffect, useState } from "react";
import { ArrowDownToLine, CircleHelp, Sparkles, X } from "lucide-react";
import { savePdf } from "@/lib/pdf";
import type { Mark } from "@/lib/types";
import { errorMessage, type Compression, type DocumentState } from "./editor-shared";

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} bytes`;
  const units = ["KiB", "MiB", "GiB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(2)} ${units[unit]}`;
};

export function OptimizeModal({ document, marks, compression, onChange, onClose, onDownload }: {
  document: DocumentState;
  marks: Mark[];
  compression: Compression;
  onChange: (value: Compression) => void;
  onClose: () => void;
  onDownload: (bytes: Uint8Array) => void;
}) {
  const [result, setResult] = useState<{ document: DocumentState; marks: Mark[]; compact: Uint8Array; standard: Uint8Array } | null>(null);
  const [failure, setFailure] = useState<{ document: DocumentState; marks: Mark[]; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    async function prepare() {
      try {
        const compact = await savePdf(document.base, document.doc, marks, true);
        if (!active) return;
        const standard = await savePdf(document.base, document.doc, marks, false);
        if (active) setResult({ document, marks, compact, standard });
      } catch (reason) {
        if (active) setFailure({ document, marks, message: `Could not calculate compressed sizes: ${errorMessage(reason)}` });
      }
    }
    void prepare();
    return () => { active = false; };
  }, [document, marks, attempt]);

  const currentResult = result?.document === document && result.marks === marks ? result : null;
  const currentFailure = failure?.document === document && failure.marks === marks ? failure.message : null;
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="compress-title" onMouseDown={(event) => event.stopPropagation()}>
    <button className="modal-close icon-button" aria-label="Close" onClick={onClose}><X size={18} /></button>
    <div className="modal-icon"><Sparkles size={21} /></div><div className="eyebrow">LOSSLESS COMPRESSION</div>
    <h2 id="compress-title">Compress PDF</h2><p>Choose how to write the PDF. Both options are lossless and preserve its content.</p>
    <div className="original-size">Original file size <strong>{formatSize(document.originalSize)}</strong></div>
    {(["compact", "standard"] as const).map((option) => <label key={option} className={`radio-card ${compression === option ? "checked" : ""}`}>
      <input type="radio" name="compression" checked={compression === option} onChange={() => onChange(option)} />
      <span><strong>{option === "compact" ? "Compact" : "Standard"}</strong><small>{option === "compact" ? "Uses PDF object streams to reduce structural overhead." : "Writes without object streams for wider compatibility."}</small><small className="estimated-size">Output size: {currentResult ? formatSize(currentResult[option].byteLength) : currentFailure ? "Unavailable" : "Calculating..."}</small></span>
    </label>)}
    {currentFailure && <div className="optimization-error" role="alert">{currentFailure} <button type="button" onClick={() => { setFailure(null); setAttempt((previous) => previous + 1); }}>Retry</button></div>}
    <div className="modal-note"><CircleHelp size={16} /><span>Sizes include current edits. Some files may be larger; editable annotations include the original PDF. Images are not recompressed.</span></div>
    <button className="button button-primary modal-submit" disabled={!currentResult} onClick={() => { if (currentResult) onDownload(currentResult[compression]); }}><ArrowDownToLine size={16} /> Download compressed PDF</button>
  </div></div>;
}

