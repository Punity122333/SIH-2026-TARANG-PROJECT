import { tempColor } from "@/lib/theme";
export const LAND_RGB: [number, number, number] = [13, 32, 54];
export const EDGE_BLEND = 0.45;
export function mix(a: number, b: number, t: number): number {
  return Math.round(a * (1 - t) + b * t);
}
export function adjacentToLand(land: Uint8Array, h: number, w: number, r: number, c: number): boolean {
  if (r > 0 && land[(r - 1) * w + c] === 1) return true;
  if (r + 1 < h && land[(r + 1) * w + c] === 1) return true;
  if (c > 0 && land[r * w + c - 1] === 1) return true;
  if (c + 1 < w && land[r * w + c + 1] === 1) return true;
  return false;
}
export function paintCell(v: number, isLand: boolean, nearLand: boolean, tMin: number, tMax: number): [number, number, number, number] {
  if (isLand || !Number.isFinite(v)) return [LAND_RGB[0], LAND_RGB[1], LAND_RGB[2], 255];
  const t = tempColor(v, tMin, tMax);
  if (!nearLand) return [t[0], t[1], t[2], 255];
  return [mix(t[0], LAND_RGB[0], EDGE_BLEND), mix(t[1], LAND_RGB[1], EDGE_BLEND), mix(t[2], LAND_RGB[2], EDGE_BLEND), 255];
}
