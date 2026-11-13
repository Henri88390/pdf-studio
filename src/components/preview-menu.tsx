"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Palette } from "lucide-react";

type PreviewOption = { value: string; label: string; font?: string; width?: number; swatch?: string };

export function PreviewMenu({ label, selected, options, color, opacity = 1, palette = false, onChange }: {
  label: string;
  selected: string;
  options: PreviewOption[];
  color?: string;
  opacity?: number;
  palette?: boolean;
  onChange: (value: string) => void;
}) {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.value === selected);
  const isWidth = options[0].width !== undefined;

  useEffect(() => {
    if (!position) return;
    function dismiss(event: PointerEvent) {
      if (!buttonRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) setPosition(null);
    }
    function dismissFocus(event: FocusEvent) {
      if (!buttonRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) setPosition(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setPosition(null);
        buttonRef.current?.focus();
      }
    }
    function close() { setPosition(null); }
    function onScroll(event: Event) {
      if (!menuRef.current?.contains(event.target as Node)) setPosition(null);
    }
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("focusin", dismissFocus);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("focusin", dismissFocus);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [position]);

  function open() {
    if (position) { setPosition(null); return; }
    const bounds = buttonRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setPosition({ left: Math.max(8, Math.min(bounds.left, window.innerWidth - 196)), top: bounds.bottom + 5 });
    requestAnimationFrame(() => (menuRef.current?.querySelector<HTMLElement>('[aria-selected="true"]') ?? menuRef.current?.querySelector<HTMLElement>('[role="option"]'))?.focus());
  }

  function select(value: string) {
    onChange(value);
    setPosition(null);
    buttonRef.current?.focus();
  }

  return <>
    <button ref={buttonRef} type="button" className="preview-trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={!!position} onClick={open}>
      {palette ? <><Palette size={16} /><span className="palette-current" style={{ backgroundColor: selected }} /></> : isWidth ? <span className="preview-trigger-line" style={{ backgroundColor: color, opacity, height: `${Number(selected)}px` }} /> : <span style={{ fontFamily: current?.font }}>{current?.label}</span>}
      <ChevronDown size={14} />
    </button>
    {position && createPortal(<div ref={menuRef} role="listbox" aria-label={label} className={`preview-menu${palette ? " palette-menu" : ""}`} style={{ left: position.left, top: position.top }} onKeyDown={(event) => {
      if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]'));
      const index = buttons.findIndex((button) => button === document.activeElement);
      const step = event.key === "ArrowDown" ? (palette ? 6 : 1) : event.key === "ArrowUp" ? (palette ? -6 : -1) : event.key === "ArrowRight" ? 1 : -1;
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + step + buttons.length) % buttons.length;
      buttons[next]?.focus();
    }}>
      {options.map((option) => <button key={option.value} type="button" role="option" aria-label={option.swatch ? `Color ${option.label}` : undefined} aria-selected={option.value === selected} tabIndex={-1} onClick={() => select(option.value)} style={{ fontFamily: option.font }} title={option.swatch ? option.label : undefined}>
        {option.swatch ? <span className="palette-swatch" style={{ backgroundColor: option.swatch }} /> : <span>{option.label}</span>}
        {option.width !== undefined && <span className="preview-line-area" aria-hidden="true"><span className="preview-line" style={{ backgroundColor: color, opacity, height: `${option.width}px` }} /></span>}
        {option.value === selected && !palette && <Check size={14} />}
      </button>)}
    </div>, document.body)}
  </>;
}

