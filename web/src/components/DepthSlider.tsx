import { DEPTH_LEVELS } from "@/lib/config";
export function DepthSlider({ index, onChange }: { index: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor="depth-slider" className="text-[11px] uppercase tracking-widest text-slate-300/70">
        Depth
      </label>
      <input
        id="depth-slider"
        aria-label="Depth slice"
        type="range"
        min={0}
        max={DEPTH_LEVELS.length - 1}
        value={index}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-cyan-300"
      />
      <span className="mono text-xs text-cyan-100">{DEPTH_LEVELS[index]} m</span>
    </div>
  );
}
