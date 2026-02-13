export function RecommendationBadge({ recommendation }: { recommendation?: string }) {
  if (!recommendation) return null;

  const rec = recommendation.toLowerCase();

  const labels: Record<string, string> = {
    buy: "Kjøp",
    hold: "Hold",
    sell: "Selg",
    overweight: "Overvekt",
    underweight: "Undervekt",
    outperform: "Outperform",
    underperform: "Underperform",
  };

  let colorStyle: React.CSSProperties;
  if (rec === "buy" || rec === "overweight" || rec === "outperform") {
    colorStyle = {
      color: "var(--an-green)",
      background: "var(--an-green-bg)",
      borderColor: "var(--an-green-border)",
    };
  } else if (rec === "sell" || rec === "underweight" || rec === "underperform") {
    colorStyle = {
      color: "var(--an-red)",
      background: "var(--an-red-bg)",
      borderColor: "var(--an-red-border)",
    };
  } else {
    colorStyle = {
      color: "var(--an-amber)",
      background: "var(--an-amber-bg)",
      borderColor: "var(--an-amber-border)",
    };
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-[3px] rounded border tracking-wide"
      style={colorStyle}
    >
      {labels[rec] || recommendation}
    </span>
  );
}
