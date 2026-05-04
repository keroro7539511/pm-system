import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useToastStore, type ToastType } from "@/stores/toastStore";
import { cn } from "@/lib/utils";

const ICON: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "var(--color-success)" }} />,
  error:   <XCircle     className="w-4 h-4 shrink-0" style={{ color: "var(--color-danger)" }} />,
  info:    <Info        className="w-4 h-4 shrink-0" style={{ color: "var(--color-primary)" }} />,
};

const STYLE: Record<ToastType, React.CSSProperties> = {
  success: { background: "rgba(16,185,129,0.12)", borderColor: "rgba(16,185,129,0.25)" },
  error:   { background: "rgba(239,68,68,0.12)",  borderColor: "rgba(239,68,68,0.25)" },
  info:    { background: "rgba(59,130,246,0.12)", borderColor: "rgba(59,130,246,0.25)" },
};

export function Toaster() {
  const { toasts, remove } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "2.5rem",
        right: "1rem",
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn("flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border text-xs shadow-lg max-w-xs")}
          style={{
            ...STYLE[t.type],
            color: "var(--color-text-primary)",
            pointerEvents: "auto",
          }}
        >
          {ICON[t.type]}
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            onClick={() => remove(t.id)}
            style={{ color: "var(--color-text-muted)" }}
            className="hover:opacity-70 transition-opacity mt-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
