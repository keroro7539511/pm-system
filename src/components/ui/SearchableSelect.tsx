import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  sub?: string;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options?: SelectOption[];
  groups?: SelectGroup[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  value,
  onValueChange,
  options = [],
  groups = [],
  placeholder = "請選擇",
  searchPlaceholder = "搜尋...",
  disabled,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [style, setStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Flatten all options for display-label lookup
  const allOptions: SelectOption[] =
    groups.length > 0 ? groups.flatMap((g) => g.options) : options;

  const displayLabel = allOptions.find((o) => o.value === value)?.label;

  function openDropdown() {
    if (disabled || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropH = Math.min(260, allOptions.length * 36 + 56);
    const above = spaceBelow < dropH && rect.top > dropH;
    setStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      zIndex: 99999,
      ...(above
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
    setSearch("");
    setOpen(true);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || dropdownRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  // Filter helpers
  function filterOpts(opts: SelectOption[]) {
    if (!search) return opts;
    const q = search.toLowerCase();
    return opts.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sub ?? "").toLowerCase().includes(q)
    );
  }

  function selectValue(v: string) {
    onValueChange(v);
    setOpen(false);
    setSearch("");
  }

  function renderOption(opt: SelectOption) {
    return (
      <button
        key={opt.value}
        type="button"
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
          "hover:bg-layer-2",
          value === opt.value && "text-primary"
        )}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => selectValue(opt.value)}
      >
        <Check
          className={cn("w-3.5 h-3.5 shrink-0 transition-opacity", value === opt.value ? "opacity-100" : "opacity-0")}
        />
        <span className="flex-1 truncate">{opt.label}</span>
        {opt.sub && <span className="text-[11px] text-text-muted shrink-0">{opt.sub}</span>}
      </button>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={openDropdown}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input",
          "bg-transparent px-3 py-2 text-sm ring-offset-background",
          "focus:outline-none focus:ring-1 focus:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      >
        <span className={cn("truncate", !displayLabel && "text-text-muted")}>
          {displayLabel ?? placeholder}
        </span>
        <ChevronDown className="w-4 h-4 shrink-0 opacity-50 ml-1" />
      </button>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            className="rounded-md border border-border shadow-2xl overflow-hidden"
            style={{ ...style, backgroundColor: "var(--color-dialog-bg)" }}
          >
            {/* Search input */}
            <div className="p-2 border-b border-border">
              <div className="flex items-center gap-2 rounded border border-input px-2 py-1">
                <Search className="w-3.5 h-3.5 text-text-muted shrink-0" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
                  className="flex-1 bg-transparent text-sm outline-none text-text-primary placeholder:text-text-muted"
                />
              </div>
            </div>

            {/* Option list */}
            <div className="max-h-48 overflow-y-auto py-1">
              {groups.length > 0 ? (
                <>
                  {groups.map((g) => {
                    const filtered = filterOpts(g.options);
                    if (filtered.length === 0) return null;
                    return (
                      <div key={g.label}>
                        <div className="px-3 py-1 text-[10px] text-text-muted uppercase tracking-wider">
                          {g.label}
                        </div>
                        {filtered.map(renderOption)}
                      </div>
                    );
                  })}
                  {groups.every((g) => filterOpts(g.options).length === 0) && (
                    <p className="px-3 py-2 text-xs text-text-muted">無符合結果</p>
                  )}
                </>
              ) : (
                <>
                  {filterOpts(options).length === 0 ? (
                    <p className="px-3 py-2 text-xs text-text-muted">無符合結果</p>
                  ) : (
                    filterOpts(options).map(renderOption)
                  )}
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
