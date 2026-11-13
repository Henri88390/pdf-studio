"use client";

import { useEffect, useRef } from "react";
import { ArrowDownToLine, ChevronDown, FileDown, FilePlus2, FileText, LoaderCircle, Sparkles } from "lucide-react";
import type { EditorMenu, ImageFormat } from "./editor-shared";

export function EditorHeader({ name, dirty, busy, menu, onMenuChange, onOpen, onSave, onImageExport }: {
  name: string | null;
  dirty: boolean;
  busy: boolean;
  menu: EditorMenu;
  onMenuChange: (menu: EditorMenu) => void;
  onOpen: () => void;
  onSave: () => void;
  onImageExport: (format: ImageFormat) => void;
}) {
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (menu !== "export") return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !exportButtonRef.current?.contains(event.target) && !exportMenuRef.current?.contains(event.target)) {
        onMenuChange(null);
      }
    }
    window.addEventListener("pointerdown", dismiss);
    return () => window.removeEventListener("pointerdown", dismiss);
  }, [menu, onMenuChange]);

  return <header className="topbar">
    <div className="brand"><div className="brand-icon"><FileText size={19} strokeWidth={2.2} /></div><span>paperwork<span className="brand-dot">.</span></span></div>
    <div className="header-divider" />
    <div className="document-title">
      <span>{name ?? "Your PDF workspace"}</span>
      {name && <span className="document-status"><span className="status-dot" />{dirty ? "Unsaved changes" : "Ready to edit"}</span>}
    </div>
    <div className="header-actions">
      <button className="button button-ghost open-button" onClick={onOpen} disabled={busy}><FilePlus2 size={16} /> Open <span className="desktop-label">file</span></button>
      <button className="button button-light mobile-compress" onClick={() => onMenuChange("compress")} disabled={!name || busy}><Sparkles size={16} /> Compress</button>
      <button ref={exportButtonRef} className="button button-light" aria-expanded={menu === "export"} onClick={() => onMenuChange(menu === "export" ? null : "export")} disabled={!name || busy}><FileDown size={16} /> Export <ChevronDown size={14} /></button>
      <button className="button button-primary" onClick={onSave} disabled={!name || busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <ArrowDownToLine size={16} />} Save <span className="desktop-label">PDF</span></button>
      {menu === "export" && <div ref={exportMenuRef} className="dropdown export-menu">
        <div className="dropdown-title">EXPORT AS</div>
        <button onClick={() => onImageExport("png")}><span>PNG images</span><small>Choose page layout</small></button>
        <button onClick={() => onImageExport("jpeg")}><span>JPEG images</span><small>Choose page layout</small></button>
      </div>}
    </div>
  </header>;
}
