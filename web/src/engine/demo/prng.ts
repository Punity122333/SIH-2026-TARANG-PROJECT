export function hashSeed(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function dayOfYear(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00Z");
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86400000);
}
export function makeNoise(h: number, w: number, rand: () => number, octaves = 3) {
  const out = new Float32Array(h * w);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const gh = 4 + o * 5;
    const gw = 6 + o * 7;
    const grid: number[] = [];
    for (let i = 0; i < gh * gw; i++) grid.push(rand() * 2 - 1);
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const fx = (c / w) * (gw - 1);
        const fy = (r / h) * (gh - 1);
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const x1 = Math.min(gw - 1, x0 + 1);
        const y1 = Math.min(gh - 1, y0 + 1);
        const tx = fx - x0;
        const ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx);
        const sy = ty * ty * (3 - 2 * ty);
        const v00 = grid[y0 * gw + x0];
        const v10 = grid[y0 * gw + x1];
        const v01 = grid[y1 * gw + x0];
        const v11 = grid[y1 * gw + x1];
        const v = v00 * (1 - sx) * (1 - sy) + v10 * sx * (1 - sy) + v01 * (1 - sx) * sy + v11 * sx * sy;
        out[r * w + c] += v * amp;
      }
    }
    total += amp;
    amp *= 0.55;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}
export interface Eddy {
  r: number;
  c: number;
  rad: number;
  amp: number;
}
export function makeEddies(rand: () => number, h: number, w: number, n: number): Eddy[] {
  const arr: Eddy[] = [];
  for (let i = 0; i < n; i++) {
    arr.push({
      r: rand() * h,
      c: rand() * w,
      rad: 6 + rand() * 16,
      amp: (rand() > 0.5 ? 1 : -1) * (0.4 + rand() * 0.9)
    });
  }
  return arr;
}
export function eddyField(h: number, w: number, eddies: Eddy[]): Float32Array {
  const out = new Float32Array(h * w);
  for (const e of eddies) {
    const r0 = Math.max(0, Math.floor(e.r - e.rad * 2));
    const r1 = Math.min(h - 1, Math.ceil(e.r + e.rad * 2));
    const c0 = Math.max(0, Math.floor(e.c - e.rad * 2));
    const c1 = Math.min(w - 1, Math.ceil(e.c + e.rad * 2));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const dr = r - e.r;
        const dc = c - e.c;
        const d2 = dr * dr + dc * dc;
        out[r * w + c] += e.amp * Math.exp(-d2 / (2 * e.rad * e.rad * 0.35));
      }
    }
  }
  return out;
}
