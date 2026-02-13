export function TradeTypeBadge({ type }: { type: string }) {
  if (type === "buy") {
    return (
      <span
        className="text-[11px] font-semibold px-2 py-[2px] rounded border"
        style={{
          color: "var(--an-green)",
          background: "var(--an-green-bg)",
          borderColor: "var(--an-green-border)",
        }}
      >
        Kjøp
      </span>
    );
  } else if (type === "sell") {
    return (
      <span
        className="text-[11px] font-semibold px-2 py-[2px] rounded border"
        style={{
          color: "var(--an-red)",
          background: "var(--an-red-bg)",
          borderColor: "var(--an-red-border)",
        }}
      >
        Salg
      </span>
    );
  }
  return (
    <span
      className="text-[11px] font-semibold px-2 py-[2px] rounded border"
      style={{
        color: "var(--an-text-muted)",
        background: "var(--an-bg-raised)",
        borderColor: "var(--an-border)",
      }}
    >
      Annet
    </span>
  );
}
