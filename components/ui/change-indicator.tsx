import { formatDateShort } from "@/lib/utils";

interface ChangeIndicatorProps {
  change: number;
  previousDate?: string | null;
  showDate?: boolean;
}

export function ChangeIndicator({ change, previousDate, showDate = false }: ChangeIndicatorProps) {
  if (change > 0.01) {
    return (
      <span className="inline-flex items-center gap-1 text-xs">
        <span style={{ color: "var(--an-red)" }}>+{change.toFixed(2)}%</span>
        {showDate && previousDate && (
          <span className="hidden lg:inline" style={{ color: "var(--an-text-muted)" }}>
            ({formatDateShort(previousDate)})
          </span>
        )}
      </span>
    );
  } else if (change < -0.01) {
    return (
      <span className="inline-flex items-center gap-1 text-xs">
        <span style={{ color: "var(--an-green)" }}>{change.toFixed(2)}%</span>
        {showDate && previousDate && (
          <span className="hidden lg:inline" style={{ color: "var(--an-text-muted)" }}>
            ({formatDateShort(previousDate)})
          </span>
        )}
      </span>
    );
  }
  return (
    <span className="text-xs" style={{ color: "var(--an-text-muted)" }}>-</span>
  );
}
