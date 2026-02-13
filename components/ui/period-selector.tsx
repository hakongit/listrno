"use client";

export interface PeriodOption {
  key: string;
  label: string;
  days: number | null;
}

export const defaultPeriods: PeriodOption[] = [
  { key: "1M", label: "1M", days: 30 },
  { key: "3M", label: "3M", days: 90 },
  { key: "6M", label: "6M", days: 180 },
  { key: "1Y", label: "1Å", days: 365 },
  { key: "ALL", label: "Alle", days: null },
];

interface PeriodSelectorProps {
  periods?: PeriodOption[];
  selected: string;
  onSelect: (key: string) => void;
}

export function PeriodSelector({
  periods = defaultPeriods,
  selected,
  onSelect,
}: PeriodSelectorProps) {
  return (
    <div className="flex gap-1" role="group" aria-label="Velg tidsperiode">
      {periods.map((period) => (
        <button
          key={period.key}
          onClick={() => onSelect(period.key)}
          aria-pressed={selected === period.key}
          aria-label={`Vis ${period.label === "Alle" ? "all historikk" : `siste ${period.label}`}`}
          className="px-3 py-1.5 rounded text-xs font-medium transition-colors border"
          style={
            selected === period.key
              ? {
                  color: "var(--an-accent)",
                  borderColor: "rgba(201, 168, 76, 0.3)",
                  background: "var(--an-accent-dim)",
                }
              : {
                  color: "var(--an-text-muted)",
                  borderColor: "var(--an-border)",
                  background: "transparent",
                }
          }
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
