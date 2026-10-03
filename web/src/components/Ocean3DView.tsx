import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "@/store/session";
import { tempColor } from "@/lib/theme";
export function Ocean3DView() {
  const s = useSession();
  const [opacity, setOpacity] = useState(0.85);
  const [showTruth, setShowTruth] = useState(false);
  const deckRef = useRef<HTMLDivElement>(null);
  const r = s.result;
  const voxels = useMemo(() => {
    if (!r) return [];
    const { h, w } = r;
    const vol = showTruth ? r.truthVolume : r.reconVolume;
    const k = s.depthIndex;
    const out: { x: number; y: number; v: number }[] = [];
    for (let rr = 0; rr < h; rr += 6) {
      for (let cc = 0; cc < w; cc += 6) {
        const v = vol[k * h * w + rr * w + cc];
        if (!Number.isFinite(v)) continue;
        out.push({ x: cc, y: rr, v });
      }
    }
    return out;
  }, [r, s.depthIndex, showTruth]);
  useEffect(() => {
    let cancelled = false;
    let deck: { finalize: () => void } | null = null;
    async function init() {
      if (!deckRef.current || voxels.length === 0 || !r) return;
      try {
        const [{ Deck }, { GridCellLayer }] = await Promise.all([import("@deck.gl/core"), import("@deck.gl/layers")]);
        if (cancelled || !deckRef.current) return;
        let tMin = Infinity;
        let tMax = -Infinity;
        for (const v of voxels) {
          if (v.v < tMin) tMin = v.v;
          if (v.v > tMax) tMax = v.v;
        }
        const data = voxels.slice(0, 800).map((v) => {
          const [rr, gg, bb] = tempColor(v.v, tMin, tMax);
          return { position: [(v.x / r.w) * 100, (v.y / r.h) * 60], color: [rr, gg, bb, 200] };
        });
        const layer = new GridCellLayer({ id: "vox", data, cellSize: 1200, getPosition: (d: { position: number[] }) => d.position as [number, number], getFillColor: (d: { color: number[] }) => d.color as [number, number, number, number], opacity });
        const d = new Deck({ parent: deckRef.current, width: "100%", height: 220, initialViewState: { longitude: 0, latitude: 0, zoom: 1 }, controller: true, layers: [layer] });
        deck = d as unknown as { finalize: () => void };
      } catch {
        void 0;
      }
    }
    void init();
    return () => {
      cancelled = true;
      try {
        if (deck) deck.finalize();
      } catch {
        void 0;
      }
    };
  }, [voxels, r, opacity]);
  if (!r) return <div className="strata-card p-4 text-sm text-slate-300/60">No run yet.</div>;
  let tMin = Infinity;
  let tMax = -Infinity;
  for (const v of voxels) {
    if (v.v < tMin) tMin = v.v;
    if (v.v > tMax) tMax = v.v;
  }
  return (
    <div className="strata-card p-3" data-testid="ocean-3d">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] uppercase tracking-widest text-slate-300/70">3D ocean block · deck.gl voxels · DEMO / SIMULATED</div>
        <label className="flex items-center gap-1 text-[11px]">
          <input type="checkbox" checked={showTruth} onChange={(e) => setShowTruth(e.target.checked)} />
          Ground-truth demo toggle
        </label>
      </div>
      <div className="mt-1 flex items-center gap-3 text-[11px]">
        <label className="flex flex-1 items-center gap-2">
          Opacity
          <input aria-label="opacity" type="range" min={0.1} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="w-full accent-cyan-300" />
        </label>
        <span className="mono">{tMin.toFixed(1)} to {tMax.toFixed(1)} C</span>
      </div>
      <div ref={deckRef} data-testid="deck-canvas" aria-label="deck.gl 3D voxel canvas" style={{ height: 220, width: "100%", position: "relative", background: "#040b18", borderRadius: 8, overflow: "hidden" }} />
      <svg viewBox="0 0 100 62" className="mt-1 h-48 w-full rounded bg-slate-950/60" role="img" aria-label="3D temperature voxels with selected profile column">
        {voxels.slice(0, 900).map((v, i) => {
          const [rr, gg, bb] = tempColor(v.v, tMin, tMax);
          const px = 6 + (v.x / r.w) * 76 + (v.y / r.h) * 10;
          const py = 8 + (v.y / r.h) * 44 - (v.v - tMin) * 0.6;
          return <rect key={i} x={px} y={py} width={1.6} height={1.6} fill={"rgb(" + rr + "," + gg + "," + bb + ")"} opacity={opacity} />;
        })}
        <rect x={6 + (s.selCol / r.w) * 76 + (s.selRow / r.h) * 10 - 1} y={6} width={2.4} height={52} fill="none" stroke="#fde68a" strokeWidth={0.5} />
      </svg>
      <div className="mono mt-1 text-[10px] text-slate-300/60">Drag on the deck.gl canvas to rotate. Selected profile shown as column.</div>
    </div>
  );
}
