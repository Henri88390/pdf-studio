import type { PDFDocumentProxy } from "pdfjs-dist";

export type DocumentState = { doc: PDFDocumentProxy; base: Uint8Array; name: string; originalSize: number };
export type Compression = "standard" | "compact";
export type EditorMenu = "export" | "compress" | "image-export" | null;
export type ImageFormat = "png" | "jpeg";
export type ImageLayout = "separate" | "combined";

export const COLORS = ["#202d3b", "#e15151", "#4575e8", "#4b9b78", "#f0bf3f"];
export const PALETTE = [
  "#000000", "#333333", "#666666", "#999999", "#cccccc", "#ffffff",
  "#7f1d1d", "#b91c1c", "#ef4444", "#f87171", "#fca5a5", "#fee2e2",
  "#7c2d12", "#c2410c", "#f97316", "#fb923c", "#fdba74", "#ffedd5",
  "#713f12", "#a16207", "#eab308", "#facc15", "#fde047", "#fef9c3",
  "#14532d", "#15803d", "#22c55e", "#4ade80", "#86efac", "#dcfce7",
  "#134e4a", "#0f766e", "#14b8a6", "#2dd4bf", "#99f6e4", "#ccfbf1",
  "#1e3a8a", "#1d4ed8", "#3b82f6", "#60a5fa", "#93c5fd", "#dbeafe",
  "#312e81", "#4338ca", "#6366f1", "#818cf8", "#a5b4fc", "#e0e7ff",
  "#581c87", "#7e22ce", "#a855f7", "#c084fc", "#d8b4fe", "#f3e8ff",
  "#831843", "#be185d", "#ec4899", "#f472b6", "#f9a8d4", "#fce7f3",
];

export const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Something went wrong.";
