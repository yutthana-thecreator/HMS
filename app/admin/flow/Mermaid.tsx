"use client";

import { useEffect, useRef, useState } from "react";

export default function Mermaid({ id, chart }: { id: string; chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: "default", securityLevel: "loose" });
        const { svg } = await mermaid.render(id, chart);
        if (active && ref.current) ref.current.innerHTML = svg;
      } catch (e) {
        if (active) setErr(String((e as Error).message ?? e));
      }
    })();
    return () => {
      active = false;
    };
  }, [id, chart]);

  if (err) return <pre style={{ color: "var(--red)", fontSize: 12 }}>{err}</pre>;
  return <div ref={ref} style={{ display: "flex", justifyContent: "center", minWidth: 480 }} />;
}
