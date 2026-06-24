/* Footer status ticker — a slow marquee of device/connection state. */
export function DeviceTicker({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  const doubled = [...items, ...items];
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 overflow-hidden"
      style={{ background: "var(--ink)", color: "var(--paper)", borderTop: "1px solid var(--ink)" }}
    >
      <div className="flex w-max animate-ticker py-2 whitespace-nowrap">
        {doubled.map((it, i) => (
          <span key={i} className="lx-mono flex items-center gap-2.5 px-6 text-[11px]" style={{ color: "rgba(249,247,242,0.72)" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--signal)", display: "inline-block" }} />
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}
