import type { LucideIcon } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  weekDelta?: number;
  weekLabel?: string;
  className?: string;
  animationDelay?: string;
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
  weekDelta,
  weekLabel,
  className,
  animationDelay = "0s",
}: KpiCardProps) {
  const animated = useCountUp(value);
  const deltaPositive = (weekDelta ?? 0) >= 0;

  return (
    <div
      className={cn("glass-card p-4 flex flex-col gap-3 animate-fade-in", className)}
      style={{ animationDelay, animationFillMode: "both" }}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs text-text-muted font-medium">{title}</p>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", bgColor)}>
          <Icon className={cn("w-4 h-4", color)} />
        </div>
      </div>
      <div>
        <p className="text-3xl font-semibold text-text-primary tabular-nums">{animated}</p>
        {weekDelta !== undefined && (
          <p className={cn("text-xs mt-1", deltaPositive ? "text-success" : "text-danger")}>
            {deltaPositive ? "+" : ""}{weekDelta} {weekLabel}
          </p>
        )}
      </div>
    </div>
  );
}
