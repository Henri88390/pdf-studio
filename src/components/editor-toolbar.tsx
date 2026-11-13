"use client";

import { Redo2, Trash2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { FONT_FAMILIES, isFontFamily, type FontFamily, type InkMark, type Mark, type TextMark, type Tool } from "@/lib/types";
import { COLORS, PALETTE } from "./editor-shared";
import { PreviewMenu } from "./preview-menu";

export function EditorToolbar({ tool, selectedMark, selectedText, selectedStroke, penSize, markerSize, color, font, fontSize, zoom, busy, hasDocument, canUndo, canRedo, onUndo, onRedo, onStrokeSizeChange, onTextStyleChange, onDelete, onColorChange, onZoom }: {
  tool: Tool;
  selectedMark: Mark | undefined;
  selectedText: TextMark | null;
  selectedStroke: InkMark | null;
  penSize: number;
  markerSize: number;
  color: string;
  font: FontFamily;
  fontSize: number;
  zoom: number;
  busy: boolean;
  hasDocument: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onStrokeSizeChange: (size: number) => void;
  onTextStyleChange: (style: { font?: FontFamily; size?: number }) => void;
  onDelete: () => void;
  onColorChange: (color: string) => void;
  onZoom: (direction: number) => void;
}) {
  return <div className="toolbar">
    <div className="toolbar-left">
      <button className="icon-button" title="Undo" aria-label="Undo" onClick={onUndo} disabled={busy || !canUndo}><Undo2 size={17} /></button>
      <button className="icon-button" title="Redo" aria-label="Redo" onClick={onRedo} disabled={busy || !canRedo}><Redo2 size={17} /></button>
      <span className="toolbar-separator" />
      {(tool === "draw" || tool === "highlight" || selectedStroke) && <div className="tool-setting">
        <label>Width <input aria-label="Line width" type="number" min="1" max="40" step="0.5" value={selectedStroke?.size ?? (tool === "draw" ? penSize : markerSize)} onChange={(event) => {
          const value = event.currentTarget.valueAsNumber;
          if (Number.isFinite(value)) onStrokeSizeChange(value);
        }} /> pt</label>
        <PreviewMenu
          label="Line width presets"
          selected={String(selectedStroke?.size ?? (tool === "draw" ? penSize : markerSize))}
          options={[1, 2.5, 4, 8, 12, 16, 24, 32, 40].map((size) => ({ value: String(size), label: `${size} pt`, width: size }))}
          color={selectedStroke?.color ?? (tool === "highlight" && color === COLORS[0] ? "#f0bf3f" : color)}
          opacity={tool === "highlight" || selectedStroke?.kind === "highlight" ? 0.3 : 1}
          onChange={(value) => onStrokeSizeChange(Number(value))}
        />
      </div>}
      {(tool === "text" || selectedText) && <div className="text-settings"><div className="tool-setting">Font <PreviewMenu
        label="Font family"
        selected={selectedText ? selectedText.font ?? "sans" : font}
        options={Object.entries(FONT_FAMILIES).map(([value, family]) => ({ value, label: family.label, font: family.css }))}
        onChange={(value) => {
          if (isFontFamily(value)) onTextStyleChange({ font: value });
        }}
      /></div>
        <label className="tool-setting">Size <input aria-label="Font size" type="number" min="6" max="144" step="1" value={selectedText?.size ?? fontSize} onChange={(event) => {
          const value = event.currentTarget.valueAsNumber;
          if (Number.isFinite(value)) onTextStyleChange({ size: Math.min(144, Math.max(6, value)) });
        }} /> pt</label></div>}
      {selectedMark && <><span className="toolbar-separator" /><button className="icon-button delete-button" title="Delete selected annotation" aria-label="Delete selected annotation" disabled={busy} onClick={onDelete}><Trash2 size={17} /></button></>}
      <div className="colors" aria-label="Annotation color">{COLORS.map((item) => <button key={item} title={item} aria-label={`Color ${item}`} className={`color-choice ${color === item ? "chosen" : ""}`} onClick={() => onColorChange(item)} style={{ "--swatch": item } as React.CSSProperties} />)}
        <PreviewMenu label="Color palette" selected={color} options={PALETTE.map((item) => ({ value: item, label: item, swatch: item }))} onChange={onColorChange} palette />
      </div>
    </div>
    <div className="zoom-controls"><button className="icon-button" aria-label="Zoom out" disabled={!hasDocument || zoom <= 0.6} onClick={() => onZoom(-1)}><ZoomOut size={17} /></button><span>{Math.round(zoom * 100)}%</span><button className="icon-button" aria-label="Zoom in" disabled={!hasDocument || zoom >= 1.8} onClick={() => onZoom(1)}><ZoomIn size={17} /></button></div>
  </div>;
}
