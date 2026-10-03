import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function formatNum(v: number, digits = 2) {
  if (!Number.isFinite(v)) return "Not specified";
  return v.toFixed(digits);
}
export function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
export function lonLatToGrid(lon: number, lat: number, region: { latMin: number; latMax: number; lonMin: number; lonMax: number }, h: number, w: number) {
  const r = clamp((lat - region.latMin) / (region.latMax - region.latMin), 0, 1);
  const c = clamp((lon - region.lonMin) / (region.lonMax - region.lonMin), 0, 1);
  return { row: Math.min(h - 1, Math.floor((1 - r) * h)), col: Math.min(w - 1, Math.floor(c * w)) };
}
export function gridToLonLat(row: number, col: number, region: { latMin: number; latMax: number; lonMin: number; lonMax: number }, h: number, w: number) {
  const lat = region.latMax - (row + 0.5) / h * (region.latMax - region.latMin);
  const lon = region.lonMin + (col + 0.5) / w * (region.lonMax - region.lonMin);
  return { lat, lon };
}
