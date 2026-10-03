import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Map as MLMap, Marker as MLMarker, MapMouseEvent as MLMouseEvent } from "maplibre-gl";
import { useSession } from "@/store/session";
import { regionBounds } from "@/engine/demo/engine";
import { paintCell, adjacentToLand } from "@/lib/fieldPaint";
import { lonLatToGrid, gridToLonLat } from "@/lib/utils";
interface Hover {
  row: number;
  col: number;
  lat: number;
  lon: number;
  val: number;
}
const FIELD_ID = "strata-field";
export function MapView({ height = 420 }: { height?: number }) {
  const s = useSession();
  const nav = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const rasterRef = useRef<{ canvas: HTMLCanvasElement; tMin: number; tMax: number } | null>(null);
  const mlRef = useRef<{ Marker: new (options?: { element?: HTMLElement }) => MLMarker } | null>(null);
  const [map, setMap] = useState<MLMap | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [markerCount, setMarkerCount] = useState(0);
  const [mapError, setMapError] = useState("");
  const [hover, setHover] = useState<Hover | null>(null);
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
    const land = result.surface.land;
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const v = field[r * w + c];
        const o = (r * w + c) * 4;
        const isLand = land[r * w + c] === 1;
        const near = !isLand && adjacentToLand(land, h, w, r, c);
        const [rr, gg, bb, aa] = paintCell(v, isLand, near, tMin, tMax);
        img.data[o] = rr;
        img.data[o + 1] = gg;
        img.data[o + 2] = bb;
        img.data[o + 3] = aa;
      }
    }
    ctx.putImageData(img, 0, 0);
    return { canvas: off, tMin, tMax };
  }, [result, field]);
  useEffect(() => {
    rasterRef.current = raster;
  }, [raster]);
  useEffect(() => {
    let cancelled = false;
    let m: MLMap | null = null;
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
        mlRef.current = { Marker: maplibregl.Marker };
        const inst = new maplibregl.Map({
          container: ref.current,
          style: "/map-style.json",
          bounds: [bounds.lonMin, bounds.latMin, bounds.lonMax, bounds.latMax],
          fitBoundsOptions: { padding: 0, animate: false },
          maxBounds: [bounds.lonMin - 3, bounds.latMin - 3, bounds.lonMax + 3, bounds.latMax + 3],
          minZoom: 3,
          maxZoom: 10,
          attributionControl: false,
          dragRotate: false,
          touchPitch: false
        });
        m = inst as unknown as MLMap;
        inst.on("error", (e: unknown) => {
          try {
            const msg = String((e as { error?: { message?: string } }).error?.message || e);
            setMapError(msg.slice(0, 160));
          } catch {
            void 0;
          }
        });
        inst.on("load", () => {
          if (cancelled) return;
          const r = rasterRef.current;
          try {
            if (r) {
              inst.addSource(FIELD_ID, {
                type: "image",
                url: r.canvas.toDataURL(),
                coordinates: [
                  [bounds.lonMin, bounds.latMax],
                  [bounds.lonMax, bounds.latMax],
                  [bounds.lonMax, bounds.latMin],
                  [bounds.lonMin, bounds.latMin]
                ]
              });
              inst.addLayer({ id: FIELD_ID, type: "raster", source: FIELD_ID, paint: { "raster-opacity": 1, "raster-resampling": "linear" } });
            }
          } catch {
            void 0;
          }
          setLoaded(true);
        });
        setMap(m);
      } catch {
        void 0;
      }
    }
    void init();
    return () => {
      cancelled = true;
      try {
        if (m) (m as unknown as { remove: () => void }).remove();
      } catch {
        void 0;
      }
      setMap(null);
      setLoaded(false);
    };
  }, [bounds.lonMin, bounds.lonMax, bounds.latMin, bounds.latMax]);
  useEffect(() => {
    if (!map || !raster) return;
    let alive = true;
    let tries = 0;
    const coords = [
      [bounds.lonMin, bounds.latMax],
      [bounds.lonMax, bounds.latMax],
      [bounds.lonMax, bounds.latMin],
      [bounds.lonMin, bounds.latMin]
    ];
    const ensure = () => {
      if (!alive) return;
      tries++;
      try {
        const src = map.getSource(FIELD_ID) as unknown as { updateImage?: (o: { image: string }) => void } | undefined;
        if (src && typeof src.updateImage === "function") {
          src.updateImage({ image: raster.canvas.toDataURL() });
          return true;
        }
        if (!src && map.isStyleLoaded()) {
          (map as unknown as { addSource: (id: string, src: unknown) => void }).addSource(FIELD_ID, { type: "image", url: raster.canvas.toDataURL(), coordinates: coords });
          (map as unknown as { addLayer: (l: unknown) => void }).addLayer({ id: FIELD_ID, type: "raster", source: FIELD_ID, paint: { "raster-opacity": 1, "raster-resampling": "linear" } });
          return true;
        }
      } catch {
        void 0;
      }
      return false;
    };
    if (loaded) ensure();
    const t = setInterval(() => {
      if (ensure() || tries >= 8) clearInterval(t);
    }, 1500);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [map, loaded, raster, bounds.lonMin, bounds.lonMax, bounds.latMin, bounds.latMax]);
  useEffect(() => {
    if (!map || !result || !field) return;
    const st = useSession.getState();
    const onClick = (e: MLMouseEvent) => {
      const g = lonLatToGrid(e.lngLat.lng, e.lngLat.lat, bounds, result.h, result.w);
      st.setSelection(g.row, g.col);
    };
    const onMove = (e: MLMouseEvent) => {
      const g = lonLatToGrid(e.lngLat.lng, e.lngLat.lat, bounds, result.h, result.w);
      const ll = gridToLonLat(g.row, g.col, bounds, result.h, result.w);
      setHover({ row: g.row, col: g.col, lat: ll.lat, lon: ll.lon, val: field[g.row * result.w + g.col] });
    };
    const onLeave = () => setHover(null);
    try {
      map.on("click", onClick);
      map.on("mousemove", onMove);
      map.on("mouseleave", onLeave);
    } catch {
      void 0;
    }
    return () => {
      try {
        map.off("click", onClick);
        map.off("mousemove", onMove);
        map.off("mouseleave", onLeave);
      } catch {
        void 0;
      }
    };
  }, [map, result, field, bounds]);
  useEffect(() => {
    if (!map || !result || !mlRef.current) return;
    const st = useSession.getState();
    const markers: MLMarker[] = [];
    try {
      for (const f of result.argo) {
        const el = document.createElement("button");
        el.setAttribute("data-testid", "map-marker-" + f.id);
        el.setAttribute("title", "Float " + f.id);
        el.setAttribute("aria-label", "Float " + f.id + ". Open in Validation.");
        el.className = "h-3.5 w-3.5 rounded-full border border-slate-950";
        el.style.background = st.argoId === f.id ? "#fde68a" : "#22d3ee";
        el.style.cursor = "pointer";
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          st.setArgoId(f.id);
          st.setSelection(f.row, f.col);
          nav("/validation");
        });
        const mk = new mlRef.current.Marker({ element: el }).setLngLat([f.lon, f.lat]).addTo(map);
        markers.push(mk);
      }
      const ll = gridToLonLat(st.selRow, st.selCol, bounds, result.h, result.w);
      const dot = document.createElement("div");
      dot.setAttribute("data-testid", "map-selection");
      dot.setAttribute("aria-hidden", "true");
      dot.className = "h-4 w-4 rounded-sm border-2 border-amber-200";
      dot.style.pointerEvents = "none";
      markers.push(new mlRef.current.Marker({ element: dot }).setLngLat([ll.lon, ll.lat]).addTo(map));
      setMarkerCount(markers.length);
    } catch {
      void 0;
    }
    return () => {
      for (const mk of markers) {
        try {
          mk.remove();
        } catch {
          void 0;
        }
      }
    };
  }, [map, loaded, result, nav, bounds, s.argoId, s.selRow, s.selCol]);
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
  return (
    <div className="strata-card overflow-hidden" data-testid="map-view" data-map-loaded={loaded ? "yes" : "no"} data-markers={markerCount} data-map-error={mapError}>
      <div className="relative w-full" style={{ height }}>
        <div ref={ref} style={{ height: "100%", width: "100%" }} data-testid="maplibre-canvas" aria-label="Interactive coastline basemap. Drag to pan, scroll to zoom." />
        <div
          role="application"
          aria-label="Reconstructed field map. Click to select location."
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") s.setSelection(Math.floor(h / 2), Math.floor(w / 2));
          }}
          className="pointer-events-none absolute inset-0"
        >
          <div className="absolute inset-0" role="img" aria-label="Reconstructed temperature field" />
        </div>
        <div className="mono absolute bottom-1 left-1 rounded bg-slate-950/70 px-1.5 py-0.5 text-[10px] text-cyan-100">
          {hover && Number.isFinite(hover.val) ? s.diagnostic.toUpperCase() + " " + hover.val.toFixed(2) + " @ " + hover.lat.toFixed(2) + "N, " + hover.lon.toFixed(2) + "E" : s.diagnostic.toUpperCase() + " · " + tMin.toFixed(2) + " to " + tMax.toFixed(2) + " · click selects profile · float click opens Validation"}
        </div>
        {hover && Number.isFinite(hover.val) ? <div data-testid="hover-readout" className="sr-only">{hover.val.toFixed(2)}</div> : null}
      </div>
    </div>
  );
}
export function OceanLayer() {
  return null;
}
