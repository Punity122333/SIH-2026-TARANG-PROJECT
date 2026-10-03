import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/store/session";
import { regionBounds } from "@/engine/demo/engine";
import { tempColor } from "@/lib/theme";
export function MapView({ height = 420 }: { height?: number }) {
  const s = useSession();
  const nav = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const bounds = regionBounds(s.region);
  const result = s.result;
  const field = useMemo(() => {
    if (!result) return null;
    const { h, w } = result;
    const k = s.depthIndex;
    const out: number[] = [];
    const diag = s.diagnostic;
    if (diag === "sst") {
      for (let i = 0; i < h * w; i++) out.push(result.surface.sst[i]);
    } else if (diag === "sss") {
      for (let i = 0; i < h * w; i++) out.push(result.surface.sss[i]);
    } else if (diag === "ssh") {
      for (let i = 0; i < h * w; i++) out.push(result.surface.ssh[i]);
    } else {
      for (let i = 0; i < h * w; i++) out.push(result.reconVolume[k * h * w + i]);
    }
    return out;
  }, [result, s.depthIndex, s.diagnostic]);
  const geoAspect = useMemo(() => {
    const lonSpan = Math.max(1e-6, bounds.lonMax - bounds.lonMin);
    const latSpan = Math.max(1e-6, bounds.latMax - bounds.latMin);
    const latMid = ((bounds.latMin + bounds.latMax) / 2) * (Math.PI / 180);
    return (lonSpan * Math.cos(latMid)) / latSpan;
  }, [bounds.lonMin, bounds.lonMax, bounds.latMin, bounds.latMax]);
  useEffect(() => {
    let cancelled = false;
    let map: { remove: () => void } | null = null;
    async function init() {
      if (!ref.current) return;
      try {
        const [{ default: maplibregl }, { Protocol }] = await Promise.all([
          import("maplibre-gl"),
          import("pmtiles")
        ]);
        const pm = new Protocol();
        try {
          (maplibregl as unknown as { addProtocol: (a: string, b: unknown) => void }).addProtocol("pmtiles", pm.tile);
        } catch {
          void 0;
        }
        if (cancelled) return;
        const m = new maplibregl.Map({
          container: ref.current,
          style: "/map-style.json",
          bounds: [bounds.lonMin, bounds.latMin, bounds.lonMax, bounds.latMax],
          fitBoundsOptions: { padding: 0, animate: false },
          attributionControl: false,
          interactive: false
        });
        map = m as unknown as { remove: () => void };
      } catch {
        void 0;
      }
    }
    void init();
    return () => {
      cancelled = true;
      try {
        if (map) map.remove();
      } catch {
        void 0;
      }
    };
  }, [bounds.lonMin, bounds.lonMax, bounds.latMin, bounds.latMax]);
  const raster = useMemo(() => {
    if (!result || !field) return null;
    const { h, w } = result;
    let tMin = Infinity;
    let tMax = -Infinity;
    for (let i = 0; i < field.length; i++) {
      const v = field[i];
      if (!Number.isFinite(v)) continue;
      if (v < tMin) tMin = v;
      if (v > tMax) tMax = v;
    }
    if (!Number.isFinite(tMin)) {
      tMin = 0;
      tMax = 1;
    }
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const ctx = off.getContext("2d");
    if (!ctx) return null;
    const img = ctx.createImageData(w, h);
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const v = field[r * w + c];
        const o = (r * w + c) * 4;
        if (!Number.isFinite(v)) {
          img.data[o + 3] = 0;
          continue;
        }
        const [rr, gg, bb] = tempColor(v, tMin, tMax);
        img.data[o] = rr;
        img.data[o + 1] = gg;
        img.data[o + 2] = bb;
        img.data[o + 3] = 235;
      }
    }
    ctx.putImageData(img, 0, 0);
    return { canvas: off, tMin, tMax };
  }, [result, field]);
  useEffect(() => {
    const cv = canvasRef.current;
    const box = boxRef.current;
    if (!cv || !box || !raster || !result) return;
    const rect = box.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const dw = Math.max(2, Math.round(rect.width * dpr));
    const dh = Math.max(2, Math.round(rect.height * dpr));
    if (cv.width !== dw || cv.height !== dh) {
      cv.width = dw;
      cv.height = dh;
    }
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(raster.canvas, 0, 0, cv.width, cv.height);
  });
  if (!result || !field || !raster) {
    return (
      <div className="strata-card overflow-hidden" data-testid="map-view">
        <div ref={ref} style={{ height, width: "100%" }} data-testid="maplibre-canvas" />
        <div className="flex items-center justify-center p-8 text-sm text-slate-300/60">Run reconstruction to render the field</div>
      </div>
    );
  }
  const { h, w } = result;
  const { tMin, tMax } = raster;
  function onClick(e: React.MouseEvent<HTMLDivElement>) {
    const el = e.currentTarget.getBoundingClientRect();
    const fx = (e.clientX - el.left) / el.width;
    const fy = (e.clientY - el.top) / el.height;
    const row = Math.min(h - 1, Math.max(0, Math.floor(fy * h)));
    const col = Math.min(w - 1, Math.max(0, Math.floor(fx * w)));
    s.setSelection(row, col);
  }
  function openValidation(id: string, row: number, col: number) {
    s.setArgoId(id);
    s.setSelection(row, col);
    nav("/validation");
  }
  return (
    <div className="strata-card overflow-hidden" data-testid="map-view">
      <div className="relative flex w-full items-center justify-center" style={{ height }}>
        <div
          ref={boxRef}
          style={{ height: "100%", aspectRatio: String(geoAspect), maxWidth: "100%" }}
          className="relative overflow-hidden"
        >
          <div ref={ref} style={{ height: "100%", width: "100%", position: "absolute", inset: 0 }} data-testid="maplibre-canvas" aria-label="MapLibre coastline basemap" />
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
          <div
            role="application"
            aria-label="Reconstructed field map. Click to select location."
            onClick={onClick}
            onKeyDown={(e) => {
              if (e.key === "Enter") s.setSelection(Math.floor(h / 2), Math.floor(w / 2));
            }}
            tabIndex={0}
            className="absolute inset-0 cursor-crosshair"
          >
            <div className="absolute inset-0" role="img" aria-label="Reconstructed temperature field">
              {result.argo.map((f) => (
                <button
                  key={f.id}
                  data-testid={"map-marker-" + f.id}
                  title={"Float " + f.id}
                  aria-label={"Float " + f.id + ". Open in Validation."}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    openValidation(f.id, f.row, f.col);
                  }}
                  style={{ left: ((f.col + 0.5) / w) * 100 + "%", top: ((f.row + 0.5) / h) * 100 + "%", background: s.argoId === f.id ? "#fde68a" : "#22d3ee" }}
                  className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-950"
                />
              ))}
              <div
                data-testid="map-selection"
                aria-hidden="true"
                style={{ left: ((s.selCol + 0.5) / w) * 100 + "%", top: ((s.selRow + 0.5) / h) * 100 + "%" }}
                className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-amber-200"
              />
            </div>
            <div className="mono absolute bottom-1 left-1 rounded bg-slate-950/70 px-1.5 py-0.5 text-[10px] text-cyan-100">
              {s.diagnostic.toUpperCase()} · {tMin.toFixed(2)} to {tMax.toFixed(2)} · click selects profile · float click opens Validation
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export function OceanLayer() {
  return null;
}
