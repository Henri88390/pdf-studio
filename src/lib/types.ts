export type Point = { x: number; y: number };
export const FONT_FAMILIES = {
  sans: { label: "Noto Sans", family: "Noto Sans", css: '"Noto Sans", sans-serif' },
  serif: { label: "Noto Serif", family: "Noto Serif", css: '"Noto Serif", "Noto Sans", serif' },
  mono: { label: "Noto Sans Mono", family: "Noto Sans Mono", css: '"Noto Sans Mono", "Noto Sans", monospace' },
  roboto: { label: "Roboto", family: "Roboto", css: '"Roboto", "Noto Sans", sans-serif' },
  arimo: { label: "Arimo (Arial compatible)", family: "Arimo", css: '"Arimo", "Noto Sans", sans-serif' },
  inter: { label: "Inter", family: "Inter", css: '"Inter", "Noto Sans", sans-serif' },
  lato: { label: "Lato", family: "Lato", css: '"Lato", "Noto Sans", sans-serif' },
  montserrat: { label: "Montserrat", family: "Montserrat", css: '"Montserrat", "Noto Sans", sans-serif' },
  openSans: { label: "Open Sans", family: "Open Sans", css: '"Open Sans", "Noto Sans", sans-serif' },
  sourceSans: { label: "Source Sans 3", family: "Source Sans 3", css: '"Source Sans 3", "Noto Sans", sans-serif' },
};
export type FontFamily = keyof typeof FONT_FAMILIES;
export function isFontFamily(value: string): value is FontFamily {
  return Object.hasOwn(FONT_FAMILIES, value);
}

type BaseMark = { id: string; page: number; color: string };
export type InkMark = BaseMark & {
  kind: "ink" | "highlight";
  points: Point[];
  size: number;
};
export type TextMark = BaseMark & {
  kind: "text";
  x: number;
  y: number;
  text: string;
  size: number;
  font?: FontFamily;
};
export type Mark = InkMark | TextMark;
export type Tool = "select" | "draw" | "highlight" | "text";

export type EditableData = {
  version: 1;
  marks: Mark[];
};
