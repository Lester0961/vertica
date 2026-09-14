"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const SEQUENCE_TIMEOUT_MS = 2400;

export interface NavigationShortcut {
  keys: string;
  label: string;
  href?: string;
  description?: string;
}

export const PUBLIC_SHORTCUTS: NavigationShortcut[] = [
  { keys: "G H", label: "Home", href: "/" },
  { keys: "G R", label: "Residences", href: "/units" },
  { keys: "G B", label: "Building map", href: "/explore" },
  { keys: "G A", label: "Amenities", href: "/amenities" },
  { keys: "G F", label: "Find my unit", href: "/recommend" },
  { keys: "G I", label: "Inquire", href: "/inquiry" },
  { keys: "G C", label: "Compare residences", href: "/compare" },
  { keys: "G L", label: "Portal login", href: "/login" },
];

export const VIEWER_SHORTCUTS: NavigationShortcut[] = [
  { keys: "1", label: "Dollhouse / overview", description: "Show the full layout from above in a unit viewer." },
  { keys: "2", label: "Walkthrough", description: "Switch to the eye-level room view in a unit viewer." },
  { keys: "R", label: "Reset viewer", description: "Return the current 3D viewer to its default view." },
  { keys: "E", label: "Expand / separate", description: "Expand a unit viewer or separate building floors." },
];

function normalizeKeys(keys: string): string {
  return keys.replaceAll(" ", "").toLowerCase();
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function NavigationShortcuts({
  items,
  contextItems = VIEWER_SHORTCUTS,
  title = "Keyboard shortcuts",
  onNavigate,
}: {
  items: NavigationShortcut[];
  contextItems?: NavigationShortcut[];
  title?: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  const sequenceRef = useRef("");
  const timerRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const clearSequence = () => {
      sequenceRef.current = "";
      setArmed(false);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };

    const armSequence = () => {
      sequenceRef.current = "g";
      setArmed(true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(clearSequence, SEQUENCE_TIMEOUT_MS);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearSequence();
        if (open) {
          setOpen(false);
          triggerRef.current?.focus();
        }
        return;
      }
      if (isTypingTarget(event.target)) return;

      if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
        event.preventDefault();
        clearSequence();
        setOpen(true);
        return;
      }
      if (open) return;

      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest('[data-hotkey-scope="viewer"]')) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const key = event.key.toLowerCase();
      if (!sequenceRef.current) {
        if (key === "g") {
          event.preventDefault();
          armSequence();
        }
        return;
      }

      const nextSequence = `${sequenceRef.current}${key}`;
      const shortcut = items.find((item) => normalizeKeys(item.keys) === nextSequence);
      const hasLongerMatch = items.some((item) => {
        const normalized = normalizeKeys(item.keys);
        return normalized !== nextSequence && normalized.startsWith(nextSequence);
      });
      if (shortcut?.href && !hasLongerMatch) {
        event.preventDefault();
        router.push(shortcut.href);
        onNavigate?.();
        setOpen(false);
        clearSequence();
        return;
      }
      if (hasLongerMatch) {
        event.preventDefault();
        sequenceRef.current = nextSequence;
        setArmed(true);
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(clearSequence, SEQUENCE_TIMEOUT_MS);
        return;
      }
      clearSequence();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [items, onNavigate, open, router]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="shortcut-launcher"
        aria-label="Open keyboard shortcuts"
        title="Press ? for navigation hotkeys"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-keyshortcuts="?"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">?</span>
        <span className="shortcut-launcher-label">Hotkeys</span>
      </button>
      {armed && <span className="shortcut-armed" role="status">Press a navigation key…</span>}
      {open && (
        <div className="shortcut-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <section ref={dialogRef} tabIndex={-1} className="shortcut-dialog" role="dialog" aria-modal="true" aria-labelledby="shortcut-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="shortcut-dialog-head">
              <div>
                <p className="eyebrow">Quick navigation</p>
                <h2 id="shortcut-dialog-title">{title}</h2>
              </div>
              <button type="button" className="shortcut-close" onClick={close} aria-label="Close shortcuts">Close</button>
            </div>
            <p className="shortcut-dialog-intro">Press <kbd>G</kbd> then the shown key. Shortcuts pause while you type in a form.</p>
            <div className="shortcut-section">
              <p className="shortcut-section-label">Site navigation</p>
              {items.map((item) => <div className="shortcut-row" key={item.keys}><span><strong>{item.label}</strong>{item.description && <small>{item.description}</small>}</span><kbd>{item.keys}</kbd></div>)}
            </div>
            {contextItems.length > 0 && <div className="shortcut-section">
              <p className="shortcut-section-label">Inside a viewer</p>
              {contextItems.map((item) => <div className="shortcut-row" key={item.keys}><span><strong>{item.label}</strong>{item.description && <small>{item.description}</small>}</span><kbd>{item.keys}</kbd></div>)}
            </div>}
            <p className="shortcut-touch-note"><strong>On mobile:</strong> use Menu for site navigation, tap room buttons to jump through a unit, and use Expand for a larger viewer.</p>
          </section>
        </div>
      )}
    </>
  );
}
