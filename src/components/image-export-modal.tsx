import { ArrowDownToLine, CircleHelp, FileDown, X } from "lucide-react";
import type { ImageFormat, ImageLayout } from "./editor-shared";

export function ImageExportModal({ format, layout, onLayoutChange, onClose, onExport }: {
  format: ImageFormat;
  layout: ImageLayout;
  onLayoutChange: (layout: ImageLayout) => void;
  onClose: () => void;
  onExport: () => void;
}) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="image-export-title" onMouseDown={(event) => event.stopPropagation()}>
    <button className="modal-close icon-button" aria-label="Close" onClick={onClose}><X size={18} /></button>
    <div className="modal-icon"><FileDown size={21} /></div><div className="eyebrow">IMAGE EXPORT</div>
    <h2 id="image-export-title">Export as {format.toUpperCase()}</h2>
    <p>Choose how to export the document pages.</p>
    <label className={`radio-card ${layout === "separate" ? "checked" : ""}`}><input type="radio" name="image-layout" checked={layout === "separate"} onChange={() => onLayoutChange("separate")} /><span><strong>One image per page</strong><small>Download all page images together in a ZIP file.</small></span></label>
    <label className={`radio-card ${layout === "combined" ? "checked" : ""}`}><input type="radio" name="image-layout" checked={layout === "combined"} onChange={() => onLayoutChange("combined")} /><span><strong>One image for all pages</strong><small>Stack pages vertically in one image.</small></span></label>
    <div className="modal-note"><CircleHelp size={16} /><span>Large documents may exceed the size supported for a combined image. Use separate page images if needed.</span></div>
    <button className="button button-primary modal-submit" onClick={onExport}><ArrowDownToLine size={16} /> Export {format.toUpperCase()}</button>
  </div></div>;
}
