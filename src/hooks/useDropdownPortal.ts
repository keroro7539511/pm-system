import { useState, useRef, useEffect, useCallback } from "react";

export interface DropdownPos {
  top: number;
  left: number;
  minWidth: number;
  dropUp: boolean;
}

export function useDropdownPortal(dropdownHeight: number, minWidth = 110) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("scroll", close, true);
    };
  }, [open, close]);

  const handleToggle = useCallback(() => {
    if (open) { close(); return; }
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropUp = rect.bottom + dropdownHeight > window.innerHeight - 8;
    setPos({
      top: dropUp ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      minWidth: Math.max(rect.width, minWidth),
      dropUp,
    });
    setOpen(true);
  }, [open, close, dropdownHeight, minWidth]);

  return { open, pos, triggerRef, dropdownRef, close, handleToggle };
}
