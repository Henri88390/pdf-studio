import { ChevronDown, FileText, Highlighter, LockKeyhole, MousePointer2, Pen, Sparkles, Type } from "lucide-react";
import type { Tool } from "@/lib/types";

export function EditorSidebar({ tool, hasDocument, busy, onToolChange, onCompress }: {
  tool: Tool;
  hasDocument: boolean;
  busy: boolean;
  onToolChange: (tool: Tool) => void;
  onCompress: () => void;
}) {
  return <aside className="sidebar">
    <div className="side-label">WORKSPACE</div>
    <div className="side-active"><span className="side-active-icon"><FileText size={16} /></span> Editor <span className="side-indicator" /></div>
    <div className="side-section">
      <div className="side-heading">TOOLS <span>01 — 04</span></div>
      {([
        ["select", MousePointer2, "Select", "V"],
        ["draw", Pen, "Pen", "D"],
        ["highlight", Highlighter, "Marker", "H"],
        ["text", Type, "Add text", "T"],
      ] as const).map(([id, Icon, label]) => <button key={id} aria-label={label} className={`side-tool ${tool === id ? "active" : ""}`} onClick={() => onToolChange(id)} disabled={!hasDocument}><Icon size={17} /><span>{label}</span>{tool === id && <span className="tool-dot" />}</button>)}
    </div>
    <div className="sidebar-bottom">
      <button className="compress-side" disabled={!hasDocument || busy} onClick={onCompress}><span className="compress-icon"><Sparkles size={16} /></span><span><strong>Compress PDF</strong><small>Lossless compression</small></span><ChevronDown size={15} /></button>
      <div className="privacy"><LockKeyhole size={14} /><span>Local processing<br /><small>Files stay on this device.</small></span></div>
    </div>
  </aside>;
}
